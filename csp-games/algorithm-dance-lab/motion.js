/* Absolute joint poses; no incremental transform drift. Also used by the SVG fallback. */
export const JOINTS=['torso','head',...['RIGHT','LEFT'].flatMap(s=>['shoulder','elbow','hand','hip','knee','foot'].map(p=>`${p}_${s}`))];
export const neutral=()=>({x:0,y:0,yaw:0,joints:Object.fromEntries(JOINTS.map(k=>[k,[0,0,0]]))});
export const clone=p=>JSON.parse(JSON.stringify(p));
export function blend(a,b,t){const p=neutral(),u=Math.max(0,Math.min(1,t));for(const k of ['x','y','yaw'])p[k]=a[k]+(b[k]-a[k])*u;for(const k of JOINTS)p.joints[k]=a.joints[k].map((v,i)=>v+(b.joints[k][i]-v)*u);return p;}
const axis=(p,name,x=0,y=0,z=0)=>{p.joints[name]=[x,y,z];};
function limbPose(p,c,inward){const s=c.side,k=s==='RIGHT'?-1:1,amount=inward?1:0;
 switch(c.part){
 case 'FOOT':axis(p,`hip_${s}`,-.48*amount);axis(p,`knee_${s}`,.25*amount);axis(p,`foot_${s}`,-.35*amount);break;
 case 'KNEE':axis(p,`hip_${s}`,-1.0*amount);axis(p,`knee_${s}`,1.45*amount);break;
 case 'HAND':axis(p,`shoulder_${s}`,-.9*amount,0,k*.18*amount);axis(p,`elbow_${s}`,-.45*amount);axis(p,`hand_${s}`,0,k*.55*amount);break;
 case 'ELBOW':axis(p,`shoulder_${s}`,-.1*amount,0,k*.8*amount);axis(p,`elbow_${s}`,-1.7*amount);break;
 case 'HIP':axis(p,`hip_${s}`,0,0,k*.32*amount);axis(p,'torso',0,0,k*.18*amount);break;
 case 'SHOULDER':axis(p,`shoulder_${s}`,0,0,k*1.1*amount);break;
 case 'HEAD':axis(p,'head',.48*amount,0,0);break;
 }
}
export function motionClip(command,start=neutral(),reduced=false){const end=clone(start),frames=[{t:0,pose:clone(start)}],add=(t,p)=>frames.push({t,pose:clone(p)}),c=command;
 if(c.op==='moveIn'||c.op==='moveOut'){limbPose(end,c,c.op==='moveIn');add(1,end);}
 else if(c.op==='shake'){const key=c.part==='HEAD'?'head':`${c.part.toLowerCase()}_${c.side}`,joint=c.part==='FOOT'?`foot_${c.side}`:key;
  for(let i=1;i<=6;i++){const p=clone(start);p.joints[joint][c.part==='HEAD'?1:2]+=(i%2?1:-1)*.42;add(i/7,p);}add(1,end);
 }else if(c.op==='turnAround'){const rest=neutral();rest.yaw=start.yaw+Math.PI*2;Object.assign(end,rest);add(1,end);}
 else if(c.op==='clap'){for(const s of ['RIGHT','LEFT']){const k=s==='RIGHT'?-1:1;axis(end,`shoulder_${s}`,-1.2,0,-k*.75);axis(end,`elbow_${s}`,-.65);axis(end,`hand_${s}`,0,-k*.4);}add(.5,end);Object.assign(end,clone(start));add(1,end);}
 else if(c.op==='bow'){axis(end,'torso',.7);add(.5,end);Object.assign(end,clone(start));add(1,end);}
 else if(c.op==='nod'){axis(end,'head',.5);add(.4,end);axis(end,'head',-.15);add(.75,end);Object.assign(end,clone(start));add(1,end);}
 else if(c.op==='jump'){end.y+=.4;for(const s of ['LEFT','RIGHT'])axis(end,`knee_${s}`,.3);add(.5,end);Object.assign(end,clone(start));add(1,end);}
 else add(1,end);
 // Reduced motion replaces continuous movement (including spins) with discrete key poses.
 return {command,frames,end:clone(end),reduced,duration:c.op==='turnAround'?1400:c.op==='shake'?1100:850};
}
export function poseAt(clip,t){const u=Math.max(0,Math.min(1,t));if(clip.reduced){return clone(u<.5?clip.frames[Math.floor((clip.frames.length-1)/2)].pose:clip.end);}
 let i=1;while(i<clip.frames.length-1&&clip.frames[i].t<u)i++;const a=clip.frames[i-1],b=clip.frames[i];const v=(u-a.t)/(b.t-a.t);return blend(a.pose,b.pose,v*v*(3-2*v));}
