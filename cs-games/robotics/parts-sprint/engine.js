import {PARTS,CATEGORIES} from './catalog.js?v=parts-1';
export {PARTS,CATEGORIES};
export const FORMATS={learn:'Learn the Parts',sprint:'Parts Sprint',find:'Find That Part'};
export const LEVELS=['Beginner','Intermediate','Advanced','mixed'];
export function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
export function normalize(value){return String(value).normalize('NFKC').toLowerCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();}
export function accepts(part,value){return part.aliases.some(a=>normalize(a)===normalize(value));}
export function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let last=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,last+(a[i-1]===b[j-1]?0:1));last=old;}}return row[b.length];}
export function feedback(part,value){
 if(accepts(part,value))return{correct:true,text:`Correct — ${part.name}. ${part.function}`};
 const other=PARTS.find(p=>p.id!==part.id&&accepts(p,value));
 const close=!other&&normalize(value).length>3&&part.aliases.some(a=>editDistance(normalize(a),normalize(value))===1);
 return{correct:false,nearMiss:close,text:`${close?'Close spelling; this was not counted correct. ':''}This is ${part.name}${other?`, rather than ${other.name}`:''}. ${part.description} ${part.function}${other?` In comparison, ${other.name}: ${other.description}`:''}`};
}
const shuffled=(items,random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function poolFor({difficulty='Beginner',category='all'}={}){return PARTS.filter(p=>(difficulty==='mixed'||p.difficulty===difficulty)&&(category==='all'||p.category===category));}
export function generate({seed=1,mode='learn',difficulty='Beginner',category='all',history=[]}={}){
 if(![...Object.keys(FORMATS),'mixed'].includes(mode)||!LEVELS.includes(difficulty))return{error:'Choose a listed practice mode and difficulty.'};
 const pool=poolFor({difficulty,category});if(!pool.length)return{error:`No ${difficulty} components are available in ${CATEGORIES[category]||category}. Choose All categories or Mixed levels.`};
 const random=rng(seed),formats=mode==='mixed'?Object.keys(FORMATS):[mode],all=pool.flatMap(part=>formats.map(format=>({part,format,id:part.id+':'+format})));
 const exactWindow=Math.min(50,all.length-1),componentWindow=Math.min(12,pool.length-1),recent=history.slice(-exactWindow),ids=new Set(exactWindow?recent.map(h=>h.id):[]),parts=new Set(componentWindow?history.slice(-componentWindow).map(h=>h.part):[]);
 let choices=all.filter(q=>!ids.has(q.id)&&!parts.has(q.part.id)),relaxed=false;
 if(!choices.length){choices=all.filter(q=>!ids.has(q.id));relaxed=true;}
 if(!choices.length)choices=all; // Corrupt or externally supplied histories cannot create an endless loop.
 const categories=[...new Set(choices.map(q=>q.part.category))],counts=Object.fromEntries(categories.map(c=>[c,history.slice(-40).filter(h=>h.category===c).length]));
 const minimum=Math.min(...Object.values(counts));choices=choices.filter(q=>counts[q.part.category]===minimum);
 if(mode==='mixed'){const counts=Object.fromEntries(formats.map(f=>[f,history.slice(-12).filter(h=>h.format===f).length]));const available=[...new Set(choices.map(q=>q.format))],n=Math.min(...available.map(f=>counts[f]));choices=choices.filter(q=>counts[q.format]===n);}
 const q=choices[Math.floor(random()*choices.length)],p=q.part;
 const same=PARTS.filter(x=>x.id!==p.id&&x.category===p.category),rest=PARTS.filter(x=>x.id!==p.id&&x.category!==p.category);
 const wrong=p.difficulty==='Beginner'?shuffled([...shuffled(same,random).slice(0,1),...shuffled(rest,random).slice(0,3)],random).slice(0,3):[...shuffled(same,random),...shuffled(rest,random)].slice(0,3);
 const options=shuffled([p,...wrong],random);
 return{...q,options,correctIndex:options.findIndex(x=>x.id===p.id),difficulty:p.difficulty,historyRecord:{id:q.id,part:p.id,format:q.format,category:p.category},notice:`${pool.length} component types; ${all.length} component/format instances. Exact-instance cooldown: ${exactWindow}; component cooldown: ${componentWindow}.${all.length<=50?' This narrow pool must repeat sooner than 50 questions.':''}${relaxed?' Component cooldown relaxed to keep the selected pool usable.':''}`};
}
export function createRace({now=()=>performance.now(),duration=60,target=10}={}){
 let state={active:false,progress:0,attempted:0,firstTry:0,identified:0,corrected:0,assisted:0,streak:0,longest:0,responseMs:[],started:0,ended:0,reason:''},question=null;
 const expired=()=>state.active&&duration>0&&now()-state.started>=duration*1000;
 function finish(reason='finish'){if(!state.active)return;state.active=false;state.ended=now();state.reason=reason;}
 return{
  start(){state={...state,active:true,started:now()};},
  begin(){question={submissions:0,helped:false,locked:false,started:now()};},
  help(){if(question&&!question.locked)question.helped=true;},
  submit(correct){
   if(expired()){finish('time');return{accepted:false,expired:true};}
   if(!state.active||!question||question.locked)return{accepted:false};
   const first=question.submissions===0;question.submissions++;
   if(first){if(question.helped)state.assisted++;else state.attempted++;if(!question.helped)state.responseMs.push(Math.max(0,now()-question.started));}
   const firstTry=first&&!question.helped&&correct;
   if(correct){question.locked=true;state.identified++;if(firstTry){state.firstTry++;state.streak++;state.longest=Math.max(state.longest,state.streak);}else{state.corrected++;state.streak=0;}state.progress=Math.min(target,state.progress+(firstTry?1+(state.streak>=3?.1:0):.4));if(state.progress>=target)finish('finish');}
   else state.streak=0;
   return{accepted:true,firstTry,assisted:question.helped,correct};
  },
  tick(){if(expired())finish('time');return state.active;},finish,
  snapshot(){const elapsed=(state.active?now():state.ended)-state.started;return{...structuredClone(state),duration,target,elapsed:Math.max(0,elapsed),remaining:duration?Math.max(0,Math.ceil(duration-elapsed/1000)):null,accuracy:state.attempted?100*state.firstTry/state.attempted:null,averageResponse:state.responseMs.length?state.responseMs.reduce((a,b)=>a+b,0)/state.responseMs.length:null};}
 };
}
export function beatsBest(candidate,previous){
 if(candidate.attempted<5||!['finish','time'].includes(candidate.reason))return false;
 if(!previous)return true;
 if(candidate.accuracy!==previous.accuracy)return candidate.accuracy>previous.accuracy;
 if(candidate.firstTry!==previous.firstTry)return candidate.firstTry>previous.firstTry;
 if(candidate.longest!==previous.longest)return candidate.longest>previous.longest;
 return candidate.averageResponse<previous.averageResponse;
}
