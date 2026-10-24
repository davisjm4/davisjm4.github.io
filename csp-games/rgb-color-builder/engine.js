// Pure numerical/generator layer: no DOM, storage, dependencies, or network.
export const WEIGHTS = Object.freeze([128,64,32,16,8,4,2,1]);
export const DIGITS = '0123456789ABCDEF';
export const TOLERANCE = 6; // Inclusive CIEDE2000 ΔE00; classroom approximation, not a JND claim.
export const MIN_SEPARATION = 18;
export const FAMILIES = ['red','green','blue','secondary','mixed','grayscale','bright','dark'];
export function channel(n) { if (!Number.isInteger(n) || n<0 || n>255) throw new RangeError('Channel must be an integer from 0 to 255'); return n; }
export const binary = n => channel(n).toString(2).padStart(8,'0');
export const hexByte = n => channel(n).toString(16).padStart(2,'0').toUpperCase();
export function fromBinary(s) { if (!/^[01]{8}$/.test(s)) throw new TypeError('Expected eight bits'); return parseInt(s,2); }
export function fromHex(s) { if (!/^[0-9a-f]{2}$/i.test(s)) throw new TypeError('Expected two hex digits'); return parseInt(s,16); }
export function validRGB(rgb) { if (!Array.isArray(rgb)||rgb.length!==3) throw new TypeError('Expected RGB triple'); return rgb.map(channel); }
export const hex = rgb => '#'+validRGB(rgb).map(hexByte).join('');
export const css = rgb => `rgb(${validRGB(rgb).join(', ')})`;
export function toggle(rgb,c,i) { validRGB(rgb); if (!Number.isInteger(c)||c<0||c>2||!Number.isInteger(i)||i<0||i>7) throw new RangeError('Invalid bit'); return rgb.map((n,k)=>k===c ? n^WEIGHTS[i] : n); }
export function editHex(rgb,c,i,d) { validRGB(rgb); if (!Number.isInteger(c)||c<0||c>2||![0,1].includes(i)||!new RegExp('^[0-9A-F]$','i').test(d)) throw new TypeError('Invalid hexadecimal digit'); const s=hexByte(rgb[c]).split(''); s[i]=d; return rgb.map((n,k)=>k===c?fromHex(s.join('')):n); }
export function linearSRGB(n) { const v=channel(n)/255; return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4; }
export function lab(rgb) {
  const [r,g,b]=validRGB(rgb).map(linearSRGB);
  const f=t=>t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;
  // sRGB D65 matrix and D65 reference white. No D50 chromatic adaptation.
  const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047);
  const y=f(.2126729*r+.7151522*g+.072175*b);
  const z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
export function deltaE00([L1,a1,b1],[L2,a2,b2]) {
  const c1=Math.hypot(a1,b1),c2=Math.hypot(a2,b2), cm=(c1+c2)/2;
  const G=.5*(1-Math.sqrt(cm**7/(cm**7+25**7)));
  const A1=(1+G)*a1,A2=(1+G)*a2,C1=Math.hypot(A1,b1),C2=Math.hypot(A2,b2);
  const hue=(a,b)=>a===0&&b===0?0:(deg(Math.atan2(b,a))+360)%360;
  const h1=hue(A1,b1),h2=hue(A2,b2),dL=L2-L1,dC=C2-C1;
  let dh=h2-h1;
  if(C1*C2===0) dh=0; else if(dh>180) dh-=360; else if(dh< -180) dh+=360;
  const dH=2*Math.sqrt(C1*C2)*Math.sin(rad(dh/2)),Lm=(L1+L2)/2,Cm=(C1+C2)/2;
  let Hm;
  if(C1*C2===0) Hm=h1+h2;
  else if(Math.abs(h1-h2)<=180) Hm=(h1+h2)/2;
  else Hm=(h1+h2+(h1+h2<360?360:-360))/2;
  const T=1-.17*Math.cos(rad(Hm-30))+.24*Math.cos(rad(2*Hm))+.32*Math.cos(rad(3*Hm+6))-.20*Math.cos(rad(4*Hm-63));
  const Sl=1+.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),Sc=1+.045*Cm,Sh=1+.015*Cm*T;
  const Rt=-2*Math.sqrt(Cm**7/(Cm**7+25**7))*Math.sin(rad(60*Math.exp(-(((Hm-275)/25)**2))));
  const l=dL/Sl,c=dC/Sc,h=dH/Sh;
  return Math.sqrt(Math.max(0,l*l+c*c+h*h+Rt*c*h));
}
export const distance=(a,b)=>deltaE00(lab(a),lab(b));
export const acceptsDistance=d=>Number.isFinite(d)&&d>=0&&d<=TOLERANCE;
export const matches=(a,b)=>acceptsDistance(distance(a,b));
export function family(rgb) {
  const sorted=[...rgb].sort((a,b)=>b-a),[hi,mid,lo]=sorted;
  if(hi===lo) return 'grayscale';
  if(hi<=85) return 'dark';
  if(lo>=170) return 'bright';
  if(hi-mid>=68) return ['red','green','blue'][rgb.indexOf(hi)];
  if(mid>=170&&lo<=102) return 'secondary';
  return 'mixed';
}
let cachedPools;
export function pools() {
  if(cachedPools) return cachedPools;
  const bank=Object.fromEntries(FAMILIES.map(f=>[f,[]]));
  for(let r=0;r<=255;r+=17) for(let g=0;g<=255;g+=17) for(let b=0;b<=255;b+=17) {
    const rgb=[r,g,b]; bank[family(rgb)].push(Object.freeze(rgb));
  }
  cachedPools=Object.freeze(Object.fromEntries(Object.entries(bank).map(([k,v])=>[k,Object.freeze(v)]))); return cachedPools;
}
export function random(seed=1) { let s=Number(seed)>>>0; return ()=>{s=(s+0x6D2B79F5)>>>0; let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function createGenerator({seed=Date.now(),history=[],bank=pools()}={}) {
  const rng=random(seed),recent=history.slice(-50).map(x=>({rgb:[...x.rgb],family:x.family,mode:x.mode}));
  const counts=Object.fromEntries(FAMILIES.map(f=>[f,0]));
  for(const q of recent) if(q.family in counts) counts[q.family]++;
  const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function next(requested='mixed') {
    if(!['mixed','binary','hex'].includes(requested)) throw new TypeError('Unknown mode');
    const excluded=new Set(recent.map(x=>hex(x.rgb))),last=recent.at(-1);
    const order=shuffle(FAMILIES).sort((a,b)=>counts[a]-counts[b]);
    let chosen, fallback=false;
    for(const f of order) {
      if(f===last?.family) continue;
      const choices=bank[f]?.filter(rgb=>!excluded.has(hex(rgb))&&(!last||distance(rgb,last.rgb)>=MIN_SEPARATION))||[];
      if(choices.length) {chosen={family:f,rgb:choices[Math.floor(rng()*choices.length)]};break;}
    }
    // Finite full-pool fallback preserves exact history; constrained custom banks may
    // relax perceptual/category spacing but never silently repeat a recent target.
    if(!chosen) {
      const choices=Object.entries(bank).flatMap(([f,rs])=>rs.filter(rgb=>!excluded.has(hex(rgb))).map(rgb=>({family:f,rgb})));
      if(!choices.length) throw new RangeError('No unseen target remains in the candidate pool');
      chosen=choices.reduce((best,q)=>!last||distance(q.rgb,last.rgb)>distance(best.rgb,last.rgb)?q:best,choices[0]);fallback=true;
    }
    let mode=requested;
    if(mode==='mixed') {
      const modes=recent.slice(-10).map(x=>x.mode),b=modes.filter(x=>x==='binary').length;
      mode=b<modes.length-b?'binary':b>modes.length-b?'hex':rng()<.5?'binary':'hex';
      if(recent.length>=2&&last.mode===recent.at(-2).mode) mode=last.mode==='binary'?'hex':'binary';
    }
    const q={rgb:[...chosen.rgb],family:chosen.family,mode,selection:requested,distanceFromPrevious:last?distance(chosen.rgb,last.rgb):null,fallback};
    counts[q.family]++;recent.push(q);if(recent.length>50) recent.shift();return q;
  }
  return {next,history:()=>recent.map(q=>({...q,rgb:[...q.rgb]}))};
}
export const SKILLS=['binary-representation','hexadecimal-representation','rgb-color-representation','data-representation'];
export function hint(rgb) {
  validRGB(rgb);
  if(rgb.every(v=>v===rgb[0])) return 'For a shade of gray, keep all three channels equal. Raise them together for a lighter gray; lower them together for a darker gray.';
  const max=Math.max(...rgb),names=['red','green','blue'],dominant=rgb.map((v,i)=>v>=max-34?names[i]:null).filter(Boolean);
  return `Look for ${dominant.join(' and ')} light in the target. Experiment with those channels first, then use the other channels to change the mixture. A larger place value makes a bigger change.`;
}
export function explanation(target,student) {
  const directions=target.map((v,i)=>`${['Red','Green','Blue'][i]}: ${student[i]===v?'exact':student[i]<v?'increase to add more light':'decrease to reduce light'} (${student[i]} → ${v})`).join('. ')+'.';
  return directions+' Eight bits represent 0–255. Two hex digits encode the same channel: FF = 255, and each hex digit represents four bits.'+(target.every(v=>v===target[0])?' Equal RGB values produce grayscale.':'');
}
