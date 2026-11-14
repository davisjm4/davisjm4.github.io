import { request } from '../../wpr-games/workplace-readiness/online/config.mjs';
import { PROFILE_ID } from '../../wpr-games/workplace-readiness/online/profile-model.mjs';

function read(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); }
  catch { return null; }
}

function write(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const focusKey = profile => 'wrg.profile.' + profile.id + '.advisory-work';
const isActivity = path => /^\/(?:java-games|csp-games|cs-games\/robotics)\/[^/]+\//.test(path) ||
  path === '/wpr-games/workplace-readiness/';

export function rememberAdvisoryWork(profile, item) {
  write(focusKey(profile), item);
}

export function reconcileAdvisoryWork(profile, assignments) {
  const current = read(focusKey(profile));
  if (current && !assignments.some(item => item.id === current.id &&
      item.revision === current.revision && item.progress !== 'complete')) rememberAdvisoryWork(profile,null);
}

export function advisoryActivity(profile, query) {
  if (!profile || typeof document === 'undefined' || !isActivity(location.pathname)) return null;
  const selected = read(focusKey(profile));
  const id = query.get('focus');
  const revision = Number(query.get('focusRevision'));
  const current = PROFILE_ID.test(id) && Number.isSafeInteger(revision) && revision > 0;
  const matches = current && selected?.id === id && selected.revision === revision;
  const key = focusKey(profile) + ':' + id + ':' + revision;
  const context = { receipt: current ? read(key) : null };
  if (current && !context.receipt) {
    const start = () => {
      void request('/profile/learning-focus/start', { token:profile.token, body:{id,revision} })
        .then(({receipt}) => {
          if (!PROFILE_ID.test(receipt)) return;
          context.receipt = receipt;
          write(key, receipt);
        }).catch(() => {});
    };
    if (navigator.onLine) start();
    window.addEventListener('online', () => { if (!context.receipt) start(); }, {once:true});
  }
  if (selected && !selected.dismissed && typeof selected.title === 'string') {
    const show = () => {
      if (document.getElementById('assignment-practice-reminder')) return;
      const main = document.querySelector('main');
      if (!main) return;
      const panel = document.createElement('aside');
      panel.id = 'assignment-practice-reminder';
      panel.className = 'wrap';
      panel.setAttribute('aria-label', 'Assigned work');
      const message = document.createElement('p');
      message.setAttribute('role','status');
      message.textContent = matches
        ? 'You’re working on ' + selected.title + '. You can practice something else and return later.'
        : 'You still have assigned work in ' + selected.title + '. It will be waiting when you return.';
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.textContent = 'Continue Here';
      dismiss.addEventListener('click', () => {
        rememberAdvisoryWork(profile, {...selected,dismissed:true});
        panel.remove();
        document.querySelector('main')?.querySelector('select, button, a')?.focus();
      });
      const link = document.createElement('a');
      link.href = '/cs-games/student/#student-learning-focus';
      link.textContent = 'View Assigned Work';
      panel.append(message, dismiss, ' ', link);
      main.before(panel);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',show,{once:true});
    else show();
  }
  return context;
}

// Only the selected assignment URL and its original mode get a local checkpoint.
export function advisoryCheckpoint(activity) {
  if (typeof location === 'undefined') return null;
  const query = new URLSearchParams(location.search);
  const id = query.get('focus');
  const profile = globalThis.CSGamesProfileDevice?.identity;
  if (!profile || !PROFILE_ID.test(id) || query.get('learner') === 'guest') return null;
  const mode = query.get('mode') ?? 'mixed';
  const key = focusKey(profile) + ':checkpoint-v1:' + activity + ':' + id + ':' + query.get('focusRevision') + ':' + mode;
  return {mode, read:() => read(key), save:value => write(key,value)};
}
