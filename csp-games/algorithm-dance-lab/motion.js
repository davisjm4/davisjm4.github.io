/* Absolute articulated poses shared by GPU, software 3D, and diagram rendering. */
export const JOINTS=['torso','head',...['RIGHT','LEFT'].flatMap(s=>['shoulder','elbow','hand','hip','knee','foot'].map(p=>`${p}_${s}`))];
export const neutral=()=>({x:0,y:0,z:0,yaw:0,joints:Object.fromEntries(JOINTS.map(k=>[k,[0,0,0]]))});
export const clone=p=>structuredClone(p);
export function blend(a,b,t){const p=neutral(),u=Math.max(0,Math.min(1,t));for(const k of ['x','y','z','yaw'])p[k]=(a[k]||0)+((b[k]||0)-(a[k]||0))*u;for(const k of JOINTS)p.joints[k]=a.joints[k].map((v,i)=>v+(b.joints[k][i]-v)*u);return p;}
const axis=(p,name,x=0,y=0,z=0)=>{p.joints[name]=[x||0,y||0,z||0];};
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),norm=v=>Math.hypot(...v),unit=v=>mul(v,1/(norm(v)||1));
function quatToEuler([x,y,z,w]){const xx=x*x,yy=y*y,zz=z*z;return [Math.atan2(2*(x*w-y*z),1-2*(xx+yy)),Math.asin(Math.max(-1,Math.min(1,2*(x*z+y*w)))),Math.atan2(2*(z*w-x*y),1-2*(yy+zz))];}
function fromDown(v){const q=[-v[2],0,v[0],1-v[1]],l=Math.hypot(...q);return l<1e-8?[1,0,0,0]:q.map(x=>x/l);}
function rotate(v,q){const [x,y,z,w]=q,[a,b,c]=v,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];}
function torsoInverse(v,angles){let [x,y,z]=v;const [a,b,c]=angles;[y,z]=[y*Math.cos(a)+z*Math.sin(a),-y*Math.sin(a)+z*Math.cos(a)];[x,z]=[x*Math.cos(b)-z*Math.sin(b),x*Math.sin(b)+z*Math.cos(b)];return [x*Math.cos(c)+y*Math.sin(c),-x*Math.sin(c)+y*Math.cos(c),z];}
// Two-bone analytic arm IK. Target is expressed relative to the robot's local origin.
export function reach(p,side,target){const k=side==='RIGHT'?-1:1;const local=torsoInverse([target[0],target[1]-p.y-1.35,target[2]],p.joints.torso);const v=sub(local,[k*.6,.97,0]),raw=norm(v),d=Math.max(.02,Math.min(1.109,raw)),dir=unit(v),L1=.55,L2=.56;
 const a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a));let bend=sub([0,0,1],mul(dir,dir[2]));if(norm(bend)<.01)bend=sub([1,0,0],mul(dir,dir[0]));const elbow=add(mul(dir,a),mul(unit(bend),h)),goal=mul(dir,d),upper=unit(elbow),fore=unit(sub(goal,elbow)),q=fromDown(upper),inverse=[-q[0],-q[1],-q[2],q[3]];
 p.joints[`shoulder_${side}`]=quatToEuler(q);p.joints[`elbow_${side}`]=quatToEuler(fromDown(rotate(fore,inverse)));axis(p,`hand_${side}`);return raw;
}
function limbPose(p,c,inward){const s=c.side,k=s==='RIGHT'?-1:1,a=inward?1:0;switch(c.part){
 case 'FOOT':axis(p,`hip_${s}`,-.48*a);axis(p,`knee_${s}`,.25*a);axis(p,`foot_${s}`,-.35*a);break;
 case 'KNEE':axis(p,`hip_${s}`,-a);axis(p,`knee_${s}`,1.45*a);break;
 case 'HAND':axis(p,`shoulder_${s}`,-.9*a,0,k*.18*a);axis(p,`elbow_${s}`,-.45*a);axis(p,`hand_${s}`,0,k*.55*a);break;
 case 'ELBOW':axis(p,`shoulder_${s}`,-.1*a,0,k*.8*a);axis(p,`elbow_${s}`,-1.7*a);break;
 case 'HIP':axis(p,`hip_${s}`,0,0,k*.32*a);axis(p,'torso',0,0,k*.18*a);break;
 case 'SHOULDER':axis(p,`shoulder_${s}`,0,0,k*1.1*a);break;case 'HEAD':axis(p,'head',.48*a);break;
 }}
export function motionClip(command,start=neutral(),reduced=false){let end=clone(start);const frames=[{t:0,pose:clone(start)}],addFrame=(t,p)=>frames.push({t,pose:clone(p)}),c=command;
 const home=()=>{const p=neutral();for(const k of ['x','y','z','yaw'])p[k]=start[k]||0;return p;};
 const translate=(p,side,d)=>{const k=side==='LEFT'?1:-1;p.x+=k*d*Math.cos(start.yaw);p.z-=k*d*Math.sin(start.yaw);};
 if(c.op==='moveIn'||c.op==='moveOut'){limbPose(end,c,c.op==='moveIn');addFrame(1,end);}
 else if(c.op==='shake'){const joint=c.part==='HEAD'?'head':`${c.part.toLowerCase()}_${c.side}`;for(let i=1;i<=6;i++){const p=clone(start);p.joints[joint][c.part==='HEAD'?1:2]+=(i%2?1:-1)*.42;addFrame(i/7,p);}addFrame(1,end);}
 else if(c.op==='turnAround'||c.op==='turn'){end=home();end.yaw=start.yaw+(c.op==='turnAround'?Math.PI*2:(c.side==='LEFT'?1:-1)*(c.quarterTurns||1)*Math.PI/2);addFrame(1,end);}
 else if(c.op==='touch'){const pose=home();if(c.part==='KNEES'){pose.y-=.2;axis(pose,'torso',1.4);for(const s of ['RIGHT','LEFT']){axis(pose,`hip_${s}`,-.6);axis(pose,`knee_${s}`,1.2);axis(pose,`foot_${s}`,-.6);}}if(c.part==='TOES'){pose.y-=.465;axis(pose,'torso',1.6);for(const s of ['RIGHT','LEFT']){axis(pose,`hip_${s}`,-1.3);axis(pose,`knee_${s}`,1.6);axis(pose,`foot_${s}`,-.3);}}
  for(const side of ['RIGHT','LEFT']){const k=side==='RIGHT'?-1:1,target=c.part==='HEAD'?[k*.16,2.78+(start.y||0),.25]:c.part==='SHOULDERS'?[-k*.42,2.25+(start.y||0),.23]:c.part==='KNEES'?[k*.24,.605+(start.y||0),.48]:[k*.24,.09+(start.y||0),.54];reach(pose,side,target);}addFrame(.42,pose);addFrame(.65,pose);addFrame(1,end);}
 else if(c.op==='clap'){const p=home();for(const s of ['RIGHT','LEFT'])reach(p,s,[s==='RIGHT'?-.065:.065,2+(start.y||0),.8]);addFrame(.45,p);addFrame(.6,p);addFrame(1,end);}
 else if(c.op==='stomp'){const p=clone(start);axis(p,`hip_${c.side}`,-.8);axis(p,`knee_${c.side}`,1.1);axis(p,`foot_${c.side}`,-.3);addFrame(.35,p);const hit=home();axis(hit,`knee_${c.side}`,.12);hit.y-=.025;addFrame(.65,hit);end=home();addFrame(1,end);}
 else if(c.op==='slide'){end=home();translate(end,c.side,.75);const mid=blend(start,end,.5);axis(mid,`hip_${c.side}`,0,0,c.side==='LEFT'?.27:-.27);axis(mid,'torso',0,0,c.side==='LEFT'?.08:-.08);addFrame(.5,mid);addFrame(1,end);}
 else if(c.op==='crissCross'){const p=home();p.y+=.12;axis(p,'hip_RIGHT',0,0,.4);axis(p,'hip_LEFT',0,0,-.4);axis(p,'knee_RIGHT',.18);axis(p,'knee_LEFT',.18);axis(p,'shoulder_LEFT',0,0,.6);axis(p,'shoulder_RIGHT',0,0,-.6);addFrame(.4,p);const open=home();open.y+=.1;axis(open,'hip_RIGHT',0,0,-.2);axis(open,'hip_LEFT',0,0,.2);addFrame(.75,open);end=home();addFrame(1,end);}
 else if(c.op==='chaCha'){end=home();translate(end,c.side,.5);for(let i=1;i<=3;i++){const p=blend(start,end,i/4);const s=i%2?c.side:c.side==='LEFT'?'RIGHT':'LEFT';p.y+=.035;axis(p,`hip_${s}`,-.18,0,s==='LEFT'?.12:-.12);axis(p,`knee_${s}`,.25);axis(p,'torso',0,0,(i%2?1:-1)*.09);addFrame(i/4,p);}addFrame(1,end);}
 else if(c.op==='charlieBrown'){for(let i=1;i<=3;i++){const p=home();p.z+=(i%2?1:-1)*.25*Math.cos(start.yaw);p.x+=(i%2?1:-1)*.25*Math.sin(start.yaw);const s=i%2?'RIGHT':'LEFT';axis(p,`hip_${s}`,-.8);axis(p,`knee_${s}`,1.05);axis(p,'torso',i%2?.14:-.12);axis(p,'shoulder_RIGHT',-.3);axis(p,'shoulder_LEFT',.3);addFrame(i/4,p);}end=home();addFrame(1,end);}
 else if(c.op==='bow'){axis(end,'torso',.7);addFrame(.5,end);end=clone(start);addFrame(1,end);}
 else if(c.op==='nod'){axis(end,'head',.5);addFrame(.4,end);axis(end,'head',-.15);addFrame(.75,end);end=clone(start);addFrame(1,end);}
 else if(c.op==='jump'||c.op==='hop'){end.y+=.4;for(const s of ['LEFT','RIGHT'])axis(end,`knee_${s}`,.3);addFrame(.5,end);end=clone(start);addFrame(1,end);}
 else addFrame(1,end);
 return {command,frames,end:clone(end),reduced,duration:c.op==='turnAround'?1400:c.op==='shake'?1100:850};
}
export function poseAt(clip,t){const u=Math.max(0,Math.min(1,t));if(clip.reduced)return clone(u<.5?clip.frames[Math.floor((clip.frames.length-1)/2)].pose:clip.end);let i=1;while(i<clip.frames.length-1&&clip.frames[i].t<u)i++;const a=clip.frames[i-1],b=clip.frames[i],v=(u-a.t)/(b.t-a.t);return blend(a.pose,b.pose,v*v*(3-2*v));}
