import {masteryAttemptControl} from './mastery-attempt-control.mjs';
import { el } from './map/ui/dom.mjs';
import { readRoute } from './map/route.mjs';
import { skillTarget } from './map/skill-target.mjs';
import { progressFromMasteryChallenge } from './map/live-contract.mjs';
import { deriveNodeState } from './map/states.mjs';
import { formatPercent } from './map/format.mjs';

export async function mountPracticeProgress(returnTo, profile) {
  const path = new URL(returnTo, location.origin);
  const {nodeId} = readRoute(path.hash);
  if (!nodeId || document.querySelector('.live-skill-progress')) return;
  const main = document.querySelector('main');
  if (!main) return;
  const section = el('section',{class:'live-skill-progress',hidden:true,'aria-label':'Skill progress'});
  const title = el('strong');
  const summary = el('p',{'aria-live':'polite','aria-atomic':'true'});
  const meter = el('progress',{max:100});
  const remaining = el('p');
  const details = el('details',{},el('summary',{text:'Remaining requirements'}),el('ul'));
  const status = el('p',{role:'status'});
  const back = el('a',{href:returnTo,text:'Find your next skill',hidden:true});
  const checks=el('ul',{'aria-label':'Qualification requirements'});
  const warning=el('p',{role:'status',class:'qualification-warning'});
  const correctPractice=el('a',{hidden:true,text:'Practice questions for this target'});
  let currentTarget=null,currentPractice=null,startAttempt=null;
  const restart=masteryAttemptControl(async()=>{if(!startAttempt)throw new Error('Refresh this page before starting an attempt.');await startAttempt();});
  restart.hidden=true;
  const scopeNote=el('p',{class:'muted'});
  section.append(title,scopeNote,summary,meter,remaining,checks,warning,correctPractice,details,restart,status,back);
  function updateContext(context={}) {
    const difficulty=String(context.difficulty??document.querySelector('input[name=difficulty]:checked, select#difficulty, select[name=difficulty]')?.value??new URL(location.href).searchParams.get('difficulty')??'').toLowerCase();
    const expected=currentTarget?.difficulty;
    const mode=context.mode??document.querySelector('input[name=mode]:checked, select#mode, select[name=mode]')?.value;
    const targetMode=currentTarget?.practice?.mode;
    warning.textContent=expected&&difficulty&&difficulty!==expected
      ?`You are practicing ${difficulty}. This does not count toward the ${expected} question requirement shown above. Use the target practice link.`
      :targetMode&&mode&&mode!==targetMode?mode==='mixed'
        ?'Mixed Practice counts only when the question assesses this skill at its qualifying difficulty.'
        :'This question is for a different skill. Use the target practice link to work toward the target shown above.':'';
  }
  window.addEventListener('csg:practice-context',event=>updateContext(event.detail));
  document.addEventListener('change',()=>updateContext());
  const stage = main.querySelector('#stage, .challenge, .question-card, #question, #scenario');
  if (stage) stage.before(section); else main.prepend(section);
  if (!document.querySelector('link[href="/cs-games/student/practice-progress.css"]'))
    document.head.append(el('link',{rel:'stylesheet',href:'/cs-games/student/practice-progress.css'}));

  let last = '';
  const restartIds=new Map();
  function paint(name,target) {
    if (!target) return;
    const heading = target.complete ? 'Target met' : target.label;
    const value = [name,target.count,target.summary,target.complete,target.attemptNumber,target.attemptId,target.detail.join('|')].join('|');
    if (last === value) return;
    last = value;
    currentTarget=target;
    section.hidden = false;
    scopeNote.textContent=target.classTarget?'Teacher-configured class practice target. Official teacher scores are separate.':'Independent formative target. This is not a teacher-assigned or official mastery score.';
    checks.replaceChildren(...target.qualification.map(check=>el('li',{'data-requirement':check.kind,text:check.text})));
    restart.hidden=target.complete||target.answered===0||!startAttempt;
    correctPractice.hidden=!currentPractice;
    if(currentPractice){
      correctPractice.textContent=target.difficulty?`Practice ${target.difficulty[0].toUpperCase()+target.difficulty.slice(1)} questions for this skill`:'Practice questions for this target';
      const href=new URL(currentPractice.url,location.origin);
      for(const key of ['learner','returnTo']){const value=new URL(location.href).searchParams.get(key);if(value)href.searchParams.set(key,value);}
      if(target.practice?.mode)href.searchParams.set('mode',target.practice.mode);
      if(target.difficulty)href.searchParams.set('difficulty',target.difficulty);
      correctPractice.href=href.pathname+href.search+href.hash;
    }
    updateContext();
    title.textContent = `${name} · ${heading} · Attempt ${target.attemptNumber}`;
    summary.textContent = `${target.count} · ${target.correct} right on the first try`;
    meter.value = Math.floor(target.fraction*100);
    meter.setAttribute('aria-label',heading);
    meter.setAttribute('aria-valuetext',target.complete?'Target met':target.count);
    remaining.textContent = target.complete?'You can return to the skill map to move on.':`${formatPercent(target.accuracy)} accuracy required${target.accuracyPercent==null?'':` · ${formatPercent(target.accuracyPercent)} so far`}`;
    details.hidden = target.complete || !target.detail.length;
    details.querySelector('ul').replaceChildren(...target.detail.map(text=>el('li',{text})));
    if (target.complete) status.textContent = 'Target met.';
    back.hidden = !target.complete;
  }

  if (path.pathname.endsWith('/guest/')) {
    const [{guestStore},{guestEvidenceByNode},{evaluateSkillProficiency}] = await Promise.all([
      import('./guest/hook.mjs?v=guest-map-v1'),
      import('./guest/evidence.mjs'),
      import('../pathway/proficiency/index.mjs?v=build6')
    ]);
    const response = await fetch('/cs-games/pathway/curriculum-graph.json');
    if (!response.ok) return;
    const graph = await response.json();
    const node = graph.nodes.find(item=>item.id===nodeId && item.courseId===path.searchParams.get('course'));
    if (!node) return;
    const refresh = () => {
      const state=guestStore().state();
      if(guestStore().info.warning)status.textContent=guestStore().info.warning;
      const events = guestEvidenceByNode(graph,state.events,node.courseId).get(nodeId) ?? [];
      const result=evaluateSkillProficiency(node,events,{attemptStarts:state.formativeAttempts??[]});
      currentPractice=node.practice.find(link=>link.activityId===result.tiers[result.goal]?.practice?.activityId)??node.practice[0];
      startAttempt=async()=>{
        guestStore().startMasteryAttempt({nodeId,courseId:node.courseId,requestId:crypto.randomUUID(),expectedAttemptId:result.attempt?.id??null,evidenceIds:events.map(e=>e.id)});
        last='';refresh();status.textContent='New mastery attempt started. Your earlier evidence is preserved.';
      };
      paint(node.title,skillTarget({proficiency:result}));
    };
    window.addEventListener('csg:guest-practice',refresh);
    window.addEventListener('pageshow',refresh);
    refresh();
    return;
  }

  const [{request},{observeSync,device,syncQueuedPractice}] = await Promise.all([
    import('../../wpr-games/workplace-readiness/online/config.mjs'),
    import('../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1')
  ]);
  if (!profile || !device.isCurrent()) return;
  let inFlight = false, pending = false;
  async function refresh() {
    if (!device.isCurrent()) { section.hidden=true; return; }
    if (inFlight) { pending=true; return; }
    inFlight = true;
    try {
      const {pathway} = await request('/pathways/student/'+encodeURIComponent(profile.classId),{token:profile.token});
      if (!device.isCurrent() || pathway?.classId!==profile.classId) { section.hidden=true; return; }
      const node = pathway.nodes.find(item=>item.id===nodeId && item.checkpoint.participation!=='excluded');
      if (!node?.masteryChallenge) { section.hidden=true; return; }
      const progress = progressFromMasteryChallenge(node.masteryChallenge,node);
      const target=skillTarget({progress,complete:node.checkpoint.pathwayComplete,state:deriveNodeState(progress).state},{enrolled:true});
      currentPractice=node.checkpoint?.practice?.[0]??node.practice?.[0];
      startAttempt=async()=>{
        if(!device.isCurrent())throw new Error('Your profile changed. Sign in again before starting an attempt.');
        if(!await syncQueuedPractice())throw new Error('Reconnect and sync your practice before starting a new mastery attempt.');
        const expectedAttemptId=node.masteryChallenge.activeAttemptId;
        const requestId=restartIds.get(expectedAttemptId)??crypto.randomUUID();
        restartIds.set(expectedAttemptId,requestId);
        try{await request('/pathways/student/'+encodeURIComponent(profile.classId)+'/restart',{
          token:profile.token,body:{nodeId,requestId,expectedAttemptId}});}
        catch(error){if(error instanceof TypeError)throw new Error('Reconnect before starting a new mastery attempt. Your current attempt is unchanged unless the server received the request; retry to confirm.');throw error;}
        restartIds.delete(expectedAttemptId);
        last='';await refresh();
      };
      if (target) paint(node.title,target);
      else { section.hidden=true; last=''; }
    } catch (error) {
      if (error.status===401 || error.status===403) section.hidden=true;
      else status.textContent = 'Class progress will update when practice syncs.';
    } finally {
      inFlight = false;
      if (pending) { pending=false; void refresh(); }
    }
  }
  observeSync(message=>{
    if (message==='Practice synced.') { status.textContent=''; void refresh(); }
    else if (message.startsWith('Some responses were kept')) { status.textContent=message; void refresh(); }
    else if (!section.hidden) status.textContent=message;
  });
  window.addEventListener('pageshow',refresh);
  await refresh();
}
