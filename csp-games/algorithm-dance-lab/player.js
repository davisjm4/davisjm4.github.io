import {neutral,motionClip,poseAt,clone} from './motion.js?v=beats-v2';
import {DEFAULT_BEATS} from './engine.js?v=beats-v2';
// Beat transport: a rendered frame samples an absolute point, never advances the clock.
export class Player{
 constructor({onPose=()=>{},onCommand=()=>{},onState=()=>{},clock=()=>performance.now()}={}){Object.assign(this,{onPose,onCommand,onState,clock});this.bpm=120;this.speed=1;this.reduced=false;this.trace=[];this.load([]);}
 notify(){this.onState(this);}
 load(result){this.result=Array.isArray(result)?{trace:result,totalBeats:0,tracks:[{name:'Dance',trace:result}]}:result;this.trace=this.result.trace;this.trackClips=[];
  for(const t of this.result.tracks||[{name:'Dance',trace:this.trace}]){let beat=0,pose=neutral();const clips=t.trace.map(c=>{const start=c.beat??beat,duration=c.beats??DEFAULT_BEATS[c.op]??1,clip=motionClip(c,pose,this.reduced);beat=start+duration;pose=clone(clip.end);return {command:c,start,end:beat,clip};});this.trackClips.push({name:t.name,clips,beats:beat});}
  this.totalBeats=Math.max(0,...this.trackClips.map(t=>t.beats),this.result.totalBeats||0);this.reset();
 }
 reset(){this.beat=0;this.index=0;this.clip=null;this.elapsed=0;this.pose=neutral();this.status='ready';this.lastCommand=null;this.onPose(this.pose);this.onCommand(null,-1,this.trace.length);this.notify();}
 setBpm(bpm){if(!Number.isInteger(bpm)||bpm<40||bpm>200)throw Error('Tempo must be a whole number from 40 to 200 BPM.');if(this.status==='running')this.pause();this.bpm=bpm;this.notify();}
 run(){if(!this.totalBeats)return;if(this.status==='complete')this.reset();this.anchorBeat=this.beat;this.anchorTime=this.clock();this.status='running';this.sample(this.beat);this.notify();}
 pause(){if(this.status==='running')this.update();if(['running','stepping'].includes(this.status))this.status='paused';this.notify();}
 seek(beat){this.beat=Math.max(0,Math.min(this.totalBeats,beat));this.sample(this.beat);this.notify();}
 step(){if(!this.totalBeats)return;if(this.status==='complete')this.reset();const all=this.trackClips.flatMap(t=>t.clips).sort((a,b)=>a.end-b.end);const next=all.find(c=>c.end>this.beat+1e-8);this.status='paused';if(next){this.beat=next.end;this.sample(this.beat,false);this.index=(this.trackClips[0]?.clips.filter(c=>c.end<=this.beat+1e-9).length)||0;this.lastCommand=next;this.clip=null;this.onCommand(next.command,this.trace.indexOf(next.command),this.trace.length);}if(this.beat>=this.totalBeats)this.status='complete';this.notify();}
 update(now=this.clock()){if(this.status!=='running')return;this.seekRunning(this.anchorBeat+Math.max(0,now-this.anchorTime)*this.bpm*this.speed/60000);}
 advance(ms){if(this.status!=='running'&&this.status!=='stepping')return;this.seekRunning(this.beat+Math.max(0,ms)*this.bpm*this.speed/60000);this.anchorBeat=this.beat;this.anchorTime=this.clock();}
 seekRunning(beat){this.beat=Math.min(this.totalBeats,beat);this.sample(this.beat);if(this.beat>=this.totalBeats-1e-9){this.status='complete';this.clip=null;this.notify();}}
 sample(beat,notifyCommand=true){const dance=this.trackClips[0],entry=dance?.clips.find(c=>beat<c.end-1e-9&&beat>=c.start)||dance?.clips.at(-1);this.index=entry?dance.clips.indexOf(entry):0;this.clip=entry?.clip||null;this.elapsed=entry?(beat-entry.start)*60000/this.bpm:0;
  if(entry){entry.clip.reduced=this.reduced;this.pose=beat>=entry.end?clone(entry.clip.end):poseAt(entry.clip,(beat-entry.start)/(entry.end-entry.start));this.onPose(this.pose);}
  const audible=this.trackClips.slice(1).flatMap(t=>t.clips).find(c=>beat>=c.start&&beat<c.end);const active=entry&&beat<entry.end?entry:audible||entry;
  if(notifyCommand&&active&&this.lastCommand!==active){this.lastCommand=active;this.onCommand(active.command,this.index,this.trace.length);}
 }
}
