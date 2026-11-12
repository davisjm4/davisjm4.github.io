import assert from 'node:assert/strict';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type:'json'};
import {createPathway,studentContract} from '../model.mjs';
import {buildMapModel} from '../../student/map/model.mjs';
import {inputFromStudentContract} from '../../student/map/live-contract.mjs';
import {practiceLinks} from '../../student/practice-links.mjs';

const make=courseId=>createPathway(graph,{classId:'map-test',courseId,title:'Map test'});
const model=view=>buildMapModel(inputFromStudentContract(view));

test('every course follows its published sequence without dates or requirements',()=>{
  for(const course of graph.courses){
    const pathway=make(course.id);
    const view=studentContract(pathway,graph);
    const map=model(view);
    assert.deepEqual(map.nodes.map(node=>node.id),pathway.sequence);
    assert.equal(map.mode,'practice');
    assert.equal(map.pacing.showDates,false);
    assert.ok(map.nodes.every(node=>node.target===null&&node.practice.length>0));
    assert.equal(map.totals.withRequirements,0);
  }
});

test('AP CSP continuation stops retain the same identity and published order',()=>{
  const pathway=make('csp');
  const map=model(studentContract(pathway,graph));
  const repeated=map.stops.filter(stop=>stop.parts>1);
  assert.ok(repeated.length>0);
  for(const stop of repeated.filter(stop=>stop.part>1)){
    const start=repeated.find(prior=>prior.areaId===stop.areaId&&prior.part===1);
    assert.ok(start.index<stop.index);
    assert.equal(start.baseTitle,stop.baseTitle);
    assert.deepEqual(start.identity,stop.identity);
    assert.match(stop.title,/continued/);
  }
});

test('practice advances the suggestion and reordering leaves evidence on the stable skill ID',()=>{
  const pathway=make('advanced');
  const [first,second]=pathway.sequence;
  const practice=new Map([[first,{attempted:2,correct:1}]]);
  const view=studentContract(pathway,graph,[],{practice});
  assert.equal(model(view).suggestedNext.nodeId,second);
  pathway.sequence=[second,first,...pathway.sequence.slice(2)];
  const moved=model(studentContract(pathway,graph,[],{practice}));
  assert.equal(moved.nodes[0].id,second);
  assert.equal(moved.nodeIndex[first].progress.attempt.correct,1);
  assert.equal(moved.nodeIndex[first].progress.attempt.attempted,2);
  assert.equal(moved.nodeIndex[first].verifiedAward,false);
});

test('map exposes only published target dates and keeps teacher assessment separate',()=>{
  const pathway=make('advanced');
  const first=pathway.checkpoints[0];
  const date='2027-03-04';
  first.targetDate=date;
  const evidence=[{id:'synthetic-teacher-score',kind:'assessment',nodeIds:[first.nodeId],score:3,
    eligible:true,timestamp:'2026-11-11T12:00:00Z'}];
  const map=()=>model(studentContract(pathway,graph,evidence,{today:'2027-03-01'}));
  pathway.calendar={timeZone:'America/Los_Angeles'};
  pathway.pacingVisibility='private';
  assert.equal(map().nodeIndex[first.nodeId].target,null);
  pathway.pacingVisibility='shared';
  const skill=map().nodeIndex[first.nodeId];
  assert.equal(skill.target.date,date);
  assert.equal(skill.standardsScore,3);
  assert.equal(skill.verifiedAward,false);
  assert.equal(skill.requirementsConfigured,false);
});

test('shared links honor published activities and reject unsupported URL schemes',()=>{
  const node=graph.nodes.find(node=>node.id==='node:advanced:loop-lab:looptype');
  assert.equal(practiceLinks(node).links[0].url,'/java-games/loop-lab/?mode=looptype');
  assert.equal(practiceLinks(node).mixed.url,'/java-games/loop-lab/?mode=mixed');
  const search=graph.nodes.find(node=>node.id==='node:advanced:search-sort-lab:binary');
  assert.equal(practiceLinks(search).mixed,null);
  assert.equal(practiceLinks(search).links[0].url,'/java-games/search-sort-lab/?mode=binary');
  assert.deepEqual(practiceLinks({...node,checkpoint:{practice:[{activityId:'loop-lab',url:'data:text/html,abc'}]}}),{links:[],mixed:null});
});
