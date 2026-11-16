const encoder = new TextEncoder();
const minute = 60_000;
const error = (status, message) => { throw Object.assign(new Error(message), {status}); };
export const rejectTeacher = () => error(401, 'Sign-in could not be verified. Check your sign-in method and try again.');
export const accountsEnabled = env => env.ENABLE_TEACHER_ACCOUNTS === '1';
const signupOpen = env => accountsEnabled(env) && env.PAUSE_TEACHER_SIGNUP !== '1';
const emailReady = env => accountsEnabled(env) && env.TEACHER_AUTH_SECRET?.length >= 32 &&
  Boolean(env.TEACHER_MAIL_FROM && env.TEACHER_MAIL_API_KEY);
export const accountCapabilities = env => ({
  enabled: accountsEnabled(env),
  signup: signupOpen(env) && env.TEACHER_AUTH_SECRET?.length >= 32 &&
    Boolean(env.GOOGLE_CLIENT_ID || emailReady(env)),
  email: Boolean(emailReady(env))
});
export const legacyApproved = (account, env) =>
  env.TEACHER_EMAILS?.toLowerCase().split(',').some(value => value.trim() === account);

export const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
export const randomSecret = size => hex(crypto.getRandomValues(new Uint8Array(size)));
export const digest = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));

function normalizedAddress(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254) return null;
  const [local, domain, extra] = email.split('@');
  if (extra !== undefined || !local || local.length > 64 ||
      !/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/.test(local) ||
      !domain || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) return null;
  return email;
}

async function takeLimit(env, key, scope, limit, window, now) {
  const expires = Math.floor(now / window) * window + window;
  const fingerprint = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(scope))));
  const row = await env.DB.prepare(`INSERT INTO teacher_auth_limits(key,expires,attempts) VALUES(?,?,1)
    ON CONFLICT(key,expires) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING attempts`)
    .bind(fingerprint, expires, limit).first();
  if (!row) error(429, 'Too many attempts. Wait before trying again.');
}

async function rateLimit(request, env, action, now, email) {
  if (!(env.TEACHER_AUTH_SECRET?.length >= 32)) error(503, 'Teacher accounts are temporarily unavailable.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.TEACHER_AUTH_SECRET),
    {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  await takeLimit(env, key, action + ':ip:' + ip, action === 'email-send' ? 12 : 30, 15 * minute, now);
  if (email) {
    const mailbox = email.endsWith('@gmail.com') ? email.split('@')[0].split('+')[0].replaceAll('.', '') + '@gmail.com' : email;
    await takeLimit(env, key, action + ':email:' + mailbox, action === 'email-send' ? 4 : 12, 15 * minute, now);
  }
  if (action === 'email-send') await takeLimit(env, key, action, 100, 60 * minute, now);
}

export async function registeredTeacher(env, owner) {
  return env.DB.prepare('SELECT owner,account,provider FROM teacher_accounts WHERE owner=?').bind(owner).first();
}

async function createTeacher(env, owner, account, provider, now) {
  await env.DB.prepare(`INSERT INTO teacher_accounts(owner,account,provider,created)
    VALUES(?,?,?,?) ON CONFLICT DO NOTHING`).bind(owner, account, provider, now).run();
}

export async function googleTeacher(request, env, mode, verifyGoogle) {
  const now = Date.now();
  await rateLimit(request, env, 'google', now);
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S{1,6000})$/)?.[1];
  const claims = await verifyGoogle(token, env);
  const account = normalizedAddress(claims?.email);
  if (!claims || !account || claims.iat * 1000 < now - 5 * minute) rejectTeacher();
  const owner = 'google:' + claims.sub;
  const teacher = await registeredTeacher(env, owner);
  const legacy = legacyApproved(account, env);
  if (!teacher && !legacy && (mode !== 'signup' || !signupOpen(env))) rejectTeacher();
  if (!teacher && !legacy && !account.endsWith('@gmail.com') && !(typeof claims.hd === 'string' && claims.hd)) {
    error(401, 'Verify your email with a code to create your account.');
  }
  // Hash the signed JWT body, so alternate encodings of the signature cannot replay this exchange.
  const proof = await digest('google:' + token.split('.').slice(0, 2).join('.'));
  const inserted = await env.DB.prepare(`INSERT INTO teacher_auth_proofs(digest,account,purpose,expires)
    VALUES(?,'','google',?) ON CONFLICT DO NOTHING RETURNING digest`).bind(proof, claims.exp * 1000).first();
  if (!inserted) rejectTeacher();
  if (teacher) return teacher;
  await createTeacher(env, owner, account, 'google', now);
  const registered = await registeredTeacher(env, owner);
  if (!registered) error(409, 'Use the original sign-in method for this email address.');
  return registered;
}

async function deliverCode(env, email, code, purpose) {
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{Authorization:'Bearer ' + env.TEACHER_MAIL_API_KEY, 'Content-Type':'application/json'},
    body:JSON.stringify({
      from:env.TEACHER_MAIL_FROM, to:[email], subject:'Your CS Games teacher verification code',
      text:'Enter this code in Teacher Tools to ' + (purpose === 'signup' ? 'create your account' : 'sign in') +
        ':\n\n' + code + '\n\nIt expires in 15 minutes and can be used once. If you did not request it, ignore this email.'
    }),
    signal:AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Teacher email delivery failed.');
}

export async function emailTeacher(request, env, input, sendCode = deliverCode) {
  if (!emailReady(env)) error(503, 'Email verification is temporarily unavailable.');
  const {mode, action} = input ?? {};
  if (!['signup', 'signin'].includes(mode) || !['send', 'verify'].includes(action)) {
    error(400, 'Choose Sign Up or Sign In.');
  }
  if (mode === 'signup' && !signupOpen(env)) error(503, 'Teacher sign-up is temporarily paused.');
  const email = normalizedAddress(input.email);
  if (!email) error(400, 'Enter a valid email address.');
  const now = Date.now();
  await rateLimit(request, env, 'email-' + action, now, email);
  if (action === 'send') {
    const code = randomSecret(16);
    const proof = await digest('email:' + code);
    await env.DB.prepare('INSERT INTO teacher_auth_proofs(digest,account,purpose,expires) VALUES(?,?,?,?)')
      .bind(proof, email, mode, now + 15 * minute).run();
    try {
      // Send the same response and message for any address. Account availability is disclosed after verification.
      await sendCode(env, email, code, mode);
    } catch {
      await env.DB.prepare('DELETE FROM teacher_auth_proofs WHERE digest=?').bind(proof).run();
      console.error('Teacher verification email delivery failed.');
      error(503, 'Email verification is temporarily unavailable. Try again later.');
    }
    return null;
  }
  const code = typeof input.code === 'string' ? input.code.replace(/[\s-]/g, '').toLowerCase() : '';
  if (!/^[0-9a-f]{32}$/.test(code)) rejectTeacher();
  const proof = await env.DB.prepare(`DELETE FROM teacher_auth_proofs
    WHERE digest=? AND account=? AND purpose=? AND expires>? RETURNING digest`)
    .bind(await digest('email:' + code), email, mode, now).first();
  if (!proof) rejectTeacher();
  const lookup = () => env.DB.prepare('SELECT owner,account,provider FROM teacher_accounts WHERE account=?').bind(email).first();
  let teacher = await lookup();
  if (!teacher && !legacyApproved(email, env) && mode === 'signup') {
    await createTeacher(env, 'email:' + crypto.randomUUID(), email, 'email', now);
    teacher = await lookup();
  }
  if (teacher?.provider === 'email') return teacher;
  if (teacher || legacyApproved(email, env)) error(409, 'Use Google to sign in to this account.');
  error(404, 'No teacher account uses this email. Choose Sign Up to create one.');
}

export async function purgeTeacherAuth(env, now) {
  if (!accountsEnabled(env)) return;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM teacher_auth_proofs WHERE expires<=?').bind(now),
    env.DB.prepare('DELETE FROM teacher_auth_limits WHERE expires<=?').bind(now)
  ]);
}
