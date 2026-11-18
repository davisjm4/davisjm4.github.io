// Where the student is, kept in the URL hash so Back, reload and shared links work. The component owns v/stop/skill/layout;
// a host page (the demo) may add its own keys and they are preserved.
const KEYS = ['v', 'unit', 'stop', 'skill', 'layout'];
export function readRoute(hash = (typeof location !== 'undefined' ? location.hash : '')) {
  const p = new URLSearchParams(String(hash).replace(/^#/, ''));
  const view = p.get('v');
  return { view: view === 'area' || view === 'unit' ? view : 'course', ...(view === 'unit' ? {unitId:p.get('unit')} : {}), stopId: p.get('stop'), nodeId: p.get('skill'), layout: p.get('layout') === 'list' ? 'list' : 'map' };
}
export function routeHash(route, currentHash = '') {
  const p = new URLSearchParams(String(currentHash).replace(/^#/, ''));
  for (const k of KEYS) p.delete(k);
  if (route.view === 'unit' && route.unitId) { p.set('v','unit'); p.set('unit',route.unitId); }
  if (route.view === 'area') { p.set('v', 'area'); if (route.stopId) p.set('stop', route.stopId); }
  if (route.nodeId) p.set('skill', route.nodeId);
  if (route.layout === 'list') p.set('layout', 'list');
  return p.toString() ? `#${p.toString()}` : '';
}
