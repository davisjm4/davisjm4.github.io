import {request} from './config.mjs';
import {activeProfile, submitIssuedResponse} from './profile-sync.mjs?v=guest-map-v1';

export function mountIssuedPractice() {
  if (activeProfile?.courseId!=='workplace') return;
  const host=document.getElementById('verified-wpr');
  if (!host) return;
  const {h, renderTicket}=globalThis.WRG.ui;
  const status=h('p',{role:'status'});
  const slot=h('div');
  let items, index=0, view=0;
  const start=h('button',{type:'button',class:'btn',text:'Try server-checked practice',onclick:show});
  host.append(start,status,slot);
  host.hidden=false;
  globalThis.addEventListener('hashchange',()=>{
    if (host.closest('#view-home').hidden) {
      view++;
      slot.replaceChildren();
      start.hidden=false;
      status.textContent='';
    }
  });

  async function show() {
    const current=++view;
    start.disabled=true;
    status.textContent='Loading a question…';
    try {
      if (!items) ({items}=await request('/profile/wpr-issue',{token:activeProfile.token}));
      if (!items.length) throw new Error('No server-checked questions are available.');
      if (index>=items.length) {
        slot.replaceChildren();
        status.textContent='You finished server-checked practice.';
        start.hidden=true;
        return;
      }
      const issued=await request('/profile/wpr-issue',{token:activeProfile.token,body:{itemId:items[index]}});
      if (current!==view) return;
      start.hidden=true;
      status.textContent='This set is practice only. It does not change mastery progress.';
      renderTicket(slot,issued.question,globalThis.WRG.app.lib,{
        async check({optionId}) {
          const {id,version,presented,permit}=issued;
          const result=await submitIssuedResponse({id,version,presented,permit,response:optionId,format:'wpr-issued-v1',kind:'practice'});
          if (result.pending) return {pending:true,status:'Response saved on this device. It will sync when you reconnect.'};
          if (result.error) return {status:result.error};
          const {correct,bestId,headline,lines}=result.feedback;
          return {ok:true,correct,bestId,feedback:{headline,lines}};
        },
        next() { index++; show(); },
      });
    } catch (error) {
      if (current===view) {
        status.textContent=error.message;
        start.hidden=false;
      }
    } finally {
      start.disabled=false;
    }
  }
}
