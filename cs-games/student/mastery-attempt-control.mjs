import {el} from './map/ui/dom.mjs';
export function masteryAttemptControl(onStart) {
  const root=el('div',{class:'mastery-attempt-control'});
  const open=el('button',{type:'button',class:'btn','data-action':'new-mastery-attempt',text:'Start New Mastery Attempt','aria-expanded':'false'});
  const group=el('div',{hidden:true,role:'group','aria-label':'Confirm new mastery attempt'});
  const yes=el('button',{type:'button',class:'btn','data-action':'confirm-mastery-attempt',text:'Start new attempt'});
  const no=el('button',{type:'button',class:'btn',text:'Keep this attempt'});
  const status=el('p',{role:'status'});
  group.append(el('p',{text:'Only this skill’s current mastery-attempt count and accuracy start over. Earlier answers, demonstrated proficiency, class requirements and official teacher scores stay unchanged. Reset Session only resets daily statistics.'}),yes,no);
  open.onclick=()=>{group.hidden=false;open.setAttribute('aria-expanded','true');yes.focus();};
  no.onclick=()=>{group.hidden=true;open.setAttribute('aria-expanded','false');open.focus();};
  yes.onclick=async()=>{yes.disabled=no.disabled=true;try{await onStart();group.hidden=true;open.setAttribute('aria-expanded','false');status.textContent='New mastery attempt started. Your earlier evidence is preserved.';open.focus();}catch(error){status.textContent=error.message||'Could not start a new attempt. Try again.';yes.focus();}finally{yes.disabled=no.disabled=false;}};
  root.append(open,group,status);return root;
}
