import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import {createPathway,publicationSnapshot,validatePathway} from '../../../cs-games/pathway/model.mjs';

// These statements can follow class creation in the same D1 transaction.
export function defaultPathwayStatements(db,{classId,owner,title,courseId,now}) {
  const draft={...createPathway(graph,{classId,title,courseId}),origin:'course-default'};
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
