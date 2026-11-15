import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import registry from '../../../cs-games/pathway/evidence-gap-registry.json' with {type:'json'};
import {applyRecommended,auditRecommended,createContext,setTierSettings,stampPublishTime} from '../../../cs-games/pathway/requirements/operations.mjs';
import {buildContentFacts} from '../../../cs-games/pathway/requirements/limits.mjs';
import {createPathway,publicationSnapshot,validatePathway} from '../../../cs-games/pathway/model.mjs';

const assignments=auditRecommended(graph,registry);
const context=createContext({graph,facts:buildContentFacts({graph,registry})});
const templates=new Map(graph.courses.map(({id:courseId})=>{
  const result=applyRecommended(createPathway(graph,{id:'default',classId:'default',courseId}),context,assignments);
  if(!result.ok||result.problems.draftOnly.length)throw new Error('The starting mastery requirements need review.');
  const {policies,checkpoints}=result.pathway;
  return [courseId,{policies,checkpoints:new Map(checkpoints.map(({nodeId,requirementTier,recommendedFamilies,policyId,policyVersion})=>
    [nodeId,{requirementTier,...(recommendedFamilies?{recommendedFamilies}:{}),policyId,policyVersion}]))}];
}));

// These statements can follow class creation in the same D1 transaction.
export function defaultPathwayStatements(db,{classId,owner,title,courseId,now,recommended=false,presetEdits={}}) {
  let draft={...createPathway(graph,{classId,title,courseId}),origin:'course-default'};
  if(recommended){
    const template=templates.get(courseId);
    draft.policies=template.policies;
    draft.checkpoints=draft.checkpoints.map(checkpoint=>({...checkpoint,...template.checkpoints.get(checkpoint.nodeId)}));
    if(Object.keys(presetEdits).length){
      const result=setTierSettings(draft,presetEdits,context);
      if(!result.ok||result.problems.draftOnly.length)
        throw Object.assign(new Error(result.errors[0]?.message??result.problems.draftOnly[0].message),{status:400});
      draft=result.pathway;
    }
    draft=stampPublishTime(draft,null,new Date(now).toISOString());
  }
  validatePathway(draft,graph);
  const snapshot=publicationSnapshot(draft,graph,1);
  return [
    db.prepare(`INSERT INTO class_pathways(id,class_id,owner,draft,created)
      SELECT ?,id,owner,?,? FROM profile_classes c
      WHERE c.id=? AND c.owner=? AND c.archived IS NULL AND c.expires>?
        AND NOT EXISTS (SELECT 1 FROM class_pathways WHERE class_id=c.id)`)
      .bind(draft.id,JSON.stringify(draft),now,classId,owner,now),
    db.prepare(`INSERT INTO pathway_revisions(pathway_id,revision,parent_revision,snapshot,summary,created)
      SELECT id,1,0,?,?,? FROM class_pathways WHERE id=? AND head=0`)
      .bind(JSON.stringify(snapshot),JSON.stringify([{kind:'course-default'}]),now,draft.id)
  ];
}

export async function ensureClassPathway(db,owner,classId,now) {
  const classroom=await db.prepare(`SELECT title,course_id FROM profile_classes c
    WHERE id=? AND owner=? AND archived IS NULL AND expires>?
      AND NOT EXISTS (SELECT 1 FROM class_pathways WHERE class_id=c.id)`).bind(classId,owner,now).first();
  if(!classroom)return;
  await db.batch(defaultPathwayStatements(db,{classId,owner,now,title:classroom.title,courseId:classroom.course_id}));
}
