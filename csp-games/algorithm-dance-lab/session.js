// Stage assessment is separate from exploratory playback. No names or identity fields.
export const KEY='algorithmDance.lesson.v1';
const day=now=>{const d=new Date(now);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
export function createLessonSession({storage,shared,now=()=>Date.now(),onWarning=()=>{}}){let data,last=now(),interaction=now(),sharedSession=shared.snapshot().id;
 const fresh=()=>({date:day(now()),stages:{},activeMs:0,counts:{},successes:[]});
 function load(){try{data=JSON.parse(storage?.getItem(KEY)||'null');}catch{}if(!data||data.date!==day(now())||!data.stages||!Array.isArray(data.successes)||!Number.isFinite(data.activeMs))data=fresh();}
 function save(){try{storage?.setItem(KEY,JSON.stringify(data));}catch{onWarning('Local saving is unavailable. You can still work and export your program.');}}
 function ensure(){const snap=shared.snapshot();if(data.date!==day(now())||sharedSession!==snap.id){data=fresh();sharedSession=snap.id;save();return true;}return false;}
 function stage(index){ensure();return data.stages[index]||=( {attempts:0,completed:false,firstCheck:false,record:null,lastChecked:''});}
 load();
 return {ensure,signal(){interaction=now();},tick(visible=true){ensure();const t=now(),delta=Math.max(0,Math.min(10000,t-last));if(visible&&t-interaction<60000)data.activeMs+=delta;last=t;save();},check(index,ok,signature){const s=stage(index);if(s.lastChecked===signature)return {duplicate:true,...s};s.lastChecked=signature;
  if(!s.record||!shared.snapshot().records[s.record])s.record=shared.begin('algorithm-dance-lab','Algorithm Dance Lab',`stage-${index+1}`,`Hokey Pokey · Stage ${index+1}`,'lesson','Hokey Pokey');
  s.attempts++;if(s.attempts===1)s.firstCheck=ok;shared.submit(s.record,ok);if(ok){s.completed=true;const key=`${index}:${signature}`;if(!data.successes.includes(key))data.successes.push(key);data.successes=data.successes.slice(-100);}
  shared.annotate(s.record,{stage:index+1,validationAttempts:s.attempts,completed:s.completed});save();return {...s};},stage,counts(values){ensure();if(values){data.counts=values;save();}return {...data.counts};},snapshot(){ensure();return JSON.parse(JSON.stringify(data));}};
}
