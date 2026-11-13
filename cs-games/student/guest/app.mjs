/* Independent-learner page. Everything here runs in the browser; the only request is a same-origin GET of the curriculum graph. */
import { el } from '../../../wpr-games/workplace-readiness/online/dom.mjs';
import { renderPathway } from '../pathway-view.mjs';
import { createGuestStore, MESSAGES, COURSE_IDS, localDate } from './store.mjs';
import { buildGuestView, guestCourses } from './pathway.mjs?v=build6';
import { reconcileEvents } from './evidence.mjs';
import { afterPractice } from './suggest.mjs';
import { activityName } from './progress.mjs';
import { mountStudentMap } from '../map/ui/app.mjs?v=targeted-clarity-v1';
import { inputFromStudentContract } from '../map/live-contract.mjs?v=targeted-clarity-v1';
import { decoratePathway, markButtons, practiceHref } from './decorate.mjs';
import { classProfileActive } from './class-state.mjs';
import { TRACKED_NODE_IDS, TRACKED_GRAPH_VERSION } from './coverage-data.mjs';

const app = document.getElementById('guest-app');
const notice = document.getElementById('guest-notice');
const storageNote = document.getElementById('guest-storage-note');
const classic = new URLSearchParams(location.search).get('view') === 'classic';
const mapHost = el('section', {class:'guest-map-host','aria-label':'Interactive learning map'});
let mixedActivities;
const LAUNCH = 'cs-games:guest:launch';
let storage; try { storage = localStorage; } catch { /* blocked */ }
const store = createGuestStore({ storage, onWarning: () => syncStorageNote() });
let graph, view, courseId, pathwayEl, map, openAreas = new Set(), afterCard = null, lastStamp = '';
const say = m => { notice.textContent = m; };
const syncStorageNote = () => { storageNote.textContent = store.info.warning || ''; };

const pct = (n, c) => (n ? Math.round((100 * c) / n) + '%' : '—');
const groupIndex = (v, nodeId) => { let gi = -1, prev = null; for (const n of v.nodes) { if (n.areaId !== prev) { gi++; prev = n.areaId; } if (n.id === nodeId) return gi; } return 0; };
const sessionGet = () => { try { return JSON.parse(sessionStorage.getItem(LAUNCH)); } catch { return null; } };
const sessionSet = v => { try { v ? sessionStorage.setItem(LAUNCH, JSON.stringify(v)) : sessionStorage.removeItem(LAUNCH); } catch { /* optional */ } };

async function loadGraph() {
  const response = await fetch(new URL('../../pathway/curriculum-graph.json', import.meta.url));
  if (!response.ok) throw new Error('The learning pathway could not be loaded.');
  return response.json();
}
function refreshState() { // write only when stored practice actually needs (re)crediting, so just looking at the page stores nothing
  const probe = store.state();
  if (reconcileEvents(probe, graph)) store.update(s => { reconcileEvents(s, graph); });
  return store.state();
}

function openArea(index, { focus = true } = {}) {
  if (map) { const stop=map.model.stops[index]; if(stop)map.openStop(stop.id); return; }
  const details = app.querySelector('#area-' + index); if (!details) return;
  details.open = true;
  if (focus) { details.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); details.querySelector('summary')?.focus({ preventScroll: true }); }
}
function showSkill(nodeId) {
  if (map) {map.select(nodeId);return;}
  openArea(groupIndex(view, nodeId), { focus: false });
  const li = app.querySelector(`li[data-node-id="${CSS.escape(nodeId)}"]`);
  li?.scrollIntoView({ block: 'center', behavior: 'auto' });
  (li?.querySelector('.pathway-actions a') || li)?.focus?.({ preventScroll: true });
}

function onMark(id, state, kind, where) {
  const control = document.activeElement?.dataset?.control;
  if (state) store.setMark(id, state, courseId, where); else store.clearMark(id);
  render({ focus: control && state === null && control.endsWith(':clear') ? control.replace(/:clear$/, ':needs-practice') : control });
  say(state ? 'Saved your note. It shapes suggestions and is never counted as practice.' : 'Cleared your note.');
}
function onLaunch(node) {
  if(!node)return;
  store.setPosition(courseId, { areaId: node.areaId, nodeId: node.id });
  sessionSet({ nodeId: node.id, courseId, answered: view.guest.totals.answered });
}

function linkFor(nodeId){
  return map ? map.model.nodeIndex[nodeId]?.practice[0]?.url : practiceHref(pathwayEl,nodeId);
}

const adapter={
  onPractice({node,stop}){onLaunch(node??stop?.nodes[0]);},
  onNavigate(route,model){
    const node=model.nodeIndex[route.nodeId],stop=model.stops.find(s=>s.id===route.stopId);
    if(!node&&!stop)return;
    const old=store.state().position[courseId];
    const areaId=node?.areaId??stop.areaId,nodeId=node?.id??null;
    if(old?.areaId!==areaId||old?.nodeId!==nodeId)store.setPosition(courseId,{areaId,nodeId});
  },
  guestAreaControls(stop){
    return markButtons({id:stop.areaId,label:stop.baseTitle,current:stop.guestMark,scope:'area',
      onMark:(id,mark)=>onMark(id,mark,'area',{areaId:id})});
  },
  guestSkillControls(node){
    const g=node.guest;
    return el('div',{class:'guest-skill-controls'},
      el('p',{class:'muted',text:g.answered?`${g.correct} of ${g.answered} correct on the first try`:'No practice recorded for this skill yet.'}),
      g.selfReported&&el('p',{class:'guest-note',text:g.selfReported}),
      trackingKnown()&&!TRACKED_NODE_IDS.has(node.id)&&el('p',{class:'muted',text:'This activity may not update skill progress automatically. You can still practice and plan a demonstration.'}),
      markButtons({id:node.id,label:node.title,current:g.markSource==='skill'?g.mark:null,inherited:g.markSource==='area'?g.mark:null,
        scope:'node',onMark:(id,mark)=>onMark(id,mark,'node',{nodeId:id,areaId:node.areaId})}));
  }
};
const courseNames={advanced:'Advanced Computer Science',csp:'AP Computer Science Principles'};
function courseChooser() {
  const group = el('div', { class: 'guest-courses', role: 'group', 'aria-label': 'Choose a course' });
  for (const c of guestCourses(graph)) group.append(el('button', { type: 'button', class: 'guest-course', 'aria-pressed': String(c.id === courseId), 'data-course': c.id,
    onclick: () => { if(courseId===c.id)return; store.setCourse(c.id); courseId = c.id; afterCard = null; openAreas = new Set(); const url = new URL(location.href); url.searchParams.set('course',c.id); url.hash=''; history.replaceState(null,'',url); render({ focus: 'course:' + c.id, fresh: true }); } },
    el('strong', { text: courseNames[c.id]??c.title }), el('small', { text: c.skills + ' skills' })));
  return el('section', { class: 'student-panel', 'aria-labelledby': 'course-h' }, el('h2', { id: 'course-h', text: 'Choose a course' }), group,
    !courseId && el('p', { class: 'guest-hint', text: 'Every skill in the course opens right away. There is nothing to set up.' }));
}

function pickUp() {
  const g = view.guest, target = g.resume;
  const heading = !target ? 'You have worked through the suggestions' : target.fromPosition ? 'Pick up where you left off' : g.totals.answered ? 'Try this next' : 'A good first step';
  const href = target && linkFor(target.nodeId);
  const alternatives = g.suggestion.alternatives.filter(a => a.nodeId !== target?.nodeId).slice(0, 3);
  return el('section', { class: 'student-panel guest-pickup', 'aria-labelledby': 'pickup-h' }, el('h2', { id: 'pickup-h', text: heading }),
    target ? [el('p', { class: 'guest-target' }, el('strong', { text: target.title })), el('small', { text: target.reason }),
      el('div', { class: 'guest-pickup-actions' },
        href && el('a', { class: 'button', href, text: target.fromPosition ? 'Resume learning' : 'Start this skill', onclick: () => onLaunch(view.nodes.find(n => n.id === target.nodeId)) }),
        el('button', { type: 'button', text: classic?'Show it in the list':'Show it on the map', onclick: () => showSkill(target.nodeId) }))]
      : el('p', { text: 'Pick any area below to keep practicing. Everything stays open.' }),
    alternatives.length > 0 && el('details', { class: 'guest-other' }, el('summary', { text: 'Other good options' }),
      el('ul', {}, alternatives.map(a => el('li', {}, el('button', { type: 'button', class: 'guest-link', text: a.title, onclick: () => showSkill(a.nodeId) }), el('small', { text: ' · ' + a.reason }))))));
}

function afterPracticeCard() {
  if (!afterCard) return null;
  const out = afterPractice({ nodes: view.nodes, areaOrder: view.guest.areaOrder, summary: view.guest.summary, suggestion: view.guest.suggestion, nodeId: afterCard });
  const here = view.nodes.find(n => n.id === afterCard);
  const option = (label, item) => {
    if (!item) return null;
    const href = linkFor(item.nodeId); // the shared renderer's own practice link (focused mode, Mixed, Workplace skill)
    const go = () => onLaunch(view.nodes.find(n => n.id === item.nodeId));
    return el('li', {}, href ? el('a', { class: 'button guest-next', href, text: label, 'aria-label': `${label}: ${item.title}`, onclick: go })
      : el('button', { type: 'button', text: label, 'aria-label': `${label}: ${item.title}`, onclick: () => { afterCard = null; render(); showSkill(item.nodeId); } }), el('small', { text: item.title }));
  };
  const items = [option('Continue in this area', out.continueInArea), option('Move to the next area', out.nextArea), option('Practice something different', out.different)].filter(Boolean);
  return el('section', { class: 'student-panel guest-after', 'aria-labelledby': 'after-h' }, el('h2', { id: 'after-h', text: 'Nice work. What next?' }),
    el('p', { text: `You just practiced ${here?.title ?? 'a skill'}. You choose what comes next; nothing is locked.` }),
    el('ul', { class: 'guest-after-list' }, items), el('button', { type: 'button', text: 'Not now', onclick: () => { afterCard = null; render(); } }));
}

function summaryPanel() {
  const g = view.guest, t = g.totals;
  const row = (k, v) => [el('dt', { text: k }), el('dd', { text: v })];
  const recent = g.recent;
  return el('section', { class: 'student-panel', 'aria-labelledby': 'sum-h' }, el('h2', { id: 'sum-h', text: 'Your practice in this browser' }),
    el('dl', { class: 'guest-stats' }, row('Questions answered', String(t.answered)), row('First-try correct', String(t.correct)), row('First-try accuracy', pct(t.answered, t.correct)),
      row('Skills practiced', `${g.practicedSkills} of ${g.skillCount}`), row('Not practiced yet', String(g.notPracticedSkills)),
      row('Areas to review', g.reviewAreas.length ? String(g.reviewAreas.length) : 'None')),
    el('small', { text: 'Only your first try on each question counts here. Retries, skips and revealed answers do not. Supported practice evidence informs formative proficiency. Official grades are separate.' }),
    el('h3', { text: 'Recent activity' }),
    recent.length ? el('ul', { class: 'guest-recent' }, recent.map(r => el('li', { text: `${r.date} · ${activityName(r.activityId)} · ${r.correct} of ${r.answered} correct first try${r.skills.length ? ' · ' + r.skills.slice(0, 3).join(', ') : ''}` })))
      : el('p', { text: 'No practice yet. Open a skill below to try a few questions.' }));
}

const trackingKnown = () => graph.version === TRACKED_GRAPH_VERSION; // the data describes one graph release; never guess for another
function coverageNote() {
  if (!trackingKnown()) return el('p', { class: 'guest-coverage', text: 'Some activities do not report skill-level results yet. They stay open for practice but may not update the numbers above.' });
  const tracked = view.nodes.filter(n => TRACKED_NODE_IDS.has(n.id)).length, total = view.nodes.length;
  const extra = courseId === 'workplace' ? ' Workplace Readiness activities are open for practice here but do not report skill-level results to this page yet.' : tracked < total ? ' The other skills are open for practice and are marked below.' : '';
  return el('p', { class: 'guest-coverage', text: `Practice on ${tracked} of ${total} skills in this course updates this page automatically.${extra}` });
}

function jumpControl() {
  const names = []; let prev = null;
  for (const n of view.nodes) if (n.areaId !== prev) { prev = n.areaId; names.push(view.areas.find(a => a.id === n.areaId)?.title || 'Learning area'); }
  const select = el('select', { id: 'jump', class: 'select', onchange: e => { if (e.target.value !== '') { openArea(Number(e.target.value)); e.target.value = ''; } } },
    el('option', { value: '', text: 'Choose an area…' }), names.map((name, i) => el('option', { value: String(i), text: name })));
  return el('div', { class: 'guest-jump' }, el('label', { for: 'jump', text: 'Jump to a learning area' }), select);
}

function storagePanel(state) {
  const info = store.info, file = el('input', { type: 'file', accept: 'application/json,.json', id: 'restore-file', class: 'sr-only', onchange: restore });
  return el('details', { class: 'student-panel guest-storage' }, el('summary', { text: 'Saved progress and backup' }),
    el('p', { text: MESSAGES.scope }), info.warning && el('p', { class: 'guest-warn', role: 'status', text: info.warning }),
    classProfileActive(storage) && el('p', { class: 'guest-warn', text: 'A class profile is active in this browser. Practice opened from this map stays independent. Practice opened from your class pathway goes to your class.' }),
    el('p', { text: 'Saving practice is ' + (state.tracking ? 'on' : 'off') + '.' }),
    el('div', { class: 'guest-storage-actions' },
      el('button', { type: 'button', text: state.tracking ? 'Pause saving practice' : 'Turn saving practice on', onclick: () => { store.setTracking(!state.tracking); render(); } }),
      el('button', { type: 'button', text: 'Download a backup', onclick: backup }),
      el('label', { class: 'guest-file', for: 'restore-file' }, el('span', { class: 'guest-file-button', text: 'Restore from a backup' }), file),
      el('button', { type: 'button', class: 'guest-danger', text: 'Clear my progress', onclick: clear })),
    el('small', { text: 'A backup holds only your practice answers and notes. It has no name, email or password. A restored file can add practice and notes. It can never award mastery or change a class.' }));
}
function backup() {
  const url = URL.createObjectURL(new Blob([store.exportBackup()], { type: 'application/json' }));
  const a = el('a', { href: url, download: 'cs-games-progress-' + localDate(Date.now()) + '.json' }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); say('Backup downloaded.');
}
async function restore(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('That file is too large to be a progress backup.');
    const { addedEvents, ignored } = store.importBackup(await file.text());
    render(); say(`Backup restored. Added ${addedEvents} answer${addedEvents === 1 ? '' : 's'} and your notes.` + (ignored.length ? ' Ignored unsupported fields: ' + ignored.join(', ') + '.' : ''));
  } catch (error) { say(error.message); }
  event.target.value = '';
}
function clear() {
  if (!confirm('Delete all independent progress saved in this browser? This removes your practice history and notes. It cannot be undone.')) return;
  store.clear(); map?.destroy(); map=null; courseId = null; afterCard = null; sessionSet(null); history.replaceState(null, '', location.pathname+(classic?'?view=classic':'')); render(); say('Your independent progress was deleted from this browser.');
}

function render({ focus, fresh = false } = {}) {
  if (pathwayEl && !fresh) openAreas = new Set([...app.querySelectorAll('details.pathway-area[open]')].map(d => d.dataset.areaIndex));
  const state = refreshState();
  if (!courseId) { app.replaceChildren(courseChooser(state), storagePanel(state)); syncStorageNote(); return; }
  view = buildGuestView(graph, courseId, state, { today: localDate(Date.now()) });
  const launch = sessionGet();
  if (launch && launch.courseId === courseId) { if (view.guest.totals.answered > launch.answered) { afterCard = launch.nodeId; sessionSet(null); } }
  const defaultIndex = String(groupIndex(view, view.guest.resume?.nodeId ?? view.nodes[0].id));
  if(classic){
    pathwayEl = renderPathway(view, { openAreas: openAreas.size ? [...openAreas] : [defaultIndex] });
    decoratePathway(pathwayEl, view, { onMark, onLaunch, trackedIds: trackingKnown() ? TRACKED_NODE_IDS : null });
  }else{
    const input=inputFromStudentContract(view,{mixedActivities});
    if(map)map.update(input);
    else map=mountStudentMap(mapHost,{...input,adapter});
  }
  app.replaceChildren(...[courseChooser(), pickUp(), coverageNote(), jumpControl(), classic?el('section',{class:'student-panel guest-pathway','aria-label':'Learning pathway'},pathwayEl):mapHost,
    afterPracticeCard(), summaryPanel(), storagePanel(state)].filter(Boolean)); // replaceChildren(null) would print "null"
  lastStamp = store.state().updated;
  syncStorageNote();
  if (focus) (app.querySelector(`[data-control="${CSS.escape(focus)}"]`) || app.querySelector(`[data-course="${CSS.escape(String(focus).replace('course:', ''))}"]`))?.focus({ preventScroll: true });
}

function refreshIfChanged() { if (graph && store.state().updated !== lastStamp && !document.hidden) render(); }
for (const type of ['focus', 'pageshow']) window.addEventListener(type, refreshIfChanged);
document.addEventListener('visibilitychange', refreshIfChanged);
window.addEventListener('storage', e => { if (e.key === null || e.key?.startsWith('cs-games:guest:')) refreshIfChanged(); });

try {
  graph = await loadGraph();
  const registry=await fetch('../../pathway/evidence-gap-registry.json').then(r=>r.ok?r.json():null).catch(()=>null);
  mixedActivities=registry?new Set(registry.entries.filter(e=>e.mixedReaches===true).map(e=>e.game)):undefined;
  const fromUrl = new URLSearchParams(location.search).get('course');
  const saved = store.state().course;
  courseId = COURSE_IDS.includes(fromUrl) ? fromUrl : COURSE_IDS.includes(saved) ? saved : null;
  if (courseId && courseId !== saved) store.setCourse(courseId);
  render();
} catch (error) {
  app.replaceChildren(el('p', { role: 'alert', text: error.message + ' You can still open any practice game from the CS Games hub.' }), el('p', {}, el('a', { href: '../../', text: 'Go to the CS Games hub' })));
}
