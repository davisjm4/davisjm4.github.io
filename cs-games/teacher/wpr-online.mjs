import { teacherProfiles, profileClassSelect } from './wpr-profiles.mjs';
import { generateDiagnostic, availability, validateSnapshot } from './wpr-online-builder.mjs';
import { VERSION, csv, MODES, LEVELS } from '../../wpr-games/workplace-readiness/online/model.mjs';
import { apiBase, googleClientId, request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { el, button, pct, table, download, options, copy } from '../../wpr-games/workplace-readiness/online/dom.mjs';

const W = globalThis.WRG;
const host = document.getElementById('wpr-online');
const slot = id => document.getElementById(id);
const kindNames = {diagnostic:'Diagnostic assessment',practice:'Targeted practice'};
const assignmentPath = '/wpr-games/workplace-readiness/?assignment=';
const modeNames = {decision:'Workplace Decisions',nextstep:'Best Next Step',order:'Put the Steps in Order',find:'Find the Problem'};
let token = '', questions = [], generated = null;
const status = el('p',{role:'status','aria-live':'polite',id:'wpr-builder-status'});
const publishStatus = el('p',{role:'status'});
const preview = el('div',{id:'wpr-online-preview'});
const auth = el('div',{id:'wpr-teacher-auth'});
const reports = el('div',{id:'wpr-class-reports'});
const input = (name,props)=>el('input',{name,...props});
const select = (name,choices)=>el('select',{name},options(choices));
const labelled = (text,control)=>el('label',{},text,control);
const checks = (name,title,choices)=>el('details',{},el('summary',{text:title}),
  el('fieldset',{class:'wpr-checks'},el('legend',{text:title}),
    choices.map(([value,label])=>el('label',{},input(name,{type:'checkbox',value}),' '+label))));
const profileClass=profileClassSelect();
const profileManager=teacherProfiles(()=>token,profileClass.update);
const settings = el('div',{class:'teacher-form'},
  labelled('Assignment title',input('title',{maxlength:120,value:'Workplace Readiness Diagnostic',required:true})),
  labelled('Assignment type',select('kind',[['diagnostic','Diagnostic assessment'],['practice','Targeted practice assignment']])),
  labelled('Difficulty',select('difficulty',LEVELS.map(x=>[x,x[0].toUpperCase()+x.slice(1)]))),
  labelled('Feedback timing',select('feedbackTiming',[['after','After submission'],['immediate','After each answer']])),
  labelled('Retakes',select('retakes',[['once','One completed attempt per browser or class profile'],['repeat','Allow repeat attempts']])),
  labelled('Optional closing date',input('closes',{type:'datetime-local'})),profileClass.field);
const form = el('form',{id:'wpr-builder-form'},settings,
  el('div',{class:'wpr-checks'},
    el('label',{},input('shuffle',{type:'checkbox',checked:true}),' Shuffle question order'),
    el('label',{},input('reporting',{type:'checkbox',checked:true}),' Collect anonymous class totals')),
  checks('skills','Filter by official skill (optional)',W.content.skills.map(s=>[s.id,s.name])),
  checks('contexts','Filter by career setting (optional)',W.content.contexts.map(c=>[c.id,c.name||c.label])),
  checks('modes','Filter by practice mode (optional)',MODES.map(m=>[m,modeNames[m]])));
const quotaOptions = [
  ['all','Mixed Workplace Readiness'],
  ...W.content.topics.flatMap(t=>[['topic:'+t.id,t.name],...t.subtopics.map(([id,name])=>['subtopic:'+id,t.name+' / '+name])]),
  ...W.content.skills.map(s=>['skill:'+s.id,'Official skill / '+s.name])
];
const quotas = el('div',{id:'wpr-quotas'});
function addQuota(value='all', count=5) {
  const area = select('quota',quotaOptions); area.value=value;
  const number = input('quota-count',{type:'number',min:1,max:50,value:count,required:true});
  const info=el('small',{class:'muted'});
  const row=el('div',{class:'wpr-quota'},labelled('Coverage group',area),labelled('Questions',number),
    button('Remove group',()=>{row.remove();invalidate();}),info);
  quotas.append(row); updateAvailability();
}
function filters() {
  const f = new FormData(form);
  return { skills:f.getAll('skills'), contexts:f.getAll('contexts'), modes:f.getAll('modes'), difficulty:f.get('difficulty') };
}
function quotaFor(row) {
  const area=row.querySelector('select');
  const [scope,id]=area.value.split(':');
  return {scope,id,count:Number(row.querySelector('input').value),name:area.selectedOptions[0].textContent};
}
function updateAvailability() {
  for (const row of quotas.children) {
    const a=availability(filters(),quotaFor(row));
    row.querySelector('small').textContent=a.families+' families · '+a.questions+' distinct configurations';
  }
}
function invalidate() {
  questions=[];generated=null;preview.replaceChildren();
  publish.disabled=true;updateAvailability();
}
function snapshot() {
  const f = new FormData(form);
  return { version:VERSION,title:String(f.get('title')).trim(),kind:f.get('kind'),retakes:f.get('retakes'),
    feedbackTiming:f.get('feedbackTiming'),shuffle:f.has('shuffle'),reporting:f.has('reporting')||f.get('kind')==='diagnostic',
    profileClassId:f.get('profileClassId') || undefined,
    closes:f.get('closes') ? new Date(f.get('closes')).getTime() : null,questions };
}
function showPreview() {
  const rows = generated.quotas.map(q=>[q.name,String(q.count)]);
  preview.replaceChildren(table(['Requested group','Assigned questions'],rows,'Question distribution'));
  questions.forEach((q,i)=>{
    const details=el('details',{},el('summary',{text:'Question '+(i+1)+' · '+q.topic+' · '+q.difficulty}),
      el('p',{text:q.tags.map(t=>t.subtopic).join(' · ')}),el('p',{text:q.context}),
      q.passage?el('pre',{text:q.passage}):null,q.response?el('pre',{text:q.response}):null,
      el('p',{text:q.prompt}),el('ol',{},q.choices.map((choice,j)=>el('li',{text:choice+(j===q.correctIndex?' (correct)':'')}))),
      el('p',{text:q.explanation}),
      button('Regenerate question '+(i+1),()=>{
        const held=questions.map((item,j)=>i===j?null:item);
        try {
          let updated;
          for (let retry=0;retry<12;retry++) {
            updated=generateDiagnostic(generated.filters,generated.quotas,crypto.randomUUID(),held);
            if (updated[i].id!==q.id) break;
          }
          if (updated[i].id===q.id) throw new Error('This selection has no alternate available for the question.');
          questions=updated;showPreview();preview.children[i+1].open=true;preview.children[i+1].querySelector('summary').focus();
        } catch(e) {status.textContent=e.message;}
      }));
    preview.append(details);
  });
  publish.disabled=false;
  status.textContent=questions.length+' validated questions ready for preview. Generate again to replace the full set.';
}
const publish=button('Publish online assignment',async()=>{
  const a=snapshot(), error=validateSnapshot(a);
  if (error) {publishStatus.textContent=error;return;}
  if (!token) {publishStatus.textContent='Sign in as a teacher to publish.';return;}
  publish.disabled=true;
  try {
    const {id}=await request('/teacher/assignments',{token,body:a});
    const url=new URL(assignmentPath+id,location.href).href;
    publishStatus.replaceChildren(el('a',{href:url,text:'Open student assignment'}),' ',
      button('Copy student link',()=>copy(url,status)));
    refreshAssignments();
  } catch(e) {publishStatus.textContent=e.message;}
  finally {publish.disabled=false;}
},'btn primary');
publish.disabled=true;
form.append(el('h3',{text:'Question distribution'}),el('p',{text:'Add one group for each skill, topic, or subtopic you want to measure. The builder fills each group with distinct questions.'}),quotas,
  el('div',{class:'actions'},button('Add coverage group',()=>{addQuota();invalidate();}),
    el('button',{type:'submit',text:'Generate / regenerate assessment'})));
form.addEventListener('change',e=>{
  if (e.target.name==='kind' && e.target.value==='practice') form.elements.feedbackTiming.value='immediate';
  if (e.target.name==='kind') {
    const diagnostic=e.target.value==='diagnostic';
    form.elements.reporting.disabled=diagnostic;
    if (diagnostic) form.elements.reporting.checked=true;
  }
  if (['skills','contexts','modes','difficulty','quota','quota-count'].includes(e.target.name)) invalidate();
});
form.elements.reporting.disabled=true;
form.addEventListener('submit',e=>{
  e.preventDefault();
  try {
    const selection={filters:filters(),quotas:[...quotas.children].map(quotaFor)};
    if (new Set(selection.quotas.map(q=>q.scope+':'+q.id)).size!==selection.quotas.length)
      throw new Error('Choose a different coverage group for each row.');
    const next=generateDiagnostic(selection.filters,selection.quotas,crypto.randomUUID());
    questions=next;
    const invalid=validateSnapshot(snapshot());
    if (invalid) throw new Error(invalid);
    generated=selection;showPreview();
  } catch(e) {invalidate();status.textContent=e.message;}
});
host.append(el('h2',{text:'Create an online diagnostic or practice'}),el('p',{class:'muted',text:'Build a Workplace Readiness diagnostic or tracked practice assignment. A published link opens a frozen set of questions. Anonymous assignments are available to any student with the link.'}),
  form,status,preview,el('div',{class:'actions'},publish),publishStatus);
(slot('teacher-account')||host).append(auth);
if (slot('published-assessments')) slot('published-assessments').replaceChildren(reports); else host.append(reports);
if (slot('my-classes')) slot('my-classes').append(profileManager.root); else host.append(profileManager.root);
addQuota();

const authControls = el('div',{id:'wpr-teacher-signin',class:'actions'});
const authNote = el('div',{id:'wpr-teacher-auth-note',role:'status','aria-live':'polite'});
auth.append(authNote,authControls);
async function signIn(value) {
  token=value;
  try {await refreshAssignments(true);}
  catch(e) {token='';authNote.replaceChildren(el('p',{class:'banner bad',role:'alert',text:e.message}));return;}
  authNote.replaceChildren(el('div',{class:'actions'},el('span',{class:'chip good',text:'Signed in as teacher'}),
    button('Sign in again',()=>{authControls.hidden=false;authNote.replaceChildren();},'btn quiet small')));
  authControls.hidden=true;
  try {await profileManager.refresh();} catch(e) {status.textContent=e.message;}
}
if (!apiBase) authNote.append(el('p',{class:'muted',text:'Preview is available. Publishing and class reports require a connected reporting service.'}));
else if (['127.0.0.1','localhost'].includes(location.hostname)) {
  const secret=input('teacher-key',{type:'password',autocomplete:'off'});
  authControls.append(labelled('Local development teacher token',secret),button('Sign in to development service',()=>{
    const value=secret.value;secret.value='';signIn(value);
  },'btn primary'));
} else if (googleClientId) {
  const script=el('script',{src:'https://accounts.google.com/gsi/client',async:true});
  script.onload=()=>{
    google.accounts.id.initialize({client_id:googleClientId,callback:r=>signIn(r.credential)});
    google.accounts.id.renderButton(authControls,{theme:'outline',text:'signin_with'});
  };
  script.onerror=()=>authNote.append(el('p',{class:'banner bad',role:'alert',text:'Teacher sign-in could not load. Check your connection and refresh the page.'}));
  document.head.append(script);
}
async function refreshAssignments(propagate=false) {
  try {
    const data=await request('/teacher/assignments',{token});
    reports.replaceChildren(el('div',{class:'actions'},button('Refresh assignments',()=>refreshAssignments(),'btn small')));
    if (!data.assignments.length) reports.append(el('p',{class:'muted',text:'You have not published an assessment yet. Create one under Create an online diagnostic or practice.'}));
    for (const a of data.assignments) {
      const url=new URL(assignmentPath+a.id,location.href).href;
      reports.append(el('div',{class:'row-card'},
        el('div',{},el('strong',{text:a.title}),el('small',{text:kindNames[a.kind]||'Online assignment'})),
        el('div',{class:'actions'},
          button('Class report',()=>openReport(a.id)),
          button('Copy student link',()=>copy(url,status)),
          button('Delete assignment',async()=>{
            if (!confirm('Delete '+a.title+' and its class totals?')) return;
            try {await request('/teacher/'+a.id,{token,method:'DELETE'});await refreshAssignments();}
            catch(e) {status.textContent=e.message;}
          },'btn danger'))));
    }
    reports.append(el('div',{id:'wpr-active-report',tabindex:-1}));
  } catch(e) {if (propagate) throw e;status.textContent=e.message;}
}
function aggregateCsv(data) {
  return csv([['schema_version','assignment_id','title','completed_submissions','submissions_in_breakdowns','scope','id','name','attempted','correct','accuracy','count','misconception'],
    [VERSION,data.id,data.title,data.completed,data.included,'overall','','Overall',data.n,data.c,data.n?data.c/data.n:'','',''],
    ...(data.groups||[]).map(r=>[VERSION,data.id,data.title,data.completed,data.included,r.scope,r.id,r.name,r.n,r.c,r.c/r.n,'','']),
    ...(data.distribution||[]).map(r=>[VERSION,data.id,data.title,data.completed,data.included,'distribution','',''+r.min+'–'+r.max,'','','',r.count,'']),
    ...(data.items||[]).flatMap(r=>[[VERSION,data.id,data.title,data.completed,data.included,'item',r.id,r.prompt,r.n,r.c,r.c/r.n,'',''],
      ...r.choices.map(c=>[VERSION,data.id,data.title,data.completed,data.included,'incorrect_choice',r.id,c.text,'','','',c.count,c.misconception])])]);
}
async function openReport(id) {
  const panel=document.getElementById('wpr-active-report');
  panel.replaceChildren(el('p',{role:'status',text:'Loading class report…'}));
  try {
    const data=await request('/teacher/'+id,{token});
    panel.replaceChildren(el('h3',{text:data.title+' class report'}),
      el('p',{text:data.reporting?data.completed+' completed submissions. One student may contribute multiple submissions.':'Class reporting was disabled for this assignment.'}),
      button('Refresh class report',()=>openReport(id)));
    panel.focus();
    if (!data.reporting) return;
    if (data.suppressed) {
      panel.append(el('p',{text:'Breakdowns appear after '+data.minimum+' completed submissions.'}));
      return;
    }
    panel.append(el('p',{text:'Average '+pct(data.n,data.c)+' · '+data.n+' answers from '+data.included+' submissions. Breakdowns refresh in groups of five.'}),
      button('Download aggregate CSV',()=>download('wpr-class-report.csv',aggregateCsv(data))),
      table(['Score range','Completed submissions'],data.distribution.map(r=>[r.min+'–'+r.max+'%',r.count===null?'Below reporting minimum':String(r.count)]),'Score distribution'));
    for (const scope of ['skill','topic','subtopic']) {
      const ranked = data.groups.filter(x=>x.scope===scope).sort((a,b)=>a.c/a.n-b.c/b.n);
      if (ranked.length) panel.append(table(['Area','Accuracy','Correct / attempted'],ranked.map(r=>[r.name,pct(r.n,r.c),r.c+'/'+r.n]),scope[0].toUpperCase()+scope.slice(1)+' accuracy · lowest to highest'));
    }
    const ranked = data.groups.filter(x=>x.scope==='topic').sort((a,b)=>a.c/a.n-b.c/b.n);
    if (ranked.length) {
      const weak=ranked.filter(r=>r.c/r.n<0.8).slice(0,3);
      panel.append(el('p',{text:'Strongest topic · '+ranked.at(-1).name+' ('+pct(ranked.at(-1).n,ranked.at(-1).c)+')'}));
      for (const r of weak) panel.append(el('p',{},r.name+' · '+pct(r.n,r.c)+' ',
        button('Create targeted practice',()=>{
          form.reset();form.elements.kind.value='practice';form.elements.feedbackTiming.value='immediate';
          form.elements.reporting.disabled=false;form.elements.reporting.checked=true;
          form.elements.title.value=r.name+' · Targeted Practice';
          quotas.replaceChildren();addQuota('topic:'+r.id,Math.min(5,availability(filters(),{scope:'topic',id:r.id}).questions));
          invalidate();form.elements.title.focus();
        })));
    }
    panel.append(el('h4',{text:'Frequently missed questions'}));
    for (const q of data.items.filter(q=>q.n>q.c).slice(0,15)) panel.append(el('article',{class:'wpr-class-item'},
      el('p',{text:q.context+' '+q.prompt}),el('p',{text:(q.n-q.c)+' missed of '+q.n}),
      q.choices.length?el('ul',{},q.choices.slice().sort((a,b)=>b.count-a.count).map(c=>el('li',{text:c.count+' chose '+c.text+' · '+c.misconception})))
        :el('p',{text:'Incorrect choices did not reach the reporting minimum.'})));
  } catch(e) {panel.textContent=e.message;}
}
