import { profilesAvailable, request } from './config.mjs';
import { PROFILE_ID, PROFILE_KEY, practiceEvent } from './profile-model.mjs';
import { el, button, download } from './dom.mjs';
import { profileCsv, renderProfileProgress } from './profile-report.mjs?v=targeted-clarity-v1';

import {device,activeProfile as identity,observeSync,queueKeys,queueProfileEvent,syncQueuedPractice as syncSoon} from './profile-sync.mjs?v=guest-map-v1';

const host=document.getElementById('student-profile');
const status=el('p',{role:'status','aria-live':'polite'});
const heading=el('h2',{class:'sr-only',text:'Student profile'});
const say=text=>{status.textContent=text;};
const credentials=()=>({token:identity?.token});
observeSync(say);

export function queuePractice(q,right) {
  queueProfileEvent(practiceEvent(q,right));
}
function credentialCard(result) {
  const label='Save this recovery credential privately before continuing.';
  const box=el('div',{},el('h3',{text:label}),el('p',{text:'Profile ID · '+result.id}),
    el('p',{class:'wpr-profile-secret',text:result.recovery}),
    button('Download recovery credentials',()=>download('cs-games-recovery.txt','Profile ID: '+result.id+'\nRecovery credential: '+result.recovery+'\nKeep this file private.','text/plain')),
    button('I saved my recovery credential',()=>{
      try {device.signIn(result);location.replace(location.pathname+location.search);}
      catch {say('This browser blocks profile storage. Save the credential and use a browser that allows local storage.');}
    }));
  host.replaceChildren(heading,box,status);
  say('Profile created.');
}
function mount() {
  if (!host || !device || !profilesAvailable) return;
  host.hidden=false;
  const onPathway=location.pathname.startsWith('/cs-games/student/');
  const details=el('details',{open:onPathway&&!identity},el('summary',{text:identity?'Student profile · '+identity.id.slice(0,8):'Student profile'}));
  const results=el('div',{id:'profile-progress'});
  host.append(heading,details,status,results);
  const invite=new URLSearchParams(location.hash.slice(1)).get('enroll');
  if (identity) {
    details.append(el('p',{text:'Profile ID · '+identity.id}),
      el('p',{text:'Supported attempts sync to your class profile. Queued practice uploads when this browser reconnects.'}),
      ...(!onPathway ? [el('a',{href:'/cs-games/student/',text:'Open my class pathway'})] : []),
      button('Sync practice now',syncSoon),
      button('View synced progress',async()=>{
        try {
          await syncSoon();
          const data=await request('/profile/me',credentials());
          results.replaceChildren(renderProfileProgress(data),button('Export profile CSV',()=>download('cs-games-profile.csv',profileCsv(data))));
        } catch(e) {say(e.message);}
      }),
      button('Sign out on this device',async()=>{
        if (!await syncSoon() && queueKeys().length && !confirm('Some practice is waiting to sync. Sign out and discard those unsynced answers?')) return;
        try {await request('/profile/signout',{...credentials(),body:{}});} catch { /* Clear the shared device even when disconnected. */ }
        device.clear();location.replace(location.pathname+location.search);
      }),
      el('details',{},el('summary',{text:'Restore a renewed session'}),restoreForm(identity.id)));
    if (invite) {
      details.open=true;
      say('You already have an active profile on this device. Sign out before joining another class.');
    }
    return;
  }
  details.append(el('p',{text:'Use a class enrollment link or restore your profile. CS Games asks for a random ID and recovery credential. Your teacher keeps your name separately.'}));
  if (PROFILE_KEY.test(invite || '')) {
    details.open=true;
    const enroll=button('Enroll in this class',async()=>{
      enroll.disabled=true;
      try {credentialCard(await request('/profile/enroll',{body:{invite}}));}
      catch(e) {say(e.message);enroll.disabled=false;}
    });
    details.append(enroll);
  }
  details.append(restoreForm());
}
function restoreForm(knownId='') {
  const id=el('input',{name:'id',value:knownId,readonly:Boolean(knownId),required:true,autocomplete:'off',maxlength:36,spellcheck:'false'});
  const recovery=el('input',{name:'recovery',type:'password',required:true,autocomplete:'off',maxlength:64});
  const submit=el('button',{type:'submit',class:'btn',text:'Restore profile'});
  const form=el('form',{class:'wpr-profile-form'},el('label',{},'Profile ID',id),
    el('label',{},'Recovery credential',recovery),submit,el('p',{text:'Lost your recovery credential? Ask your teacher to reset access using your profile ID.'}));
  form.onsubmit=async e=>{
    e.preventDefault();
    const input={id:id.value.trim().toLowerCase(),recovery:recovery.value.trim().toLowerCase()};
    if (!PROFILE_ID.test(input.id) || !PROFILE_KEY.test(input.recovery)) return say('Check the profile ID and recovery credential.');
    submit.disabled=true;
    try {
      const session=await request('/profile/restore',{body:input});
      recovery.value=''; device.signIn(session); location.replace(location.pathname+location.search);
    } catch(e) {say(e.message);submit.disabled=false;}
  };
  return form;
}
mount();
// An enrollment link may open in a tab already on the same path.
if (profilesAvailable) addEventListener('hashchange',()=>{
  if (PROFILE_KEY.test(new URLSearchParams(location.hash.slice(1)).get('enroll') || '')) location.reload();
  if(location.hash==='#student-profile'&&location.pathname.startsWith('/cs-games/student/')){
    const details=host?.querySelector('details');
    if(details)details.open=true;
  }
});
