// Set these public values after deploying the reporting service. Never put credentials here.
export const productionApi = '';
export const googleClientId = '';
const local = ['127.0.0.1', 'localhost'].includes(globalThis.location?.hostname);
export const apiBase = local ? '/api/wpr' : productionApi;
export async function request(path, { token, body, method } = {}) {
  if (!apiBase) throw new Error('Online assignments are unavailable until the shared reporting service is connected.');
  const response = await fetch(apiBase + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { ...(token ? { Authorization:'Bearer ' + token } : {}), ...(body !== undefined ? {'Content-Type':'application/json'} : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), cache:'no-store'
  });
  const payload = await response.json().catch(()=>null);
  if (!response.ok || !payload) throw new Error(payload?.error || 'The reporting service is unavailable. Try again.');
  return payload;
}
