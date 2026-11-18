import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMapModel } from '../../map/model.mjs';
import { groupCourseStops } from '../../map/course-groups.mjs';
const graph=JSON.parse(readFileSync(new URL('../../../pathway/curriculum-graph.json',import.meta.url),'utf8'));

test('independent curriculum groups cover every original learning area without changing skill identity',()=>{
 for(const courseId of ['csp','advanced','workplace']){
   const model=buildMapModel({graph,courseId,guest:true});
   const groups=groupCourseStops(model);
   const stops=groups.flatMap(g=>g.stops);
   assert.equal(stops.length,model.stops.length,courseId+' stop coverage');
   assert.deepEqual(new Set(stops.map(s=>s.id)),new Set(model.stops.map(s=>s.id)));
   assert.equal(new Set(stops.map(s=>s.id)).size,model.stops.length);
   assert.equal(stops.reduce((n,s)=>n+s.nodes.length,0),model.nodes.length);
   assert.ok(groups.every(g=>g.stops.length>0&&g.skills>0));
 }
});
test('AP CSP groups by all five real Big Ideas; Robotics keeps its small existing map',()=>{
 const csp=groupCourseStops(buildMapModel({graph,courseId:'csp',guest:true}));
 assert.equal(csp.length,5);
 assert.deepEqual(csp.map(g=>g.label.split(' · ')[0]),['Big Idea 1','Big Idea 2','Big Idea 3','Big Idea 4','Big Idea 5']);
 assert.deepEqual(groupCourseStops(buildMapModel({graph,courseId:'robotics',guest:true})),[]);
});
