import * as E from './engine.js?v=rgb-v1';
import {sessionTracker,addSessionNavigation} from '../session.js?v=per-mode-daily-v1';
const $=id=>document.getElementById(id), title='RGB Color Code Builder',slug='rgb-color-builder';
const tracker=sessionTracker();addSessionNavigation('../');
const names=['Red','Green','Blue'],labels={binary:'Binary RGB',hex:'Hexadecimal RGB'};
const key='cspGames.rgb-color-builder.history.v1';
let generator,sessionId,current,recordId,student=[0,0,0],submitted=false,solved=false,lastChecked=null;
const seed=new URL(location.href).searchParams.get('seed');
function ensureGenerator() {
  const id=tracker.snapshot().id;
  if(id===sessionId) return false;
  sessionId=id;
  let history=[];try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.sessionId===id) history=saved.history.filter(q=>{E.validRGB(q.rgb);return E.FAMILIES.includes(q.family)&&['binary','hex'].includes(q.mode);});}catch{}
  generator=E.createGenerator({seed:seed===null?Date.now():Number(seed),history});return true;
}
function persistHistory(){try{localStorage.setItem(key,JSON.stringify({sessionId,history:generator.history()}));}catch{}}
function stats(){const g=tracker.snapshot().games[slug],fmt=b=>b?.attempted?`${Math.round(100*b.firstTry/b.attempted)}% (${b.firstTry}/${b.attempted})`:'— (0/0)';
  $('stats').textContent=`First-try accuracy · Overall / Mixed: ${fmt(g)} · Binary: ${fmt(g?.modes?.binary)} · Hex: ${fmt(g?.modes?.hex)}`;
}
function newColor(message='') {
  ensureGenerator();if(recordId)tracker.skip(recordId);
  current=generator.next($('mode').value);student=[0,0,0];submitted=false;solved=false;lastChecked=null;
  recordId=tracker.begin(slug,title,current.mode,labels[current.mode],current.mode,labels[current.mode]);
  tracker.annotate(recordId,{skills:E.SKILLS,representation:current.mode,selection:current.selection,targetRGB:current.rgb,targetHex:E.hex(current.rgb),family:current.family,distanceFromPrevious:current.distanceFromPrevious,generatorFallback:current.fallback});
  persistHistory();$('representation').textContent=labels[current.mode];
  $('target-swatch').style.backgroundColor=E.css(current.rgb);
  $('target-swatch').setAttribute('aria-label','Target color to match; exact values hidden until checking');
  $('target-caption').textContent='Match by sight · code hidden until checking';
  $('editor-instructions').textContent=current.mode==='binary'?'Tap a bit to toggle it. Each 1 adds the place value above it.':'Choose each digit (0–F). The left digit counts sixteens; the right digit counts ones.';
  $('editor').innerHTML=names.map((name,c)=>`<fieldset class="channel" data-channel="${c}"><legend>${name} · <span id="channel-${c}">0</span> / 255</legend>${current.mode==='binary'?`<div class="bit-grid">${E.WEIGHTS.map((w,i)=>`<div class="bit-control"><small aria-hidden="true">${w}</small><button type="button" data-c="${c}" data-bit="${i}" aria-label="${name} bit ${w}" aria-pressed="false">0</button></div>`).join('')}</div>`:`<div class="hex-pair">${[0,1].map(i=>`<label>${i===0?'Sixteens (×16)':'Ones (×1)'}<select data-c="${c}" data-digit="${i}" aria-label="${name} ${i===0?'high':'low'} hexadecimal digit">${[...E.DIGITS].map(d=>`<option value="${d}">${d}</option>`).join('')}</select></label>`).join('')}<span class="channel-value" id="pair-${c}">00 = 0</span></div>`}</fieldset>`).join('');
  for(const b of $('editor').querySelectorAll('button')) b.onclick=()=>{if(!guard())return;student=E.toggle(student,Number(b.dataset.c),Number(b.dataset.bit));adjusted();};
  for(const s of $('editor').querySelectorAll('select')) s.onchange=()=>{if(!guard())return;try{student=E.editHex(student,Number(s.dataset.c),Number(s.dataset.digit),s.value);adjusted();}catch{update();}};
  $('hint-text').hidden=true;$('feedback').hidden=true;$('feedback').textContent='';$('action-status').textContent=message;
  update();stats();
}
function guard(){
  if(ensureGenerator()||tracker.status(recordId)==='expired'){newColor('A new daily session has started. Match this new target.');return false;}return true;
}
function adjusted(){tracker.interact(recordId);lastChecked=null;update();$('action-status').textContent=solved?'Matched! Keep exploring, or choose New Color.':submitted?'Color updated. Check again to compare this new mixture.':'';}
function update(){
  $('student-swatch').style.backgroundColor=E.css(student);
  $('student-swatch').setAttribute('aria-label',`Your color: red ${student[0]}, green ${student[1]}, blue ${student[2]}`);
  $('student-caption').textContent=`${E.hex(student)} · RGB(${student.join(', ')})`;
  $('decimal').textContent=names.map((n,i)=>`${n}: ${student[i]}`).join('\n');
  $('hex-code').textContent=`${E.hex(student)}\n${student.map(E.hexByte).join(' · ')}`;
  $('binary-code').textContent=student.map(E.binary).join('\n');
  student.forEach((v,c)=>{ $('channel-'+c).textContent=v;if(current.mode==='hex')$('pair-'+c).textContent=`${E.hexByte(v)} = ${v}`; });
  for(const b of $('editor').querySelectorAll('button')){const on=!!(student[Number(b.dataset.c)]&E.WEIGHTS[Number(b.dataset.bit)]);b.textContent=on?'1':'0';b.setAttribute('aria-pressed',String(on));}
  for(const s of $('editor').querySelectorAll('select'))s.value=E.hexByte(student[Number(s.dataset.c)])[Number(s.dataset.digit)];
  $('check').disabled=solved||lastChecked===E.hex(student);
}
function check(){
  if(!guard()||solved||lastChecked===E.hex(student))return;
  const delta=E.distance(current.rgb,student),correct=E.acceptsDistance(delta),first=!submitted;
  const result=tracker.submit(recordId,correct);if(!result.accepted){newColor('Session changed. Match this new target.');return;}
  if(first)tracker.annotate(recordId,{firstSubmittedRGB:[...student],firstDistance:delta,firstTryCorrect:correct});
  submitted=true;solved=correct;lastChecked=E.hex(student);
  tracker.annotate(recordId,{lastSubmittedRGB:[...student],lastDistance:delta});
  $('target-caption').textContent=`${E.hex(current.rgb)} · RGB(${current.rgb.join(', ')})`;
  $('target-swatch').setAttribute('aria-label',`Target: red ${current.rgb[0]}, green ${current.rgb[1]}, blue ${current.rgb[2]}`);
  $('feedback').hidden=false;$('feedback').className='feedback '+(correct?'good':'retry');
  $('feedback').textContent=`${correct?'Correct — close enough!':'Not Yet Correct — keep experimenting.'}\nTarget: ${E.hex(current.rgb)} · RGB(${current.rgb.join(', ')})\nYour checked color: ${E.hex(student)} · RGB(${student.join(', ')})\nPerceptual distance: ${delta.toFixed(2)} (accepted: ≤ ${E.TOLERANCE}).\n${E.explanation(current.rgb,student)}\n${first?'Your first check is recorded.':'Your original first-try result is unchanged.'}${correct?' Choose New Color when ready.':' Adjust the channels and check again.'}`;
  $('action-status').textContent='';update();stats();
}
$('mode').onchange=()=>newColor();$('new').onclick=()=>newColor();$('check').onclick=check;
$('reset').onclick=()=>{if(!guard())return;student=[0,0,0];adjusted();$('action-status').textContent='Your color was reset to black. First-try results are unchanged.';};
$('hint').onclick=()=>{if(!guard())return;$('hint-text').textContent=E.hint(current.rgb);$('hint-text').hidden=false;tracker.interact(recordId);};
newColor();
// Exports support deterministic DOM integration tests; no target-revealing UI control.
export const state=()=>({current,student:[...student],recordId,submitted,solved,tracker});
