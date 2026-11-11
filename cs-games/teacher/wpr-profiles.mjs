import {renderPathway} from '../student/pathway-view.mjs';
import { profilesAvailable } from '../../wpr-games/workplace-readiness/online/config.mjs';
import {currentTeacher,teacherRequest} from './session.mjs';
import { csv } from '../../wpr-games/workplace-readiness/online/model.mjs';
import { el, button, download, table, copy, options } from '../../wpr-games/workplace-readiness/online/dom.mjs';
import { PROFILE_CSV_HEADER, profileCsv, profileCsvRows, renderProfileProgress } from '../../wpr-games/workplace-readiness/online/profile-report.mjs';
import { COURSE_LABELS, courseLabel, publicationStatus, formatWhen } from './ui-model.mjs';

const courseNames=COURSE_LABELS;
const enrollUrl=invite=>new URL('/cs-games/student/'+'#enroll='+invite,location.href).href;
const path='/teacher/profiles';
const classHint=new URLSearchParams(location.search).get('class');
const pacingHref=(id,stage='goals')=>'/cs-games/teacher/pacing/?class='+encodeURIComponent(id)+'#'+stage;
const credentialText=({id,recovery})=>'Profile ID: '+id+'\nRecovery credential: '+recovery+'\nShare privately with this student only.';
const chip=(text,tone='plain')=>el('span',{class:'chip '+tone,text});
// Native replaceChildren() turns `false` into the text "false"; this drops empty children first.
const put=(node,...children)=>{node.replaceChildren(...children.flat().filter(x=>x!=null&&x!==false));return node;};
export function profileClassSelect() {
  const select=el('select',{name:'profileClassId',disabled:true},options([['','Anonymous assignment']]));
  const field=el('label',{hidden:!profilesAvailable},'Student reporting',select);
  return {field,update(classes,requested){
    const selected=requested||select.value;
    const active=classes.filter(c=>!c.archived);
    select.replaceChildren(...options([['','Anonymous assignment'],...active.map(c=>[c.id,'Class profile · '+c.title])]));
    select.value=active.some(c=>c.id===selected)?selected:'';
    select.disabled=!active.length;
  }};
}
export function teacherProfiles(onClasses) {
  const root=el('section',{id:'wpr-teacher-profiles',hidden:true,'aria-label':'Student profile classes'});
  const status=el('p',{role:'status','aria-live':'polite',class:'muted'}), classList=el('div',{class:'class-grid'}), panel=el('div',{id:'class-overview'}), credential=el('div',{class:'credential'});
  let classes=[], pathways=new Map(), selectedId=null, creating=false;
  const invites=new Map();
  const api=(suffix,opts={})=>teacherRequest(path+suffix,opts);
  const rq=(suffix,opts={})=>teacherRequest(suffix,opts);
  const act=(label,fn,cls='btn')=>button(label,async event=>{
    const clicked=event.currentTarget;
    clicked.disabled=true;
    status.textContent='';
    try {await fn();} catch(e){status.textContent=e.message;}
    finally {clicked.disabled=false;}
  },cls);
  const title=el('input',{name:'class-title',type:'text',maxlength:80,required:true,autocomplete:'off',placeholder:'For example, Period 3 Advanced CS'});
  const course=el('select',{name:'class-course'},options(Object.entries(courseNames)));
  const create=el('form',{class:'field-grid'},el('label',{},'Class name',title),el('label',{},'Course',course),
    el('div',{class:'actions',style:'align-self:end;margin:0'},el('button',{type:'submit',class:'btn primary',text:'Create class'})));
  create.onsubmit=async e=>{
    e.preventDefault();
    if(creating)return;
    creating=true;
    const submit=e.submitter;
    if(submit)submit.disabled=true;
    const teacher=currentTeacher();
    const courseId=course.value;
    const classTitle=title.value.trim();
    // Keep the same key if a request succeeded but the browser never received its response.
    const retrySlot='cs-games:create-class:'+teacher?.owner;
    let retry;
    try{retry=JSON.parse(sessionStorage.getItem(retrySlot));}catch{}
    if(retry?.title!==classTitle||retry.courseId!==courseId){
      retry={title:classTitle,courseId,creationKey:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')};
    }
    try{sessionStorage.setItem(retrySlot,JSON.stringify(retry));}catch{}
    try{
      const result=await api('',{body:retry});
      if(currentTeacher()!==teacher)return;
      if(result.invite)invites.set(result.id,result.invite);
      await refresh();
      await openClass(result.id);
      if(currentTeacher()!==teacher)return;
      title.value='';
      try{sessionStorage.removeItem(retrySlot);}catch{}
      status.textContent='Class created. The student pathway is ready to use.';
      panel.querySelector('h3')?.focus();
    }catch(e){status.textContent=e.message;}
    finally{creating=false;if(submit)submit.disabled=false;}
  };
  function showInvite(invite) {
    const link=enrollUrl(invite);
    put(credential,el('div',{class:'banner good'},
      el('p',{},el('strong',{text:'Enrollment link ready. '}),'Share this link with your class. Students can start the pathway as soon as they enroll.'),
      el('label',{},'Enrollment link',el('input',{value:link,readonly:true})),
      el('div',{class:'actions'},act('Copy enrollment link',()=>copy(link,status)),el('a',{class:'btn',href:link,text:'Open enrollment link',target:'_blank',rel:'noopener noreferrer'}))));
  }
  function showRecovery(result) {
    put(credential,el('div',{class:'banner warn'},el('p',{},el('strong',{text:'Share this recovery credential privately. It is shown only now.'})),
      el('p',{text:result.id}),el('p',{class:'wpr-profile-secret',text:result.recovery})),
      el('div',{class:'actions'},act('Download recovery credentials',()=>download('cs-games-recovery.txt',credentialText(result),'text/plain'))));
  }
  const pathwayChip=(c)=>{
    if(c.archived)return chip('Archived','plain');
    const p=pathways.get(c.id);
    if(!p)return chip('No pathway yet','info');
    return p.revision>0?chip(p.isDefault?'Default pathway ready':'Pathway published','good'):chip('Pathway not published','warn');
  };
  function renderList() {
    classList.replaceChildren(...classes.map(c=>{
      const card=el('button',{type:'button',class:'class-card','aria-pressed':String(c.id===selectedId),onclick:()=>openClass(c.id).catch(e=>{status.textContent=e.message;})},
        el('strong',{text:c.title}),el('span',{class:'sub',text:courseLabel(c.course_id)}),el('span',{class:'chips'},pathwayChip(c)));
      return card;
    }));
    if(!classes.length)put(classList,el('div',{class:'empty',style:'grid-column:1/-1'},el('h3',{text:'No classes yet'}),el('p',{text:'Create your first class below. Students join with an enrollment link.'})));
    const list=document.getElementById('pathway-class-list');
    if(list){
      const active=classes.filter(c=>!c.archived);
      put(list,active.length?el('ul',{class:'link-list'},active.map(c=>el('li',{},el('div',{class:'row-card'},
        el('div',{},el('strong',{text:c.title}),el('small',{text:courseLabel(c.course_id)})),
        el('div',{class:'actions'},pathwayChip(c),el('a',{class:'btn small',href:pacingHref(c.id),text:'Customize pathway'})))))):el('p',{class:'muted',text:'You have no active classes yet. Add one under My Classes.'}));
    }
  }
  async function refresh() {
    const session=currentTeacher();
    if(!profilesAvailable || !session)return;
    root.hidden=false;
    const signedOut=document.getElementById('classes-signed-out');
    if(signedOut)signedOut.hidden=true;
    const list=await api('');
    let plans=await rq('/pathways/teacher');
    if(list.classes.some(c=>!c.archived&&!plans.pathways.some(p=>p.classId===c.id))){
      await api('/default-pathways',{body:{}});
      plans=await rq('/pathways/teacher');
    }
    if(currentTeacher()!==session)return;
    classes=list.classes;
    pathways=new Map(plans.pathways.map(p=>[p.classId,p]));
    onClasses(classes,classHint);
    renderList();
    if(!selectedId&&classHint&&classes.some(c=>c.id===classHint))await openClass(classHint);
  }
  async function loadPathwayStatus(c,slot) {
    const entry=pathways.get(c.id);
    if(!entry){
      put(slot,el('p',{class:'muted',text:'A learning pathway is unavailable for this class.'}));
      return;
    }
    try {
      if(entry.isDefault){
        put(slot,el('p',{class:'muted',text:'The default pathway is ready for students. Share the enrollment link to get started.'}));
        return;
      }
      const [detail,history]=await Promise.all([rq('/pathways/teacher/'+entry.id),rq('/pathways/teacher/'+entry.id+'/history')]);
      const state=publicationStatus({published:detail.published,draft:detail.draft});
      const last=detail.published&&history.revisions?.[0]?.created;
      put(slot,el('div',{class:'chips'},chip(state.label,state.tone),last?chip('Last published '+formatWhen(last),'plain'):null),el('p',{class:'muted',text:state.detail}));
    } catch {put(slot,el('p',{class:'muted',text:'Pathway status is unavailable right now.'}));}
  }
  async function openClass(id) {
    selectedId=id;
    const url=new URL(location.href);
    url.searchParams.set('class',id);
    history.replaceState(null,'',url);
    const session=currentTeacher();
    const base='/'+id;
    const {class:c,roster}=await api(base);
    if(currentTeacher()!==session||selectedId!==id)return;
    const selected=el('div',{id:'wpr-profile-report'});
    const previewSlot=el('div',{id:'published-student-preview',hidden:true,tabindex:-1});
    const pathwaySlot=el('div',{id:'class-pathway-status'},el('p',{class:'muted',text:'Checking pathway status…'}));
    put(credential);
    renderList();
    const active=roster.filter(p=>p.active===1).length;
    const stat=(value,label)=>el('div',{class:'stat'},el('strong',{text:String(value)}),el('span',{text:label}));
    const rosterTable=roster.length?table(['Profile ID','Access','Recorded events','Actions'],roster.map(p=>{
        const person=base+'/students/'+p.id;
        const actions=el('div',{class:'actions'},
          act('View progress',async()=>{
            await showStudent(person,selected,!c.archived&&p.active===1);
          },'btn small'),
          !c.archived&&act('Reset access',async()=>{
            if(!confirm('Invalidate all sessions and issue a replacement recovery credential?'))return;
            const result=await api(person+'/reset',{body:{}});await openClass(id);showRecovery(result);
          },'btn small'),
          !c.archived&&p.active===1&&act('Revoke access',async()=>{
            if(!confirm('End access on every device for this profile?'))return;
            await api(person+'/revoke',{body:{}});await openClass(id);
          },'btn small'),
          act('Delete profile',async()=>{
            if(!confirm('Permanently delete this profile and its progress?'))return;
            await api(person,{method:'DELETE'});await openClass(id);
          },'btn small danger'));
        return [p.id,p.active?'Active':'Revoked',String(p.events),actions];
      }),'Class roster'):el('div',{class:'empty'},el('h3',{text:'No student profiles yet'}),el('p',{text:c.archived?'This class had no student profiles.':'Share the enrollment link, or issue a profile ID for a student who cannot enroll themselves.'}));
    rosterTable.querySelector?.('table')?.classList.add('stack');
    put(panel,
      el('div',{class:'card accent'},
        el('div',{class:'card-head'},
          el('div',{},el('div',{class:'eyebrow',text:'Class overview'}),el('h3',{text:c.title,tabindex:-1,style:'margin:0;font-size:1.5rem'}),
            el('div',{class:'chips'},chip(courseLabel(c.course_id),'plain'),chip(c.archived?'Archived':'Active',c.archived?'warn':'good'))),
          !c.archived&&pathways.get(c.id)?.revision>0&&act('Open student pathway',()=>openStudentPreview(c.id,previewSlot),'btn primary')),
        pathwaySlot,
        credential,
        c.archived&&el('div',{class:'banner warn'},el('p',{text:'Archived. Scheduled deletion by '+new Date(c.expires).toISOString().slice(0,10)+'.'})),
        el('div',{class:'task-grid'},
          !c.archived&&el('a',{class:'task',href:pacingHref(c.id)},el('strong',{text:'Customize pathway'}),el('span',{text:'Change learning goals or set practice requirements.'})),
          !c.archived&&el('a',{class:'task',href:pacingHref(c.id,'calendar')},el('strong',{text:'Pacing & target dates'}),el('span',{text:'Plan privately or share optional target dates.'})),
          el('a',{class:'task',href:'#practice-online',onclick:()=>onClasses(classes,c.id)},el('strong',{text:'Practice & assessments'}),el('span',{text:'Create a diagnostic or targeted practice for students.'})),
          el('a',{class:'task',href:'#class-students'},el('strong',{text:'Students & progress'}),el('span',{text:'Enrollment link, student profile IDs and each student’s progress.'}))),previewSlot),
      el('div',{class:'card',id:'class-students'},
        el('div',{class:'card-head'},el('div',{},el('h3',{text:'Student profiles'}),el('p',{text:'Student profiles are pseudonymous. Keep your name-to-ID mapping in a school-controlled file. The roster export leaves names blank.'}))),
        el('div',{class:'stats'},stat(roster.length,'student profiles'),stat(active,'with active access'),stat(roster.length-active,'access ended')),
        !c.archived&&el('div',{class:'actions'},
          act('Generate new enrollment link',async()=>{
            const {invite}=await api(base+'/invite',{body:{}});
            if(currentTeacher()!==session)return;
            invites.set(c.id,invite);
            if(selectedId===c.id)showInvite(invite);
          },'btn primary'),
          act('Issue student profile ID',async()=>{const result=await api(base+'/students',{body:{}});await openClass(id);showRecovery(result);})),
        rosterTable,
        el('div',{class:'actions'},
          act('Download roster CSV',()=>download('cs-games-roster.csv',csv([['profile_id','student_name'],...roster.map(p=>[p.id,''])]))),
          act('Export class progress CSV',async()=>{
            const {reports}=await api(base+'/progress');
            download('cs-games-class-progress.csv',csv([PROFILE_CSV_HEADER,...reports.flatMap(profileCsvRows)]));
          })),
        selected),
      el('details',{class:'more'},el('summary',{},'Manage this class',el('small',{text:'Archive, delete, support details'})),
        el('div',{class:'body'},
          !c.archived&&el('p',{class:'muted',text:'Archiving closes enrollment and ends student access. The class and its records are kept until the scheduled deletion date.'}),
          el('div',{class:'actions'},
            !c.archived&&act('Archive class',async()=>{
              if(!confirm('Archive this class, close enrollment, and end student access?'))return;
              await api(base+'/archive',{body:{}});await refresh();await openClass(id);
            }),
            act('Delete class and records',async()=>{
              if(!confirm('Permanently delete this class and every profile and progress record in it?'))return;
              await api(base,{method:'DELETE'});selectedId=null;put(panel);put(credential);await refresh();
            },'btn danger')),
          el('div',{id:'class-troubleshooting'},el('h4',{text:'Troubleshooting details'}),
            el('p',{class:'muted',text:'Share this with support if something does not look right. Teachers do not need it for everyday use.'}),
            el('p',{},'Class ID: ',el('code',{text:c.id}),' '),
            act('Copy class ID',()=>copy(c.id,status),'btn small')))));
    if(invites.has(c.id)&&!c.archived)showInvite(invites.get(c.id));
    loadPathwayStatus(c,pathwaySlot);
  }
  async function openStudentPreview(classId,slot){
    const plan=pathways.get(classId);
    if(!plan)return;
    const {pathway}=await rq('/pathways/teacher/'+plan.id+'/student-preview');
    if(!slot.isConnected)return;
    slot.hidden=false;
    slot.replaceChildren(el('p',{class:'muted',text:'Student preview · published pathway'}),renderPathway(pathway));
    slot.focus();

  }
  async function showStudent(person,container,canAssess) {
    const report=await api(person);
    const pathway=report.pathway;
    put(container,el('p',{class:'muted',text:report.classTitle+' · '+courseLabel(report.courseId)}),
      renderProfileProgress(report),el('div',{class:'actions'},act('Download student CSV',()=>download('cs-games-profile.csv',profileCsv(report)))));
    if (!pathway) {
      container.append(el('p',{class:'banner info',text:'Publish a class pathway to view checkpoint progress and record mastery.'}));
      return;
    }
    container.append(renderPathway(pathway));
    if (!canAssess || !pathway.nodes.length) return;
    const skill=el('select',{required:true},options(pathway.nodes.map(node=>[node.id,node.title])));
    const score=el('input',{type:'number',required:true,min:0,max:4,step:0.5});
    const award=el('input',{type:'checkbox'});
    const submit=el('button',{type:'submit',class:'btn primary',text:'Record assessment'});
    const form=el('form',{class:'card flat'},el('h4',{text:'Teacher assessment'}),el('label',{},'Checkpoint skill',skill),
      el('label',{},'Standards-based score (0–4)',score),el('label',{class:'check'},award,' Award mastery for the current policy'),submit);
    let pending;
    form.onsubmit=async event=>{
      event.preventDefault();
      submit.disabled=true;
      const values={nodeId:skill.value,score:Number(score.value),award:award.checked,revision:pathway.revision};
      if (!pending || JSON.stringify(pending.values)!==JSON.stringify(values)) pending={id:crypto.randomUUID(),values};
      try {
        await api(person+'/evidence',{body:{id:pending.id,...values}});
        await showStudent(person,container,canAssess);
        status.textContent='Assessment recorded.';
      } catch (error) {status.textContent=error.message;}
      finally {submit.disabled=false;}
    };
    container.append(form);
  }
  root.append(
    el('div',{class:'card-head'},el('div',{},el('h2',{text:'My Classes'}),el('p',{text:'Choose a class to see its status, open its learning pathway, and manage student profiles.'})),
      el('div',{class:'actions'},el('a',{class:'btn small',href:'#add-class-title',text:'Create a class'}),act('Refresh classes',refresh,'btn small'))),
    status,classList,panel,
    el('section',{class:'card','aria-labelledby':'add-class-title'},el('h3',{id:'add-class-title',text:'Create a class'}),
      el('p',{class:'muted',text:'Enter a class name only. Do not enter student names. Class profiles store pseudonymous learning records.'}),create));
  function clear(){
    classes=[];pathways.clear();invites.clear();selectedId=null;
    root.hidden=true;
    put(panel);put(credential);put(classList);
    onClasses([]);
    const signedOut=document.getElementById('classes-signed-out');
    if(signedOut)signedOut.hidden=false;
    const list=document.getElementById('pathway-class-list');
    if(list)put(list,el('p',{class:'muted',text:'Sign in to open an existing class pathway.'}));
  }
  return {root,refresh,clear};
}
