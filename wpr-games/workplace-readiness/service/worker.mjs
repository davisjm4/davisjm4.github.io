import { prepareFocusPreview, publishLearningFocus } from './learning-focus.mjs';
import { pathwayRoute } from './pathways.mjs';
import { validateSnapshot, publicAssignment, dimensions, answerReport, grade, MIN_CLASS, RETENTION_DAYS } from '../online/model.mjs';
import { teacherIdentity, teacherSession } from './auth.mjs';
import { routeProfiles, profilesEnabled, ownerClass, studentProfile, saveProfileAssessment, purgeProfiles } from './profiles.mjs';
const DAY = 86400000;
const UUID = /^[0-9a-f-]{36}$/;
const hex = b => Array.from(new Uint8Array(b), x=>x.toString(16).padStart(2,'0')).join('');
const hash = async s => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
async function submissionDigest(secret, receipt, answers) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(receipt+'|'+JSON.stringify(answers))));
}
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const parsed = row => JSON.parse(row.snapshot);
function open(row, a, now) {
  if (row.expires <= now || (a.closes && a.closes <= now)) fail(410,'This assignment is closed.');
}

async function body(request, limit = 500000) {
  if (Number(request.headers.get('content-length')) > limit) fail(413,'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) fail(400,'Request body is required.');
  let size = 0, json = '';
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); fail(413,'Request is too large.'); }
    json += decoder.decode(value,{stream:true});
  }
  try { return JSON.parse(json+decoder.decode()); } catch { fail(400,'Invalid JSON.'); }
}
function keys(a) {
  const labels = new Map();
  for (const q of a.questions) for (const d of dimensions(q)) labels.set(d.scope+':'+d.id,d);
  return labels;
}
async function classReport(db, row, a) {
  const { results } = await db.prepare('SELECT key,n,c,g FROM released_totals WHERE assignment=?').bind(row.id).all();
  const by = new Map(results.map(r=>[r.key,r]));
  const completed = (await db.prepare("SELECT g FROM totals WHERE assignment=? AND key='overall'").bind(row.id).first())?.g || 0;
  const included = by.get('overall')?.g || 0;
  const base = { id:row.id, title:a.title, kind:a.kind, completed, included, minimum:MIN_CLASS, reporting:a.reporting };
  if (!a.reporting || included < MIN_CLASS) return { ...base, suppressed:true };
  const groups = [];
  for (const [k,label] of keys(a)) {
    const cell = by.get(k);
    if (cell?.g >= MIN_CLASS) groups.push({...label,n:cell.n,c:cell.c,g:cell.g});
  }
  // Small buckets are merged into one undisclosed residual to avoid exposing rare scores.
  const distribution = Array.from({length:10},(_,i)=>({ min:i*10,max:i===9?100:i*10+9,
    count:(by.get('score:'+i)?.g || 0) >= MIN_CLASS ? by.get('score:'+i).g : null }));
  const items = a.questions.map((q,i)=>{
    const totals = by.get('item:'+i);
    if (totals?.g < MIN_CLASS || !totals) return null;
    const choices = q.choices.flatMap((text,j)=>{
      const count = by.get('choice:'+i+':'+j)?.g || 0;
      return j !== q.correctIndex && count >= MIN_CLASS ? [{text,count,misconception:q.feedback[j].misconception ||
        q.feedback[j].lines.find(l=>l.kind==='why')?.text || ''}] : [];
    });
    return {id:q.id,prompt:q.prompt,context:q.context,n:totals.n,c:totals.c,choices};
  }).filter(Boolean).sort((x,y)=>(y.n-y.c)-(x.n-x.c));
  return {...base,n:by.get('overall').n,c:by.get('overall').c,groups,distribution,items};
}

async function route(request, env, path) {
  if (path==='/health' && request.method==='GET') {
    const tables=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('assignments','profile_classes','performance_events','pathway_revisions','mastery_attempt_states','mastery_attempts','mastery_restart_requests')").all();
    const columns=await env.DB.prepare('PRAGMA table_info(student_profiles)').all();
    return {service:'cs-games',schema:4,databaseReady:tables.results.filter(table=>!table.name.startsWith('mastery_')).length===4 && columns.results.some(column=>column.name==='event_count'),
      masteryHistoryReady:tables.results.filter(table=>table.name.startsWith('mastery_')).length===3,
      teacherConfigured:Boolean(env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.startsWith('REPLACE_') && env.TEACHER_EMAILS?.trim()),
      diagnosticsConfigured:Boolean(env.SUBMISSION_SECRET?.length>=32),profilesEnabled:profilesEnabled(env)};
  }
  if (path==='/teacher/session') return teacherSession(request,env);
  if (path.startsWith('/pathways/')) return pathwayRoute(request,env,path,{body:request=>body(request,1800000),teacherIdentity});
  const now = Date.now(), db = env.DB, method = request.method;
  const segments = path.split('/').filter(Boolean);
  const [group, id, action] = segments;
  if (group==='profile' || (group==='teacher' && id==='profiles'))
    return routeProfiles(request,env,segments,body,now);
  if (group === 'teacher') {
    const owner = await teacherIdentity(request,env);
    if (!owner) fail(401,'Teacher sign-in required.');
    if (id==='learning-focus' && segments.length===4 && method==='POST') {
      const action=segments[3];
      const options={owner,classId:segments[2],input:await body(request),now};
      if(action==='preview')return prepareFocusPreview(env,options);
      if(action==='publish')return publishLearningFocus(env,options);
    }
    if (id === 'assignments' && !action && method === 'GET') {
      const {results} = await db.prepare('SELECT id,snapshot,created FROM assignments WHERE owner=? AND expires>? ORDER BY created DESC LIMIT 100').bind(owner,now).all();
      return { assignments:results.map(r=>({ id:r.id, title:parsed(r).title, kind:parsed(r).kind, date:r.created })) };
    }
    if (id === 'assignments' && !action && method === 'POST') {
      const data = await body(request), message = validateSnapshot(data,now);
      if (message) fail(400,message);
      if (data.profileClassId != null) {
        if (!profilesEnabled(env)) fail(403,'Student profiles are unavailable.');
        await ownerClass(db,owner,data.profileClassId,now,true);
      }
      const id = crypto.randomUUID();
      const classId=data.profileClassId ?? null;
      const activeClass=classId ? ' AND EXISTS (SELECT 1 FROM profile_classes WHERE id=? AND owner=? AND archived IS NULL AND expires>?)' : '';
      const classParams=classId ? [classId,owner,now] : [];
      const result = await db.prepare('INSERT INTO assignments(id,owner,snapshot,created,expires) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM assignments WHERE owner=? AND expires>?)<100'+activeClass)
        .bind(id,owner,JSON.stringify(data),now,now+RETENTION_DAYS*DAY,owner,now,...classParams).run();
      if (!result.meta.changes) fail(429,'Assignment limit reached. Delete an older assignment before publishing.');
      return {id};
    }
    if (!UUID.test(id || '')) fail(404,'Assignment not found.');
    const row = await db.prepare('SELECT * FROM assignments WHERE id=? AND owner=? AND expires>?').bind(id,owner,now).first();
    if (!row) fail(404,'Assignment not found.');
    if (!action && method === 'GET') return classReport(db,row,parsed(row));
    if (!action && method === 'DELETE') {
      await db.prepare('DELETE FROM assignments WHERE id=? AND owner=?').bind(id,owner).run();
      return { deleted:true };
    }
  }
  if (group !== 'student' || !UUID.test(id || '')) fail(404,'Assignment not found.');
  const row = await db.prepare('SELECT * FROM assignments WHERE id=? AND expires>?').bind(id,now).first();
  if (!row) fail(404,'Assignment not found.');
  const a = parsed(row);
  if (!action && method === 'GET') { open(row,a,now); return publicAssignment(a,id); }
  if (method !== 'POST') fail(404,'Assignment not found.');
  const profile = a.profileClassId ? await studentProfile(request,env,now) : null;
  if (profile && profile.class_id !== a.profileClassId) fail(403,'This assignment belongs to a different class.');
  if (profile && (!env.SUBMISSION_SECRET || env.SUBMISSION_SECRET.length < 32)) fail(503,'The reporting service is not fully configured.');
  const profileBrowser = profile ? await submissionDigest(env.SUBMISSION_SECRET, 'profile:' + id, [profile.id]) : null;
  const input = await body(request);
  if (!input || typeof input !== 'object') fail(400,'Invalid request.');
  if (action === 'start') {
    open(row,a,now);
    if (!profile && !UUID.test(input.browser || '')) fail(400,'Invalid attempt request.');
    // This random per-assignment browser nonce limits accidental retakes on one browser.
    const browser = profileBrowser || await hash(id+'|'+input.browser);
    const existing = await db.prepare('SELECT token,finished FROM receipts WHERE assignment=? AND browser=? ORDER BY created DESC LIMIT 1').bind(id,browser).first();
    if (existing && !existing.finished) return { token:existing.token };
    if (existing && a.retakes === 'once') fail(409,(profile?'This profile':'This browser')+' has already completed the assignment.');
    const token = crypto.randomUUID();
    const result = await db.prepare(`INSERT INTO receipts(token,assignment,browser,created)
      SELECT ?,?,?,? WHERE (SELECT count(*) FROM receipts WHERE assignment=? AND created>?)<300
      AND (SELECT count(*) FROM receipts WHERE assignment=?)<5000
      AND NOT EXISTS (SELECT 1 FROM receipts WHERE assignment=? AND browser=? AND (finished IS NULL OR ?='once'))`)
      .bind(token,id,browser,now,id,now-60000,id,id,browser,a.retakes).run();
    if (!result.meta.changes) fail(429,'An attempt is already starting or this assignment is busy. Try again shortly.');
    return {token};
  }
  if (!UUID.test(input.token || '')) fail(400,'Invalid attempt.');
  const receipt = await db.prepare('SELECT * FROM receipts WHERE token=? AND assignment=?').bind(input.token,id).first();
  if (!receipt || (profile && receipt.browser !== profileBrowser)) fail(404,'Attempt not found.');
  if (action === 'answer' && a.feedbackTiming === 'immediate') {
    open(row,a,now);
    const { index, choice } = input;
    if (receipt.finished || !Number.isInteger(index) || !a.questions[index] ||
        !Number.isInteger(choice) || choice<0 || choice>3) fail(400,'Invalid answer.');
    await db.prepare(`UPDATE receipts SET locked=json_set(locked,?,?) WHERE token=? AND finished IS NULL AND json_type(locked,?) IS NULL`)
      .bind('$."' + index + '"',choice,receipt.token,'$."' + index + '"').run();
    const updated = await db.prepare('SELECT locked,finished FROM receipts WHERE token=?').bind(receipt.token).first();
    if (updated.finished || JSON.parse(updated.locked)[index] !== choice) fail(409,'That answer is already locked.');
    return answerReport(a.questions[index],choice);
  }
  if (action !== 'submit') fail(404,'Assignment not found.');
  let outcome;
  try { outcome = grade(a,input.answers,id,new Date(receipt.finished || now).toISOString()); }
  catch(e) { fail(400,e.message); }
  if (!env.SUBMISSION_SECRET || env.SUBMISSION_SECRET.length < 32) fail(503,'The reporting service is not fully configured.');
  const digest = await submissionDigest(env.SUBMISSION_SECRET,receipt.token,input.answers);
  if (!receipt.finished) {
    open(row,a,now);
    const locked = JSON.parse(receipt.locked);
    if (a.feedbackTiming === 'immediate' && (Object.keys(locked).length !== a.questions.length ||
      input.answers.some((v,i)=>locked[i]!==v))) fail(409,'Complete and lock each answer before submitting.');
    await db.prepare('UPDATE receipts SET finished=?,digest=?,payload=? WHERE token=? AND finished IS NULL')
      .bind(now,digest,JSON.stringify(a.reporting?outcome.aggregates:[]),receipt.token).run();
  }
  const finalized = await db.prepare('SELECT finished,digest FROM receipts WHERE token=?').bind(receipt.token).first();
  if (finalized.digest !== digest) fail(409,'This attempt was already submitted with different answers.');
  outcome.report.date = new Date(finalized.finished).toISOString();
  if (profile) await saveProfileAssessment(db,profile,receipt.token,outcome.report,now);
  return outcome.report;
}

export default {
  async fetch(request,env) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).includes(origin);
    const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', Vary:'Origin',
      ...(allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':'Authorization,Content-Type'}:{}) };
    const json = (value,status=200)=>new Response(JSON.stringify(value),{status,headers});
    if (origin && !allowed) return json({error:'Origin is not allowed.'},403);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    try { return json(await route(request,env,new URL(request.url).pathname.replace(/^\/api\/wpr(?=\/|$)/,''))); }
    catch (e) { return json({error:e.status?e.message:'The reporting service could not complete the request. Try again.'},e.status||500); }
  },
  async scheduled(_event, env) {
    const now = Date.now();
    await env.DB.prepare('DELETE FROM assignments WHERE expires<=?').bind(now).run();
    await env.DB.prepare('DELETE FROM receipts WHERE finished IS NULL AND created<?').bind(now-DAY).run();
    await env.DB.prepare('DELETE FROM teacher_sessions WHERE expires<=?').bind(now).run();
    if (profilesEnabled(env) || env.PROFILE_SCHEMA_INSTALLED==='1') await purgeProfiles(env.DB,now);
  }
};
