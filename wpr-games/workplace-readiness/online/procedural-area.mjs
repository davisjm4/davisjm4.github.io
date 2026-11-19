import {request} from './config.mjs';
import {activeProfile,device,observeSync,syncQueuedPractice} from './profile-sync.mjs?v=guest-map-v1';
import {submitIssuedResponse} from './issued-practice.mjs';
import {el} from './dom.mjs';
export async function mountProceduralArea(skill){
 if(!activeProfile||!device.isCurrent()||activeProfile.courseId!=='workplace')return false;
 try{const capability=await request('/profile/wpr-procedural',{token:activeProfile.token});if(capability.format!=='wpr-procedural-v2')return false;}catch{return false;}
 const W=globalThis.WRG,slot=document.getElementById('ticket-slot');if(!W?.app||!slot||slot.querySelector('.feedback'))return false;
 const status=el('p',{role:'status'});slot.before(status);
 let serial=0,answered=0;
 async function savedFeedback(event){
  let result=await submitIssuedResponse(event);
  if(!result.pending)return result;
  status.textContent='Response saved on this device. Reconnect to receive server-checked feedback.';
  return new Promise(resolve=>{let waiting=false,done=false,timer;
   const retry=async()=>{if(waiting||done)return;waiting=true;
    const result=await submitIssuedResponse(event);waiting=false;
    if(!result.pending){done=true;clearTimeout(timer);stop();removeEventListener('online',retry);resolve(result);}
    else if(navigator.onLine){clearTimeout(timer);timer=setTimeout(retry,2000);}
   };
   const stop=observeSync(message=>{if(message==='Practice synced.')void retry();});
   addEventListener('online',retry);void syncQueuedPractice().then(()=>{if(navigator.onLine)void retry();});
  });
 }
 async function show(){
  const version=++serial;if(!device.isCurrent())return;
  status.textContent='Loading a varied, server-checked scenario…';slot.replaceChildren(el('p',{text:'Loading your next scenario…'}));
  try{
   const issued=await request('/profile/wpr-procedural',{token:activeProfile.token,body:{skillId:skill}});
   if(version!==serial||!device.isCurrent())return;
   status.textContent='Server-checked practice. Mastery eligibility remains separate.';
   W.ui.renderTicket(slot,issued.question,W.app.lib,{
    async check(response){
     const {id,version,presented,permit,format}=issued;
     const result=await savedFeedback({id,version,presented,permit,format,response,kind:'practice'});
     if(result.error)return {status:result.error};
     if(!device.isCurrent())return {status:'Your profile changed. Restore the original class profile to continue.'};
     const checked=result.feedback;
     W.app.tracker.record({skill,category:W.app.lib.skillsById[skill]?.category,mode:issued.question.mode,difficulty:issued.question.difficulty},checked.correct);
     W.app.store.save(W.app.tracker.data);answered++;
     globalThis.dispatchEvent(new CustomEvent('csg:wpr-answer',{detail:{question:{...issued.question,reasoning:checked.reasoningFamily??issued.id},correct:checked.correct,index:answered}}));
     status.textContent='Server response received. This is practice evidence, not an official teacher score.';
     return {...checked,ok:true};
    },next(){if(answered>=8)location.hash='#/summary';else void show();}
   });
  }catch{if(version===serial){status.replaceChildren('Reconnect to request the next server-checked scenario. ',el('button',{type:'button',class:'btn',text:'Try again',onclick:show}));}}
 }
 addEventListener('csg:wpr-area-round',()=>{answered=0;void show();});
 addEventListener('hashchange',()=>{if(location.hash==='#/practice'){answered=0;void show();}else serial++;});
 await show();return true;
}
