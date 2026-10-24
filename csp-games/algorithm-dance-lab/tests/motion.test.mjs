import assert from 'node:assert/strict';import {neutral,motionClip,poseAt,JOINTS} from '../motion.js';import {Player} from '../player.js';
let count=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);count++;},ok=(x,m)=>{assert.ok(x,m);count++;};
const base=neutral(),results=[];
for(const part of ['FOOT','HAND','KNEE','ELBOW','HIP','SHOULDER','HEAD'])for(const side of part==='HEAD'?['CENTER']:['RIGHT','LEFT']){
 const inClip=motionClip({op:'moveIn',part,side},base);ok(JSON.stringify(inClip.end)!==JSON.stringify(base),`${part} ${side} visibly moves`);results.push(JSON.stringify(inClip.end));
 const other=side==='RIGHT'?'LEFT':'RIGHT';if(side!=='CENTER')for(const k of JOINTS.filter(x=>x.endsWith(other)))eq(inClip.end.joints[k],base.joints[k],`${part} does not move opposite limb`);
 const out=motionClip({op:'moveOut',part,side},inClip.end);eq(out.end,base,`${part} returns to neutral`);
 const shake=motionClip({op:'shake',part,side},inClip.end);ok(JSON.stringify(poseAt(shake,.25))!==JSON.stringify(inClip.end),'shake changes pose');eq(shake.end,inClip.end,'shake preserves prior resting state');
 for(const clip of [inClip,out,shake])for(const t of [0,.1,.25,.5,.75,1]){const pose=poseAt(clip,t);ok(Object.values(pose.joints).flat().every(Number.isFinite));}
}
eq(new Set(results).size,results.length,'every part/side has a distinct target pose');eq(base,neutral(),'clip construction does not mutate input');
for(const op of ['clap','bow','nod','jump']){const c=motionClip({op},base);ok(JSON.stringify(poseAt(c,.4))!==JSON.stringify(base));eq(c.end,base);}
const turn=motionClip({op:'turnAround'},base);eq(turn.end.yaw,Math.PI*2);ok(poseAt(turn,.5).yaw>3);const reduced=motionClip({op:'turnAround'},base,true);eq(poseAt(reduced,.25).yaw,0);eq(poseAt(reduced,.75).yaw,Math.PI*2);
const commands=[],poses=[];const player=new Player({onPose:p=>poses.push(structuredClone(p)),onCommand:(c,i)=>{if(c)commands.push([c.op,i]);}});player.load([{op:'moveIn',part:'FOOT',side:'RIGHT',id:'a'},{op:'moveOut',part:'FOOT',side:'RIGHT',id:'b'},{op:'turnAround',id:'c'}]);
player.step();for(let i=0;i<20;i++)player.advance(100);eq(player.status,'paused');eq(player.index,1);eq(commands,[['moveIn',0]]);const pause=structuredClone(player.pose);player.advance(100);eq(player.pose,pause);
player.run();player.advance(100);player.pause();const mid=structuredClone(player.pose);for(let i=0;i<20;i++)player.advance(100);eq(player.pose,mid);player.run();for(let i=0;i<100;i++)player.advance(100);eq(player.status,'complete');eq(commands.slice(-2),[['moveOut',1],['turnAround',2]]);
const final=structuredClone(player.pose);player.reset();eq(player.pose,base);eq(player.index,0);player.run();for(let i=0;i<100;i++)player.advance(100);eq(player.pose,final,'replay exactly reproduces pose');
for(let n=0;n<100;n++){player.reset();player.run();player.advance(100);player.reset();eq(player.pose,base,'rapid run/reset cannot accumulate transforms');eq(player.clip,null);}
player.speed=4;player.load([{op:'clap'}]);player.run();for(let i=0;i<3;i++)player.advance(100);eq(player.status,'complete');
player.load([]);player.run();eq(player.status,'ready');
console.log(`Joint motion / playback: ${count} assertions passed.`);
