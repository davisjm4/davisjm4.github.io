import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import {validatePathway,diffPathways,studentContract} from '../../../cs-games/pathway/model.mjs';
const error=(status,message)=>{throw Object.assign(new Error(message),{status});};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const valid=p=>{try{return validatePathway(p,graph);}catch(e){error(400,e.message);}};
const parse=row=>row?JSON.parse(row.snapshot):null;
const stamp=(p,revision)=>({...p,revision,baseRevision:revision,checkpoints:p.checkpoints.map(c=>({...c,revision})),sessions:p.sessions.map(s=>({...s,revision}))});
export async function pathwayRoute(request,env,path,{body,teacherIdentity}) {
  const parts=path.split('/').filter(Boolean);if(parts[0]!=='pathways')return null;
  const [,role,id,action]=parts,db=env.DB,method=request.method;
  if(parts.length>4)error(404,'Pathway route not found.');
  if(role==='student'&&method==='GET'&&!action){
    if(!env.resolvePathwayStudent||!env.readPathwayEvidence)error(503,'Student profile and evidence adapters are not connected.');
    const identity=await env.resolvePathwayStudent(request);if(!identity?.profileId||!identity.classIds?.includes(id))error(403,'Class enrollment required.');
    const p=await db.prepare('SELECT id,head FROM class_pathways WHERE class_id=?').bind(id).first();if(!p||!p.head)error(404,'No pathway has been published for this class.');
    const row=await db.prepare('SELECT snapshot FROM pathway_revisions WHERE pathway_id=? AND revision=?').bind(p.id,p.head).first();
    const evidence=await env.readPathwayEvidence(identity.profileId);const view=studentContract(parse(row),graph,evidence);
    const digest=await hash(JSON.stringify({status:view.status,nodes:view.nodes.map(n=>n.checkpoint)}));
    await db.prepare('INSERT OR IGNORE INTO pathway_status_history(pathway_id,profile_id,revision,digest,status,created) VALUES(?,?,?,?,?,?)')
      .bind(p.id,identity.profileId,p.head,digest,view.status,Date.now()).run();
    return {pathway:view,notice:'Class pathway revision '+p.head,cacheKey:p.id+':'+p.head};
  }
  if(role!=='teacher')error(404,'Pathway route not found.');
  const owner=await teacherIdentity(request,env);if(!owner)error(401,'Teacher sign-in required.');
  if(!id&&method==='GET'){const {results}=await db.prepare('SELECT id,class_id,head,draft_version,draft FROM class_pathways WHERE owner=? ORDER BY created DESC LIMIT 100').bind(owner).all();return {pathways:results.map(r=>({id:r.id,classId:r.class_id,revision:r.head,draftVersion:r.draft_version,title:JSON.parse(r.draft).title}))};}
  if(!id&&method==='POST'){
    const p=await body(request);valid(p);if(p.revision!==0)error(400,'A new pathway starts at revision zero.');
    try{await db.prepare('INSERT INTO class_pathways(id,class_id,owner,draft,created) VALUES(?,?,?,?,?)').bind(p.id,p.classId,owner,JSON.stringify(p),Date.now()).run();}catch{error(409,'This class or pathway already exists. Copy to a new class ID.');}
    return {id:p.id,revision:0,draftVersion:1};
  }
  const p=await db.prepare('SELECT * FROM class_pathways WHERE id=? AND owner=?').bind(id,owner).first();if(!p)error(404,'Pathway not found.');
  const current=p.head?parse(await db.prepare('SELECT snapshot FROM pathway_revisions WHERE pathway_id=? AND revision=?').bind(id,p.head).first()):null;
  if(!action&&method==='GET')return {draft:JSON.parse(p.draft),draftVersion:p.draft_version,published:current};
  if(action==='history'&&method==='GET'){const {results}=await db.prepare('SELECT revision,parent_revision,created,summary FROM pathway_revisions WHERE pathway_id=? ORDER BY revision DESC').bind(id).all();return {revisions:results};}
  if(action==='draft'&&method==='POST'){
    const data=await body(request);valid(data.pathway);
    if(data.pathway.id!==id||data.pathway.classId!==p.class_id)error(400,'Pathway and class identity cannot be changed.');
    if(data.pathway.baseRevision!==p.head)error(409,'The published pathway changed. Reload before saving this draft.');
    // A changed policy must have a new version, even when the old version is absent from the draft.
    const historical=await db.prepare('SELECT definition FROM pathway_policy_versions WHERE pathway_id=?').bind(id).all();
    for(const old of historical.results.map(r=>JSON.parse(r.definition))){const next=data.pathway.policies.find(x=>x.id===old.id&&x.version===old.version);if(next&&JSON.stringify(next)!==JSON.stringify(old))error(409,'Create a new mastery policy version instead of changing an existing policy.');}
    const result=await db.prepare('UPDATE class_pathways SET draft=?,draft_version=draft_version+1 WHERE id=? AND owner=? AND draft_version=? AND head=?')
      .bind(JSON.stringify(data.pathway),id,owner,data.draftVersion,p.head).run();if(!result.meta.changes)error(409,'Another session changed the draft. Reload before editing.');return {draftVersion:p.draft_version+1};
  }
  if(action==='preview'&&method==='POST'){
    const draft=JSON.parse(p.draft);valid(draft);return {changes:diffPathways(current,draft),draftVersion:p.draft_version,expectedRevision:p.head,
      previewToken:await hash(p.draft+'|'+p.draft_version+'|'+p.head),studentPreview:studentContract(stamp(draft,p.head+1),graph),warnings:draft.warnings||[]};
  }
  if(action==='publish'&&method==='POST'){
    const data=await body(request);if(data.previewToken!==await hash(p.draft+'|'+p.draft_version+'|'+p.head)||data.draftVersion!==p.draft_version||data.expectedRevision!==p.head)error(409,'Preview the latest draft before publishing.');
    const draft=JSON.parse(p.draft);valid(draft);const snapshot=stamp({...draft,curriculumSnapshot:{version:graph.version,nodes:graph.nodes.filter(n=>draft.sequence.includes(n.id)),areas:graph.areas.filter(a=>draft.checkpoints.some(c=>c.areaId===a.id))}},p.head+1);
    // Insertion and pointer change are one SQLite statement via the trigger. No student evidence is touched.
    const result=await db.prepare('INSERT INTO pathway_revisions(pathway_id,revision,parent_revision,snapshot,summary,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM class_pathways WHERE id=? AND owner=? AND head=? AND draft_version=?)')
      .bind(id,p.head+1,p.head,JSON.stringify(snapshot),JSON.stringify(diffPathways(current,draft).map(c=>({kind:c.kind,id:c.id}))),Date.now(),id,owner,p.head,p.draft_version).run();
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
