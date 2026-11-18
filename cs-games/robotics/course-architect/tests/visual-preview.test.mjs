import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,geometry,poseAt} from '../core.mjs';
import {previewFrames,previewFailures} from '../visual-test.mjs';

test('deterministic preview follows independent geometry and preserves every endpoint',()=>{
 for(const name of ['rectangle','tight','mixed']){
  const design=preset(name),frames=previewFrames(design),path=geometry(design);
  assert.ok(frames.length>path.segments.length);
  assert.ok(frames.length<650);
  const first=frames[0],last=frames.at(-1);
  assert.equal(first.segment,1);
  assert.equal(last.segment,path.segments.length);
  assert.equal(last.end,true);
  for(const key of ['x','y','h']){
    assert.ok(Math.abs(first.pose[key]-path.start[key])<1e-8,key+' start');
    assert.ok(Math.abs(last.pose[key]-path.end[key])<1e-8,key+' finish');
  }
  for(const segment of path.segments){
   const steps=frames.filter(f=>f.segment===segment.index+1);
   assert.ok(steps.length>0);
   assert.ok(Math.abs(steps.at(-1).pose.x-poseAt(segment,1).x)<1e-7);
   assert.equal(steps.at(-1).end,true);
  }
  assert.deepEqual(previewFrames(design),frames,'pure deterministic route');
 }
});
test('preview reports failures only from the established geometric oracle',()=>{
 const narrow=preset('tight'),{result,groups}=previewFailures(narrow);
 assert.ok(result.failures>0);
 assert.ok(groups.has(1));
 assert.ok(groups.get(1).some(x=>x.includes('width')));
 for(const [index,messages]of groups){
  assert.ok(Number.isInteger(index)&&index>=1&&index<=narrow.segments.length);
  assert.ok(messages.every(msg=>result.checks.some(c=>c.segment===index&&c.status==='Fail'&&c.message===msg)));
 }
});
test('unbuilt course cannot be animated',()=>{
 const design=preset();design.segments=[];
 assert.throws(()=>previewFrames(design),/Add a course segment/);
});
