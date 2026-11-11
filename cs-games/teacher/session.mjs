import {apiBase, googleClientId, request} from '../../wpr-games/workplace-readiness/online/config.mjs';
import {el, button} from '../../wpr-games/workplace-readiness/online/dom.mjs';

const storageKey = 'cs-games:teacher-session';
const local = ['localhost','127.0.0.1'].includes(location.hostname);
const listeners = new Set();
let session = null;
let timer;
let notice = '';
let pendingSignOut = false;

function store(value) {
  try {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
  } catch { /* The current page still works when storage is unavailable. */ }
}

function update(value, message = '') {
  session = value;
  notice = message;
  store(value);
  clearTimeout(timer);
  if (value) timer = setTimeout(() => update(null, expired), Math.max(0, value.expires - Date.now()));
  listeners.forEach(listener => listener(session, notice));
}

const expired = 'Your session ended. Sign in again to continue.';
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (/^csgt_[a-f0-9]{64}$/.test(saved?.token) && saved.expires > Date.now()) update(saved);
  else store(null);
} catch { /* Ignore unavailable storage or an invalid entry. */ }

export function observeTeacher(listener) {
  listeners.add(listener);
  listener(session, notice);
  return () => listeners.delete(listener);
}

export function currentTeacher() {
  return session;
}

export async function teacherRequest(path, options) {
  const active = session;
  if (!active) throw new Error(expired);
  try {
    return await request(path, {...options, token:active.token});
  } catch (error) {
    if (error.status === 401 && active.token === session?.token) {
      update(null, expired);
      throw new Error(expired);
    }
    throw error;
  }
}

// Verify the cached session once per page. Authorization is also checked on every API request.
function revalidate() {
  if (session) void teacherRequest('/teacher/session').catch(() => {});
}
revalidate();
window.addEventListener('pageshow', event => {
  if (!event.persisted || !session) return;
  try {
    if (JSON.parse(sessionStorage.getItem(storageKey))?.token !== session.token) {
      update(null, 'Sign in to continue.');
      return;
    }
  } catch { /* Server validation still applies. */ }
  revalidate();
});

export function mountTeacherAccount(host) {
  if (!host) return;
  const status = el('p',{role:'status',class:'muted account-status'});
  const control = el('div',{class:'actions account-control'});
  host.append(control,status);
  let gis, script, signingIn=false;
  const signIn = async credential => {
    if (!credential || signingIn) return;
    signingIn=true;
    status.textContent = 'Signing in…';
    try {
      update(await request('/teacher/session',{method:'POST',token:credential}));
    } catch (error) {
      status.textContent = error.status === 401 ? 'Use an authorized teacher Google account.' : 'Sign-in is temporarily unavailable. Try again.';
    } finally { signingIn=false; }
  };
  observeTeacher((active,message) => {
    control.replaceChildren();
    status.textContent = message;
    if (active) {
      control.append(el('span',{class:'chip good account-name',text:'Signed in as '+active.account}),button('Sign out',async () => {
        if (pendingSignOut) return;
        pendingSignOut = true;
        try {
          await request('/teacher/session',{method:'DELETE',token:active.token});
          gis?.disableAutoSelect();
          if (session?.token === active.token) update(null,'Signed out.');
        } catch {
          status.textContent = 'Sign-out could not finish. Check your connection and try again.';
        } finally {
          pendingSignOut = false;
        }
      },'btn quiet small'));
      return;
    }
    if (!apiBase) return;
    if (local) {
      const key = el('input',{name:'teacher-key',type:'password',autocomplete:'off','aria-label':'Development teacher token'});
      const form = el('form',{class:'actions account-control'},el('label',{},'Development teacher token',key),el('button',{type:'submit',class:'btn primary',text:'Sign in to development service'}));
      form.onsubmit = event => {
        event.preventDefault();
        const value = key.value;
        key.value = '';
        void signIn(value);
      };
      control.append(form);
    } else if (googleClientId) {
      const draw = () => {
        if (!session) gis.renderButton(control,{theme:'outline',text:'signin_with'});
      };
      if (gis) draw();
      else if (!script) {
        script = el('script',{src:'https://accounts.google.com/gsi/client',async:true});
        script.onload = () => {
          gis = window.google.accounts.id;
          gis.initialize({client_id:googleClientId,callback:response=>void signIn(response.credential)});
          draw();
        };
        script.onerror = () => { status.textContent = 'Google sign-in could not load. Refresh to try again.'; };
        document.head.append(script);
      }
    }
  });
}
