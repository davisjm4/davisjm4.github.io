import { accountCapabilities, accountsEnabled, digest, emailTeacher, googleTeacher, legacyApproved,
  randomSecret, registeredTeacher, rejectTeacher } from './teacher-accounts.mjs';

const decoder = new TextDecoder();
const bytes = s => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
let cachedKeys;
let cacheUntil = 0;
let lastKeyFetch = 0;
let keyFetch;

const bearer = request => request.headers.get('Authorization')?.match(/^Bearer (\S{1,6000})$/)?.[1];
const sessionPattern = /^csgt_[0-9a-f]{64}$/;

async function verifyGoogle(token, env) {
  if (!token || sessionPattern.test(token) || !env.GOOGLE_CLIENT_ID) return null;
  try {
    const [head, body, sig, extra] = token.split('.');
    if (extra !== undefined || !sig) return null;
    const header = JSON.parse(decoder.decode(bytes(head)));
    const claims = JSON.parse(decoder.decode(bytes(body)));
    const now = Math.floor(Date.now()/1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
        !['accounts.google.com','https://accounts.google.com'].includes(claims.iss) ||
        claims.aud !== env.GOOGLE_CLIENT_ID || !Number.isInteger(claims.exp) || claims.exp <= now ||
        !Number.isInteger(claims.iat) || claims.iat > now+60 || claims.email_verified !== true ||
        typeof claims.email !== 'string' ||
        typeof claims.sub !== 'string' || !/^\d{1,32}$/.test(claims.sub)) return null;
    if (!cachedKeys || now >= cacheUntil || !cachedKeys.some(key=>key.kid===header.kid)) {
      if (!keyFetch && now - lastKeyFetch >= 10) {
        lastKeyFetch = now;
        keyFetch = fetch('https://www.googleapis.com/oauth2/v3/certs')
          .then(async response => {
            if (!response.ok) return;
            const {keys} = await response.json();
            if (!Array.isArray(keys)) return;
            cachedKeys = keys;
            cacheUntil = now + 300;
          }).finally(() => { keyFetch = undefined; });
      }
      await keyFetch;
    }
    if (!cachedKeys || now >= cacheUntil) return null;
    const jwk = cachedKeys.find(k=>k.kid===header.kid && k.kty==='RSA');
    if (!jwk) return null;
    const algorithm = { name:'RSASSA-PKCS1-v1_5',hash:'SHA-256' };
    const key = await crypto.subtle.importKey('jwk',jwk,algorithm,false,['verify']);
    return await crypto.subtle.verify(algorithm,key,bytes(sig),new TextEncoder().encode(head+'.'+body))
      ? claims : null;
  } catch { return null; }
}

async function verifyLegacyCredential(token, env) {
  if (!token || sessionPattern.test(token)) return null;
  if (env.verifyLocalTeacher) {
    const owner = await env.verifyLocalTeacher(token);
    return owner ? {owner,account:owner} : null;
  }
  if (!env.TEACHER_EMAILS) return null;
  const claims = await verifyGoogle(token, env);
  if (!claims) return null;
  const account = claims.email.toLowerCase();
  return legacyApproved(account, env) ? {owner:'google:' + claims.sub, account} : null;
}

async function findSession(token, env) {
  const row = await env.DB.prepare('SELECT owner,account,expires FROM teacher_sessions WHERE digest=? AND expires>?')
    .bind(await digest(token), Date.now()).first();
  if (!row) return null;
  const account = accountsEnabled(env) ? await registeredTeacher(env, row.owner) : null;
  if (account) return {...row, provider:account.provider};
  return env.verifyLocalTeacher || (row.owner.startsWith('google:') && legacyApproved(row.account, env)) ? row : null;
}

export async function teacherIdentity(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const identity = sessionPattern.test(token) ? await findSession(token, env) :
    (!accountsEnabled(env) || env.verifyLocalTeacher) && await verifyLegacyCredential(token, env);
  return identity?.owner ?? null;
}

async function createSession(env, identity) {
  const token = 'csgt_' + randomSecret(32);
  const expires = Date.now() + 2 * 60 * 60 * 1000;
  const {owner, account, provider} = identity;
  await env.DB.prepare('INSERT INTO teacher_sessions(digest,owner,account,expires) VALUES(?,?,?,?)')
    .bind(await digest(token), owner, account, expires).run();
  return {token, owner, account, provider, expires};
}

export async function teacherAccountRoute(request, env, path, readBody) {
  if (path === '/teacher/registration' && request.method === 'GET') return accountCapabilities(env);
  if (path === '/teacher/email' && request.method === 'POST') {
    const teacher = await emailTeacher(request, env, await readBody(request, 2048));
    return teacher ? createSession(env, teacher) : {sent:true};
  }
  if (path === '/teacher/sessions' && request.method === 'DELETE') {
    const token = bearer(request);
    const active = token && sessionPattern.test(token) && await findSession(token, env);
    if (!active) rejectTeacher();
    await env.DB.prepare('DELETE FROM teacher_sessions WHERE owner=? AND digest<>?')
      .bind(active.owner, await digest(token)).run();
    return {revoked:true};
  }
  throw Object.assign(new Error('Teacher account route not found.'), {status:404});
}

export async function teacherSession(request, env, readBody) {
  const token = bearer(request);
  const reject = () => { throw Object.assign(new Error('Sign in with an authorized teacher account.'), {status:401}); };
  if (request.method === 'POST') {
    if (accountsEnabled(env) && !env.verifyLocalTeacher) {
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) rejectTeacher();
      const {mode} = (await readBody(request, 2048)) ?? {};
      if (!['signup', 'signin'].includes(mode)) rejectTeacher();
      return createSession(env, await googleTeacher(request, env, mode, verifyGoogle));
    }
    const identity = await verifyLegacyCredential(token, env);
    if (!identity) reject();
    return createSession(env, identity);
  }
  if (request.method === 'GET') {
    const identity = token && sessionPattern.test(token) && await findSession(token, env);
    if (!identity) reject();
    return identity;
  }
  if (request.method === 'DELETE') {
    if (token && sessionPattern.test(token)) {
      await env.DB.prepare('DELETE FROM teacher_sessions WHERE digest=?').bind(await digest(token)).run();
    }
    return {signedOut:true};
  }
  throw Object.assign(new Error('Teacher session route not found.'), {status:404});
}
