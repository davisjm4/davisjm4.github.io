// Display-only helpers. Nothing here evaluates mastery: numbers arrive already computed in the progress contract.
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Same output as the engine's formatPercent so the map and the engine's own sentences agree. */
export const formatPercent = (value) => (value === null || value === undefined ? null : `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}%`);
export function joinList(items) {
  const a = items.filter(Boolean);
  return a.length <= 1 ? a.join('') : a.length === 2 ? a.join(' and ') : `${a.slice(0, -1).join(', ')}, and ${a.at(-1)}`;
}
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Date-only strings are compared as UTC day numbers, so a school date never shifts with the viewer's time zone. */
export function dayNumber(dateOnly) {
  const m = DATE_ONLY.exec(String(dateOnly ?? ''));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t / 86400000 : null;
}
export const daysUntil = (target, today) => { const a = dayNumber(target), b = dayNumber(today); return a === null || b === null ? null : a - b; };
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const formatDay = (dateOnly) => { const n = dayNumber(dateOnly); return n === null ? null : monthDay.format(new Date(n * 86400000)); };
/** ISO timestamp -> "Nov 3" in the class time zone. */
export function formatStamp(iso, timeZone = 'America/Los_Angeles') {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(new Date(t));
}
