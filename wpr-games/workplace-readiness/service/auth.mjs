const decoder = new TextDecoder();
const bytes = s => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
let cachedKeys;
let cacheUntil = 0;

export async function teacherIdentity(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S{1,6000})$/)?.[1];
  if (!token) return null;
  if (env.verifyLocalTeacher) return env.verifyLocalTeacher(token);
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
        !env.TEACHER_EMAILS.toLowerCase().split(',').map(x=>x.trim()).includes(claims.email?.toLowerCase()) ||
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
      ? 'google:' + claims.sub : null;
  } catch { return null; }
}
