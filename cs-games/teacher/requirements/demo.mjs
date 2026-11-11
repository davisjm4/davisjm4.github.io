// Standalone demo: two synthetic classes built from the real Advanced CS curriculum graph. Nothing is saved anywhere and nothing is published
// to students; "Publish" only updates the in-page demo copy. Use it to try the controls.
import { createPathway } from '../../pathway/model.mjs';
import { createMemoryAdapter } from './adapter.mjs';
import { createRequirementsEditor } from './editor.mjs';

const $ = (id) => document.getElementById(id);
const [graph, registry] = await Promise.all([fetch('../../pathway/curriculum-graph.json').then((r) => r.json()), fetch('../../pathway/evidence-gap-registry.json').then((r) => r.json())]);
const calendar = { start: '2026-08-10', end: '2027-05-28', weekdays: [1, 2, 3, 4, 5], minutes: 80, rotation: ['A', 'B'], classRotations: [], rotationOffset: 0, overrides: [] };
const classes = {
  p1: { title: 'Period 1, Advanced CS', pathway: createPathway(graph, { id: 'demo-pathway-1', classId: 'demo-class-1', title: 'Period 1, Advanced CS', courseId: 'advanced', calendar }) },
  p3: { title: 'Period 3, Advanced CS', pathway: createPathway(graph, { id: 'demo-pathway-3', classId: 'demo-class-3', title: 'Period 3, Advanced CS', courseId: 'advanced', calendar }) },
};
for (const c of Object.values(classes)) { c.pathway.examDate = '2027-05-21'; c.adapter = createMemoryAdapter({ pathway: c.pathway }); c.draft = c.pathway; c.published = null; }
let current = 'p1', editor = null;
const params = new URLSearchParams(location.search);
function mount(key, tab) {
  current = key;
  const c = classes[key];
  editor = createRequirementsEditor($('editor'), { graph, registry, pathway: c.draft, published: c.adapter.state.published, adapter: c.adapter, tab,
    theme: params.get('theme') === 'light' ? 'light' : null, onChange: (p) => { c.draft = p; } });
  window.__editor = editor;
}
const sel = $('class');
sel.replaceChildren(...Object.entries(classes).map(([k, c]) => Object.assign(document.createElement('option'), { value: k, textContent: c.title })));
sel.addEventListener('change', () => mount(sel.value));
mount('p1', params.get('tab') ?? undefined);
window.__demo = { classes, mount };
