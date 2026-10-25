import {FAMILIES,TOPICS} from './content.js?v=number-v3';
import {R,add,sub,mul,div,cmp,pow,text,integer,fixed,binaryFixed,significant,represent} from './math.js?v=number-v3';
export {FAMILIES,TOPICS};export const ANSWERS=['Overflow','Roundoff','Neither'];
export const SKILLS=['binary-representation','numerical-range','numerical-precision','overflow','roundoff'];
export function calculate(op,a,b){if(op==='store')return a;if(op==='add')return add(a,b);if(op==='subtract')return sub(a,b);if(op==='multiply')return mul(a,b);if(op==='divide')return div(a,b);throw Error('Unknown operation');}
function make(format,op,a,b=R(0),note=''){return {format,op,a,b,value:calculate(op,a,b),note};}
function integerCase(kind,j){const bits=[4,5,6,7,8,10][j],u=integer(bits),s=integer(bits,true),M=u.max.n,H=s.max.n,L=s.min.n,err=j<4,k=BigInt(j+1),I=n=>R(n);
 switch(kind){
 case 'uinc':return make(u,'add',I(err?M:M-1n),I(1));
 case 'uadd':return make(u,'add',I(M-2n),I(err?3n+k:2n));
 case 'umul':return make(u,'multiply',I(err?M/2n+1n:M/2n),I(2));
 case 'udouble':return make(u,'add',I(err?(M+1n)/2n:(M-1n)/2n),I(err?(M+1n)/2n:(M-1n)/2n));
 case 'upower':return make(u,'store',I(err?M+1n:M),I(0),err?'The value is the number of distinct bit patterns, 2 raised to the bit width.':'The value is one less than the number of distinct bit patterns.');
 case 'udec':return make(u,'subtract',I(err?0n:1n),I(1));
 case 'usub':return make(u,'subtract',I(k),I(err?k+1n:k));
 case 'uzero':return make(u,'multiply',I(M-k),I(0));
 case 'unarrow':return make(u,'store',I(err?M+k:M-k),I(0),'The source field has two additional bits; classify the destination write.');
 case 'uinclusive':return make(u,'add',I(err?M:M-1n),I(1),`There are indices from 0 through ${err?M:M-1n}, inclusive. The count is already calculated below.`);
 case 'sinc':return make(s,'add',I(err?H:H-1n),I(1));
 case 'sdec':return make(s,'subtract',I(err?L:L+1n),I(1));
 case 'snegadd':return make(s,'add',I(L+2n),I(err?-3n-k:-2n));
 case 'ssub':return make(s,'subtract',I(L+k),I(err?k+1n:k));
 case 'snegate':return make(s,'multiply',I(err?L:L+1n),I(-1));
 case 'sabs':return make(s,'multiply',I(err?L:L+2n),I(-1),'The negative input is multiplied by -1 to obtain its absolute value.');
 case 'smul':return make(s,'multiply',I(err?-(H+1n)/2n:-(H-1n)/2n),I(-2));
 case 'scancel':return make(s,'add',I(H-k),I(-H+k));
 case 'stransfer':return make(s,'store',I(err?H+1n:H),I(0),'The source unsigned field has the same bit width. Classify storage in the signed destination.');
 case 'snarrow':return make(s,'store',I(err?L-k:L+k),I(0),'The source has a wider signed field; classify the smaller destination.');
 default:throw Error('Unknown integer family');
 }
}
function precisionCase(kind,j){const err=j<4,p=1+j%3,k=j+2,F=fixed(p),unit=pow(10,-p),fine=pow(10,-p-1),val=add(R(k),mul(R(err?3:0),fine)),store=(format,value,note='')=>make(format,'store',value,R(0),note);
 switch(kind){
 case 'decimal':return store(F,val);
 case 'dsum':return make(F,'add',R(k),err?mul(R(3),fine):unit);
 case 'dproduct':return make(F,'multiply',err?add(R(1),fine):R(2),R(k));
 case 'ddivide':return make(F,'divide',R(err?2*k+1:k),err?R(8):R(2));
 case 'dnegative':return store(F,mul(R(-1),val));
 case 'dzeros':return store(F,err?val:R(k),`The source also writes this value with two trailing decimal zeros. Those zeros do not change its numerical value.`);
 case 'third':return make(F,'divide',R(err?3*k+1:3*k),R(3));
 case 'seventh':return make(F,'divide',R(err?k:7*k),R(7));
 case 'mean':return make(F,'divide',R(err?3*k+1:2*k),R(err?3:2),'The numerator is the total of the measurements; the divisor is their count.');
 case 'percent':return make(fixed(2),'divide',err?add(R(k),R(3,10)):R(k),R(100));
 case 'btenth':return store(binaryFixed(2+j%3),err?R(k,10):R(k,4));
 case 'bdyadic':return store(binaryFixed(2+j%3),R(2*j+1,2**(2+j%3+(err?1:0))));
 case 'bsum':{const bf=binaryFixed(2+j%3);return make(bf,'add',R(k),err?div(bf.step,R(2)):bf.step);}
 case 'bproduct':{const bf=binaryFixed(2+j%3);return make(bf,'multiply',bf.step,err?R(2*k+1,2):R(2));}
 case 'bthird':return make(binaryFixed(2+j%3),'divide',R(err?3*k+1:3*k),R(3));
 case 'flarge':return store(significant(10,3),R(err?1234+k:1200+100*j));
 case 'fsmall':return store(significant(10,3),R(err?1234+k:1250,100000+j%2*100000));
 case 'fadd':return make(significant(10,3),'add',R(1200+100*j),R(err?1:10));
 case 'binteger':return store(significant(2,4),R(err?33+2*j:32+4*j));
 case 'bfraction':return store(significant(2,4),R(err?33+2*j:32+4*j,64));
 default:throw Error('Unknown precision family');
 }
}
function applicationCase(kind,j){const c=j%3,k=j+1,typical=add(R(2+k),R(k,1000));let fmt=fixed(2,-100,100),a=c===0?R(101+k):c===1?typical:R(k+2),b=R(0),op='store',note='';
 switch(kind){
 case 'sensor':fmt=fixed(1,-40,80);a=c===0?R(81+k):c===1?R(203+k,100):R(20+k,10);note='Classify storage resolution, not uncertainty in the physical sensor.';break;
 case 'money':fmt={kind:'fixed',min:R(0),max:R(100),step:R(1,100),description:'a scaled-cent field: 0 through 100 dollars, in exact steps of 0.01 dollar'};a=c===0?R(101+k):c===1?R(102+k,1000):R(20+k,100);break;
 case 'interest':op='multiply';a=R(c===0?101+k:5+k);b=c===1?R(3,10000):R(1);break;
 case 'ticks':fmt={kind:'fixed',min:R(0),max:R(60),step:R(1,4),description:'a tick counter representing 0 through 60 seconds, in exact quarter-second steps'};a=c===0?R(61+k):c===1?R(4*k+1,8):R(k,4);break;
 case 'pixel':fmt={kind:'fixed',min:R(0),max:R(255),step:R(1),description:'an unsigned 8-bit intensity field, 0 through 255, in whole-number steps with nearest-value storage'};a=c===0?R(256+k):c===1?R(2*k+1,2):R(k*10);note='No explicit truncating conversion is requested; the destination uses nearest-value storage.';break;
 case 'robot':fmt=binaryFixed(3);a=c===0?R(-17-k):c===1?R(2*k+1,16):R(k,8);break;
 case 'ratio':op='divide';a=R(c===0?400+k:c===1?3*k+1:k*4);b=R(c===1?3:4);break;
 case 'archive':note='The archive stores a numerical value, not merely a formatted display string.';break;
 case 'distance':op='divide';a=R(c===0?100001+k:c===1?1234+k:1000*k);b=R(1000);note='This calculation converts meters to kilometers.';break;
 case 'battery':op='divide';a=R(c===0?303+k:c===1?3*k+1:3*k);b=R(3);break;
 case 'network':fmt=fixed(1,0,1000);a=c===0?R(1001+k):c===1?R(123+k,100):R(k,10);break;
 case 'health':fmt=binaryFixed(2);a=c===0?R(16+k):c===1?R(k,10):R(k,4);break;
 case 'audio':fmt=binaryFixed(4);a=c===0?R(-17-k):c===1?R(2*k+1,32):R(k,16);break;
 case 'height':fmt=fixed(1,-500,500);op='divide';a=R(c===0?-5001-k:c===1?123+k:100*k);b=R(c===1?100:10);break;
 case 'cost':op='divide';a=R(c===0?301+k:c===1?3*k+1:3*k);b=R(3);break;
 case 'blocks':fmt={kind:'fixed',min:R(0),max:R(255),step:R(1,2),description:'a size-estimate field from 0 through 255 blocks, in half-block steps'};a=c===0?R(256+k):c===1?R(k,3):R(k,2);break;
 case 'dilution':op='divide';a=R(c===0?701+k:c===1?k:7*k);b=R(7);break;
 case 'power':fmt=significant(10,3);a=c===0?R(100001+k):c===1?R(1234+k):R(100*k);break;
 case 'simulation':fmt=binaryFixed(2+j%3);a=c===0?R(16+k):c===1?R(k,10):R(k,4);break;
 case 'rate':a=c===0?R(-101-k):c===1?mul(R(-1),typical):R(-k);break;
 default:throw Error('Unknown application family');
 }return make(fmt,op,a,b,note);
}
export function buildQuestion(f,j){const m=f.topic==='integer'?integerCase(f.kind,j):f.topic==='precision'?precisionCase(f.kind,j):applicationCase(f.kind,j),result=represent(m.value,m.format),expression=m.op==='store'?`The exact value to save is ${text(m.value)}.`:`The calculation is ${text(m.a)} ${{add:'+',subtract:'−',multiply:'×',divide:'÷'}[m.op]} ${text(m.b)}. Its exact mathematical result is ${text(m.value)}.`,range=`Supported range: ${text(m.format.min)} through ${text(m.format.max)}.`,rule=m.format.kind==='integer'?'Only whole numbers are represented.':'Values that are not exactly representable use nearest-value storage; ties go away from zero.',focus=m.format.description;
 const scene=`${f.context} The destination uses ${focus}. ${expression} ${range} ${m.note} ${rule}`.replace(/\s+/g,' ').trim();let evidence;
 if(result.answer==='Overflow')evidence=`${text(m.value)} is ${cmp(m.value,m.format.min)<0?'below the minimum':'above the maximum'} of ${text(m.format.min)} through ${text(m.format.max)}. The destination lacks range. This is not a precision adjustment. No stored result is claimed: wrapping, saturation or an error would depend on a separately defined system policy.`;
 else evidence=result.answer==='Roundoff'?`The exact value ${text(m.value)} is within range, but it falls between supported values. This format stores ${text(result.stored)}; the absolute difference is ${text(result.difference)}. The limitation is precision, not range.`:`${text(m.value)} is within ${text(m.format.min)} through ${text(m.format.max)} and is exactly representable${m.format.kind==='integer'?' as a whole number':` with this format’s ${m.format.kind==='significant'?'significant-digit precision':text(result.step)+' step size'}`}. The stored value is unchanged, so neither limitation affects this write.`;
 return {id:`${f.id}:${j}`,family:f.id,topic:f.topic,objective:f.objective,scene,focus,prompt:'What happens when this result is represented in the destination?',model:m,...result,evidence};}
export const QUESTIONS=FAMILIES.flatMap(f=>Array.from({length:6},(_,j)=>buildQuestion(f,j)));
export function feedback(q,selection){if(!ANSWERS.includes(selection))throw Error('Choose Overflow, Roundoff or Neither.');return {correct:selection===q.answer,text:`${selection===q.answer?'Correct':'Incorrect'} — ${q.answer}\n${q.evidence}`};}
export function numericSignature(q){const f=q.model.format;return [text(q.model.value),text(f.min),text(f.max),f.kind,f.step?text(f.step):`${f.base}:${f.digits}`].join('|');}
function random(seed){let s=Number(seed)>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createGenerator({seed=Date.now(),history=[],bank=QUESTIONS}={}){if(!bank.length)throw Error('Empty bank');const rng=random(seed),byId=new Map(bank.map(q=>[q.id,q])),recent=history.map(h=>byId.get(typeof h==='string'?h:h?.id)).filter(Boolean).slice(-50),counts=Object.fromEntries(ANSWERS.map(a=>[a,0])),families={};let last=recent.at(-1)?.answer,streak=0;for(let i=recent.length-1;i>=0&&recent[i].answer===last;i--)streak++;
 return {next(topic='mixed'){const pool=topic==='mixed'?bank:bank.filter(q=>q.topic===topic);if(!pool.length)throw Error('Unknown filter');let candidates=pool.filter(q=>!recent.some(r=>r.id===q.id)),exactRelaxed=false,cooldownRelaxed=false;if(!candidates.length){exactRelaxed=true;for(let n=recent.length-1;n>=0;n--){const tail=n?recent.slice(-n):[];candidates=pool.filter(q=>!tail.some(r=>r.id===q.id));if(candidates.length)break;}}
 const fresh=candidates.filter(q=>!recent.slice(-3).some(r=>r.family===q.family));if(fresh.length)candidates=fresh;else cooldownRelaxed=true;
 const recentNumbers=new Set(recent.slice(-3).map(numericSignature)),newNumbers=candidates.filter(q=>!recentNumbers.has(numericSignature(q)));if(newNumbers.length)candidates=newNumbers;
 const available=ANSWERS.filter(a=>candidates.some(q=>q.answer===a)&&(streak<2||a!==last)),choices=available.length?available:ANSWERS.filter(a=>candidates.some(q=>q.answer===a)),min=Math.min(...choices.map(a=>counts[a])),weights=choices.map(a=>1/(1+counts[a]-min));let ticket=rng()*weights.reduce((sum,w)=>sum+w,0),desired=choices.at(-1);for(let i=0;i<choices.length;i++){ticket-=weights[i];if(ticket<0){desired=choices[i];break;}}candidates=candidates.filter(q=>q.answer===desired);
 const least=Math.min(...candidates.map(q=>families[q.family]||0));candidates=candidates.filter(q=>(families[q.family]||0)===least);const q=candidates[Math.floor(rng()*candidates.length)];counts[q.answer]++;families[q.family]=(families[q.family]||0)+1;streak=q.answer===last?streak+1:1;last=q.answer;recent.push(q);if(recent.length>50)recent.shift();return {...q,exactRelaxed,cooldownRelaxed};},history:()=>recent.map(q=>q.id),metrics:()=>({answers:{...counts},families:{...families}})};
}
