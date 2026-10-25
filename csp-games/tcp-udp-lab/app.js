import * as E from './generator.js?v=tcpudp-v2';
import { createLabSession, percent } from './session.js?v=tcpudp-v2';
import { sessionTracker, addSessionNavigation } from '../session.js?v=per-mode-daily-v1';

const $ = id => document.getElementById(id);
const tracker = sessionTracker();
const lab = createLabSession({ tracker, topics: E.TOPICS, skills: E.SKILLS, practiceMode: E.PRACTICE_MODE });
const seedParam = new URL(location.href).searchParams.get('seed');
const buttons = { TCP: $('tcp'), UDP: $('udp') };
let generator, current, answered = false, lastResult = null;

addSessionNavigation('../');

// Rebuild the generator when the daily session changes (or on first load).
function ensure() {
  if (!lab.ensure() && generator) return false;
  generator = E.createGenerator({ seed: seedParam === null ? Date.now() : Number(seedParam), history: lab.history() });
  return true;
}

function renderStats() {
  const s = lab.stats();
  $('stats').textContent = `First-try accuracy: ${percent(s)} · Answered: ${s.attempted} · Active CSP practice: ${Math.floor(s.activeSeconds / 60)}m ${s.activeSeconds % 60}s`;
  $('topic-stats').replaceChildren(...Object.entries(E.TOPICS).map(([id, label]) => {
    const p = document.createElement('p'); p.textContent = `${label}: ${percent(s.topics[id])}`; return p;
  }));
  $('protocol-stats').replaceChildren(...E.ANSWERS.map(a => {
    const p = document.createElement('p'); p.textContent = `Rounds where ${a} was correct: ${percent(s.protocols[a])}`; return p;
  }));
}

function next(message = '') {
  ensure();
  current = generator.next($('topic').value);
  lab.rememberHistory(generator.history());
  answered = false; lastResult = null;
  $('scene').textContent = current.scene;
  $('prompt').textContent = current.prompt;
  $('topic-label').textContent = E.TOPICS[current.topic];
  $('feedback').hidden = true; $('feedback').replaceChildren(); $('feedback').className = 'feedback';
  $('notice').textContent = message;
  for (const b of Object.values(buttons)) { b.disabled = false; b.classList.remove('chosen', 'is-answer'); b.removeAttribute('aria-pressed'); }
  renderStats();
}

function renderFeedback(result) {
  const box = $('feedback'), h = document.createElement('p');
  h.className = 'verdict'; h.textContent = result.verdict;
  const parts = [h];
  for (const s of result.sections) {
    const sec = document.createElement('div'), t = document.createElement('h3'), p = document.createElement('p');
    sec.className = 'explain'; t.textContent = s.title; p.textContent = s.text; sec.append(t, p); parts.push(sec);
  }
  box.replaceChildren(...parts);
  box.className = 'feedback ' + (result.correct ? 'correct' : 'incorrect');
  box.hidden = false;
}

function answer(value) {
  if (ensure()) { next('A new daily session has started. Answer this fresh scenario.'); return; }
  if (answered || !current) return;
  const result = E.feedback(current, value), recorded = lab.record(current, value, $('topic').value);
  if (!recorded.accepted) return;
  answered = true; lastResult = { ...result, recordId: recorded.recordId };
  for (const [a, b] of Object.entries(buttons)) {
    b.disabled = true;
    if (a === value) { b.classList.add('chosen'); b.setAttribute('aria-pressed', 'true'); }
    if (a === current.answer) b.classList.add('is-answer');
  }
  renderFeedback(result);
  $('notice').textContent = 'Your answer is recorded. Choose Next question to continue.';
  $('feedback').focus({ preventScroll: false });
  renderStats();
}

for (const [id, label] of Object.entries(E.TOPICS)) {
  const o = document.createElement('option'); o.value = id; o.textContent = label; $('topic').append(o);
}
buttons.TCP.addEventListener('click', () => answer('TCP'));
buttons.UDP.addEventListener('click', () => answer('UDP'));
$('next').addEventListener('click', () => { next(); $('scene').focus(); });
$('topic').addEventListener('change', () => next());
$('learn-link').addEventListener('click', () => { $('learn').open = true; });
document.addEventListener('keydown', e => {
  if (!$('shortcuts').checked) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
  const tag = e.target?.tagName;
  if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
  const k = (e.key || '').toLowerCase();
  if (k === 't' && !answered) { e.preventDefault(); buttons.TCP.click(); }
  else if (k === 'u' && !answered) { e.preventDefault(); buttons.UDP.click(); }
  else if (k === 'n') { e.preventDefault(); $('next').click(); }
});

ensure();
next();
setInterval(() => { if (ensure()) next('A new daily session has started. Results reset; this is a fresh scenario.'); else renderStats(); }, 10000);

export const state = () => ({ current, answered, lastResult, tracker, generator, lab });
