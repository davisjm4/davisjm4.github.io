import {el} from './dom.mjs';
import {activeProfile,observeSync} from './profile-sync.mjs?v=guest-map-v1';
import {request} from './config.mjs';
import {resolvePracticeReturn} from '../../../cs-games/student/practice-return.mjs';
const url=new URL(location.href),areaId=url.searchParams.get('area');
if(areaId?.startsWith('area:workplace:'))void mount();
async function mount(){
 const response=await fetch('/cs-games/pathway/curriculum-graph.json');if(!response.ok)return;
 const graph=await response.json(),area=graph.areas.find(a=>a.id===areaId&&a.courseId==='workplace');
 if(!area)return;
 const slug=areaId.split(':').at(-1),objectives=graph.nodes.filter(n=>n.areaId===areaId);
 const host=document.getElementById('view-practice'),ticket=document.getElementById('ticket-slot');if(!host||!ticket)return;
 const heading=host.querySelector('h1');heading.classList.remove('sr-only');heading.textContent=area.title;
 document.title=area.title+' · Workplace Readiness';
 const backTo=resolvePracticeReturn(url,activeProfile);
 const back=el('a',{class:'btn',href:backTo??'/cs-games/student/guest/?course=workplace',text:'Back to learning unit'});
 const bar=el('section',{class:'area-progress','aria-label':'Learning area progress'}),summary=el('p',{'aria-live':'polite'}),progress=el('progress',{max:8,value:0,'aria-label':'Practice round'});
 const mastery=el('p',{text:'Mastery: reviewed evidence needed. Practice answers alone do not certify workplace performance.'});
 const coverage=el('p'),next=el('button',{type:'button',class:'btn',text:'Start another short round',hidden:true});
 const details=el('details',{},el('summary',{text:'What this area develops'}),el('ul',{},objectives.map(n=>el('li',{text:n.objective??n.title}))));
 bar.append(back,summary,progress,coverage,mastery,next,details);ticket.before(bar);
 let roundStart=null,answered=0,correct=0,patterns=new Set();
 const counts=()=>globalThis.WRG?.app?.tracker?.data?.stats?.bySkill?.[slug]??{n:0,c:0};
 function paint(){const c=counts();roundStart??={n:c.n,c:c.c};answered=Math.max(0,c.n-roundStart.n);correct=Math.max(0,c.c-roundStart.c);
  summary.textContent=`Practice round · ${Math.min(answered,8)} of 8 questions · ${correct} right on the first try${answered?' · '+Math.round(100*correct/answered)+'%':''}`;
  progress.value=Math.min(answered,8);progress.setAttribute('aria-valuetext',`${answered} of 8 practice questions; mastery is separate`);
  coverage.textContent=patterns.size?`${patterns.size} reasoning patterns practiced this round. Objective coverage is checked separately from accuracy.`:'Questions rotate through this area’s available reasoning patterns.';
  next.hidden=answered<8;
 }
 next.onclick=()=>{roundStart={...counts()};patterns=new Set();globalThis.WRG.app.startPractice({...globalThis.WRG.app.tracker.data.filters,skills:[slug],count:8},true);paint();};
 addEventListener('csg:wpr-answer',event=>{if(event.detail.question.skill===slug){patterns.add(event.detail.question.reasoning??event.detail.question.family);paint();}});
 addEventListener('csg:wpr-question',paint);paint();
 // Keep the completion action reachable when the existing round ends at its summary.
 addEventListener('hashchange',()=>{if(location.hash==='#/summary'&&answered>=8){document.getElementById('view-summary').prepend(bar);next.hidden=false;}else if(location.hash==='#/practice')ticket.before(bar);});
 if(activeProfile){
  async function refresh(){try{const {pathway}=await request('/pathways/student/'+encodeURIComponent(activeProfile.classId),{token:activeProfile.token});
   const included=pathway.nodes.filter(n=>n.areaId===areaId&&n.checkpoint.participation!=='excluded'&&n.checkpoint.required!==false);
   const met=included.length&&included.every(n=>n.checkpoint.pathwayComplete||n.checkpoint.score>=3);
   mastery.textContent=met?'Level 3 demonstrated for this area. Your class requirements and teacher scores are preserved.':'Class mastery: teacher-configured requirements and reviewed evidence still apply. An eight-question round does not replace them.';
  }catch{mastery.textContent='Class requirements will refresh when you reconnect. Practice remains available; no official score is changed.';}}
  observeSync(message=>{if(message==='Practice synced.')void refresh();});void refresh();
 }
}
