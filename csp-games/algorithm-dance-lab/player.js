import {neutral,motionClip,poseAt,clone} from './motion.js';
export class Player{
 constructor({onPose=()=>{},onCommand=()=>{},onState=()=>{}}={}){this.onPose=onPose;this.onCommand=onCommand;this.onState=onState;this.speed=1;this.reduced=false;this.trace=[];this.reset();}
 notify(){this.onState(this);}
 load(trace){this.trace=trace;this.reset();}
 reset(){this.index=0;this.elapsed=0;this.clip=null;this.pose=neutral();this.status='ready';this.onPose(this.pose);this.onCommand(null,-1,this.trace.length);this.notify();}
 begin(){if(this.index>=this.trace.length){this.status='complete';this.notify();return false;}this.clip=motionClip(this.trace[this.index],this.pose,this.reduced);this.elapsed=0;this.onCommand(this.trace[this.index],this.index,this.trace.length);return true;}
 run(){if(!this.trace.length)return;if(this.status==='complete')this.reset();this.status='running';if(!this.clip)this.begin();this.notify();}
 pause(){if(['running','stepping'].includes(this.status)){this.status='paused';this.notify();}}
 step(){if(!this.trace.length)return;if(this.status==='complete')this.reset();this.status='stepping';if(!this.clip)this.begin();this.notify();}
 advance(ms){if(!['running','stepping'].includes(this.status)||!this.clip)return;
 this.elapsed+=Math.max(0,Math.min(100,ms))*this.speed;const t=Math.min(1,this.elapsed/this.clip.duration);this.pose=poseAt(this.clip,t);this.onPose(this.pose);
 if(t>=1){this.pose=clone(this.clip.end);this.onPose(this.pose);this.index++;this.clip=null;
  if(this.index>=this.trace.length)this.status='complete';else if(this.status==='stepping')this.status='paused';else this.begin();this.notify();
 }}
}
