// View B: one learning area as a trail of skills, in the suggested order. Every skill is open; the trail is a guide, never a gate.
import { icon } from '../icons.mjs';
import { serpentine } from '../layout.mjs';
import { el } from './dom.mjs';
import { createSkillNode } from './skill-node.mjs';
import { createBackdrop } from './trail.mjs';

/** @returns {{content: Node[], width:number, height:number, cols:number, hue:number}} */
export function renderAreaMap(model, stop, { width, selectedId, onSelect, nextId }) {
  const layout = serpentine(stop.nodes.length, { width, cellW: 132, cellH: 152, padX: 14, padY: 18, maxCols: 6, wobble: 7 });
  // A segment is "travelled" when the skill it leaves is complete, counted from the start of the trail.
  const firstOpen = stop.nodes.findIndex((n) => !n.complete);
  const travelled = firstOpen === -1 ? stop.nodes.length - 1 : firstOpen;
  const content = [
    el('div', { class: 'stage-mark', 'aria-hidden': 'true' }, icon(stop.identity.icon, { size: 220 })),
    createBackdrop({ width: layout.width, height: layout.height, points: layout.points, motif: stop.identity.motif, travelled, bulge: 96 }),
  ];
  stop.nodes.forEach((node, i) => {
    const { x, y } = layout.points[i];
    const shown = nextId ? {...node,suggested:node.id===nextId} : node;
    const b = createSkillNode(shown, { x, y, onSelect, selected: node.id === selectedId });
    b.dataset.x = x; b.dataset.y = y;
    content.push(b);
  });
  return { content, width: layout.width, height: layout.height, cols: layout.cols, hue: stop.identity.hue };
}
