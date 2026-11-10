import { request } from './config.mjs';
import { addReport, displayReport, feedbackNodes } from './readiness.mjs';
import { el, button } from './dom.mjs';

const id=new URL(location.href).searchParams.get('assignment');
let memory = {};
if (id) init();
async function init() {
  const host=document.getElementById('assignment-body');
  host.hidden=false;
  document.body.classList.add('wpr-assignment');
  const endpoint='/student/'+encodeURIComponent(id);
  const device=globalThis.WRG?.profileDevice;
  const key=device?.key('wrg.assignment.'+id) || 'wrg.assignment.'+id;
  let local = memory;
  try {local=JSON.parse(localStorage.getItem(key))||memory;} catch {}
  const save=()=>{if (device?.identity && !device.isCurrent()) return;memory=local;try {localStorage.setItem(key,JSON.stringify(local));} catch {}};
  const showError=(err,again)=> {
    host.replaceChildren(el('h1',{text:'Workplace Readiness assignment'}),el('p',{role:'alert',text:err.message}),
      button('Try again',again),el('p',{},el('a',{href:'./',text:'Open Workplace Readiness practice'})));
  };
  if (local.report) {
    displayReport(host,local.report);
    if (local.retakes === 'repeat') host.append(button('Start another attempt',()=>{
      delete local.report; delete local.token; delete local.answers; delete local.order;save();init();
    }));
    return;
  }
  let a;
  try {a=await request(endpoint);} catch(e) {showError(e,init);return;}
  const status=el('p',{role:'status','aria-live':'polite'});
  const profileToken=a.profileRequired?device?.identity?.token:undefined;
  function intro() {
    const title=el('h1',{tabindex:-1,text:a.title});
    const start=button(local.token?'Resume assignment':a.kind==='diagnostic'?'Start assessment':'Start assigned practice',async()=>{
      start.disabled=true;
      try {
        if (a.profileRequired && !profileToken) throw new Error('Restore your class profile above before starting.');
        if (!a.profileRequired) local.browser ||= crypto.randomUUID();
        save();
        if (!local.token) local.token=(await request(endpoint+'/start',{token:profileToken,body:{browser:local.browser}})).token;
        local.retakes=a.retakes;
        local.answers ||= Array(a.questions.length).fill(null);
        if (!local.order) {
          local.order=a.questions.map((_,i)=>i);
          if (a.shuffle) for (let i=local.order.length-1;i>0;i--) {
            const j=Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*(i+1));
            [local.order[i],local.order[j]]=[local.order[j],local.order[i]];
          }
        }
        save();question();
      } catch(e) {status.textContent=e.message;start.disabled=false;}
    },'btn primary');
    host.replaceChildren(title,
      el('p',{text:(a.kind==='diagnostic'?'Teacher-assigned diagnostic':'Teacher-assigned practice')+' · '+a.questions.length+' questions'}),
      el('p',{text:'Choose one response for each question. '+(a.feedbackTiming==='immediate'?'Feedback follows each locked answer.':'Feedback appears after you submit the assessment.')}),
      el('p',{text:(a.profileRequired?'This assignment saves results to your class profile. Your teacher can see results by profile ID. ':a.reporting?'Completed responses contribute to anonymous class totals. ':'Your report stays in this browser. ')+(a.retakes==='once'?(a.profileRequired?'One completed attempt per profile.':'One completed attempt per browser.'):'Additional attempts are allowed.')}),
      a.closes?el('p',{text:'Closes '+new Date(a.closes).toLocaleString()}):null,start,status);
    title.focus();
  }
  function question() {
    status.textContent='';
    const position=local.order.findIndex(i=>local.answers[i]===null);
    if (position<0) { finish(); return; }
    const index=local.order[position], q=a.questions[index];
    const title=el('h1',{tabindex:-1,text:'Question '+(position+1)+' of '+a.questions.length});
    const options=el('fieldset',{},el('legend',{text:q.prompt}));
    q.choices.forEach((text,i)=>options.append(el('label',{class:'wpr-answer'},
      el('input',{type:'radio',name:'answer',value:i,required:true}), ' '+text)));
    const next=el('button',{type:'submit',class:'btn primary',text:a.feedbackTiming==='immediate'?'Check answer':'Save answer'});
    const form=el('form',{},options,next);
    const saved=(choice)=>{local.answers[index]=choice;save();};
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const choice=Number(new FormData(form).get('answer'));
      next.disabled=true;
      if (a.feedbackTiming==='after') {saved(choice);question();return;}
      // Keep the pending choice across a network failure. The server may have already locked it.
      local.pending={index,choice};save();
      await immediate(choice);
    });
    async function immediate(choice) {
      options.disabled=true;
      next.disabled=true;
      try {
        const f=await request(endpoint+'/answer',{token:profileToken,body:{token:local.token,index,choice}});
        saved(choice);delete local.pending;save();
        const feedbackTitle=el('h2',{tabindex:-1,text:f.correct?'Correct':'Incorrect'});
        next.replaceWith(el('section',{class:'feedback '+(f.correct?'ok':'miss')},feedbackTitle,
          el('p',{text:'Correct response · '+f.best}),...feedbackNodes(f),
          button('Continue',question,'btn primary')));
        feedbackTitle.focus();
      } catch(e) {
        status.textContent=e.message;
        next.replaceWith(button('Retry this answer',()=>question()));
      }
    }
    host.replaceChildren(title,el('article',{class:'ticket'},
      q.context?el('p',{text:q.context}):null,q.passage?el('p',{class:'wpr-pre',text:q.passage}):null,
      q.response?el('p',{class:'wpr-pre',text:q.response}):null,form),status);
    title.focus();
    if (local.pending?.index===index) {
      options.querySelectorAll('input')[local.pending.choice].checked=true;
      immediate(local.pending.choice);
    }
  }
  function finish() {
    const title=el('h1',{tabindex:-1,text:'Ready to submit'});
    const submit=button('Submit and view results',async()=>{
      submit.disabled=true;
      try {
        const report=await request(endpoint+'/submit',{token:profileToken,body:{token:local.token,answers:local.answers}});
        addReport(report);local.report=report;delete local.answers;delete local.token;delete local.order;save();
        init();
      } catch(e) {status.textContent=e.message;submit.disabled=false;}
    },'btn primary');
    host.replaceChildren(title,el('p',{text:'All '+a.questions.length+' answers are recorded.'}),submit,status);
    title.focus();
  }
  intro();
}
