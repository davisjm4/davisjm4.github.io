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
  section.append(title,summary,meter,remaining,details,status,back);
  const stage = main.querySelector('#stage, .challenge, .question-card, #question, #scenario');
  if (stage) stage.before(section); else main.prepend(section);
  if (!document.querySelector('link[href="/cs-games/student/practice-progress.css"]'))
    document.head.append(el('link',{rel:'stylesheet',href:'/cs-games/student/practice-progress.css'}));

  let last = '';
  function paint(name,target) {
    if (!target) return;
    const heading = target.complete ? 'Target met' : target.label;
    const value = [name,target.count,target.summary,target.complete,target.detail.join('|')].join('|');
    if (last === value) return;
    last = value;
    section.hidden = false;
    title.textContent = `${name} · ${heading}`;
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
      const events = guestEvidenceByNode(graph,guestStore().state().events,node.courseId).get(nodeId) ?? [];
      paint(node.title,skillTarget({proficiency:evaluateSkillProficiency(node,events)}));
    };
    window.addEventListener('csg:guest-practice',refresh);
    window.addEventListener('pageshow',refresh);
    refresh();
    return;
  }

  const [{request},{observeSync,device}] = await Promise.all([
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
