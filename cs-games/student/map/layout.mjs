// Pure layout for both maps. A "serpentine" trail: rows of `cols` stops that alternate direction, joined by smooth curves, so the
// map reads as one journey whatever the number of stops or the screen width. No DOM, so it can be tested without a browser.
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
/**
 * @param {number} count number of points
 * @param {{width:number, cellW:number, cellH:number, padX?:number, padY?:number, minCols?:number, maxCols?:number, wobble?:number}} o
 * @returns {{cols:number, width:number, height:number, points:Array<{x:number,y:number,row:number,col:number}>}}
 */
export function serpentine(count, { width, cellW, cellH, padX = 24, padY = 28, minCols = 1, maxCols = 6, wobble = 0 }) {
  const usable = Math.max(1, width - padX * 2);
  const cols = clamp(Math.floor(usable / cellW) || 1, minCols, Math.max(minCols, maxCols));
  const stepX = cols > 1 ? usable / cols : 0;
  const points = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols), k = i % cols, col = row % 2 === 0 ? k : cols - 1 - k;
    // A single column zigzags left and right so one-column phone layouts still read as a trail rather than a straight list.
    const x = cols === 1 ? padX + usable * (0.3 + 0.4 * (i % 2 === 0 ? 0 : 1)) : padX + stepX * col + stepX / 2;
    const bob = wobble ? Math.sin(i * 1.7) * wobble : 0;
    points.push({ x: Math.round(x), y: Math.round(padY + cellH * row + cellH / 2 + bob), row, col });
  }
  const rows = count ? Math.floor((count - 1) / cols) + 1 : 0;
  return { cols, width, height: Math.round(padY * 2 + cellH * rows), points };
}
/**
 * Smooth path through the points (Catmull-Rom converted to cubic segments), one `d` string per consecutive pair.
 * Where the trail turns a corner (the next point is directly below), the curve bulges outward by `bulge` so it loops around the
 * labels instead of cutting through them.
 */
export function trailSegments(points, { tension = 0.5, bulge = 0 } = {}) {
  const segs = [];
  const maxCol = Math.max(0, ...points.map((p) => p.col));
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    if (bulge && maxCol > 0 && p1.row !== p2.row && p1.col === p2.col) {
      const dir = p1.col * 2 >= maxCol ? 1 : -1, dy = p2.y - p1.y;
      segs.push(`M${p1.x} ${p1.y}C${p1.x + dir * bulge} ${Math.round(p1.y + dy * 0.12)} ${p2.x + dir * bulge} ${Math.round(p2.y - dy * 0.12)} ${p2.x} ${p2.y}`);
      continue;
    }
    const c1 = { x: p1.x + ((p2.x - p0.x) * tension) / 3, y: p1.y + ((p2.y - p0.y) * tension) / 3 };
    const c2 = { x: p2.x - ((p3.x - p1.x) * tension) / 3, y: p2.y - ((p3.y - p1.y) * tension) / 3 };
    segs.push(`M${p1.x} ${p1.y}C${Math.round(c1.x)} ${Math.round(c1.y)} ${Math.round(c2.x)} ${Math.round(c2.y)} ${p2.x} ${p2.y}`);
  }
  return segs;
}
export const trailPath = (points) => trailSegments(points).join('');
/** Index of the neighbouring point for an arrow key, following trail order. Returns the same index at the ends. */
export function stepIndex(key, index, count) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(count - 1, index + 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(0, index - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return index;
}
