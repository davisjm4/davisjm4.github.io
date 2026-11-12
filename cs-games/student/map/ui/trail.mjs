// The backdrop and the trail behind the nodes: an environment per learning area, and a path whose travelled part is drawn solid.
import { trailSegments } from '../layout.mjs';
import { svg } from './dom.mjs';

const patternFor = (motif, id) => {
  const common = { id, patternUnits: 'userSpaceOnUse' };
  const line = { stroke: 'currentColor', 'stroke-width': 1, fill: 'none' };
  switch (motif) {
    case 'grid': return svg('pattern', { ...common, width: 36, height: 36 }, svg('path', { d: 'M36 0H0V36', ...line }));
    case 'waves': return svg('pattern', { ...common, width: 48, height: 24 }, svg('path', { d: 'M0 12q12-12 24 0t24 0', ...line }));
    case 'diagonals': return svg('pattern', { ...common, width: 22, height: 22, patternTransform: 'rotate(45)' }, svg('path', { d: 'M0 0V22', ...line }));
    case 'rings': return svg('pattern', { ...common, width: 56, height: 56 }, svg('circle', { cx: 28, cy: 28, r: 8, ...line }), svg('circle', { cx: 28, cy: 28, r: 19, ...line }));
    case 'circuit': return svg('pattern', { ...common, width: 60, height: 60 }, svg('path', { d: 'M0 30H20V10H40V50H60', ...line }), svg('rect', { x: 17, y: 27, width: 6, height: 6, fill: 'currentColor' }));
    case 'hex': return svg('pattern', { ...common, width: 52, height: 45 }, svg('path', { d: 'M13 0L0 22.5 13 45M39 0l13 22.5L39 45M13 0h26', ...line }));
    default: return svg('pattern', { ...common, width: 26, height: 26 }, svg('circle', { cx: 13, cy: 13, r: 1.6, fill: 'currentColor' }));
  }
};
let uid = 0;
/**
 * @param {{width:number,height:number,points:Array<{x:number,y:number}>,motif:string,travelled:number}} o
 *   `travelled` = how many segments (from the start) are drawn solid, because the skill at their start is complete.
 */
export function createBackdrop({ width, height, points, motif = 'dots', travelled = 0, bulge = 0 }) {
  const id = `motif-${++uid}`;
  const segs = trailSegments(points, { bulge });
  return svg('svg', { class: 'stage-art', width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true', focusable: 'false' },
    svg('defs', {}, patternFor(motif, id)),
    svg('rect', { class: 'motif', x: 0, y: 0, width, height, fill: `url(#${id})` }),
    svg('g', { class: 'trail' },
      segs.map((d, i) => svg('path', { class: i < travelled ? 'trail-seg travelled' : 'trail-seg', d }))));
}
