// Stroke icons on a 24x24 grid. Paths only, so they inherit `currentColor` and scale cleanly. Pure data plus one DOM helper.
export const ICON_PATHS = Object.freeze({
  // learning areas
  variable: 'M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM9.5 10l5 4M14.5 10l-5 4',
  math: 'M6 4v6M3 7h6M15 7h6M6 15l5 5M11 15l-5 5M15 16h6M15 19h6',
  branch: 'M12 3l8 8-8 8-8-8zM12 19v3',
  string: 'M6 8h4v4a3 3 0 0 1-3 3M14 8h4v4a3 3 0 0 1-3 3',
  loop: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5',
  array: 'M3 8h18v8H3zM9 8v8M15 8v8',
  arraylist: 'M3 9h14v6H3zM8 9v6M13 9v6M20 10v4M18 12h4',
  linkedlist: 'M7 9h4v6H7zM15 9h4v6h-4zM3 12h4M11 12h4M19 12h2',
  method: 'M9 4c-3 4-3 12 0 16M15 4c3 4 3 12 0 16M10.5 12h3M12.5 10.5l1.5 1.5-1.5 1.5',
  cube: 'M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10',
  tree: 'M10 3h4v4h-4zM12 7v3M6 10h12M6 10v3M18 10v3M4 13h4v4H4zM16 13h4v4h-4z',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L21 21',
  nested: 'M3 3h18v18H3zM7 7h10v10H7zM10.5 10.5h3v3h-3z',
  bug: 'M9 7a3 3 0 0 1 6 0M8 9h8v6a4 4 0 0 1-8 0zM4 10l4 1M20 10l-4 1M4 18l4-2M20 18l-4-2M12 9v10',
  page: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  robot: 'M8 8h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM12 8V4M10 13h.01M14 13h.01M9.5 16.5h5',
  binary: 'M7 3c3 0 3 8 0 8s-3-8 0-8zM17 13v8M15 15l2-2M7 13c3 0 3 8 0 8s-3-8 0-8zM17 3v8M15 5l2-2',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 0 0 3-3A9 9 0 0 0 12 3zM7.5 11h.01M10.5 7.5h.01M15 8h.01',
  network: 'M12 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM5 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM19 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 8v4M12 12l-5.5 4.5M12 12l5.5 4.5',
  chart: 'M5 20V11M10 20V4M15 20v-8M20 20V8',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  checklist: 'M4 7l2 2 3.5-4M13 7h7M4 15l2 2 3.5-4M13 15h7',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  // node states and UI
  play: 'M9 6.5l8 5.5-8 5.5z',
  check: 'M5.5 12.5l4.2 4.2L18.5 7.8',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.1 9.5l6.1-.9z',
  refresh: 'M19.5 10A8 8 0 0 0 6 6.5M5.5 3v4h4M4.5 14A8 8 0 0 0 18 17.5M18.5 21v-4h-4',
  circle: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  help: 'M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1M12 17.5h.01',
  zoomIn: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L21 21M8 10.5h5M10.5 8v5',
  zoomOut: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L21 21M8 10.5h5',
  reset: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  flag: 'M6 21V4M6 5h11l-2 4 2 4H6',
});
export const iconKeys = () => Object.keys(ICON_PATHS);
const NS = 'http://www.w3.org/2000/svg';
/** @returns {SVGSVGElement} an inline icon. Decorative by default (aria-hidden); pass `label` to expose it. */
export function icon(key, { size = 24, label = null, className = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size)); svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  if (className) svg.setAttribute('class', className);
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', ICON_PATHS[key] ?? ICON_PATHS.compass);
  svg.append(p);
  return svg;
}
