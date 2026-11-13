import { withPracticeReturn } from '../../practice-return.mjs';
// The student map component. Mount it with the curriculum graph and the evaluated progress contract; it draws, it never decides.
//
//   const map = mountStudentMap(container, { graph, courseId, progress, attempts, pacing, mixedActivities, adapter });
//   map.update({ progress, attempts, pacing });   // new evaluated data from the host
//
// Every piece of progress shown comes from `progress` (cs-games.mastery-progress/1 objects). Nothing is stored by this component
// except where the student is (the URL hash) and, for the demo, transient simulated attempts held in memory.
import { buildMapModel, findNode, findStop, normalizeProgress } from '../model.mjs?v=guest-map-v1';
import { readRoute, routeHash } from '../route.mjs';
import { plural } from '../format.mjs';
import { createPacingCard, createHeader, createLegend, createSuggested, createToolbar } from './chrome.mjs?v=targeted-clarity-v1';
import { renderAreaMap } from './area-map.mjs';
import { renderCourseMap } from './course-map.mjs';
import { el } from './dom.mjs';
import { renderListView } from './list-view.mjs';
import { createPanelPlaceholder, createProgressPanel } from './progress-panel.mjs?v=guest-map-v1';
import { createSkillSearch } from './search.mjs';
import { createStage } from './stage.mjs';

export function mountStudentMap(container, options) {
  const adapter = options.adapter ?? {};
  const timeZone = options.timeZone ?? 'America/Los_Angeles';
  const hashRouting = options.hashRouting !== false;
  let input = { ...options };
  let overrides = { progress: new Map(), attempts: {} };
  let deltas = new Map();
  let model, route = hashRouting ? readRoute() : { view: 'course', stopId: null, nodeId: null, layout: 'map' };
  const searchStorageKey = () => 'cs-games:skill-search:' + (input.classId ?? 'guest') + ':' + input.courseId;
  function restoreQuery() {
    if (!input.guest && !input.classId) return '';
    try { return sessionStorage.getItem(searchStorageKey()) ?? ''; } catch { return ''; }
  }
  let searchQuery = restoreQuery();
  let stageCtl = null, zoomLevel = 1, resizeObserver = null, lastStopId = null, destroyed = false;
  const restartIds = new Map();   // one request id per attempt, reused on retry, so a repeated click cannot start two attempts
  const live = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const root = el('div', { class: 'map-app' });
  container.replaceChildren(root);

  const announce = (text) => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); };
  function effectiveInput() {
    const norm = normalizeProgress(input.progress);
    for (const [id, p] of overrides.progress) norm.nodes.set(id, p);
    return { ...input, progress: { nodes: [...norm.nodes.values()], areas: [...norm.areas.values()] }, attempts: { ...(input.attempts ?? {}), ...overrides.attempts } };
  }
  function build() {
    model = buildMapModel(effectiveInput());
    for (const n of model.nodes) n.delta = deltas.get(n.id) ?? 0;
    for (const s of model.stops) s.delta = s.nodes.reduce((t, n) => t + n.delta, 0);
    // Make the route valid for this model.
    if (route.nodeId && !findNode(model, route.nodeId)) route = { ...route, nodeId: null };
    if (route.nodeId && route.view === 'area' && findNode(model, route.nodeId).stopId !== route.stopId) route = { ...route, stopId: findNode(model, route.nodeId).stopId };
    if (route.view === 'area' && !findStop(model, route.stopId)) route = { ...route, view: 'course', stopId: null };
  }

  function writeHash(replace) {
    if (!hashRouting) return;
    const next = routeHash(route, location.hash);
    adapter.onNavigate?.({...route},model);
    if (next === (location.hash || '')) return;
    // pushState/replaceState on purpose: assigning location.hash would fire `hashchange`, and other scripts on a host page listen to it
    // (the existing student page reloads on a matching #enroll hash). Back and Forward are handled through `popstate` below.
    const url = next || location.pathname + location.search;
    if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  }
  function go(patch, { replace = false, focus = null } = {}) {
    route = { ...route, ...patch };
    writeHash(replace);
    render({ focus });
  }
  const openStop = (stop) => { lastStopId = stop.id; go({ view: 'area', stopId: stop.id, nodeId: null }, { focus: 'heading' }); };
  const backToCourse = () => go({ view: 'course', stopId: null, nodeId: null }, { focus: 'stop' });
  const setLayout = (layout) => go({ layout }, { replace: true, focus: 'layout' });

  function select(node, { focusPanel = true, scroll = false } = {}) {
    if (!node) {
      const had = route.nodeId; route = { ...route, nodeId: null }; writeHash(true);
      // The course-level list only has a side column while a skill is open, so closing removes it.
      if (route.view === 'course') render({ focus: 'none', keepScroll: true }); else { updateSelection(); renderSide(); }
      if (had) focusItem(had);
      return;
    }
    const sameStop = route.stopId === node.stopId;
    route = { ...route, nodeId: node.id, stopId: route.view === 'area' ? node.stopId : route.stopId };
    writeHash(true);
    if ((route.view === 'area' && !sameStop) || !root.querySelector('.map-side')) { render({ focus: 'panel', keepScroll: true }); return; }
    updateSelection(); renderSide(focusPanel);
    if (scroll && stageCtl) stageCtl.scrollToItem(stageCtl.items().find((i) => i.dataset.nodeId === node.id));
  }
  function updateSelection() {
    for (const holder of root.querySelectorAll('.skill-node, .skill-row')) {
      const b = holder.matches('button') ? holder : holder.querySelector('.skill-row-open');
      if (holder.dataset.nodeId === route.nodeId) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
  }
  function focusItem(nodeId) { root.querySelector(`button[data-node-id="${CSS.escape(nodeId)}"], li[data-node-id="${CSS.escape(nodeId)}"] .skill-row-open`)?.focus({ preventScroll: true }); }

  const panelCtx = (stop) => ({
    stop, model, timeZone, guestSkillControls:adapter.guestSkillControls, canRestart: typeof adapter.restartAttempt === 'function',
    onPractice: (info) => adapter.onPractice?.(info) === true,
    onClose: () => select(null), onSelectNode: (id) => select(findNode(model, id), { scroll: true }),
    async onRestart(node) {
      const expectedAttemptId = node.progress?.attempt?.id ?? null;
      // The live endpoint requires a UUID request id and answers only { restarted: true }, so the host then re-reads progress.
      const requestId = restartIds.get(expectedAttemptId) ?? crypto.randomUUID();
      restartIds.set(expectedAttemptId, requestId);
      try {
        const result = await adapter.restartAttempt({ nodeId: node.id, requestId, expectedAttemptId });
        if (!result?.ok) return result;
        const fresh = result.progress ? null : await adapter.reload?.();
        restartIds.delete(expectedAttemptId);
        if (result.progress) { overrides.progress.set(node.id, result.progress); if (result.attempts) overrides.attempts[node.id] = result.attempts; }
        else if (fresh) { input = { ...input, ...fresh }; overrides = { progress: new Map(), attempts: {} }; }
        deltas = new Map();
        build(); render({ focus: 'panel', keepScroll: true });
        announce(result.message ?? 'Started a new attempt. Your earlier attempts stay in your history.');
        return result;
      } catch(error) {
        return {ok:false,message:error.message};
      }
    },
  });
  function showSearchSkill(node) {
    lastStopId = node.stopId;
    go({ view: 'area', stopId: node.stopId, nodeId: node.id }, { focus: 'panel' });
  }

  function addReturnLinks(container) {
    if (!input.guest && !input.classId) return;
    for (const link of container.querySelectorAll('a[data-action^="practice"], a[data-action="mixed"]')) {
      link.href = withPracticeReturn(link.href, { origin: location.origin, course: model.courseId, classId: input.classId, route });
    }
  }

  function renderSide(focusPanel = false) {
    const side = root.querySelector('.map-side');
    if (!side) return;
    const node = route.nodeId ? findNode(model, route.nodeId) : null;
    side.replaceChildren();
    if (node) {
      const stop = findStop(model, node.stopId);
      side.dataset.empty = 'false';
      const panel = createProgressPanel(node, panelCtx(stop));
      side.append(panel);
      addReturnLinks(panel);
      root.dataset.panel = 'open';
      if (focusPanel) panel.querySelector('.panel-title')?.focus({ preventScroll: false });
    } else {
      side.dataset.empty = 'true'; root.dataset.panel = 'closed';
      side.append(createPanelPlaceholder(model));
    }
  }

  function mixedCard(stop) {
    if (!stop?.mixed) return null;
    return el('div', { class: 'mixed-card' },
      el('div', {}, el('p', { class: 'suggested-label', text: 'Mixed Practice' }), el('p', { class: 'muted small', text: `Practice several ${stop.baseTitle} skills in one session.` })),
      el('a', { class: 'btn btn-primary', href: stop.mixed.url, 'data-action': 'mixed', 'aria-label': `Start ${stop.mixed.label}`, text: 'Start Mixed Practice', onclick: (e) => { if (adapter.onPractice?.({ stop, url: stop.mixed.url, kind: 'mixed' }) === true) e.preventDefault(); } }));
  }
  function sessionCard() {
    if (!deltas.size || !options.highlightLabel) return null;
    const changed = model.nodes.filter((n) => n.delta > 0);
    return el('section', { class: 'session-card', 'aria-label': 'What changed' },
      el('div', {}, el('p', { class: 'suggested-label', text: options.highlightLabel }),
        el('p', { text: `${plural(changed.length, 'skill')} moved forward. Each answer counted for the skill it asked about.` }),
        el('ul', {}, changed.map((n) => el('li', {}, el('button', { type: 'button', class: 'link-btn', text: n.title, onclick: () => { if (route.view !== 'area' || route.stopId !== n.stopId) { lastStopId = n.stopId; route = { ...route, view: 'area', stopId: n.stopId, nodeId: n.id }; writeHash(false); render({ focus: 'panel' }); } else select(n, { scroll: true }); } }), el('span', { text: ` +${plural(n.delta, 'question')}` }))))),
      el('button', { type: 'button', class: 'btn btn-quiet', 'data-action': 'clear-highlights', text: 'Clear highlights', onclick: () => { deltas = new Map(); build(); render({ focus: 'none', keepScroll: true }); } }));
  }

  function drawStage(main) {
    const width = Math.max(260, Math.floor(stageCtl.viewport.clientWidth || main.clientWidth || 360));
    const stop = route.view === 'area' ? findStop(model, route.stopId) : null;
    const drawn = stop
      ? renderAreaMap(model, stop, { width, selectedId: route.nodeId, onSelect: (n) => select(n) })
      : renderCourseMap(model, { width, onOpenStop: openStop, onPractice: (info) => adapter.onPractice?.(info) });
    stageCtl.viewport.style.setProperty('--h', stop ? stop.identity.hue : 190);
    stageCtl.setContent(drawn.content, drawn.width, drawn.height);
    stageCtl.viewport.dataset.cols = String(drawn.cols);
    return drawn;
  }

  function render({ focus = null, keepScroll = false } = {}) {
    if (destroyed) return;
    const focused=root.contains(document.activeElement)?document.activeElement:null;
    const keepLayout=focus==='none'&&focused?.dataset.layout;
    const keepPanel=focus==='none'&&focused?.closest('.skill-panel');
    const keepSkill=focus==='none'&&focused?.closest('[data-node-id]')?.dataset.nodeId;
    const keepStop=focus==='none'&&focused?.dataset.stopId;
    const prev = stageCtl ? { left: stageCtl.viewport.scrollLeft, top: stageCtl.viewport.scrollTop } : null;
    resizeObserver?.disconnect(); resizeObserver = null;
    const stop = route.view === 'area' ? findStop(model, route.stopId) : null;
    root.dataset.view = route.view; root.dataset.layout = route.layout; root.dataset.mode = model.mode; root.dataset.pacing = model.pacing.mode;
    if (stop) root.style.setProperty('--h', stop.identity.hue); else root.style.removeProperty('--h');
    const dated = model.pacing.showDates;
    const header = createHeader(model, { route, stop, onBack: backToCourse });
    const meta = el('div', { class: 'map-meta' },
      route.view === 'area' ? mixedCard(stop) : null,
      stop?adapter.guestAreaControls?.(stop):null,
      createSuggested(model, { stop, onShow: (n) => { if (route.view === 'area' && n.stopId === route.stopId) select(n, { scroll: true, focusPanel: false }); else { lastStopId = n.stopId; route = { ...route, view: 'area', stopId: n.stopId, nodeId: n.id }; writeHash(false); render({ focus: 'panel' }); } }, onPractice: (i) => adapter.onPractice?.(i) }),
      createPacingCard(model, { onShow: (n) => { route = { ...route, view: 'area', stopId: n.stopId, nodeId: n.id }; lastStopId = n.stopId; writeHash(false); render({ focus: 'panel' }); } }),
      sessionCard());
    const showZoom = route.layout === 'map';
    const toolbar = createToolbar({ layout: route.layout, onLayout: setLayout, zoom: { in: () => stageCtl?.zoomIn(), out: () => stageCtl?.zoomOut(), reset: () => stageCtl?.resetView() }, showZoom });
    const main = el('div', { class: 'map-main' });
    const side = el('aside', { class: 'map-side', 'aria-label': 'Skill progress' });
    const showSide = route.view === 'area' || route.nodeId;
    const search = createSkillSearch(model, {
      layout: route.layout, query: searchQuery, onShow: showSearchSkill,
      onPractice: info => adapter.onPractice?.(info),
      onQuery(query, results) {
        searchQuery = query;
        if (input.guest || input.classId) {
          try { sessionStorage.setItem(searchStorageKey(), query); } catch { /* Search still works in this view. */ }
        }
        addReturnLinks(results);
      },
    });
    root.replaceChildren(live, header, el('div', { class: 'map-tools' }, toolbar, createLegend({ dated })), search, meta, el('div', { class: 'map-body', 'data-side': showSide ? 'true' : 'false' }, main, showSide ? side : null));

    if (route.layout === 'map') {
      stageCtl = createStage({ label: stop ? `${stop.title} skill map` : `${model.courseTitle} course map`, onZoomChange: (z) => { zoomLevel = z; root.dataset.zoom = String(z); } });
      stageCtl.zoom = zoomLevel;
      main.append(stageCtl.viewport);
      drawStage(main);
      if (typeof ResizeObserver === 'function') {
        let last = stageCtl.viewport.clientWidth;
        resizeObserver = new ResizeObserver(() => { const w = stageCtl.viewport.clientWidth; if (Math.abs(w - last) > 12 && w > 0) { last = w; const had = document.activeElement?.dataset?.nodeId ?? document.activeElement?.dataset?.stopId; const left = stageCtl.viewport.scrollTop; drawStage(main); stageCtl.viewport.scrollTop = left; if (had) root.querySelector(`[data-node-id="${CSS.escape(had)}"],[data-stop-id="${CSS.escape(had)}"] .stop-open`)?.focus?.({ preventScroll: true }); } });
        resizeObserver.observe(main);
      }
    } else {
      stageCtl = null;
      const stops = stop ? [stop] : model.stops;
      main.append(renderListView(model, stops, { onSelect: (n) => select(n), onOpenStop: openStop, onPractice: (i) => adapter.onPractice?.(i), selectedId: route.nodeId, showStopButton: !stop }));
    }
    addReturnLinks(root);
    if (showSide) renderSide(focus === 'panel'||Boolean(keepPanel));
    if (keepScroll && prev && stageCtl) stageCtl.viewport.scrollTo({ left: prev.left, top: prev.top, behavior: 'auto' });

    // Focus management: say where the student landed, and give focus back where they came from.
    if (focus === 'heading') root.querySelector('#map-heading')?.focus({ preventScroll: false });
    else if (focus === 'layout') root.querySelector('[data-layout][aria-pressed="true"]')?.focus({ preventScroll: true });
    else if (focus === 'none' && focused?.id === 'map-skill-search') root.querySelector('#map-skill-search')?.focus({ preventScroll: true });
    else if (keepLayout) root.querySelector('[data-layout][aria-pressed="true"]')?.focus({preventScroll:true});
    else if (keepSkill&&!keepPanel) focusItem(keepSkill);
    else if (keepStop) root.querySelector(`button[data-stop-id="${CSS.escape(keepStop)}"]`)?.focus({preventScroll:true});
    else if (focus === 'stop' && lastStopId) { const t = root.querySelector(`[data-stop-id="${CSS.escape(lastStopId)}"] .stop-open, .stop-item[data-stop-id="${CSS.escape(lastStopId)}"] [data-action="open-stop"]`); t?.focus({ preventScroll: true }); if (stageCtl && t) stageCtl.scrollToItem(t, { smooth: false }); }
    else if (focus === 'panel' && route.nodeId && stageCtl) { const b = stageCtl.items().find((i) => i.dataset.nodeId === route.nodeId); if (b) stageCtl.scrollToItem(b, { smooth: false }); }
    else if (!focus && route.view === 'area' && route.nodeId && stageCtl) { const b = stageCtl.items().find((i) => i.dataset.nodeId === route.nodeId); if (b) stageCtl.scrollToItem(b, { smooth: false }); }
  }

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && route.nodeId && !e.defaultPrevented) { const id = route.nodeId; select(null); focusItem(id); }
  });
  const onHash = () => {
    if (!hashRouting || location.hash==='#student-profile') return;
    const next = readRoute();
    if (next.view === route.view && next.stopId === route.stopId && next.nodeId === route.nodeId && next.layout === route.layout) return;
    route = next; build(); render({ focus: 'none' });
  };
  window.addEventListener('hashchange', onHash);
  window.addEventListener('popstate', onHash);

  const hadMapContext = route.view === 'area' || route.nodeId !== null;
  const wantedStop = route.stopId, wantedNode = route.nodeId;
  build();
  const stale = hadMapContext && (wantedStop !== route.stopId || wantedNode !== route.nodeId);
  if (stale) writeHash(true);
  render();
  if ((input.guest || input.classId) && route.nodeId) requestAnimationFrame(() => {
    if (document.activeElement === document.body) root.querySelector('.panel-title')?.focus();
  });
  if (stale) {
    const note = el('p', { class: 'note', role: 'status', text: 'The previous skill or area is unavailable. Use this map to choose where to continue.' });
    container.prepend(note);
  }

  return {
    get model() { return model; },
    get route() { return { ...route }; },
    /** New data from the host. Pass `highlight: true` to show what changed since the last update (used by the Mixed Practice demo). */
    update(patch = {}, { highlight = false, label = null } = {}) {
      // Lifetime practice, not the current attempt: an attempt that has already met its requirement is frozen, but the answers still count.
      const practiced = (n) => n.progress?.lifetime?.questionsAnswered ?? n.progress?.attempt?.attempted ?? 0;
      const before = model ? new Map(model.nodes.map((n) => [n.id, practiced(n)])) : new Map();
      const courseChanged = patch.courseId && patch.courseId !== input.courseId;
      input = { ...input, ...patch };
      if (label !== null) options.highlightLabel = label;
      overrides = { progress: new Map(), attempts: {} };
      if (courseChanged) {
        searchQuery = restoreQuery();
        route = { view: 'course', stopId: null, nodeId: null, layout: route.layout };
      }
      deltas = new Map();
      if (highlight) {
        const next = buildMapModel(effectiveInput());
        for (const n of next.nodes) { const d = practiced(n) - (before.get(n.id) ?? 0); if (d > 0) deltas.set(n.id, d); }
        announce(`${plural(deltas.size, 'skill')} moved forward.`);
      }
      build(); writeHash(true); render({ focus: 'none', keepScroll: true });
    },
    select: (nodeId) => { const n = findNode(model, nodeId); if (n) { if (route.view === 'course') { lastStopId = n.stopId; route = { ...route, view: 'area', stopId: n.stopId, nodeId: n.id }; writeHash(false); render({ focus: 'panel' }); } else select(n, { scroll: true }); } },
    openStop: (stopId) => { const s = findStop(model, stopId); if (s) openStop(s); },
    showCourse: backToCourse, setLayout,
    destroy() { destroyed = true; resizeObserver?.disconnect(); window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); container.replaceChildren(); },
  };
}
