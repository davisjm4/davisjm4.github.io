import {TOPICS,MODES,families,buildChallenge,createSampler,assess,validate} from './engine.js?v=family-history-v1';
import {sessionTracker,addSessionNavigation,startActivePractice} from '../session.js?v=per-mode-daily-v1';
const $=id=>document.getElementById(id),tracker=sessionTracker(),game='create-task-lab';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const historyKey='csp-create-task-recent-v1';let history=[];try{history=JSON.parse(localStorage.getItem(historyKey)||'[]');if(!Array.isArray(history))history=[];}catch{}
const params=new URL(location.href).searchParams;let sampler=createSampler(Date.now()>>>0,{history}),current,record,chosen=null,scored=false;
addSessionNavigation('../');startActivePractice();
function changedLines(before,after){
  const a=before.split('\n'),b=after.split('\n'),dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0;const unchanged=new Set();while(i<a.length&&j<b.length){if(a[i]===b[j]){unchanged.add(j++);i++;}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
  return new Set(b.map((_,i)=>i).filter(i=>!unchanged.has(i)));
}
function lineAt(code,offset){return code.slice(0,offset).split('\n').length;}
export function renderCode(container,code,candidates=[],changed=new Set()){
  container.replaceChildren();const sorted=[...candidates].sort((a,b)=>a.start-b.start||a.end-b.end);
  const inline=sorted.every((r,i)=>!r.text.includes('\n')&&(!i||r.start>=sorted[i-1].end));
  let offset=0;
  code.split('\n').forEach((line,index)=>{
    const start=offset,end=start+line.length;offset=end+1;
    const row=document.createElement('div');row.className='code-line'+(changed.has(index)?' changed':'');row.dataset.line=String(index+1);
    const number=document.createElement('span');number.className='line-number';number.textContent=String(index+1);number.setAttribute('aria-hidden','true');
    const content=document.createElement('span');content.className='line-content';row.append(number,content);
    const local=sorted.filter(r=>r.start>=start&&r.start<=end);
    if(inline){let cursor=start;for(const r of local){content.append(document.createTextNode(code.slice(cursor,r.start)));const b=document.createElement('button');b.type='button';b.className='code-token';b.dataset.region=r.id;b.setAttribute('aria-label',`Select code on line ${index+1}: ${r.text}`);b.setAttribute('aria-pressed','false');b.textContent=r.text;b.addEventListener('click',()=>choose(r.id));content.append(b);cursor=r.end;}content.append(document.createTextNode(code.slice(cursor,end)));}
    else content.textContent=line||' ';
    container.append(row);
    if(!inline&&local.length){const picks=document.createElement('div');picks.className='region-picks';for(const r of local){const b=document.createElement('button');b.type='button';b.className='region-pick';b.dataset.region=r.id;b.setAttribute('aria-pressed','false');const last=lineAt(code,r.end-1),range=last===index+1?`line ${index+1}`:`lines ${index+1}–${last}`;b.setAttribute('aria-label',`Select code region, ${range}: ${r.text}`);b.innerHTML=`<span aria-hidden="true">↳</span> Select ${escape(range)}<span class="excerpt">${escape(r.text.split('\n')[0])}${last>index+1?' …':''}</span>`;b.addEventListener('click',()=>choose(r.id));picks.append(b);}container.append(picks);}
  });
}
function highlight(){
  for(const b of $('code').querySelectorAll('[data-region]')){
    b.classList.toggle('chosen',b.dataset.region===chosen);b.classList.toggle('answer',scored&&b.dataset.region===current.correct);b.setAttribute('aria-pressed',String(b.dataset.region===chosen));b.disabled=scored;
  }
  const selected=current.candidates.find(r=>r.id===chosen),answer=scored?current.target:null;
  for(const row of $('code').querySelectorAll('[data-line]')){const line=Number(row.dataset.line);row.classList.toggle('region-selected',!!selected&&line>=lineAt(current.code,selected.start)&&line<=lineAt(current.code,selected.end-1));row.classList.toggle('answer-region',!!answer&&line>=lineAt(current.code,answer.start)&&line<=lineAt(current.code,answer.end-1));}
  for(const b of $('choices').querySelectorAll('button')){b.classList.toggle('chosen',b.dataset.answer===chosen);b.classList.toggle('answer',scored&&b.dataset.answer===current.correct);b.classList.toggle('wrong',scored&&b.dataset.answer===chosen&&chosen!==current.correct);b.setAttribute('aria-pressed',String(b.dataset.answer===chosen));b.disabled=scored;}
}
function choose(value){if(scored)return;chosen=value;tracker.interact(record);$('submit').disabled=false;$('selected').textContent=current.mode==='identify'?'Your selection:\n'+current.regions.find(r=>r.id===value).text:'Your choice: '+value;highlight();}
function beginRecord(){record=tracker.begin(game,'Create Performance Task Lab',current.topic,TOPICS[current.topic],current.mode,MODES[current.mode]);tracker.annotate(record,{familyId:current.familyId,scenarioId:current.scenarioId,seed:current.seed,variant:current.variant,validControl:current.valid,phrasing:current.phrasing});}
function render(q,remember=true){
  if(remember)sampler.remember(q);try{localStorage.setItem(historyKey,JSON.stringify(sampler.history()));}catch{}
  current=q;chosen=null;scored=false;beginRecord();
  $('meta').textContent=MODES[q.mode]+' · '+TOPICS[q.topic];$('scenario').textContent=q.scenario;$('requirement').textContent=q.requirement;$('requirement').hidden=!q.requirement;$('question').textContent=q.prompt;$('selection-help').hidden=q.mode!=='identify';
  renderCode($('code'),q.code,q.candidates);$('selected').textContent='';$('choices').replaceChildren();$('choices').hidden=q.mode!=='missing';
  for(const choice of q.choices){const b=document.createElement('button');b.type='button';b.className='choice';b.dataset.answer=choice;b.setAttribute('aria-pressed','false');b.textContent=choice;b.addEventListener('click',()=>choose(choice));$('choices').append(b);}
  $('submit').disabled=true;$('feedback').hidden=true;$('correction').hidden=true;$('status').textContent='';stats();
}
export function next(){if(record&&!scored)tracker.skip(record);try{const q=sampler.next({mode:$('mode').value,topic:$('topic').value});render(q,false);try{localStorage.setItem(historyKey,JSON.stringify(sampler.history()));}catch{}}catch(e){$('status').textContent='This practice item could not be loaded. Please choose another topic or reload.';console.error(e);}}
export function submit(){
  if(scored||chosen===null)return;
  tracker.ensureCurrentDay();if(tracker.status(record)==='expired')beginRecord();
  const correct=assess(current,chosen),result=tracker.submit(record,correct);if(!result.accepted)return;
  if(!correct)tracker.closeIncorrect(record);scored=true;$('submit').disabled=true;
  $('feedback').hidden=false;$('feedback').classList.toggle('incorrect',!correct);
  $('feedback').innerHTML=`<strong>${correct?'Correct.':'Not quite.'}</strong><p>${escape(current.explanation)}</p>${!correct?'<p>Correct '+(current.mode==='identify'?'code: <code>'+escape(current.target.text)+'</code>':'answer: '+escape(current.correct))+'</p>':''}`;
  if(current.mode==='missing'&&!current.valid){$('correction').hidden=false;renderCode($('corrected-code'),current.correctedCode,[],changedLines(current.code,current.correctedCode));const removed=changedLines(current.correctedCode,current.code);for(const row of $('code').querySelectorAll('[data-line]'))row.classList.toggle('changed',removed.has(Number(row.dataset.line)-1));}
  highlight();stats();
}
export function stats(){
  const data=tracker.snapshot(),g=data.games[game],attempted=g?.attempted||0,correct=g?.firstTry||0,accuracy=attempted?Math.round(100*correct/attempted):0;
  $('stats').textContent=`Mixed overall: ${correct}/${attempted} correct · ${accuracy}% first-try accuracy · ${Math.floor(data.activeSeconds/60)}m ${data.activeSeconds%60}s active CSP practice`;
  $('breakdown').replaceChildren();for(const [key,label] of Object.entries(MODES)){const b=g?.modes?.[key],p=document.createElement('p');p.textContent=`${label}: ${b?.firstTry||0}/${b?.attempted||0}`;$('breakdown').append(p);}for(const [key,label] of Object.entries(TOPICS)){const b=g?.topics?.[key],p=document.createElement('p');p.textContent=`${label}: ${b?.firstTry||0}/${b?.attempted||0}`;$('breakdown').append(p);}
}
$('next').addEventListener('click',next);$('submit').addEventListener('click',submit);for(const id of ['mode','topic'])$(id).addEventListener('change',next);
$('reset').addEventListener('click',()=>{if(window.confirm('Reset today’s CSP Games session in this browser?')){tracker.reset(true);record=null;next();}});
$('share').addEventListener('click',async()=>{const url=new URL(location.href);url.search='';for(const key of ['familyId','variant','seed','phrasing'])url.searchParams.set(key,current[key]);url.searchParams.set('valid',current.valid?'1':'0');try{await navigator.clipboard.writeText(url.href);$('status').textContent='Challenge link copied.';}catch{$('status').textContent=url.href;}});
window.addEventListener('pageshow',stats);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')stats();});
const requested=families.find(f=>f.id===params.get('familyId'));
if(requested){try{const q=buildChallenge(requested.id,Number(params.get('variant'))||0,Number(params.get('seed'))||1,{valid:params.get('valid')==='1',phrasing:Number(params.get('phrasing'))||0});if(!validate(q).ok)throw Error('Invalid shared challenge');render(q);}catch{next();}}else next();
export const state=()=>({current,chosen,scored,record,tracker});
