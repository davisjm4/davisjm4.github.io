const decoder = new TextDecoder();
const bytes = s => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
let cachedKeys;
let cacheUntil = 0;

const bearer = request => request.headers.get('Authorization')?.match(/^Bearer (\S{1,6000})$/)?.[1];
const sessionPattern = /^csgt_[0-9a-f]{64}$/;
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const digest = async token => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
const approved = (account, env) => env.TEACHER_EMAILS?.toLowerCase().split(',').map(x => x.trim()).includes(account);

async function verifyCredential(token, env) {
  if (!token || sessionPattern.test(token)) return null;
  if (env.verifyLocalTeacher) {
    const owner = await env.verifyLocalTeacher(token);
    return owner ? {owner, account:owner} : null;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.TEACHER_EMAILS) return null;
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
        typeof claims.email !== 'string' || !approved(claims.email.toLowerCase(), env) ||
        typeof claims.sub !== 'string' || !/^\d{1,32}$/.test(claims.sub)) return null;
    if (!cachedKeys || now >= cacheUntil) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
      if (!response.ok) return null;
      cachedKeys = (await response.json()).keys;
      cacheUntil = now + 300;
    }
    const jwk = cachedKeys.find(k=>k.kid===header.kid && k.kty==='RSA');
    if (!jwk) return null;
    const algorithm = { name:'RSASSA-PKCS1-v1_5',hash:'SHA-256' };
    const key = await crypto.subtle.importKey('jwk',jwk,algorithm,false,['verify']);
    return await crypto.subtle.verify(algorithm,key,bytes(sig),new TextEncoder().encode(head+'.'+body))
      ? {owner:'google:' + claims.sub, account:claims.email.toLowerCase()} : null;
  } catch { return null; }
}

async function findSession(token, env) {
  const row = await env.DB.prepare('SELECT owner,account,expires FROM teacher_sessions WHERE digest=? AND expires>?')
    .bind(await digest(token), Date.now()).first();
  return row && (env.verifyLocalTeacher || approved(row.account, env)) ? row : null;
}

export async function teacherIdentity(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const identity = sessionPattern.test(token) ? await findSession(token, env) : await verifyCredential(token, env);
  return identity?.owner ?? null;
}

export async function teacherSession(request, env) {
  const token = bearer(request);
  const reject = () => { throw Object.assign(new Error('Sign in with an authorized teacher account.'), {status:401}); };
  if (request.method === 'POST') {
    const identity = await verifyCredential(token, env);
    if (!identity) reject();
    const session = 'csgt_' + hex(crypto.getRandomValues(new Uint8Array(32)));
    const expires = Date.now() + 2 * 60 * 60 * 1000;
    await env.DB.prepare('INSERT INTO teacher_sessions(digest,owner,account,expires) VALUES(?,?,?,?)')
      .bind(await digest(session), identity.owner, identity.account, expires).run();
    return {token:session, ...identity, expires};
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
