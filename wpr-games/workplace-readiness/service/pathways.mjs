import {readMasteryProgress,restartMasteryPractice} from './mastery-attempts.mjs';
import {buildContentFacts} from '../../../cs-games/pathway/requirements/limits.mjs';
import {reviewRequirements} from '../../../cs-games/pathway/requirements/review.mjs';
import {isRequirementPolicy} from '../../../cs-games/pathway/requirements/ids.mjs';
import registry from '../../../cs-games/pathway/evidence-gap-registry.json' with {type:'json'};
import {validateMasteryPolicy,policyKey} from '../../../cs-games/pathway/mastery/policy.mjs';
import {PROFILE_ID} from '../online/profile-model.mjs';
import {ownerClass,profilesEnabled,studentProfile} from './profiles.mjs';
import {readProfileEvidence,readPracticeProgress} from './profile-evidence.mjs';
import {ensureClassPathway} from './default-pathways.mjs';
import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import {validatePathway,diffPathways,studentContract,publicationSnapshot} from '../../../cs-games/pathway/model.mjs';
const facts=buildContentFacts({graph,registry});
const error=(status,message)=>{throw Object.assign(new Error(message),{status});};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
function valid(pathway) {
  try {
    validatePathway(pathway,graph);
    for(const policy of pathway.policies.filter(p=>p.challenge||p.requirementSource)){
      const check=validateMasteryPolicy(policy);
      if(!isRequirementPolicy(policy)||!check.ok||policy.scoreTarget!==null||Object.keys(policy.coverage).length)
        throw new Error('Practice requirements need a valid question and accuracy rule.');
    }
  }catch(e){error(400,e.message);}
}
const parse=row=>row?JSON.parse(row.snapshot):null;
const stamp=(p,revision)=>({...p,revision,baseRevision:revision,checkpoints:p.checkpoints.map(c=>({...c,revision})),sessions:p.sessions.map(s=>({...s,revision}))});
export async function pathwayRoute(request,env,path,{body,teacherIdentity}) {
  const parts=path.split('/').filter(Boolean);if(parts[0]!=='pathways')return null;
  const [,role,id,action]=parts,db=env.DB,method=request.method;
  const testAdapter=typeof env.resolvePathwayStudent==='function' && typeof env.verifyLocalTeacher==='function';
  const requireEnrollment=profilesEnabled(env) && !testAdapter;
  if(parts.length>4)error(404,'Pathway route not found.');
  if(role==='student'&&((method==='GET'&&!action)||(method==='POST'&&action==='restart'))){
    const profile=testAdapter?null:await studentProfile(request,env);
    const identity=profile?{profileId:profile.id,classIds:[profile.class_id],evidenceCount:profile.evidence_count,eventCount:profile.event_count}
      :await env.resolvePathwayStudent(request);
    if(!identity?.profileId||!identity.classIds?.includes(id))error(403,'Class enrollment required.');
    const lookup=()=>db.prepare(`SELECT p.id,p.head,json_extract(r.snapshot,'$.calendar.timeZone') timeZone
      FROM class_pathways p LEFT JOIN pathway_revisions r ON r.pathway_id=p.id AND r.revision=p.head
      WHERE p.class_id=?`).bind(id).first();
    let p=await lookup();
    if(!p&&profile){
      const classroom=await db.prepare('SELECT owner FROM profile_classes WHERE id=?').bind(id).first();
      if(classroom)await ensureClassPathway(db,classroom.owner,id,Date.now());
      p=await lookup();
    }
    if(!p||!p.head)error(404,'No pathway has been published for this class.');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:p.timeZone||'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    // Include the current attempt version so a restart on another device invalidates this client's cached view.
    const attemptVersion=profile?await db.prepare('SELECT COALESCE(SUM(version),0) value FROM mastery_attempt_states WHERE profile_id=?')
      .bind(profile.id).first():{value:0};
    const cacheKey='progress-v3:'+p.id+':'+p.head+':'+(identity.evidenceCount??0)+':'+(identity.eventCount??0)+':'+attemptVersion.value+':'+today;
    if(!action&&!testAdapter&&new URL(request.url).searchParams.get('known')===cacheKey)return {unchanged:true,cacheKey};
    const row=await db.prepare('SELECT snapshot FROM pathway_revisions WHERE pathway_id=? AND revision=?').bind(p.id,p.head).first();
    const pathway=parse(row);
    if(action==='restart'){
      if(!profile)error(403,'Student profile sign-in required.');
      return restartMasteryPractice(db,profile,pathway,await body(request));
    }
    const [evidence,practice]=await Promise.all([
      testAdapter?env.readPathwayEvidence(identity.profileId):readProfileEvidence(db,identity.profileId),
      testAdapter?null:readPracticeProgress(db,identity.profileId)
    ]);
    const mastery=profile?await readMasteryProgress(db,profile,pathway,evidence):null;
    const view=studentContract(pathway,graph,evidence,{practice,mastery,today});
    const digest=await hash(JSON.stringify({status:view.status,nodes:view.nodes.map(n=>n.checkpoint)}));
    await db.prepare('INSERT OR IGNORE INTO pathway_status_history(pathway_id,profile_id,revision,digest,status,created) VALUES(?,?,?,?,?,?)')
      .bind(p.id,identity.profileId,p.head,digest,view.status,Date.now()).run();
    return {pathway:view,notice:'Class pathway revision '+p.head,cacheKey:mastery?.stable===false?null:cacheKey};
  }
  if(role!=='teacher')error(404,'Pathway route not found.');
  const owner=await teacherIdentity(request,env);if(!owner)error(401,'Teacher sign-in required.');
  if(!id&&method==='GET'){
    const filter=requireEnrollment ? ' AND EXISTS(SELECT 1 FROM profile_classes c WHERE c.id=class_id AND c.owner=class_pathways.owner AND c.expires>?)' : '';
    const parameters=requireEnrollment ? [owner,Date.now()] : [owner];
    const {results}=await db.prepare("SELECT id,class_id,head,draft_version,json_extract(draft,'$.title') title, json_extract(draft,'$.origin') origin FROM class_pathways WHERE owner=?"+filter+' ORDER BY created DESC LIMIT 100')
      .bind(...parameters).all();
    return {pathways:results.map(row=>({id:row.id,classId:row.class_id,revision:row.head,draftVersion:row.draft_version,title:row.title,isDefault:row.head===1&&row.origin==='course-default'}))};
  }
  if(!id&&method==='POST'){
    const p=await body(request);valid(p);
    if(requireEnrollment){
      if(!PROFILE_ID.test(p.id))error(400,'Invalid pathway ID. Create or copy a local pathway first.');
      const classroom=await ownerClass(db,owner,p.classId,Date.now(),true);
      if(classroom.course_id!==p.courseId)error(400,'The pathway template must match the enrolled class course.');
    }
    if(p.revision!==0)error(400,'A new pathway starts at revision zero.');
    try{await db.prepare('INSERT INTO class_pathways(id,class_id,owner,draft,created) VALUES(?,?,?,?,?)').bind(p.id,p.classId,owner,JSON.stringify(p),Date.now()).run();}catch{error(409,'This class or pathway already exists. Copy to a new class ID.');}
    return {id:p.id,revision:0,draftVersion:1};
  }
  const p=await db.prepare('SELECT * FROM class_pathways WHERE id=? AND owner=?').bind(id,owner).first();if(!p)error(404,'Pathway not found.');
  const classroom=requireEnrollment?await ownerClass(db,owner,p.class_id,Date.now(),method==='POST'):null;
  const current=p.head?parse(await db.prepare('SELECT snapshot FROM pathway_revisions WHERE pathway_id=? AND revision=?').bind(id,p.head).first()):null;
  if(!action&&method==='GET')return {draft:JSON.parse(p.draft),draftVersion:p.draft_version,published:current};
  if(action==='student-preview'&&method==='GET'){
    if(!current)error(404,'No pathway has been published for this class.');
    const mastery=await readMasteryProgress(db,null,current,[]);
    return {pathway:studentContract(current,graph,[],{mastery})};
  }
  if(action==='history'&&method==='GET'){const {results}=await db.prepare('SELECT revision,parent_revision,created,summary FROM pathway_revisions WHERE pathway_id=? ORDER BY revision DESC').bind(id).all();return {revisions:results};}
  if(action==='draft'&&method==='POST'){
    const data=await body(request);valid(data.pathway);
    if(classroom&&data.pathway.courseId!==classroom.course_id)error(400,'The pathway template must match the enrolled class course.');
    if(data.pathway.id!==id||data.pathway.classId!==p.class_id)error(400,'Pathway and class identity cannot be changed.');
    if(data.pathway.baseRevision!==p.head)error(409,'The published pathway changed. Reload before saving this draft.');
    // A changed policy must have a new version, even when the old version is absent from the draft.
    const historical=await db.prepare('SELECT definition FROM pathway_policy_versions WHERE pathway_id=?').bind(id).all();
    for(const old of historical.results.map(r=>JSON.parse(r.definition))){const next=data.pathway.policies.find(x=>x.id===old.id&&x.version===old.version);if(next&&JSON.stringify(next)!==JSON.stringify(old))error(409,'Create a new mastery policy version instead of changing an existing policy.');}
    const result=await db.prepare('UPDATE class_pathways SET draft=?,draft_version=draft_version+1 WHERE id=? AND owner=? AND draft_version=? AND head=?')
      .bind(JSON.stringify(data.pathway),id,owner,data.draftVersion,p.head).run();if(!result.meta.changes)error(409,'Another session changed the draft. Reload before editing.');return {draftVersion:p.draft_version+1};
  }
  if(action==='preview'&&method==='POST'){
    const draft=JSON.parse(p.draft);valid(draft);
    const mastery=await readMasteryProgress(db,null,draft,[]);
    return {changes:diffPathways(current,draft),draftVersion:p.draft_version,expectedRevision:p.head,
      previewToken:await hash(p.draft+'|'+p.draft_version+'|'+p.head),
      studentPreview:studentContract(stamp(draft,p.head+1),graph,[],{mastery}),warnings:draft.warnings||[]};
  }
  if(action==='publish'&&method==='POST'){
    const data=await body(request);if(data.previewToken!==await hash(p.draft+'|'+p.draft_version+'|'+p.head)||data.draftVersion!==p.draft_version||data.expectedRevision!==p.head)error(409,'Preview the latest draft before publishing.');
    const draft=JSON.parse(p.draft);valid(draft);
    const publishedAt=Date.now();
    if(draft.policies.some(policy=>policy.challenge)){
      const {results}=await db.prepare('SELECT definition FROM pathway_policy_versions WHERE pathway_id=?').bind(id).all();
      const historical=new Map(results.map(row=>JSON.parse(row.definition)).map(policy=>[policyKey(policy),policy]));
      if(draft.policies.some(policy=>isRequirementPolicy(policy)&&!historical.has(policyKey(policy)))){
        const review=reviewRequirements(draft,current,graph,{facts,acknowledged:data.acknowledged===true});
        if(!review.readiness.canPublish)
          error(400,'Open Customize mastery requirements to review this draft. '+review.readiness.reasons.join(' '));
      }
      draft.policies=draft.policies.map(policy=>policy.challenge
        ?{...policy,effectiveFrom:historical.get(policyKey(policy))?.effectiveFrom??new Date(publishedAt).toISOString()}
        :policy);
    }
    const snapshot=publicationSnapshot(draft,graph,p.head+1);
    // Insertion and pointer change are one SQLite statement via the trigger. No student evidence is touched.
    const result=await db.prepare('INSERT INTO pathway_revisions(pathway_id,revision,parent_revision,snapshot,summary,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM class_pathways WHERE id=? AND owner=? AND head=? AND draft_version=?)')
      .bind(id,p.head+1,p.head,JSON.stringify(snapshot),JSON.stringify(diffPathways(current,draft).map(c=>({kind:c.kind,id:c.id}))),publishedAt,id,owner,p.head,p.draft_version).run();
    if(!result.meta.changes)error(409,'The pathway changed while publishing. Reload and preview again.');return {revision:p.head+1,published:snapshot};
  }
  if(action==='rollback'&&method==='POST'){
    const data=await body(request);const prior=await db.prepare('SELECT snapshot FROM pathway_revisions WHERE pathway_id=? AND revision=?').bind(id,data.revision).first();if(!prior)error(404,'Revision not found.');
    const draft={...parse(prior),baseRevision:p.head,revision:p.head};
    const result=await db.prepare('UPDATE class_pathways SET draft=?,draft_version=draft_version+1 WHERE id=? AND owner=? AND head=? AND draft_version=?').bind(JSON.stringify(draft),id,owner,p.head,data.draftVersion).run();
    if(!result.meta.changes)error(409,'Reload before restoring a revision.');return {draft,draftVersion:p.draft_version+1,requiresPreviewAndPublish:true};
  }
  error(404,'Pathway route not found.');
}
