import { createTeacherFocus } from './learning-focus.mjs';
import {DEMONSTRATION_TYPES} from '../pathway/proficiency/demonstrations.mjs';
import {renderPathway} from '../student/pathway-view.mjs';
import { profilesAvailable } from '../../wpr-games/workplace-readiness/online/config.mjs';
import {currentTeacher,teacherRequest} from './session.mjs';
import { csv } from '../../wpr-games/workplace-readiness/online/model.mjs';
import { el, button, download, table, copy, options } from '../../wpr-games/workplace-readiness/online/dom.mjs';
import { PROFILE_CSV_HEADER, profileCsv, profileCsvRows, renderProfileProgress } from '../../wpr-games/workplace-readiness/online/profile-report.mjs?v=targeted-clarity-v1';
import { renderClassEvidence } from './class-evidence.mjs';
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
    const selected=requested??select.value;
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
      const card=el('button',{type:'button',class:'class-card','aria-pressed':String(c.id===selectedId),onclick:()=>openClass(c.id,{focus:true}).catch(e=>{status.textContent=e.message;})},
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
    onClasses(classes,selectedId??classHint);
    renderList();
    if(!selectedId&&classHint&&classes.some(c=>c.id===classHint))await openClass(classHint);
  }
  async function loadPathwayStatus(c,slot,activeStudents) {
    const entry=pathways.get(c.id);
    if(!entry){
      put(slot,el('p',{class:'muted',text:'A learning pathway is unavailable for this class.'}));
      return;
    }
    try {
      if(entry.isDefault){
        put(slot,el('p',{class:'muted',text:activeStudents ? 'Students have access to the default pathway.' : 'The default pathway is ready for students. Share the enrollment link to get started.'}));
        return;
      }
      const [detail,history]=await Promise.all([rq('/pathways/teacher/'+entry.id),rq('/pathways/teacher/'+entry.id+'/history')]);
      const state=publicationStatus({published:detail.published,draft:detail.draft});
      const last=detail.published&&history.revisions?.[0]?.created;
      put(slot,el('div',{class:'chips'},chip(state.label,state.tone),last?chip('Last published '+formatWhen(last),'plain'):null),el('p',{class:'muted',text:state.detail}));
    } catch {put(slot,el('p',{class:'muted',text:'Pathway status is unavailable right now.'}));}
  }
  async function openClass(id,{focus=false}={}) {
    selectedId=id;
    put(panel,el('p',{role:'status',text:'Loading class…'}));
    const url=new URL(location.href);
    url.searchParams.set('class',id);
    history.replaceState(null,'',url);
    const session=currentTeacher();
    const base='/'+id;
    const {class:c,roster}=await api(base);
    if(currentTeacher()!==session||selectedId!==id)return;
    const selected=el('div',{id:'wpr-profile-report'});
    const evidence=el('div');
    const comparisonReport=el('div');
    const rosterReport=el('div');
    const evidenceHeading=el('h3',{id:'class-progress-title',text:'Compare skill practice',tabindex:-1});
    const compare=act('Load skill comparison',async()=>{
      put(evidence,el('p',{role:'status',text:'Loading skill comparison…'}));
      const plan=pathways.get(c.id);
      let report,preview;
      try {
        [report,preview]=await Promise.all([
          api(base+'/progress'),
          plan?.revision>0 ? rq('/pathways/teacher/'+plan.id+'/student-preview') : null,
        ]);
      } catch(error) {
        put(evidence,el('p',{role:'alert',text:error.message}));
        return;
      }
      if(currentTeacher()!==session||selectedId!==id||!evidence.isConnected)return;
      put(evidence,renderClassEvidence({
        classroom:c,roster,pathway:preview?.pathway,reports:report.reports,
        openProfile:async(profileId,node,trigger)=>{
          comparisonReport.append(selected);
          const person=base+'/students/'+encodeURIComponent(profileId);
          const returnButton=button('Back to skill comparison',()=>{
            put(selected);
            (trigger.isConnected?trigger:evidenceHeading).focus();
          },'btn small');
          await showStudent(person,selected,!c.archived,{nodeId:node.id,returnButton});
        },
      }));
      evidenceHeading.focus();
    });
    const previewSlot=el('div',{id:'published-student-preview',hidden:true,tabindex:-1});
    const pathwaySlot=el('div',{id:'class-pathway-status'},el('p',{class:'muted',text:'Checking pathway status…'}));
    put(credential);
    renderList();
    const active=roster.filter(p=>p.active===1).length;
    const task=(href,title,detail,onclick)=>el('a',{class:'task',href,...(onclick?{onclick}:{})},
      el('strong',{text:title}),el('span',{text:detail}));
    const practice=kind=>()=>{
      onClasses(classes,c.archived?'':c.id,kind);
    };
    const stat=(value,label)=>el('div',{class:'stat'},el('strong',{text:String(value)}),el('span',{text:label}));
    const rosterTable=roster.length?table(['Profile ID','Access','Recorded events','Actions'],roster.map(p=>{
        const person=base+'/students/'+p.id;
        const actions=el('div',{class:'actions'},
          act('View progress',async()=>{
            rosterReport.append(selected);
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
    const focusPanel= !c.archived && createTeacherFocus(c,roster,restricted=>{
      const body=rosterTable.querySelector?.('tbody');
      if(!body)return;
      for(const row of [...body.rows]){
        const cell=row.cells[1];
        cell.querySelector('[data-restriction-status]')?.remove();
        if(restricted.has(row.cells[0].textContent))cell.append(el('strong',{'data-restriction-status':'',text:' · Restricted'}));
      }
      const rows=[...body.rows].sort((a,b)=>Number(restricted.has(b.cells[0].textContent))-Number(restricted.has(a.cells[0].textContent)));
      body.append(...rows);
    });
    put(panel,
      el('div',{class:'card accent'},
        el('div',{class:'card-head'},
          el('div',{},el('div',{class:'eyebrow',text:'Class overview'}),el('h3',{text:c.title,tabindex:-1,style:'margin:0;font-size:1.5rem'}),
            el('div',{class:'chips'},chip(courseLabel(c.course_id),'plain'),chip(c.archived?'Archived':'Active',c.archived?'warn':'good'))),
          !c.archived&&pathways.get(c.id)?.revision>0&&act('Open student pathway',()=>openStudentPreview(c.id,previewSlot),'btn primary')),
        focusPanel?.restrictions,
        pathwaySlot,
        credential,
        c.archived&&el('div',{class:'banner warn'},el('p',{text:'Archived. Scheduled deletion by '+new Date(c.expires).toISOString().slice(0,10)+'.'})),
        el('div',{class:'task-grid'},
          task('#class-progress','Class progress','Compare first attempts across students on the same skill.'),
          !c.archived&&task('#class-plan','Plan','Customize the pathway, practice requirements and pacing.'),
          task('#class-assessments','Practice & assessments','Create a diagnostic or targeted practice.'),
          task('#class-students','Student profiles','Enrollment, access and individual progress reports.')),previewSlot),
      focusPanel?.root,
      el('section',{class:'card',id:'class-progress','aria-labelledby':'class-progress-title'},evidenceHeading,
        el('div',{class:'actions'},compare),evidence,comparisonReport),
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
        rosterReport),
      !c.archived&&el('section',{class:'card',id:'class-plan','aria-labelledby':'class-plan-title'},
        el('h3',{id:'class-plan-title',text:'Plan'}),
        el('div',{class:'task-grid'},
          task(pacingHref(c.id),'Customize pathway','Choose learning goals and checkpoint order.'),
          pathways.get(c.id)?.revision>0&&task('/cs-games/teacher/requirements/?class='+encodeURIComponent(c.id),'Practice requirements','Set optional question counts and accuracy goals.'),
          task(pacingHref(c.id,'calendar'),'Pacing & target dates','Plan privately or share optional target dates.'))),
      el('section',{class:'card',id:'class-assessments','aria-labelledby':'class-assessments-title'},
        el('h3',{id:'class-assessments-title',text:'Practice & assessments'}),
        el('div',{class:'task-grid'},
          !c.archived&&task('#practice-online','Create a diagnostic','Build a Workplace Readiness diagnostic.',practice('diagnostic')),
          !c.archived&&task('#practice-online','Create targeted practice','Build a Workplace Readiness practice assignment.',practice('practice')),
          task('#practice-published','Published assessments','Open reports or copy assignment links.'))),
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
    if(focus)panel.querySelector('h3')?.focus();
    else if(location.hash==='#class-plan')panel.querySelector('#class-plan')?.scrollIntoView();
    loadPathwayStatus(c,pathwaySlot,active);
    void focusPanel?.refresh();
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
  async function showStudent(person,container,canAssess,{nodeId,returnButton}={}) {
    const session=currentTeacher();
    const loading=el('p',{role:'status',text:'Loading student evidence…'});
    put(container,loading);
    let report;
    try {
      report=await api(person);
    } catch(error) {
      if(loading.isConnected&&currentTeacher()===session) {
        put(container,returnButton,el('p',{role:'alert',text:error.message}));
        returnButton?.focus();
      }
      return;
    }
    if(currentTeacher()!==session||!loading.isConnected)return;
    const heading=el('h3',{id:'profile-skill-title',tabindex:-1});
    const summary=el('div');
    const results=el('div');
    function renderReport(data){
      if(nodeId){
        const node=data.pathway?.nodes.find(item=>item.id===nodeId);
        const count=node?.practiceProgress;
        const official=node?.checkpoint?.score;
        const reviews=data.verifiedEvidence?.filter(item=>item.kind==='assessment'&&item.nodeIds.includes(nodeId))??[];
        const attempts=data.attempts?.filter(item=>item.dimensions?.some(row=>row.scope==='node'&&row.id===nodeId))??[];
        heading.textContent=(node?.title??'Skill record')+' · '+data.id;
        put(summary,
          el('p',{},el('strong',{text:'Teacher-reviewed score'}),' · '+(official==null?'No assessment recorded':official+'/4')),
          el('p',{text:count&&count.attempted ? count.correct+'/'+count.attempted+' first-try responses correct' : 'No recorded first attempts for this skill.'}),
          reviews.length&&el('details',{},el('summary',{text:'Assessment history for this skill'}),table(['Date','Score','Evidence type'],reviews.map(item=>[
            formatWhen(Date.parse(item.timestamp)),item.score+'/4',DEMONSTRATION_TYPES[item.demonstrationType]??'Unspecified'
          ]),'Teacher assessments')),
          attempts.length&&el('details',{},el('summary',{text:'Recent first attempts for this skill'}),table(['Date','Result'],attempts.map(item=>[
            formatWhen(item.occurred),item.correct?'Correct':'Incorrect'
          ]),'First attempts among the latest 100 practice records')));
      }
      put(results,el('p',{class:'muted',text:data.classTitle+' · '+courseLabel(data.courseId)}),
        renderProfileProgress(data),el('div',{class:'actions'},act('Download student CSV',()=>download('cs-games-profile.csv',profileCsv(data)))),
        data.pathway?renderPathway(data.pathway):el('p',{class:'banner info',text:'Publish a class pathway to view checkpoint progress and record mastery.'}));
    }
    renderReport(report);
    put(container,nodeId?el('section',{class:'card accent','aria-labelledby':heading.id},returnButton,heading,summary):null);
    if(nodeId)heading.focus();
    let pathway=report.pathway;
    const assessmentSkills=()=>pathway?.nodes.filter(node=>!nodeId||node.id===nodeId)??[];
    if (!canAssess || !assessmentSkills().length) {container.append(results);return;}
    const skillChoices=()=>options(assessmentSkills().map(node=>[node.id,node.title]));
    const skill=el('select',{required:true},skillChoices());
    const score=el('input',{type:'number',required:true,min:0,max:4,step:0.5});
    const type=el('select',{},options([['','Choose an evidence type (optional)'],...Object.entries(DEMONSTRATION_TYPES)]));
    const award=el('input',{type:'checkbox'});
    const submit=el('button',{type:'submit',class:'btn primary',text:'Record assessment'});
    const assessmentStatus=el('p',{role:'status',class:'muted',tabindex:-1});
    const assessmentError=el('p',{role:'alert',class:'muted'});
    const revealFeedback=node=>{
      if(document.activeElement!==document.body&&!form.contains(document.activeElement))return;
      node.scrollIntoView({block:'nearest',behavior:'instant'});
    };
    const form=el('form',{class:'card flat'},el('h4',{text:'Teacher assessment'}),el('label',{},'Checkpoint skill',skill),
      el('p',{class:'muted',text:'Use the skill’s rubric to score the demonstrated work. Level 4 is available for any checkpoint.'}),
      el('label',{},'Evidence type',type),el('label',{},'Standards-based score (0–4)',score),el('label',{class:'check'},award,' Award mastery for the current policy'),submit,assessmentStatus,assessmentError);
    let pending;
    form.onsubmit=async event=>{
      event.preventDefault();
      if(submit.disabled)return;
      submit.disabled=true;
      for(const field of [skill,score,type,award])field.disabled=true;
      assessmentError.textContent='';
      assessmentStatus.textContent='Recording assessment…';
      const values={nodeId:skill.value,score:Number(score.value),award:award.checked,revision:pathway.revision,
        ...(type.value?{demonstrationType:type.value}:{})};
      if (!pending || JSON.stringify(pending.values)!==JSON.stringify(values)) pending={id:crypto.randomUUID(),values};
      try {
        await api(person+'/evidence',{body:{id:pending.id,...values}});
        if(currentTeacher()!==session||!form.isConnected)return;
        pending=null;
        score.value='';
        type.value='';
        award.checked=false;
        assessmentStatus.textContent='Assessment recorded.';
        if(document.activeElement===document.body||form.contains(document.activeElement))assessmentStatus.focus({preventScroll:true});
        revealFeedback(assessmentStatus);
        try {
          const fresh=await api(person);
          if(currentTeacher()!==session||!form.isConnected)return;
          renderReport(fresh);
          pathway=fresh.pathway;
          if(!assessmentSkills().length){form.remove();return;}
          skill.replaceChildren(...skillChoices());
          if(pathway.nodes.some(node=>node.id===values.nodeId))skill.value=values.nodeId;
        } catch {
          assessmentStatus.textContent='Assessment recorded. Open View progress again to refresh the report.';
        }
      } catch (error) {
        assessmentStatus.textContent='';
        assessmentError.textContent=error.message;
      } finally {
        submit.disabled=false;
        for(const field of [skill,score,type,award])field.disabled=false;
        if(form.isConnected) {
          if(assessmentError.textContent) {
            if(document.activeElement===document.body)submit.focus({preventScroll:true});
            revealFeedback(assessmentError);
          } else revealFeedback(assessmentStatus);
        }
      }
    };
    if(nodeId)container.append(form,results);
    else container.append(results,form);
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
