// Set these public values after deploying the reporting service. Never put credentials here.
export const productionApi = 'https://cs-games-api.cs-games-davisjm4.workers.dev/api/wpr';
export const googleClientId = '1030010713743-pdt1cknkf1utf54kvo568d2o6q84aai0.apps.googleusercontent.com';
const profilesOnProduction = true;
const local = ['127.0.0.1', 'localhost'].includes(globalThis.location?.hostname);
export const apiBase = local ? '/api/wpr' : productionApi;
export const profilesAvailable = local || Boolean(profilesOnProduction && productionApi && googleClientId);
export async function request(path, { token, body, method } = {}) {
  if (!apiBase) throw new Error('Online assignments are unavailable until the shared reporting service is connected.');
  const response = await fetch(apiBase + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { ...(token ? { Authorization:'Bearer ' + token } : {}), ...(body !== undefined ? {'Content-Type':'application/json'} : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), cache:'no-store'
  });
  const payload = await response.json().catch(()=>null);
  if (!response.ok || !payload) throw Object.assign(new Error(payload?.error || 'The reporting service is unavailable. Try again.'), {status:response.status});
  return payload;
}
