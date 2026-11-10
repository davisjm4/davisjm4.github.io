import { profilesAvailable, request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { csv } from '../../wpr-games/workplace-readiness/online/model.mjs';
import { el, button, download, table, copy, options } from '../../wpr-games/workplace-readiness/online/dom.mjs';
import { PROFILE_CSV_HEADER, profileCsv, profileCsvRows, renderProfileProgress } from '../../wpr-games/workplace-readiness/online/profile-report.mjs';

const enrollUrl=invite=>new URL('/wpr-games/workplace-readiness/#enroll='+invite,location.href).href;
const path='/teacher/profiles';
const credentialText=({id,recovery})=>'Profile ID: '+id+'\nRecovery credential: '+recovery+'\nShare privately with this student only.';
export function profileClassSelect() {
  const select=el('select',{name:'profileClassId',disabled:true},options([['','Anonymous assignment']]));
  const field=el('label',{hidden:!profilesAvailable},'Student reporting',select);
  return {field,update(classes){
    const selected=select.value;
    const active=classes.filter(c=>!c.archived);
    select.replaceChildren(...options([['','Anonymous assignment'],...active.map(c=>[c.id,'Class profile · '+c.title])]));
    select.value=active.some(c=>c.id===selected)?selected:'';
    select.disabled=!active.length;
  }};
}
export function teacherProfiles(getToken,onClasses) {
  const root=el('section',{id:'wpr-teacher-profiles',hidden:true,'aria-label':'Student profile classes'});
  const status=el('p',{role:'status','aria-live':'polite'}), classList=el('div'), panel=el('div'), credential=el('div');
  const api=(suffix,opts={})=>request(path+suffix,{...opts,token:getToken()});
  const act=(label,fn)=>button(label,async event=>{
    const clicked=event.currentTarget;
    clicked.disabled=true;
    status.textContent='';
    try {await fn();} catch(e){status.textContent=e.message;}
    finally {clicked.disabled=false;}
  });
  const title=el('input',{name:'class-title',type:'text',maxlength:80,required:true});
  const create=el('form',{},el('label',{},'Class title',title),el('button',{type:'submit',text:'Create profile class'}));
  create.onsubmit=async e=>{
    e.preventDefault();
    const submit=e.submitter;
    if(submit)submit.disabled=true;
    try{
      const result=await api('',{body:{title:title.value}});
      title.value='';await refresh();await openClass(result.id);showInvite(result.invite);
    } catch(e){status.textContent=e.message;}
    finally{if(submit)submit.disabled=false;}
  };
  function showInvite(invite) {
    const link=enrollUrl(invite);
    credential.replaceChildren(el('p',{text:'Enrollment link. Share only with this class. Generating a new link invalidates this one.'}),
      el('a',{href:link,text:'Open enrollment link',target:'_blank',rel:'noopener noreferrer'}),act('Copy enrollment link',()=>copy(link,status)));
  }
  function showRecovery(result) {
    credential.replaceChildren(el('p',{text:'Share this recovery credential privately. It is shown only now.'}),
      el('p',{text:result.id}),el('p',{class:'wpr-profile-secret',text:result.recovery}),
      act('Download recovery credentials',()=>download('cs-games-recovery.txt',credentialText(result),'text/plain')));
  }
  async function refresh() {
    if(!profilesAvailable || !getToken())return;
    root.hidden=false;
    const {classes}=await api('');
    onClasses(classes);
    classList.replaceChildren(...classes.map(c=>el('p',{},c.title+(c.archived?' (archived)':'')+' ',
      act('Open profile class',()=>openClass(c.id)))));
  }
  async function openClass(id) {
    const base='/'+id;
    const {class:c,roster}=await api(base);
    const selected=el('div',{id:'wpr-profile-report'});
    credential.replaceChildren();
    panel.replaceChildren(el('h3',{text:c.title}),
      el('p',{text:'Keep your name-to-ID mapping in a school-controlled file. The roster export leaves names blank.'}),
      act('Download roster CSV',()=>download('cs-games-roster.csv',csv([['profile_id','student_name'],...roster.map(p=>[p.id,''])]))),
      act('Export class progress CSV',async()=>{
        const {reports}=await api(base+'/progress');
        download('cs-games-class-progress.csv',csv([PROFILE_CSV_HEADER,...reports.flatMap(profileCsvRows)]));
      }),
      c.archived?el('p',{text:'Archived. Scheduled deletion by '+new Date(c.expires).toISOString().slice(0,10)+'.'}):el('div',{class:'actions'},
        act('Generate new enrollment link',async()=>showInvite((await api(base+'/invite',{body:{}})).invite)),
        act('Issue student profile ID',async()=>{const result=await api(base+'/students',{body:{}});await openClass(id);showRecovery(result);}),
        act('Archive class',async()=>{
          if(!confirm('Archive this class, close enrollment, and end student access?'))return;
          await api(base+'/archive',{body:{}});await refresh();await openClass(id);
        })),
      act('Delete class and records',async()=>{
        if(!confirm('Permanently delete this class and every profile and progress record in it?'))return;
        await api(base,{method:'DELETE'});panel.replaceChildren();credential.replaceChildren();await refresh();
      }),
      table(['Profile ID','Access','Recorded events','Actions'],roster.map(p=>{
        const person=base+'/students/'+p.id;
        const actions=el('div',{class:'actions'},
          act('View progress',async()=>{
            const report=await api(person);
            selected.replaceChildren(renderProfileProgress(report),
              act('Download student CSV',()=>download('cs-games-profile.csv',profileCsv(report))));
          }),
          !c.archived&&act('Reset access',async()=>{
            if(!confirm('Invalidate all sessions and issue a replacement recovery credential?'))return;
            const result=await api(person+'/reset',{body:{}});await openClass(id);showRecovery(result);
          }),
          !c.archived&&p.active===1&&act('Revoke access',async()=>{
            if(!confirm('End access on every device for this profile?'))return;
            await api(person+'/revoke',{body:{}});await openClass(id);
          }),
          act('Delete profile',async()=>{
            if(!confirm('Permanently delete this profile and its progress?'))return;
            await api(person,{method:'DELETE'});await openClass(id);
          }));
        return [p.id,p.active?'Active':'Revoked',String(p.events),actions];
      }),'Class roster'),selected);
  }
  root.append(el('h2',{text:'Student profile classes'}),el('p',{text:'Class profiles store pseudonymous learning records. Enter a class title only. Do not enter student names.'}),
    create,act('Refresh profile classes',refresh),status,classList,credential,panel);
  return {root,refresh};
}
