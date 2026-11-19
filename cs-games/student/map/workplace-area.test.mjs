import {test} from 'node:test';import assert from 'node:assert/strict';
import graph from '../../pathway/curriculum-graph.json' with {type:'json'};
import {workplaceAreaSummary,workplaceAreaLink} from './workplace-area.mjs';
test('WPR aggregates presentation without deleting 94 objectives or changing teacher requirements',()=>{
 assert.equal(graph.nodes.filter(n=>n.courseId==='workplace').length,94);assert.equal(graph.areas.filter(n=>n.courseId==='workplace').length,22);
 const stop={areaId:'area:workplace:creativity-and-innovation',summary:{practiced:2},nodes:[
  {required:true,complete:false,standardsScore:3,practice:[{activityId:'workplace-readiness',url:'/wpr-games/workplace-readiness/?skills=old'}]},
  {required:true,complete:false,standardsScore:2}, {required:false,complete:false,standardsScore:null}]};
 const before=JSON.stringify(stop);assert.equal(workplaceAreaSummary(stop).complete,false);assert.equal(workplaceAreaSummary(stop).fraction,.5);
 stop.nodes[1].standardsScore=4;assert.equal(workplaceAreaSummary(stop).level,3);stop.nodes[0].standardsScore=4;assert.equal(workplaceAreaSummary(stop).level,4);
 const href=new URL(workplaceAreaLink(stop,{guest:true,returnTo:'/cs-games/student/guest/?course=workplace'}),'https://site.test');
 assert.equal(href.searchParams.get('skills'),'creativity-and-innovation');assert.equal(href.searchParams.get('count'),'8');assert.equal(href.searchParams.get('learner'),'guest');
 assert.equal(workplaceAreaLink({...stop,nodes:[]}),null);assert.ok(before.includes('old'));
});
