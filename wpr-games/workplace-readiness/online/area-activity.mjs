import {el} from './dom.mjs';
import {activeProfile,observeSync} from './profile-sync.mjs?v=guest-map-v1';
import {request} from './config.mjs';
import {groupCourseStops} from '../../../cs-games/student/map/course-groups.mjs';
import {readRoute,routeHash} from '../../../cs-games/student/map/route.mjs';
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
 const classChecks=el('ul',{'aria-label':'Class requirements',hidden:true});
 const nextArea=el('a',{class:'btn',hidden:true,text:'Next area'});
 const coverage=el('p'),next=el('button',{type:'button',class:'btn',text:'Start another short round',hidden:true});
 const details=el('details',{},el('summary',{text:'What this area develops'}),el('ul',{},objectives.map(n=>el('li',{text:n.objective??n.title}))));
 bar.append(back,summary,progress,coverage,mastery,classChecks,nextArea,next,details);ticket.before(bar);
 let roundStart=null,answered=0,correct=0,patterns=new Set(),areaMet=false;
 const counts=()=>globalThis.WRG?.app?.tracker?.data?.stats?.bySkill?.[slug]??{n:0,c:0};
 function paint(){const c=counts();roundStart??={n:c.n,c:c.c};answered=Math.max(0,c.n-roundStart.n);correct=Math.max(0,c.c-roundStart.c);
  summary.textContent=`Practice round · ${Math.min(answered,8)} of 8 questions · ${correct} right on the first try${answered?' · '+Math.round(100*correct/answered)+'%':''}`;
  progress.value=Math.min(answered,8);progress.setAttribute('aria-valuetext',`${answered} of 8 practice questions; mastery is separate`);
  coverage.textContent=patterns.size?`${patterns.size} reasoning patterns practiced this round. Objective coverage is checked separately from accuracy.`:'Questions rotate through this area’s available reasoning patterns.';
  next.hidden=!areaMet&&answered<8;
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
   const requirements=included.map(n=>n.masteryChallenge).filter(c=>c?.requirement?.minimumQuestions);
   classChecks.hidden=!requirements.length;
   if(requirements.length){
     const answered=requirements.reduce((sum,c)=>sum+(c.progress?.answered??0),0),minimum=requirements.reduce((sum,c)=>sum+c.requirement.minimumQuestions,0);
     const covered=requirements.filter(c=>c.status==='requirements-met').length;
     const accuracy=[...new Set(requirements.map(c=>c.requirement.accuracyPercent))].sort((a,b)=>a-b);
     classChecks.replaceChildren(el('li',{text:`Qualifying class answers: ${answered} of ${minimum} across this area’s included objectives.`}),
       el('li',{text:`Accuracy required: ${accuracy.join('–')}% on the applicable objective evidence.`}),
       el('li',{text:`Coverage: ${covered} of ${requirements.length} configured objective requirements met. Unvalidated practice is not counted as mastery.`}));
   }
   areaMet=Boolean(met);nextArea.hidden=true;next.textContent=areaMet?'Optional extension practice':'Start another short round';
   details.querySelector('.extension-note')?.remove();
   if(met){
     next.hidden=false;
     next.textContent='Optional extension practice';
     details.append(el('p',{class:'extension-note',text:'Level 4 is optional. Use an applied workplace task and teacher review to demonstrate performance; these questions remain practice.'}));
     const grouped=new Map();for(const n of pathway.nodes){if(n.checkpoint.participation==='excluded'||n.checkpoint.required===false)continue;const group=grouped.get(n.areaId)??[];group.push(n);grouped.set(n.areaId,group);}
     const entries=[...grouped];const at=entries.findIndex(([id])=>id===areaId);
     const candidate=[...entries.slice(at+1),...entries.slice(0,at)].find(([,nodes])=>nodes.some(n=>!n.checkpoint.pathwayComplete&&!(n.checkpoint.score>=3)));
     if(candidate){
       const target=new URL(location.href);target.searchParams.set('area',candidate[0]);target.searchParams.set('skills',candidate[0].split(':').at(-1));target.hash='#/practice';
       const groups=groupCourseStops({courseId:'workplace',stops:graph.areas.filter(a=>a.courseId==='workplace').map((a,index)=>({id:a.id,areaId:a.id,index,nodes:[]}))},graph);
       const parent=groups.find(group=>group.stops.some(stop=>stop.id===candidate[0]));
       if(backTo&&parent){const back=new URL(backTo,location.origin);back.hash=routeHash({...readRoute(back.hash),view:'unit',unitId:parent.id,stopId:null,nodeId:null});target.searchParams.set('returnTo',back.pathname+back.search+back.hash);}
       nextArea.href=target.pathname+target.search+target.hash;nextArea.textContent='Next area · '+(graph.areas.find(a=>a.id===candidate[0])?.title??candidate[0].split(':').at(-1).replaceAll('-',' '));nextArea.hidden=false;
     }
   }
   mastery.textContent=met?'Level 3 demonstrated for this area. Level 4 is optional. Your class requirements and teacher scores are preserved.':'Class mastery: teacher-configured requirements and reviewed evidence still apply. An eight-question round does not replace them.';
  }catch{mastery.textContent='Class requirements will refresh when you reconnect. Practice remains available; no official score is changed.';}}
  observeSync(message=>{if(message==='Practice synced.')void refresh();});void refresh();
  const {mountProceduralArea}=await import('./procedural-area.mjs');await mountProceduralArea(slug);
 }
}
