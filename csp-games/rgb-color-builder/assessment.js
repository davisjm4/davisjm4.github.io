// Exact code tasks are separate from perceptual matching. Nothing in the color
// editor is used as an answer or as proof of representation understanding.
export const RGB_CODE_FAMILIES=['binary-to-hex','hex-to-binary','decimal-to-hex','decimal-to-binary','code-to-decimal','channel-change'];
const byte=(value,base)=>value.toString(base).toUpperCase().padStart(base===2?8:2,'0');
export function codeQuestion(index,rgb) {
  const family=RGB_CODE_FAMILIES[index%RGB_CODE_FAMILIES.length];
  if(rgb.length!==3||rgb.some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('Invalid RGB channels');
  const binary=rgb.map(n=>byte(n,2)),hex=rgb.map(n=>byte(n,16));
  const source=family==='binary-to-hex'?binary.join(' / '):family==='hex-to-binary'||family==='code-to-decimal'?'#'+hex.join(''):rgb.join(', ');
  const base=family.endsWith('to-hex')?16:family.endsWith('to-binary')?2:10;
  const channel=index%3,delta=rgb[channel]>127?-32:32;
  const values=[...rgb];if(family==='channel-change')values[channel]+=delta;
  const task=family==='channel-change'?`Start with RGB(${source}). ${delta>0?'Increase':'Decrease'} the ${['red','green','blue'][channel]} channel by 32. Give all three resulting decimal channels.`:
    `Convert ${source} to ${base===16?'two hexadecimal digits per channel':base===2?'eight binary bits per channel':'decimal channel values'}. Keep red, green, blue order.`;
  return {family:'rgb-code:'+family,task,base,answers:values.map(n=>base===10?String(n):byte(n,base)),rgb:[...rgb]};
}
export function gradeCode(question,answers) {
  return Array.isArray(answers)&&answers.length===3&&answers.every((raw,i)=>{
    const value=String(raw).trim().toUpperCase();
    return question.base===16?/^[0-9A-F]{2}$/.test(value)&&value===question.answers[i]:
      question.base===2?/^[01]{8}$/.test(value)&&value===question.answers[i]:
      /^\d{1,3}$/.test(value)&&Number(value)===Number(question.answers[i]);
  });
}

export function mountCodeAssessment(tracker) {
  const studio=document.querySelector('.studio');
  if(!studio)return;
  const chooser=document.createElement('label');chooser.textContent='Practice type ';
  const select=document.createElement('select');select.id='practice-type';
  for(const [value,label]of [['assessment','Code questions — measured understanding'],['explore','Explore and match colors']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  chooser.append(select);document.querySelector('.mode-bar').before(chooser);
  const section=document.createElement('section');section.className='panel question-card';section.id='rgb-code-question';
  const heading=document.createElement('h2');heading.textContent='Construct and interpret RGB codes';
  const note=document.createElement('p');note.textContent='Answer independently. Exact conversions and channel reasoning support proficiency; visual matches remain exploratory practice.';
  const task=document.createElement('p');task.id='code-task';
  const form=document.createElement('form');
  const fields=['Red','Green','Blue'].map(name=>{const label=document.createElement('label');label.textContent=name+' ';const input=document.createElement('input');input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',name+' code answer');input.required=true;input.maxLength=8;label.append(input);form.append(label);return input;});
  const check=document.createElement('button');check.type='submit';check.textContent='Check Code';form.append(check);
  const next=document.createElement('button');next.type='button';next.textContent='Next Code Question';
  const feedback=document.createElement('p');feedback.id='code-feedback';feedback.setAttribute('role','status');
  section.append(heading,note,task,form,feedback,next);studio.before(section);
  let index=0,question,record,sessionId;
  function draw(){
    if(record)tracker.skip(record);
    sessionId=tracker.snapshot().id;
    const rgb=Array.from({length:3},()=>Math.floor(Math.random()*256));
    question=codeQuestion(index++,rgb);
    record=tracker.begin('rgb-color-builder','RGB Color Code Builder','assessment','Code understanding','assessment','Code understanding');
    tracker.annotate(record,{practiceMode:'assessment',difficulty:'intermediate',familyId:question.family,evidenceRevision:'rgb-objective-v1'});
    task.textContent=question.task;feedback.textContent='';fields.forEach(f=>f.value='');check.disabled=false;
    window.dispatchEvent(new window.CustomEvent('csg:practice-context',{detail:{mode:'assessment',difficulty:'intermediate'}}));
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(check.disabled)return;
    if(sessionId!==tracker.snapshot().id||tracker.status(record)==='expired'){draw();feedback.textContent='A new daily session started. Answer this new question.';return;}
    const correct=gradeCode(question,fields.map(f=>f.value));
    if(!tracker.submit(record,correct).accepted)return;
    check.disabled=true;
    feedback.textContent=(correct?'Correct. This first answer qualifies for RGB code understanding.':'Not quite. The first answer is recorded; review the conversion and try a new question.')+
      ' Red, green, blue: '+question.answers.join(' / ')+'. '+(question.base===16?'Each channel uses sixteens and ones.':question.base===2?'Add the weights of bits set to 1: 128, 64, 32, 16, 8, 4, 2, 1.':'Keep the channels in red, green, blue order.');
  });
  next.onclick=draw;
  function choose(){
    const measured=select.value==='assessment';section.hidden=!measured;studio.hidden=measured;
    for(const id of ['instructions','stats'])document.getElementById(id).hidden=measured;
    document.querySelector('.mode-bar').hidden=measured;
    if(measured)draw();else {if(record)tracker.skip(record);window.dispatchEvent(new window.CustomEvent('csg:practice-context',{detail:{mode:'explore'}}));}
  }
  select.value=new URL(location.href).searchParams.has('practiceSkill')||new URL(location.href).searchParams.get('mode')==='assessment'?'assessment':'explore';
  select.onchange=choose;choose();
}
