// A scrollable, zoomable stage shared by the course map and the learning-area map.
//  - Panning is the browser's own scrolling (touch, wheel, keyboard, scroll bars). Mouse drag is an extra, never the only way.
//  - Zoom is explicit (buttons or + / - / 0) and scales real DOM text, so labels stay crisp and selectable.
//  - Arrow keys on a node move to the neighbouring node in trail order; Tab still walks every node, so focus is never trapped.
import { stepIndex } from '../layout.mjs';
import { el, reducedMotion } from './dom.mjs';

export const ZOOM_STEPS = Object.freeze([0.9, 1, 1.25, 1.5, 2]);
export function createStage({ label, onZoomChange = () => {} }) {
  let zoom = 1, size = { width: 0, height: 0 }, drag = null;
  const stage = el('div', { class: 'stage' });
  const sizer = el('div', { class: 'stage-sizer' }, stage);
  const viewport = el('div', { class: 'map-viewport', role: 'region', 'aria-label': label, tabindex: '0' }, sizer);
  const items = () => [...viewport.querySelectorAll('[data-map-item]')];

  function apply() {
    sizer.style.width = `${size.width * zoom}px`; sizer.style.height = `${size.height * zoom}px`;
    stage.style.width = `${size.width}px`; stage.style.height = `${size.height}px`; stage.style.transform = `scale(${zoom})`;
    viewport.dataset.zoom = String(zoom);
    onZoomChange(zoom);
  }
  function scrollToItem(item, { smooth = true } = {}) {
    if (!item) return;
    const x = Number.parseFloat(item.dataset.x ?? item.style.left), y = Number.parseFloat(item.dataset.y ?? item.style.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    viewport.scrollTo({ left: Math.max(0, x * zoom - viewport.clientWidth / 2), top: Math.max(0, y * zoom - viewport.clientHeight / 2), behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  }
  function setZoom(next) {
    const idx = ZOOM_STEPS.indexOf(next);
    if (idx < 0 || next === zoom) return;
    // Keep the centre of what the student is looking at where it is.
    const cx = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom, cy = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
    zoom = next; apply();
    viewport.scrollTo({ left: Math.max(0, cx * zoom - viewport.clientWidth / 2), top: Math.max(0, cy * zoom - viewport.clientHeight / 2), behavior: 'auto' });
  }
  const zoomIn = () => setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(zoom) + 1)]);
  const zoomOut = () => setZoom(ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(zoom) - 1)]);
  function resetView() { zoom = 1; apply(); viewport.scrollTo({ left: 0, top: 0, behavior: 'auto' }); }

  viewport.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const onItem = e.target.closest?.('[data-map-item]');
    if (onItem && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      const list = items(), i = list.indexOf(onItem), j = stepIndex(e.key, i, list.length);
      e.preventDefault();
      if (j !== i) { list[j].focus(); scrollToItem(list[j]); }
      return;
    }
    if (e.target !== viewport && !onItem) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
    else if (e.key === '0') { e.preventDefault(); resetView(); }
  });
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('[data-map-item], a, button')) return;
    drag = { x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture?.(e.pointerId); viewport.dataset.panning = 'true';
  });
  viewport.addEventListener('pointermove', (e) => { if (drag) { viewport.scrollLeft = drag.left - (e.clientX - drag.x); viewport.scrollTop = drag.top - (e.clientY - drag.y); } });
  const endDrag = () => { drag = null; delete viewport.dataset.panning; };
  viewport.addEventListener('pointerup', endDrag); viewport.addEventListener('pointercancel', endDrag);

  return {
    viewport, stage, items, scrollToItem, zoomIn, zoomOut, resetView,
    get zoom() { return zoom; },
    set zoom(v) { if (ZOOM_STEPS.includes(v)) { zoom = v; apply(); } },
    /** Replace the drawing. `content` is an array of nodes that are positioned inside the stage's coordinate space. */
    setContent(content, width, height) { size = { width, height }; stage.replaceChildren(...content); apply(); },
    get width() { return viewport.clientWidth; },
  };
}
