// Shared launch URLs for the map and the classic list.
export const courseNames={advanced:'Advanced CS',csp:'AP CSP',robotics:'Robotics 1',workplace:'Workplace Readiness'};
const titleCase = (id) => id.split('-').map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const BASE = globalThis.location?.origin??'https://cs-games.invalid';
const href = (u) => (u.origin === BASE ? u.pathname + u.search + u.hash : u.href);
// These activities open in their mixed mode or with all topics selected.
const mixedOnOpen=new Set([
  'mixed-ap-practice','vocabulary-fill-in-lab','test-case-builder','response-builder',
  'create-task-lab','rgb-color-builder','analog-digital-lab','roundoff-overflow-lab',
  'lossless-lossy-lab','algorithm-architect','trivial-nontrivial','simulation-lab',
  'internet-layers-lab','tcp-udp-lab','ai-ethics-lab','computing-impact-lab',
  'digital-divide-lab','copyright-creative-commons-lab','component-challenge'
]);

function safeUrl(raw) {
  try {
    const u = new URL(raw, BASE);
    if (u.origin !== BASE && u.protocol !== 'https:') return null;
    return u;
  } catch { return null; }
}
/**
 * @param node a curriculum-graph node
 * @param {{mixedActivities?: Set<string>}} [options] activity ids known to offer a Mixed Practice mode
 * @returns {{links: Array<{kind:string,activityId:string,label:string,url:string}>, mixed: {activityId:string,label:string,url:string}|null}}
 */
export function practiceLinks(node, { mixedActivities, guest=false } = {}) {
  const links = [];
  let mixed = null;
  for (const item of node.checkpoint?.practice ?? node.practice ?? []) {
    const u = safeUrl(item.url);
    if (!u || !item.activityId) continue;
    const name = titleCase(item.activityId);
    const selector = node.familySelectors?.find((s) => s.activityId === item.activityId);
    const mode = selector?.modeId ?? selector?.modeIds?.[0];
    const local = u.origin === BASE;
    const java = local && u.pathname.startsWith('/java-games/');
    const robotics = local && item.activityId === 'parts-sprint' && selector?.category;
    const workplace = local && item.activityId === 'workplace-readiness' && node.standardRefs?.find((s) => s.registry === 'ctecs-wrs');
    if (java && mode) u.searchParams.set('mode', String(mode).split('/')[0]);
    if (robotics) u.searchParams.set('category', selector.category);
    if (workplace) { u.searchParams.set('practice', '1'); u.searchParams.set('skills', workplace.id); }
    if (local && guest) u.searchParams.set('learner', 'guest');
    links.push({ kind: java && mode ? 'focused' : robotics ? 'focused' : workplace ? 'workplace' : 'open', activityId: item.activityId,
      label: java && mode || robotics ? `Practice in ${name}` : workplace ? `Practice ${workplace.label}` : `Open ${name}`, url: href(u) });
    const javaMixed=java&&(mixedActivities?mixedActivities.has(item.activityId):item.activityId!=='search-sort-lab');
    if (!mixed && (javaMixed || robotics || local&&mixedOnOpen.has(item.activityId))) {
      const m = safeUrl(item.url);
      if(java||robotics){
        m.searchParams.delete('category');
        m.searchParams.set('mode', 'mixed');
      }
      if (guest) m.searchParams.set('learner', 'guest');
      mixed = { activityId: item.activityId, label: `Mixed Practice in ${name}`, url: href(m) };
    }
  }
  return { links, mixed };
}
