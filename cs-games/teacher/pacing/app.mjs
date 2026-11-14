import {renderPathway} from '../../student/pathway-view.mjs';
import {DAY_TYPES,importCalendar,applyImport,bulkDates} from '../../pathway/calendar.mjs';
import {createPathway,clone,validatePathway,diffPathways,studentContract,removePacing} from '../../pathway/model.mjs';
import {generatePacing,exportCSV,exportICS,groupedView} from '../../pathway/pacing.mjs';
import {profilesAvailable} from '../../../wpr-games/workplace-readiness/online/config.mjs';
import {currentTeacher,mountTeacherAccount,observeTeacher,teacherRequest} from '../session.mjs';
import {WEEKDAYS,courseLabel,scheduleModeFromCalendar,classLabelsFromCalendar,calendarFromSchedule,offsetForKnownDay,rotationLabelOn,scheduleSummary,formatDate,formatWhen,publicationStatus,draftStatus,filterSkills} from '../ui-model.mjs';
const $=id=>document.getElementById(id),graph=await fetch('../../pathway/curriculum-graph.json').then(r=>r.json());
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const add=(node,...kids)=>{node.append(...kids.flat().filter(x=>x!=null&&x!==false));return node;};
const chip=(text,tone='plain')=>el('span',text,{class:'chip '+tone});
const btn=(text,fn,cls='secondary')=>{const b=el('button',text,{type:'button',class:cls});b.onclick=()=>run(fn);return b;};
const option=(value,label)=>{const o=el('option',label);o.value=value;return o;};
const list=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
const STAGES=['calendar','goals','pacing','review'];
const blankCalendar={start:'',end:'',weekdays:[1,2,3,4,5],minutes:80,rotation:[],classRotations:[],rotationOffset:0,overrides:[],timeZone:'America/Los_Angeles'};
const STAGE_ALIASES={setup:'calendar',nodes:'goals',revisions:'review',student:'review'};
const localKey='cs-games:teacher-pathways:v1';
let store={selected:null,classes:{}},p,entry,loadedOwner=null,connected=false,preview=null,imported=[];
let enrolledClasses=[], remotePlans=[];
let savedSnapshot=null,lastPublishedAt=null,publishError=null,settingsDirty=false,stage='calendar',statusTimer=null;
const assessSel=new Set();
const classHint=new URLSearchParams(location.search).get('class');
if(classHint)document.querySelectorAll('a[href="../#classes"]').forEach(link=>{
  link.href='../?class='+encodeURIComponent(classHint)+(link.id==='back-to-classes'?'#class-plan':'#class-students');
  if(link.id==='back-to-classes')link.textContent='Back to class plan';
});
try{store=JSON.parse(localStorage.getItem(localKey))||store;}catch{}

/* ───────── messages ───────── */
function message(text,error=false){
  const s=$('status');s.replaceChildren();s.hidden=!text;if(!text)return;
  s.className='banner '+(error?'bad':'good');s.setAttribute('role',error?'alert':'status');
  const dismiss=el('button','Dismiss',{type:'button',class:'quiet small','aria-label':'Dismiss message'});dismiss.onclick=()=>{s.hidden=true;};
  s.append(el('span',text),' ',dismiss);
}
function setPublishError(text){publishError=text;refreshStatus();}
// `kind` marks publication-related actions so a failure is shown in the Review & Publish stage.
const run=async(fn,kind)=>{try{await fn();if(kind)setPublishError(null);}catch(e){message(e.message,true);if(kind)setPublishError(e.message);}};

/* ───────── storage and change tracking ───────── */
function persist(){entry.unsaved=isDirty();entry.draft=clone(p);store.selected=p.id;store.classes[p.id]=entry;try{localStorage.setItem(localKey,JSON.stringify(store));}catch{message('Browser storage is unavailable. Export a JSON backup (More tools) to keep your work.',true);}}
function invalidate(){preview=null;$('publish').disabled=true;$('local-publish').disabled=true;$('changes').replaceChildren();persist();queueStatus();}
const markSaved=()=>{savedSnapshot=entry.remote&&!entry.needsReload?JSON.stringify(p):null;};
const isDirty=()=>!!entry.remote&&(!!entry.needsReload||(savedSnapshot!==null&&savedSnapshot!==JSON.stringify(p)));
window.addEventListener('beforeunload',event=>{
  if(!$('pacing-content').hidden&&(settingsDirty||isDirty())){
    event.preventDefault();
    event.returnValue='';
  }
});
function queueStatus(){clearTimeout(statusTimer);statusTimer=setTimeout(refreshStatus,120);}

/* ───────── data lookups ───────── */
function allNodes(){return [...new Map([...graph.nodes,...(p.curriculumSnapshot?.nodes||[]),...p.customNodes].map(n=>[n.id,n])).values()];}function allAreas(){return [...new Map([...graph.areas,...(p.curriculumSnapshot?.areas||[]),...p.customAreas].map(a=>[a.id,a])).values()];}function node(id){return allNodes().find(n=>n.id===id);}function area(id){return allAreas().find(a=>a.id===id)?.title||id;}
function newClass(courseId='advanced',classroom=null,{temporary=false}={}){
  p=createPathway(graph,{title:classroom?.title||'New class pathway',courseId,...(classroom?{classId:classroom.id}:{})});
  entry={draft:p,revisions:[],remote:false,draftVersion:null,owner:classroom?loadedOwner:null};
  savedSnapshot=null;if(!temporary)persist();render();
}

/* ───────── tables ───────── */
function table(headers,cls=[]){const wrap=el('div',undefined,{class:'scroll-table',tabindex:'0',role:'region','aria-label':headers.slice(0,3).join(', ')+' table (scrollable)'}),t=el('table',undefined,{class:'stack'}),thead=el('thead'),tr=el('tr');headers.forEach((h,i)=>{const th=el('th',h,{scope:'col'});if(cls[i])th.className=cls[i];tr.append(th);});thead.append(tr);const tbody=el('tbody');t.append(thead,tbody);wrap.append(t);const t_={wrap,tbody,headers,cls};return t_;}
// Phones show each row as a labelled card, so every cell needs its column name.
function labelled(t){for(const tr of t.tbody.rows)[...tr.cells].forEach((td,i)=>{td.dataset.label=t.headers[i]||'';if(t.cls[i])td.classList.add(t.cls[i]);});return t.wrap;}

/* ───────── stage 1: class & calendar ───────── */
const currentMode=()=>document.querySelector('#settings input[name=scheduleMode]:checked')?.value||'every';
function buildStaticControls(){
  $('weekday-picker').replaceChildren(...WEEKDAYS.map(d=>{const label=el('label',undefined,{class:'choice'}),input=el('input',undefined,{type:'checkbox',name:'day',value:String(d.n),'aria-label':d.long});label.append(input,el('span',d.short));return label;}));
  $('course').replaceChildren(...graph.courses.map(c=>option(c.id,courseLabel(c.id)||c.title)));
  $('day-types').replaceChildren(...DAY_TYPES.map(v=>option(v,v)));
}
function calendarFromForm(){
  const f=$('settings').elements,mode=currentMode();
  let cal=calendarFromSchedule(p.calendar||blankCalendar,{mode,weekdays:[...document.querySelectorAll('#weekday-picker input:checked')].map(i=>Number(i.value)),classLabels:[...document.querySelectorAll('#ab-picker input:checked')].map(i=>i.value),customRotation:list(f.rotation.value),customClassLabels:list(f.classRotations.value),offset:Number(f.offset.value)});
  cal={...cal,start:f.start.value,end:f.end.value,minutes:Number(f.minutes.value),timeZone:f.timezone.value};
  if(mode==='ab'&&f.anchorDate.value)cal.rotationOffset=offsetForKnownDay(cal,f.anchorDate.value,f.anchorLabel.value);
  return cal;
}
function updateScheduleUI(){
  const mode=currentMode(),f=$('settings').elements;
  $('weekday-panel').hidden=mode==='every';$('ab-panel').hidden=mode!=='ab';$('custom-panel').hidden=mode!=='custom';
  $('schedule-summary').className='banner info';
  try{
    const cal=calendarFromForm();
    $('schedule-summary').textContent=scheduleSummary(cal);
    if(mode==='ab'){const label=rotationLabelOn({...p.calendar,...cal},f.start.value);$('ab-hint').textContent=label?`With these settings, ${formatDate(f.start.value)} (the first day of school) is ${/^[AEIOU]/i.test(label)?'an':'a'} ${label} day.`:'';}
  }catch(e){$('schedule-summary').textContent=e.message;$('schedule-summary').className='banner warn';$('ab-hint').textContent='';}
}
function setSettings(){
  const f=$('settings').elements,c=p.calendar||blankCalendar,mode=scheduleModeFromCalendar(c);
  f.title.value=p.title;f.course.value=p.courseId;f.start.value=c.start;f.end.value=c.end;f.exam.value=p.examDate||'';f.minutes.value=c.minutes;
  for(const r of document.querySelectorAll('#settings input[name=scheduleMode]'))r.checked=r.value===mode;
  for(const i of document.querySelectorAll('#weekday-picker input'))i.checked=c.weekdays.includes(Number(i.value));
  const labels=classLabelsFromCalendar(c);for(const i of document.querySelectorAll('#ab-picker input'))i.checked=labels.includes(i.value);
  f.rotation.value=c.rotation.join(',');f.classRotations.value=c.classRotations.join(',');f.offset.value=c.rotationOffset||0;
  f.anchorDate.value='';f.anchorLabel.value='A';
  f.tolerance.value=p.toleranceDays;f.timezone.value=c.timeZone||'America/Los_Angeles';$('recalculate-from').value=c.start;
  $('rotation-options').replaceChildren(...c.rotation.map(l=>{const o=el('option');o.value=l;return o;}));
  f.shareTargets.checked=!!p.calendar&&p.pacingVisibility!=='private';
  $('settings').hidden=!p.calendar;
  $('add-pacing').hidden=!!p.calendar;
  $('remove-pacing').hidden=!p.calendar;
  $('calendar-exceptions').hidden=!p.calendar;
  settingsDirty=false;$('settings-dirty').hidden=true;updateScheduleUI();
}
function readSettings(){
  const f=$('settings').elements;if(f.course.value!==p.courseId)throw new Error('Create a new class pathway to use a different course.');
  if(!f.start.value||!f.end.value)throw new Error('Choose the first and last day for the pacing guide.');
  const calendar=calendarFromForm();
  const candidate={...p,title:f.title.value.trim(),calendar,examDate:f.exam.value||null,
    pacingVisibility:f.shareTargets.checked?(p.calendar&&p.pacingVisibility===undefined?undefined:'shared'):'private',toleranceDays:Number(f.tolerance.value)};
  validatePathway(candidate,graph,{validateSessions:false,validateTargets:false});
  if(JSON.stringify(calendar)!==JSON.stringify(p.calendar)||candidate.examDate!==p.examDate)candidate.sessions=[];
  p=candidate;
  f.offset.value=calendar.rotationOffset;
}
function applySettings(){
  readSettings();$('recalculate-from').value=p.calendar.start;recalculate();renderSaved();
  $('remove-pacing').hidden=false;$('calendar-exceptions').hidden=false;
  settingsDirty=false;$('settings-dirty').hidden=true;
  message('Pacing updated in the draft.');
}

function renderSaved(){
  const saved=$('saved');
  const choices=new Map(Object.values(store.classes).filter(item=>!item.remote&&!item.owner || connected&&item.owner===loadedOwner).map(item=>[item.draft.id,item.draft.title+(item.remote?'':' (this browser only)')]));
  for(const item of remotePlans) choices.set(item.id,item.title);
  saved.replaceChildren(...Array.from(choices,([id,title])=>option(id,title)));
  saved.value=p.id;
}
function renderEnrollment(){
  const wrapper=$('class-enrollment'), select=$('enrolled-class');
  wrapper.hidden=!connected || !profilesAvailable;
  const prior=select.value;
  const classes=enrolledClasses.filter(c=>c.course_id===p.courseId && (!c.archived || c.id===p.classId));
  select.replaceChildren(option('','Choose a student class'),...classes.map(c=>option(c.id,c.title)));
  select.value=classes.find(c=>c.id===p.classId)?.id || classes.find(c=>c.id===prior)?.id || '';
  select.disabled=entry.remote;
}
async function openRemote(id){
  const active=currentTeacher();
  const result=await teacherRequest('/pathways/teacher/'+id);
  if(currentTeacher()!==active)return;
  const local=store.classes[id];
  const serverEntry={draft:result.draft,published:result.published,revisions:result.published?[result.published]:[],
    draftVersion:result.draftVersion,remote:true,owner:active.owner};
  const ownsCache=local?.owner===active.owner;
  const sameVersion=local?.draftVersion===result.draftVersion;
  const editsDiffer=local && JSON.stringify(local.draft)!==JSON.stringify(result.draft);
  if(editsDiffer && (ownsCache && local.unsaved || sameVersion && local.remote && !local.owner)){
    entry={...serverEntry,draft:local.draft,unsaved:true,needsReload:!sameVersion};
  }else entry=serverEntry;
  p=clone(entry.draft);
  savedSnapshot=JSON.stringify(result.draft);
  invalidate();render();loadLastPublished();
}
async function loadLastPublished(){
  lastPublishedAt=null;
  try{if(connected&&entry.remote&&entry.published)lastPublishedAt=(await teacherRequest('/pathways/teacher/'+p.id+'/history')).revisions?.[0]?.created??null;}catch{}
  refreshStatus();
}

/* ───────── special dates: searchable skill picker ───────── */
function skillOptions(){return allNodes().filter(n=>n.courseId===p.courseId).map(n=>({id:n.id,title:n.title,area:area(n.areaId),standards:(n.standardRefs||[]).map(x=>x.id).join(' ')}));}
function syncPicker(){
  $('day-edit').elements.assessmentNodes.value=[...assessSel].join(',');
  const byId=new Map(skillOptions().map(s=>[s.id,s]));
  $('assess-selected').replaceChildren(...[...assessSel].map(id=>{const c=el('span',undefined,{class:'chip plain'});const x=el('button','×',{type:'button',class:'quiet small','aria-label':'Remove '+(byId.get(id)?.title||'skill')});x.onclick=()=>{assessSel.delete(id);syncPicker();renderPicker();};c.append(byId.get(id)?.title||'Skill',x);return c;}));
}
function renderPicker(){
  const matches=filterSkills(skillOptions(),$('assess-search').value),shown=matches.slice(0,60);
  const rows=shown.map(s=>{const li=el('li'),lab=el('label'),cb=el('input',undefined,{type:'checkbox',value:s.id});cb.checked=assessSel.has(s.id);cb.onchange=()=>{if(cb.checked)assessSel.add(s.id);else assessSel.delete(s.id);syncPicker();};const text=el('span');text.append(el('span',s.title),el('small',s.area+(s.standards?' · '+s.standards:'')));lab.append(cb,text);li.append(lab);return li;});
  if(!matches.length)rows.push(el('li','No skills match your search.',{class:'hint'}));
  else if(matches.length>shown.length)rows.push(el('li',`Showing ${shown.length} of ${matches.length} skills. Keep typing to narrow the list.`,{class:'hint'}));
  $('assess-list').replaceChildren(...rows);
}
function resetPicker(skillIds=[]){assessSel.clear();for(const id of skillIds)assessSel.add(id);$('assess-search').value='';syncPicker();renderPicker();}

/* ───────── stage 3: pacing guide ───────── */
const SHORT_WEEKDAY=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dayDate=iso=>SHORT_WEEKDAY[new Date(iso+'T12:00:00Z').getUTCDay()]+', '+formatDate(iso);
function renderSchedule(){
  if(!p.calendar){
    $('capacity').replaceChildren();$('warnings').replaceChildren();
    const link=el('a','Add pacing & target dates',{href:'#calendar'});
    $('schedule').replaceChildren(el('p','This pathway is self-paced.'),link);
    $('generate').disabled=true;
    return;
  }
  $('generate').disabled=false;
  const c=p.capacity||{};
  $('capacity').replaceChildren(...[[c.meetings||0,'class meetings',false],[c.totalMinutes||0,'minutes available',false],[c.protectedMinutes||0,'review & testing minutes',false],[c.deficit||0,'minutes still needed',(c.deficit||0)>0]].map(([v,t,alert])=>{const div=el('div',undefined,{class:'stat'});div.append(el('strong',String(v)),el('span',t));if(alert)div.querySelector('strong').style.color='var(--gold)';return div;}));
  $('warnings').replaceChildren(...(p.warnings||[]).map(w=>el('p',w,{class:'banner warn'})));
  const wrap=$('schedule');wrap.replaceChildren();for(const group of groupedView(p,$('view').value)){
    const detail=el('details',undefined,{class:'more'});if($('view').value==='daily'){detail.open=true;}const summary=el('summary',group.label+' · '+group.minutes+' min');detail.append(summary);
    const t=table(['Date','Time','Learning area & skill','Standards','Checkpoint & practice']);
    const sessionRow=s=>{const row=el('tr');if(s.protected)row.className='protected';const objectives=s.allocations.map(a=>area(a.areaId)+': '+a.objective+' ('+a.minutes+'m)').join('\n');
      const target=s.allocations.map(a=>{const c=p.checkpoints.find(c=>c.id===a.checkpointId);return 'Checkpoint '+(c?.targetDate?formatDate(c.targetDate):'not scheduled')+' · expected score '+(c?.expectedMastery==null?'not set':c.expectedMastery+'/4')+(a.practice.length?'\nPractice: '+a.practice.map(x=>x.url).join(', '):'');}).join('\n');
      for(const text of [dayDate(s.date)+'\n'+s.dayType,s.minutes+' min',objectives||s.dayType,s.allocations.map(a=>a.standardRefs.map(x=>x.id).join(', ')||'Teacher-defined goal').join('\n')||'—',(target?target+'\n':'')+(s.reviewNodeIds.length?'Review: '+s.reviewNodeIds.slice(0,3).map(id=>node(id)?.title||id).join('; ')+(s.reviewNodeIds.length>3?'; + '+(s.reviewNodeIds.length-3)+' previously introduced skills':''):'')+(s.diagnostic?'\n'+s.diagnostic:'')])row.append(el('td',text));return row;};
    // Long daily views load in pages so phones are not handed hundreds of rows at once.
    const PAGE=40;let shown=0;const more=el('div',undefined,{class:'actions'});
    const showMore=count=>{for(const s of group.sessions.slice(shown,shown+count))t.tbody.append(sessionRow(s));shown=Math.min(group.sessions.length,shown+count);labelled(t);
      more.replaceChildren();const left=group.sessions.length-shown;
      if(left>0){more.append(btn('Show '+Math.min(PAGE,left)+' more meetings',()=>{showMore(PAGE);},'secondary small'),btn('Show all '+left+' remaining',()=>{showMore(left);},'quiet small'));more.append(el('span',shown+' of '+group.sessions.length+' meetings shown',{class:'hint'}));}};
    showMore(PAGE);detail.append(t.wrap,more);wrap.append(detail);}
  if(c.unscheduled?.length){const d=el('details',undefined,{class:'more'});d.append(el('summary','Not yet scheduled ('+c.unscheduled.length+' skills)'));const body=el('div',undefined,{class:'body'}),ul=el('ul');for(const u of c.unscheduled)ul.append(el('li',(node(u.nodeId)?.title||'Skill')+' · '+u.remainingMinutes+' min · '+(u.required?'required':'optional')));body.append(ul);d.append(body);wrap.append(d);}
}

/* ───────── stage 2: learning goals ───────── */
function renderNodes(){const filter=$('area-filter'),selected=filter.value;filter.replaceChildren(option('','All areas'),...allAreas().filter(a=>p.checkpoints.some(c=>c.areaId===a.id)).map(a=>option(a.id,a.title)));filter.value=[...filter.options].some(o=>o.value===selected)?selected:'';
  const headers=['Skill','Minutes','Target date','Required','Expected score (0–4)','Order'];
  const makeRow=(id,c)=>{const n=node(id),tr=el('tr'),title=el('td',undefined,{class:'node-title'});title.append(el('strong',n.title),el('small',area(c.areaId)),el('small',c.standardRefs.map(x=>x.id).join(', ')||'Teacher-defined learning goal'));
    const control=(type,value,label,change,attrs={})=>{const td=el('td'),input=el('input',undefined,{type,'aria-label':label,...attrs});if(type==='checkbox')input.checked=value;else input.value=value??'';input.onchange=()=>run(()=>{change(type==='checkbox'?input.checked:input.value);invalidate();renderStudent();});td.append(input);return td;};
    tr.append(title,control('number',c.minutes,'Minutes for '+n.title,v=>c.minutes=Number(v),{min:1,max:10000}),p.calendar?control('date',c.targetDate,'Target date for '+n.title,v=>{c.targetDate=v||null;c.targetLocked=!!v;},{min:p.calendar.start,max:p.examDate||p.calendar.end}):el('td','—'),control('checkbox',c.required,'Required: '+n.title,v=>c.required=v),control('number',c.expectedMastery,'Expected 0–4 score for '+n.title,v=>c.expectedMastery=v===''?null:Number(v),{min:0,max:4,step:.5}));
    const actions=el('td'),box=el('div',undefined,{class:'order-actions'}),pos=p.sequence.indexOf(id);for(const [text,delta]of [['↑',-1],['↓',1]]){const b=btn(text,()=>{const j=pos+delta;if(j<0||j>=p.sequence.length)return;[p.sequence[pos],p.sequence[j]]=[p.sequence[j],p.sequence[pos]];invalidate();renderNodes();renderStudent();});b.setAttribute('aria-label',(delta<0?'Move up: ':'Move down: ')+n.title);box.append(b);}box.append(btn('Remove',()=>{
      removeGoals([id]);
    },'quiet small'));
    actions.append(box);tr.append(actions);return tr;};
  // Skills stay in plan order; consecutive skills from one area share a collapsible group.
  const groups=[];for(const id of p.sequence){const c=p.checkpoints.find(c=>c.nodeId===id);if(filter.value&&c.areaId!==filter.value)continue;const last=groups.at(-1);if(last&&last.areaId===c.areaId)last.rows.push([id,c]);else groups.push({areaId:c.areaId,rows:[[id,c]]});}
  const out=groups.map((g,i)=>{const t=table(headers);for(const [id,c] of g.rows)t.tbody.append(makeRow(id,c));labelled(t);
    if(filter.value||groups.length===1)return t.wrap;
    const d=el('details',undefined,{class:'more'});if(i===0)d.open=true;d.append(el('summary',area(g.areaId)+' · '+g.rows.length+(g.rows.length===1?' skill':' skills')));const body=el('div',undefined,{class:'body'});body.append(t.wrap);d.append(body);return d;});
  $('node-table').replaceChildren(...(out.length?out:[el('p','No skills in this area.',{class:'hint'})]));
  const targets=$('area-target-form');
  targets.hidden=!p.calendar||!filter.value;
  const date=targets.elements.date;
  date.value='';
  date.min=p.calendar?.start||'';
  date.max=p.examDate||p.calendar?.end||'';

}

/* ───────── stage 4: review & publish ───────── */
function renderStudent(source=p,isDraft=publicationStatus({published:entry.published,draft:p}).key!=='published',contract=studentContract(source,graph)){
  $('student-source').textContent=isDraft?'Draft preview (not published)':'Published pathway';
  $('student-view').replaceChildren(renderPathway(contract));
}
function renderOverrides(){const t=table(['Date','Type','School / rotation','Minutes','Description','Actions']);for(const o of p.calendar?.overrides||[]){const tr=el('tr');for(const text of [formatDate(o.date)||o.date,o.dayType,(o.schoolDay===false?'Closed':'Instructional')+(o.nonRotation?' / does not advance rotation':'')+(o.rotation?' · '+o.rotation:''),o.minutes??'Default',o.label||''])tr.append(el('td',String(text)));const td=el('td');td.append(btn('Edit',()=>{const f=$('day-edit').elements;f.from.value=f.to.value=o.date;f.type.value=o.dayType;f.minutes.value=o.minutes??'';f.label.value=o.label||'';f.rotation.value=o.rotation||'';f.nonRotation.value=String(o.nonRotation??'');f.schoolDay.value=String(o.schoolDay??'');resetPicker(o.assessmentNodeIds||[]);f.from.scrollIntoView({block:'center'});},'secondary small'),btn('Clear',()=>{p.calendar.overrides=p.calendar.overrides.filter(x=>x.date!==o.date);recalculate();},'secondary small'));tr.append(td);t.tbody.append(tr);}
  $('override-count').textContent=p.calendar?.overrides.length?p.calendar.overrides.length+(p.calendar.overrides.length===1?' special date':' special dates'):'No special dates yet';
  $('overrides').replaceChildren(p.calendar?.overrides.length?labelled(t):el('p','Closures, tests and special dates you add will appear here.',{class:'hint'}));}
const KIND_LABELS={created:'New class pathway',title:'Class name',examDate:'Exam date',calendar:'Calendar and schedule',pacingVisibility:'Student target date visibility',sequence:'Skill order',policies:'Mastery policies',toleranceDays:'Pacing tolerance',customAreas:'Your own areas',customNodes:'Your own skills',added:'Skill added',targetDate:'Target date',required:'Required',policyId:'Mastery policy',policyVersion:'Mastery policy version',practiceGoalPolicyId:'Practice goal',practiceGoalPolicyVersion:'Practice goal version',expectedMastery:'Expected score',minutes:'Minutes',prerequisites:'Prerequisites'};
function renderChanges(changes){
  const t=table(['What changed','Before','After']);
  const describe=(kind,value)=>{if(value===null||value===undefined)return 'Not set';if(kind==='practiceGoalPolicyId')return 'Practice goal';if(kind==='policyId')return p.policies.find(policy=>policy.id===value)?.label||'Earlier setting';if(kind==='required')return value?'Required':'Optional';if(kind==='sequence')return value.map(id=>node(id)?.title||id).join(' → ');if(kind==='policies')return value.map(x=>x.label+' · version '+x.version+' · '+(x.provisional?'provisional':'teacher-activated')+' · questions '+(x.minimumQuestions??'not set')+' · accuracy '+(x.accuracy===null?'not set':Math.round(x.accuracy*100)+'%')).join('\n');if(kind==='calendar')return formatDate(value.start)+' through '+formatDate(value.end)+' · '+value.minutes+' minutes · '+scheduleSummary(value).split(' · ')[0]+' · '+value.overrides.length+' special dates';if(Array.isArray(value))return value.length+' entries';if(typeof value==='object')return value.title||'Updated configuration';return String(value);};
  const add=(label,before,after)=>{const row=el('tr');for(const text of [label,before,after])row.append(el('td',text));t.tbody.append(row);};
  for(const c of changes){const checkpoint=p.checkpoints.find(x=>x.id===c.id),label=checkpoint?node(checkpoint.nodeId)?.title||'Skill':'';add((KIND_LABELS[c.kind]||c.kind)+(label?': '+label:''),describe(c.kind,c.before),c.kind==='created'?p.title+' · '+p.checkpoints.length+' skill checkpoints':describe(c.kind,c.after));
    if(c.kind==='calendar'){const old=new Map((c.before?.overrides||[]).map(o=>[o.date,o])),next=new Map((c.after?.overrides||[]).map(o=>[o.date,o]));for(const date of new Set([...old.keys(),...next.keys()]))if(JSON.stringify(old.get(date))!==JSON.stringify(next.get(date))){const display=o=>o?(o.dayType||'New Instruction')+' · '+(o.minutes??'default')+' minutes'+(o.nonRotation?' · does not advance rotation':''):'Default school/class schedule';add(formatDate(date)||date,display(old.get(date)),display(next.get(date)));}}
  }
  $('changes').replaceChildren(changes.length?labelled(t):el('p','No changes from the published configuration.',{class:'banner good'}));
}
function renderHistory(){const box=$('history-list');box.replaceChildren();for(const r of [...entry.revisions].reverse())box.append(btn('Restore revision '+r.revision+' to draft',()=>{p=clone(r);p.baseRevision=entry.published?.revision||0;p.revision=p.baseRevision;invalidate();render();message('Earlier configuration restored as a draft. Preview and publish to update the class.');}));}

/* ───────── status: what is saved, what is published ───────── */
function refreshStatus(){
  if(!p||!entry)return;
  const pub=publicationStatus({published:entry.published,draft:p}),draft=draftStatus({connected,remote:!!entry.remote,dirty:isDirty()});
  $('page-title').textContent=p.title||'Class learning pathway';
  $('page-sub').textContent=courseLabel(p.courseId)+' · '+scheduleSummary(p.calendar);
  const chips=[chip(pub.label,pub.tone),chip(draft.label,draft.tone)];
  if(lastPublishedAt)chips.push(chip('Last published '+formatWhen(lastPublishedAt),'plain'));
  if(publishError)chips.push(chip('Publication error','bad'));
  $('revision-badge').replaceChildren(...chips);
  const required=p.checkpoints.filter(c=>c.required).length;
  $('step-calendar-note').textContent=p.calendar?scheduleSummary(p.calendar).split(' · ').slice(0,-1).join(' · '):'Optional · self-paced';
  $('step-goals-note').textContent=required+' required '+(required===1?'skill':'skills');
  $('step-pacing-note').textContent=(p.capacity?.meetings||0)+' class meetings';
  $('step-review-note').textContent=pub.label;
  const summary=$('pub-summary');summary.className='banner '+(pub.tone==='good'?'good':'warn');
  summary.replaceChildren(el('p',pub.label,{class:'strong-line'}),el('p',pub.detail),el('p',draft.detail));
  summary.firstChild.style.fontWeight='800';
  // Three plain steps: save, preview, publish.
  const published=pub.key==='published',saved=draft.key==='saved'||(draft.key==='browser'&&!connected),previewed=!!preview;
  const steps=[
    {t:'Draft saved',s:published?'Nothing waiting':draft.label,st:saved||published?'done':'now'},
    {t:'Changes previewed',s:published?'Nothing to preview':previewed?'Ready to publish':'Review what will change',st:published||previewed?'done':saved?'now':''},
    {t:connected?'Published to students':'Local preview revision',s:publishError?'Publication error':published?'Students are up to date':previewed?'Ready when you are':'After preview',st:publishError?'fail':published?'done':previewed?'now':''}
  ];
  $('tracker').replaceChildren(...steps.map((x,i)=>{const li=el('li',undefined,{class:x.st});const dot=el('span',x.st==='done'?'✓':x.st==='fail'?'!':String(i+1),{class:'dot','aria-hidden':'true'}),txt=el('span');txt.append(el('strong',x.t),el('small',x.s+(x.st==='done'?' (complete)':x.st==='fail'?' (needs attention)':'')));li.append(dot,txt);return li;}));
  $('publish-error').hidden=!publishError;
  $('publish-error').replaceChildren(...(publishError?[el('p','Publication error',{class:'strong-line'}),el('p',publishError),el('p','Your draft and the published version are unchanged. Fix the problem and try again.')]:[]));
  if(publishError)$('publish-error').firstChild.style.fontWeight='800';
  $('publish').hidden=!connected;$('local-publish').hidden=connected;
  const ids=[['Class ID',p.classId],['Pathway ID',p.id],['Published revision',entry.published?.revision??'none'],['Shared draft version',entry.draftVersion??'not saved to shared yet'],['Curriculum version',p.graphVersion],['Saved in',entry.remote?'Shared draft and this browser':'This browser only']];
  $('troubleshoot').replaceChildren(...ids.flatMap(([k,v])=>[el('dt',k),el('dd',String(v))]));
}

function render(){
  const masteryLink=$('mastery-settings-link');
  masteryLink.hidden=!entry.remote||!connected;
  masteryLink.querySelector('a').href='../requirements/?class='+encodeURIComponent(p.classId);
  renderSaved();renderEnrollment();setSettings();renderSchedule();renderNodes();renderOverrides();renderStudent();renderHistory();resetPicker();$('coverage-limits').textContent=graph.coverageLimits.join(' ');$('publish-note').textContent=connected?'Preview the saved draft before publishing. Students receive the next revision at a safe question or assessment boundary.':'Shared publication needs a teacher sign-in. Local preview revisions test the structure in this browser. They do not reach student devices.';refreshStatus();}
function recalculate(){const from=$('recalculate-from').value||p.calendar?.start;p=generatePacing(p,graph,{from});invalidate();renderSchedule();renderNodes();renderOverrides();renderStudent(p,true);refreshStatus();message('Schedule updated. Review the changes before publishing.');}
async function saveRemote(){
  if(!connected&&(classHint||entry.owner))throw new Error('Sign in again to save this class draft.');
  if(settingsDirty)readSettings();
  p=generatePacing(p,graph,{from:$('recalculate-from').value||p.calendar?.start});
  validatePathway(p,graph);
  renderSchedule();renderNodes();renderSaved();persist();
  if(!connected){message('Draft saved in this browser. Export a JSON backup (More tools) for a portable copy.');refreshStatus();return;}
  if(entry.needsReload)throw new Error('The shared draft differs from the copy cached in this browser. Export a JSON backup under More tools, then choose Reload shared class before editing. Your cached draft has been kept.');
  if(!entry.remote){
    const classId=profilesAvailable ? $('enrolled-class').value : p.classId;
    if(!classId)throw new Error('Choose a student class for this course (Step 1) before saving a shared draft.');
    if(remotePlans.some(item=>item.classId===classId))throw new Error('This class already has a shared pathway. Open it from the Class menu.');
    const upload={...clone(p),classId,revision:0,baseRevision:0,checkpoints:p.checkpoints.map(c=>({...c,revision:0}))};
    const out=await teacherRequest('/pathways/teacher',{body:upload});
    entry.localRevisions=clone(entry.revisions);
    entry.revisions=[];entry.published=null;p=upload;entry.remote=true;entry.owner=loadedOwner;entry.draftVersion=out.draftVersion;
    remotePlans.push({id:p.id,classId,title:p.title});
    renderEnrollment();renderSaved();
  } else {
    const out=await teacherRequest('/pathways/teacher/'+p.id+'/draft',{body:{pathway:p,draftVersion:entry.draftVersion}});
    entry.draftVersion=out.draftVersion;
  }
  markSaved();persist();settingsDirty=false;$('settings-dirty').hidden=true;refreshStatus();message('Draft saved. Students still see the published version until you publish.');
}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

/* ───────── stage navigation ───────── */
function showStage(name,{focus=false}={}){
  name=STAGE_ALIASES[name]||name;if(!STAGES.includes(name))name='goals';stage=name;
  for(const sec of document.querySelectorAll('[data-stage-panel]'))sec.hidden=sec.dataset.stagePanel!==name;
  for(const b of document.querySelectorAll('#stepper button')){if(b.dataset.stage===name)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');}
  if(focus){const h=document.querySelector(`[data-stage-panel="${name}"] h2`);if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}document.getElementById('stepper').scrollIntoView({block:'start'});}
}
const goStage=name=>{location.hash=name;};
window.addEventListener('hashchange',()=>showStage(location.hash.slice(1),{focus:true}));
for(const b of document.querySelectorAll('#stepper button'))b.onclick=()=>goStage(b.dataset.stage);
for(const b of document.querySelectorAll('[data-go]'))b.onclick=()=>run(()=>{
  // Leaving Step 1 with edited settings applies them first, so nothing is silently lost.
  if(stage==='calendar'&&settingsDirty&&p.calendar)applySettings();
  goStage(b.dataset.go);
});

/* ───────── handlers ───────── */
$('copy').onclick=()=>run(()=>{const copied=clone(p);copied.id=crypto.randomUUID();copied.classId=crypto.randomUUID();copied.title+=' (copy)';copied.revision=copied.baseRevision=0;copied.checkpoints=copied.checkpoints.map(c=>({...c,id:'checkpoint:'+copied.id+':'+c.nodeId,pathwayId:copied.id,revision:0}));p=generatePacing(copied,graph);entry={draft:p,revisions:[],remote:false,draftVersion:null};savedSnapshot=null;lastPublishedAt=null;invalidate();render();message('Independent class copy created. Publishing this copy cannot change the original class.');});
$('new').onclick=()=>run(()=>{lastPublishedAt=null;newClass($('course').value||'advanced');message('New draft pathway started. Pacing is optional.');goStage('goals');});
$('saved').onchange=()=>run(async()=>{
  const id=$('saved').value;lastPublishedAt=null;
  const plan=connected&&remotePlans.find(item=>item.id===id);
  if(plan && plan.classId!==classHint){
    const url=new URL(location.href);url.searchParams.set('class',plan.classId);location.assign(url);
    return;
  }
  if(plan)return openRemote(id);
  entry=store.classes[id];p=clone(entry.draft);savedSnapshot=null;invalidate();render();
});
$('settings').onsubmit=e=>{e.preventDefault();run(applySettings);};
$('generate').onclick=()=>run(recalculate);$('save').onclick=()=>run(saveRemote,'publish');$('view').onchange=renderSchedule;$('area-filter').onchange=renderNodes;
$('add-pacing').onclick=()=>{
  $('settings').hidden=false;$('add-pacing').hidden=true;
  $('settings').elements.start.focus();
};
$('remove-pacing').onclick=()=>run(()=>{
  p=removePacing(p);
  invalidate();render();
  message('Pacing removed from the draft. Publish changes to return students to a self-paced pathway.');
});

function removeGoals(ids){
  const removed=new Set(ids);
  p.checkpoints=p.checkpoints.filter(c=>!removed.has(c.nodeId)).map(c=>({...c,prerequisites:c.prerequisites.filter(id=>!removed.has(id))}));
  p.sequence=p.sequence.filter(id=>!removed.has(id));
  p.sessions=[];
  $('recalculate-from').value=p.calendar?.start||'';
  recalculate();
  message('Learning goals removed from the draft. Past practice and assessment records are kept.');
}

$('area-target-form').onsubmit=e=>{
  e.preventDefault();
  run(()=>{
    const selected=$('area-filter').value,date=e.currentTarget.elements.date.value||null;
    if(!p.calendar||!selected)return;
    for(const c of p.checkpoints.filter(item=>item.areaId===selected)){
      c.targetDate=date;c.targetLocked=!!date;
    }
    invalidate();renderNodes();renderStudent();
    message(date?'Area target saved in the draft.':'Area target dates cleared from the draft.');
  });
};
$('day-edit').onsubmit=e=>{e.preventDefault();run(()=>{const f=$('day-edit').elements,patch={dayType:f.type.value,label:f.label.value};if(f.minutes.value!=='')patch.minutes=Number(f.minutes.value);if(f.schoolDay.value!=='')patch.schoolDay=f.schoolDay.value==='true';if(f.nonRotation.value!=='')patch.nonRotation=f.nonRotation.value==='true';if(f.rotation.value)patch.rotation=f.rotation.value;patch.assessmentNodeIds=list(f.assessmentNodes.value);p.calendar=bulkDates(p.calendar,f.from.value,f.to.value,patch);resetPicker();recalculate();});};
$('assess-search').oninput=renderPicker;
$('assess-search').onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
$('calendar-file').onchange=()=>run(async()=>{const file=$('calendar-file').files[0];if(!file)return;imported=importCalendar(await file.text(),file.name.endsWith('.ics')?'ics':'csv');const t=table(['Date','Description','Classification','Minutes','Confirm uncertain']);
  for(const e of imported){const tr=el('tr');tr.append(el('td',e.date),el('td',e.label));const type=el('select',undefined,{'aria-label':'Classification for '+e.date});type.append(...DAY_TYPES.map(v=>option(v,v)));type.value=e.dayType;type.onchange=()=>{e.dayType=type.value;e.schoolDay=e.dayType!=='No Class';e.confirmed=false;check.checked=false;};const td=el('td');td.append(type);tr.append(td);const min=el('input',undefined,{type:'number',min:0,max:1440,'aria-label':'Minutes for '+e.date});min.value=e.minutes??'';min.onchange=()=>e.minutes=min.value===''?null:Number(min.value);const mt=el('td');mt.append(min);tr.append(mt);const check=el('input',undefined,{type:'checkbox','aria-label':'Confirm classification for '+e.date});check.checked=e.confirmed;check.onchange=()=>e.confirmed=check.checked;const ct=el('td');ct.append(check);tr.append(ct);t.tbody.append(tr);}
  $('import-preview').replaceChildren(el('p',imported.length+' school dates. Confirm uncertain classifications and shortened minutes before applying.'),labelled(t),btn('Confirm import & apply',()=>{p.calendar=applyImport(p.calendar,imported);recalculate();$('import-preview').replaceChildren();},'primary'));});
for(const [buttonId,delta]of [['area-up',-1],['area-down',1]])$(buttonId).onclick=()=>run(()=>{const selected=$('area-filter').value;if(!selected)throw new Error('Select an area first.');const areas=[...new Set(p.sequence.map(id=>p.checkpoints.find(c=>c.nodeId===id).areaId))],i=areas.indexOf(selected),j=i+delta;if(j<0||j>=areas.length)return;[areas[i],areas[j]]=[areas[j],areas[i]];p.sequence=areas.flatMap(a=>p.sequence.filter(id=>p.checkpoints.find(c=>c.nodeId===id).areaId===a));invalidate();renderNodes();renderStudent(p,true);message('Area reordered in your draft. Update the schedule in Step 3 to recalculate dates.');});
$('optional-area').onclick=()=>run(()=>{if(!$('area-filter').value)throw new Error('Select an area first.');for(const c of p.checkpoints)if(c.areaId===$('area-filter').value)c.required=false;invalidate();renderNodes();renderStudent(p,true);});
$('remove-area').onclick=()=>run(()=>{
  const id=$('area-filter').value;
  if(!id)throw new Error('Select an area first.');
  removeGoals(p.checkpoints.filter(c=>c.areaId===id).map(c=>c.nodeId));
});
$('add-node').onsubmit=e=>{e.preventDefault();run(()=>{const f=$('add-node').elements;let a=p.customAreas.find(a=>a.title===f.area.value);if(!a){a={id:'area:custom:'+crypto.randomUUID(),title:f.area.value,courseId:p.courseId};p.customAreas.push(a);}const id='node:custom:'+crypto.randomUUID(),refs=list(f.standards.value).map(s=>{const i=s.indexOf(':');if(i<1)throw new Error('Use registry:id for standard references.');return {registry:s.slice(0,i),id:s.slice(i+1)};});const n={id,areaId:a.id,courseId:p.courseId,title:f.objective.value,objective:f.objective.value,standardRefs:refs,primaryObjectives:refs.length?refs:[{registry:'teacher-objective',id,label:f.objective.value}],practice:f.url.value?[{activityId:'teacher-assigned',url:f.url.value}]:[],prerequisites:list(f.prerequisites.value),familySelectors:[],estimatedMinutes:Number(f.minutes.value),estimateProvisional:true};p.customNodes.push(n);p.sequence.push(id);p.checkpoints.push({id:'checkpoint:'+p.id+':'+id,pathwayId:p.id,areaId:a.id,nodeId:id,standardRefs:n.standardRefs,primaryObjectives:n.primaryObjectives,targetDate:null,targetLocked:false,required:true,policyId:p.policies[0].id,policyVersion:p.policies[0].version,expectedMastery:null,practice:n.practice,prerequisites:n.prerequisites,minutes:n.estimatedMinutes,revision:p.revision});recalculate();f.reset?.();});};
$('preview').onclick=()=>run(async()=>{await saveRemote();if(connected){preview=await teacherRequest('/pathways/teacher/'+p.id+'/preview',{body:{}});renderChanges(preview.changes);$('publish').disabled=false;}else{preview={changes:diffPathways(entry.published,p)};renderChanges(preview.changes);$('local-publish').disabled=false;}renderStudent(p,true,preview.studentPreview);refreshStatus();message('Preview ready. Review deadlines, requirements, protected windows and what students will see.');},'publish');
$('publish').onclick=()=>run(async()=>{if(!preview||!connected)throw new Error('Preview the latest shared draft first.');const result=await teacherRequest('/pathways/teacher/'+p.id+'/publish',{body:{previewToken:preview.previewToken,draftVersion:preview.draftVersion,expectedRevision:preview.expectedRevision}});p=result.published;entry.published=clone(p);entry.revisions.push(clone(p));entry.draftVersion=preview.draftVersion+1;markSaved();invalidate();render();loadLastPublished();message('Published. Enrolled students can see this pathway in My Class Progress.');},'publish');
$('local-publish').onclick=()=>run(()=>{if(!preview)throw new Error('Preview the draft first.');p=clone(p);p.revision=(entry.published?.revision||0)+1;p.baseRevision=p.revision;p.checkpoints=p.checkpoints.map(c=>({...c,revision:p.revision}));entry.published=clone(p);entry.revisions.push(clone(p));invalidate();render();message('Local preview revision saved. Nothing was sent to students.');},'publish');
$('history').onclick=()=>run(async()=>{if(!connected||!entry.remote){renderHistory();return;}const out=await teacherRequest('/pathways/teacher/'+p.id+'/history');$('history-list').replaceChildren(...out.revisions.map(r=>btn('Restore shared revision '+r.revision+' to draft',async()=>{const restored=await teacherRequest('/pathways/teacher/'+p.id+'/rollback',{body:{revision:r.revision,draftVersion:entry.draftVersion}});p=restored.draft;entry.draftVersion=restored.draftVersion;markSaved();invalidate();render();message('Earlier version restored as a draft. Preview and publish to update students.');})));});
$('export-json').onclick=()=>run(()=>download('class-pathway.json',JSON.stringify({format:'cs-games-pathway-backup',graphVersion:graph.version,...entry,draft:p},null,2),'application/json'));
$('export-csv').onclick=()=>run(()=>download('class-pacing.csv',exportCSV(p),'text/csv'));$('export-ics').onclick=()=>run(()=>download('class-pacing.ics',exportICS(p),'text/calendar'));
$('reload-shared').onclick=()=>run(async()=>{if(!connected||!entry.remote)throw new Error('Sign in and choose a shared class first.');const current=await teacherRequest('/pathways/teacher/'+p.id);entry.recoveryDrafts=[...(entry.recoveryDrafts||[]),clone(p)];p=current.draft;entry.draftVersion=current.draftVersion;entry.published=current.published;entry.needsReload=false;markSaved();invalidate();render();loadLastPublished();message('Shared class reloaded. The previous browser copy is kept in the next JSON backup (recoveryDrafts).');});
$('restore').onclick=()=>$('restore-file').click();$('restore-file').onchange=()=>run(async()=>{const file=$('restore-file').files[0];if(!file)return;if(file.size>10000000)throw new Error('Backup is too large.');const data=JSON.parse(await file.text()),draft=data.draft||data;validatePathway(draft,graph);p=draft;entry={draft:p,published:data.published||null,revisions:data.revisions||[],remote:false,draftVersion:null};savedSnapshot=null;lastPublishedAt=null;invalidate();render();message('Backup restored as a local draft. Sign in and reload the shared class before publishing.');});
$('copy-ids').onclick=()=>run(async()=>{const text=[...$('troubleshoot').children].reduce((out,n,i,all)=>n.tagName==='DT'?out+n.textContent+': '+all[i+1].textContent+'\n':out,'');try{await navigator.clipboard.writeText(text);message('Troubleshooting details copied.');}catch{message('Copy is not available here. Select the details above and copy them manually.',true);}});

/* ───────── sign-in ───────── */
async function connect(active){
  connected=false;
  const connection=$('connection');
  if(!active){
    remotePlans=[];enrolledClasses=[];
    connection.className='banner info';
    connection.textContent=classHint||loadedOwner
      ? 'Sign in to save shared drafts and publish. Your in-progress changes stay in this tab.'
      : 'Sign in to save shared drafts and publish to students. You can plan locally in the meantime.';
    if(classHint||entry?.owner)$('pacing-content').hidden=true;
    if(p){
      preview=null;$('publish').disabled=true;$('local-publish').disabled=true;
      renderSaved();renderEnrollment();refreshStatus();
      if(entry.owner){$('page-title').textContent='Class learning pathway';$('page-sub').textContent='';}
    }
    return;
  }
  const [plans,classes]=await Promise.all([
    teacherRequest('/pathways/teacher'),
    profilesAvailable ? teacherRequest('/teacher/profiles') : {classes:[]},
  ]);
  if(currentTeacher()!==active)return;
  remotePlans=plans.pathways;enrolledClasses=classes.classes;
  if(classHint&&!enrolledClasses.some(c=>c.id===classHint&&!c.archived)){
    $('pacing-content').hidden=true;
    throw new Error('This class is unavailable. Choose a class from My Classes.');
  }
  const selected=remotePlans.find(item=>item.classId===classHint) || remotePlans.find(item=>item.id===p.id);
  const resume=loadedOwner===active.owner && (!entry.owner||entry.owner===active.owner)
    && (!classHint||p.classId===classHint);
  loadedOwner=active.owner;
  connected=true;
  connection.className='banner good';
  connection.textContent='Signed in. You can save shared drafts and publish to your enrolled classes.';
  if(resume){
    renderSaved();renderEnrollment();refreshStatus();
  }else if(selected){
    await openRemote(selected.id);
  }else{
    const classroom=enrolledClasses.find(c=>c.id===classHint&&!c.archived);
    const cached=classroom&&Object.values(store.classes).find(item=>!item.remote&&item.owner===active.owner&&item.draft.classId===classHint);
    if(cached){entry=cached;p=clone(entry.draft);savedSnapshot=null;render();}
    else if(classroom)newClass(classroom.course_id,classroom);
    else if(entry.owner&&entry.owner!==active.owner)newClass();
    else render();
  }
  if(currentTeacher()===active)$('pacing-content').hidden=false;
}
$('enrolled-class').onchange=()=>{preview=null;$('publish').disabled=true;refreshStatus();};
/* ───────── start ───────── */
buildStaticControls();
document.addEventListener('input',e=>{
  if(e.target.closest('#settings')){settingsDirty=true;$('settings-dirty').hidden=false;updateScheduleUI();}
  if(e.target.closest('#settings,#day-edit,#add-node,#node-table')){preview=null;$('publish').disabled=true;$('local-publish').disabled=true;queueStatus();}
});
document.addEventListener('change',e=>{if(e.target.closest('#settings')){settingsDirty=true;$('settings-dirty').hidden=false;updateScheduleUI();}});
const initial=store.classes[store.selected];
if(initial&&!initial.remote&&!initial.owner){entry=initial;p=clone(entry.draft);render();}else newClass('advanced',null,{temporary:!!classHint});
if(classHint)$('pacing-content').hidden=true;
mountTeacherAccount($('auth'));
observeTeacher(active=>void connect(active).catch(error=>{
  if(currentTeacher()===active){$('connection').className='banner bad';$('connection').textContent=error.message;}
}));
showStage(location.hash.slice(1)||'goals');
