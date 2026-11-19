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
  const dialog = el('dialog',{class:'teacher-account-dialog','aria-labelledby':'teacher-account-title'});
  host.append(control,status,dialog);
  let googleScript;
  let google;
  let busy = false;
  let view = 0;
  let trigger;
  dialog.addEventListener('close', () => {
    view++;
    if (trigger?.isConnected) trigger.focus();
    else if (dialog.contains(document.activeElement) || document.activeElement === document.body) {
      control.querySelector('button')?.focus();
    }
  });

  function openDialog(title, anchor) {
    trigger = anchor;
    if (!dialog.open) dialog.showModal();
    const message = el('p',{role:'status',class:'account-message'});
    const close = el('button',{type:'submit',class:'btn quiet',text:'Close'});
    dialog.replaceChildren(el('h2',{id:'teacher-account-title',text:title}),message,el('form',{method:'dialog'},close));
    close.focus();
    return {message,closeForm:close.parentNode,generation:++view};
  }

  async function authenticate(exchange, message, generation) {
    if (busy || generation !== view || !dialog.open) return;
    busy = true;
    message.textContent = 'Verifying sign-in…';
    try {
      const active = await exchange();
      if (generation !== view || !dialog.open) {
        await request('/teacher/session',{method:'DELETE',token:active.token});
        return;
      }
      dialog.close();
      update(active);
    } catch (e) {
      if (generation === view && dialog.open) message.textContent = e.message;
    } finally {
      busy = false;
    }
  }

  function loadGoogle(callback) {
    if (!googleScript) {
      googleScript = new Promise((resolve,reject) => {
        const script = el('script',{src:'https://accounts.google.com/gsi/client',async:true});
        script.onload = () => resolve(window.google.accounts.id);
        script.onerror = () => {
          script.remove();
          googleScript = undefined;
          reject(new Error('Google sign-in could not load.'));
        };
        document.head.append(script);
      });
    }
    return googleScript.then(api => {
      if (!google) {
        google = api;
        google.initialize({client_id:googleClientId,callback:response=>googleCallback?.(response.credential)});
      }
      googleCallback = callback;
      return google;
    });
  }
  let googleCallback;

  function emailForm(mode, message, generation) {
    const email = el('input',{type:'email',required:true,autocomplete:'email',maxlength:'254'});
    const code = el('input',{type:'text',required:true,autocomplete:'one-time-code',maxlength:'48',spellcheck:'false'});
    const codeLabel = el('label',{hidden:true},'Verification code',code);
    code.disabled = true;
    const send = el('button',{type:'submit',class:'btn primary',text:'Send code'});
    const resend = el('button',{type:'button',class:'btn quiet',hidden:true,text:'Send another code'});
    const form = el('form',{class:'teacher-email-form'},el('label',{},'Email address',email),codeLabel,
      el('div',{class:'actions'},send,resend));
    let delivering = false;
    async function sendCode() {
      if (delivering || !email.reportValidity()) return;
      delivering = true;
      send.disabled = true;
      resend.disabled = true;
      const address = email.value;
      email.readOnly = true;
      message.textContent = 'Sending a verification code…';
      try {
        await request('/teacher/email',{body:{action:'send',mode,email:address}});
        if (generation !== view || !dialog.open) return;
        codeLabel.hidden = false;
        code.disabled = false;
        resend.hidden = false;
        send.textContent = 'Verify code';
        message.textContent = 'Check your email for a code. It expires in 15 minutes.';
        code.focus();
      } catch (e) {
        if (generation === view && dialog.open) message.textContent = e.message;
        if (code.disabled) email.readOnly = false;
      } finally {
        delivering = false;
        send.disabled = false;
        resend.disabled = false;
      }
    }
    form.onsubmit = event => {
      event.preventDefault();
      if (code.disabled) void sendCode();
      else void authenticate(() => request('/teacher/email',{body:{action:'verify',mode,email:email.value,code:code.value}}),
        message,generation);
    };
    resend.onclick = () => void sendCode();
    return form;
  }

  async function openAuth(mode, anchor) {
    const {message,closeForm,generation} = openDialog(mode === 'signup' ? 'Create a teacher account' : 'Sign in to Teacher Tools', anchor);
    message.textContent = 'Loading sign-in options…';
    const capabilities = await request('/teacher/registration').catch(() => ({}));
    if (generation !== view || !dialog.open) return;
    message.textContent = '';
    if (mode === 'signup' && !capabilities.signup) {
      message.textContent = 'Teacher sign-up is currently unavailable.';
      return;
    }
    if (local && mode === 'signin') {
      const key = el('input',{name:'teacher-key',type:'password',autocomplete:'off','aria-label':'Development teacher token'});
      const form = el('form',{class:'actions account-control'},el('label',{},'Development teacher token',key),
        el('button',{type:'submit',class:'btn primary',text:'Sign in to development service'}));
      form.onsubmit = event => {
        event.preventDefault();
        const value = key.value;
        key.value = '';
        void authenticate(() => request('/teacher/session',{method:'POST',token:value}),message,generation);
      };
      closeForm.before(form);
    } else if (!local && googleClientId) {
      const googleHost = el('div');
      closeForm.before(googleHost);
      void loadGoogle(credential => {
        if (credential) void authenticate(() => request('/teacher/session',{
          method:'POST',token:credential,body:capabilities.enabled ? {mode} : undefined
        }),message,generation);
      }).then(api => {
        if (generation === view && dialog.open) api.renderButton(googleHost,{theme:'outline',text:mode === 'signup' ? 'signup_with' : 'signin_with'});
      }).catch(e => {
        if (generation === view && dialog.open) message.textContent = e.message;
      });
    }
    if (capabilities.email) closeForm.before(emailForm(mode,message,generation));
  }

  function openSettings(active, anchor) {
    const {message,closeForm} = openDialog('Account Settings',anchor);
    const email = el('p',{text:active.account});
    const recovery = el('p',{text:active.provider === 'email'
      ? 'To regain access, choose Sign In and request a new code at this email address.'
      : 'Use Google Account recovery if you lose access to your Google sign-in.'});
    const revoke = button('Sign out other sessions',async () => {
      revoke.disabled = true;
      try {
        await teacherRequest('/teacher/sessions',{method:'DELETE'});
        message.textContent = 'Other sessions were signed out.';
      } catch (e) {
        message.textContent = e.message;
      } finally {
        revoke.disabled = false;
      }
    },'btn quiet');
    closeForm.before(email,recovery,revoke);
  }

  observeTeacher((active,message) => {
    control.replaceChildren();
    status.textContent = message;
    if (active) {
      control.append(el('span',{class:'account-name',text:'Signed in as ' + active.account}),
        button('Account Settings',event => openSettings(active,event.currentTarget),'btn quiet small'),
        button('Sign Out',async () => {
          if (pendingSignOut) return;
          pendingSignOut = true;
          try {
            await request('/teacher/session',{method:'DELETE',token:active.token});
            google?.disableAutoSelect();
            if (session?.token === active.token) update(null,'Signed out.');
          } catch {
            status.textContent = 'Sign-out could not finish. Check your connection and try again.';
          } finally {
            pendingSignOut = false;
          }
        },'btn quiet small'));
    } else if (apiBase) {
      if (dialog.open && !busy) dialog.close();
      control.append(button('Sign Up',event => void openAuth('signup',event.currentTarget),'btn quiet small'),
        button('Sign In',event => void openAuth('signin',event.currentTarget),'btn quiet small'));
    }
  });
}
