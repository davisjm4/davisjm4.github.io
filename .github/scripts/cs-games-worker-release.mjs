// Code-only deployment: Cloudflare's /content endpoint preserves remote configuration.
// Credentials stay in the runner environment; this script never reads learner records.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
assert(token, 'Missing repository secret CLOUDFLARE_API_TOKEN');
assert(account, 'Missing repository secret CLOUDFLARE_ACCOUNT_ID');
const worker = 'cs-games-api';
const api = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}`;
const live = 'https://cs-games-api.cs-games-davisjm4.workers.dev/api/wpr';
const origin = 'https://davisjm4.github.io';
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const report = {worker, sourceCommit:sha, startedAt:new Date().toISOString(), status:'preflight', checks:[]};
const out = path.resolve(process.env.RUNNER_TEMP || '/tmp', 'cs-games-worker-release');
fs.mkdirSync(out, {recursive:true});
const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_key, v) => v && !Array.isArray(v) && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b))) : v);
function save() {
  fs.writeFileSync(path.join(out, 'release-report.json'), JSON.stringify(report,null,2)+'\n');
}
async function cf(route, {method='GET', body}={}) {
  const response = await fetch(api+route, {method, body,
    headers:{Authorization:`Bearer ${token}`, ...(typeof body==='string' ? {'Content-Type':'application/json'} : {})},
    signal:AbortSignal.timeout(60000)});
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(`Cloudflare ${method} ${route}: HTTP ${response.status}; codes ${data.errors?.map(e=>e.code).join(',')}`);
  return data.result;
}
async function state() {
  return {settings:await cf('/settings'), schedules:await cf('/schedules'), subdomain:await cf('/subdomain')};
}
async function deployment() {
  const result=await cf('/deployments');
  const current=result.deployments?.[0];
  assert.equal(current?.versions?.length,1,'Refusing to replace a split deployment');
  assert.equal(current.versions[0].percentage,100);
  return {deploymentId:current.id, versionId:current.versions[0].version_id, createdAt:current.created_on};
}
async function smoke() {
  const checks=[];
  for (const [route, method, requestOrigin, expected] of [
    ['/health','GET',origin,200], ['/teacher/profiles','GET',origin,401],
    ['/profile/wpr-procedural','POST',origin,401], ['/health','GET','https://unauthorized.invalid',403]
  ]) {
    const response=await fetch(live+route,{method,headers:{Origin:requestOrigin,
      ...(method==='POST'?{'Content-Type':'application/json'}:{})},
      ...(method==='POST'?{body:JSON.stringify({skillId:'information-technology'})}:{}),signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,expected,`${method} ${route}`);
    if (route==='/health' && expected===200) {
      const h=await response.json(); assert.equal(h.schema,4);
      for(const key of ['databaseReady','masteryHistoryReady','teacherConfigured','diagnosticsConfigured','profilesEnabled','advisoryAssignmentsReady']) assert.equal(h[key],true,key);
      assert.equal(response.headers.get('access-control-allow-origin'),origin);
    }
    checks.push({route,method,status:response.status,passed:true});
  }
  return checks;
}
async function liveModule(name) {
  const response=await fetch(api+'/content',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,200,'Read live module content');
  if (response.headers.get('content-type')?.includes('multipart/form-data')) {
    const parts=await response.formData();
    const part=parts.get(name);
    assert(part,`Expected deployed module ${name}`);
    return typeof part==='string'?part:await part.text();
  }
  return response.text();
}

let previous, before, mutationStarted=false;
try {
  previous=await deployment(); before=await state(); report.previous=previous;
  assert.equal(before.settings.compatibility_date,'2026-11-05','Unexpected compatibility date requires review');
  const bindings=before.settings.bindings;
  const binding=name=>bindings.find(b=>b.name===name);
  assert.equal(binding('DB')?.type,'d1');
  assert.equal(binding('DB').id,'5acd2ede-8b2a-4103-917c-ad1a9ab43da7','Unexpected production D1 binding');
  assert.equal(binding('ALLOWED_ORIGINS')?.text,origin);
  for(const key of ['ENABLE_STUDENT_PROFILES','PROFILE_SCHEMA_INSTALLED','ENABLE_TEACHER_DIRECTED_LEARNING']) assert.equal(binding(key)?.text,'1',key);
  assert.equal(binding('GOOGLE_CLIENT_ID')?.text,'1030010713743-pdt1cknkf1utf54kvo568d2o6q84aai0.apps.googleusercontent.com');
  for(const key of ['SUBMISSION_SECRET','TEACHER_EMAILS']) assert.equal(binding(key)?.type,'secret_text',key);
  report.configurationFingerprint=digest(canonical(before));
  report.bindingNames=bindings.map(b=>({name:b.name,type:b.type}));
  report.schedules=before.schedules; report.subdomain=before.subdomain;
  report.checks.push(...await smoke());
  save();

  const service=path.resolve('wpr-games/workplace-readiness/service');
  // This temporary config is for offline bundling only. No secrets or bindings enter it.
  const config=path.join(out,'bundle.json');
  fs.writeFileSync(config,JSON.stringify({name:worker,main:path.join(service,'worker.mjs'),
    compatibility_date:before.settings.compatibility_date,compatibility_flags:before.settings.compatibility_flags || []}));
  execFileSync('npm',['exec','--yes','--package=wrangler@4.160.0','--','wrangler','deploy','--config',config,'--dry-run','--outdir',path.join(out,'bundle')],
    {stdio:'inherit',env:{...process.env,CLOUDFLARE_API_TOKEN:'',WRANGLER_SEND_METRICS:'false'}});
  const moduleName='worker.mjs';
  const code=`// cs-games-worker-source-commit: ${sha}\n`+fs.readFileSync(path.join(out,'bundle','worker.js'),'utf8').replace(/\n\/\/# sourceMappingURL=.*$/m,'');
  report.bundleSha256=digest(code);
  // Recheck for concurrent dashboard/configuration changes before the only code write.
  assert.deepEqual(await deployment(),previous,'Production changed during preflight');
  assert.equal(canonical(await state()),canonical(before),'Production settings changed during preflight');
  const versionsBefore=new Set((await cf('/versions')).items.map(v=>v.id));
  const form=new FormData();
  form.set('metadata',new Blob([JSON.stringify({main_module:moduleName})],{type:'application/json'}));
  form.set(moduleName,new Blob([code],{type:'application/javascript+module'}),moduleName);
  mutationStarted=true;
  await cf('/content',{method:'PUT',body:form});
  // Content replacement uploads a version; traffic activation is a separate operation.
  const addedVersions=(await cf('/versions')).items.filter(v=>!versionsBefore.has(v.id));
  assert.equal(addedVersions.length,1,'Expected exactly one newly uploaded Worker version');
  const versionId=addedVersions[0].id;
  assert.equal(canonical(await state()),canonical(before),'Upload changed production configuration');
  await cf('/deployments',{method:'POST',body:JSON.stringify({strategy:'percentage',versions:[{version_id:versionId,percentage:100}],annotations:{'workers/message':`CS Games WPR release ${sha}; code only, settings preserved`}})});
  report.current=await deployment();
  assert.equal(report.current.versionId,versionId,'Activation did not select the uploaded Worker version');
  assert.equal(canonical(await state()),canonical(before),'Remote bindings, settings or triggers changed');
  assert.equal(digest(await liveModule(moduleName)),report.bundleSha256,'Deployed code differs from the Wrangler bundle');
  report.checks.push(...await smoke());
  report.status='deployed-basic-verification-passed';
  report.authenticatedEndToEnd='pending: real Google teacher session and isolated synthetic classes required';
  report.completedAt=new Date().toISOString();
  save();
  console.log(JSON.stringify(report,null,2));
} catch (error) {
  report.failure=error.message; report.status='failed-before-deployment';
  if (mutationStarted && previous) {
    try {
      await cf('/deployments',{method:'POST',body:JSON.stringify({strategy:'percentage',versions:[{version_id:previous.versionId,percentage:100}],annotations:{'workers/message':'Automatic recovery after CS Games release verification failure'}})});
      assert.equal((await deployment()).versionId,previous.versionId);
      await smoke(); report.status='rolled-back'; report.rollbackVersion=previous.versionId;
    } catch (rollbackError) { report.status='rollback-needs-attention'; report.rollbackFailure=rollbackError.message; }
  }
  save(); console.error(JSON.stringify(report,null,2)); process.exitCode=1;
} finally {
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `CS Games Worker: **${report.status}**\n\nSource: ${sha}\n\nPrevious version: ${previous?.versionId || 'unavailable'}\n\nCurrent version: ${report.current?.versionId || 'unchanged'}\n\nSee the release-report artifact. No database migrations or secret writes were performed.\n`);
}
