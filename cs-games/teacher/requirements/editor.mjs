import { renderPathway } from '../../student/pathway-view.mjs';
// Teacher-controlled mastery requirements: a standalone, framework-free component. It edits the DRAFT pathway through the pure functions in
// cs-games/pathway/requirements/ and hands the result to the host (onChange, adapter). It never stores anything itself and never publishes
// without an explicit button press. Routine views show titles and sentences only: no identifiers, no JSON.
import { COUNTING_RULES, applyToAreas, applyToClass, applyToSkills, buildContentFacts, catalog, clearSkillOverridesInAreas, copyAreaSettings, createContext, levelView,
  overridesTable, readLevels, resetToInherited, resolveAll, reviewRequirements, stampPublishTime, SEVERITY_HEADING, briefSettings } from '../../pathway/requirements/index.mjs';
import { createSettingsForm } from './form.mjs';
import { el, fill, plural, uid } from './dom.mjs';

const TABS = [['class', 'Class defaults'], ['areas', 'Learning areas'], ['skills', 'Individual skills'], ['review', 'Review & publish']];

export function createRequirementsEditor(root, options) {
  const { graph, registry = null, adapter = null, onChange = null, theme = null } = options;
  const facts = options.facts ?? buildContentFacts({ graph, registry });
  const st = { pathway: options.pathway, published: options.published ?? null, tab: options.tab ?? 'class', areas: new Set(), skills: new Set(), areaFilter: '', search: '', ack: false, busy: false, replaceLower: false, confirm: null, history: [] };
  let savedSnapshot = adapter?.saveDraft ? JSON.stringify(st.pathway) : null;
  let operation = '';
  let preview = null;
  let formChanged = false;
  const dirty = () => JSON.stringify(st.pathway) !== savedSnapshot;
  const ctx = () => createContext({ graph, published: st.published, facts });
  const ids = { head: uid('mreq-h'), tabs: uid('mreq-tabs') };

  const status = el('p', { class: 'mreq-status', role: 'status', 'aria-live': 'polite', tabindex: '-1' });
  const persistence = el('p', { class: 'mreq-persistence', role: 'status' });
  const alertBox = el('div', { class: 'mreq-alert', role: 'alert' });
  const tabList = el('div', { class: 'mreq-tabs', role: 'tablist', 'aria-label': 'Where to set requirements', id: ids.tabs });
  const panel = el('div', { class: 'mreq-panel', role: 'tabpanel', tabindex: '-1' });
  const shell = el('section', { class: 'mreq', 'data-theme': theme ?? undefined, 'aria-labelledby': ids.head },
    el('header', { class: 'mreq-head' },
      el('div', { class: 'mreq-eyebrow', text: 'Mastery requirements' }),
      el('h2', { id: ids.head, text: 'How much practice shows a skill is learned?' }),
      el('p', { class: 'mreq-lede', text: 'Choose how many questions students answer and how accurate they must be. Students can answer more than the minimum to improve their accuracy. Meeting a requirement is a practice milestone; it never sets the 0 to 4 standards score, which comes from your own assessment.' }),
      persistence, status, alertBox),
    tabList, panel);
  root.replaceChildren(shell);

  // ---- messages ----
  const say = (text) => { alertBox.replaceChildren(); status.textContent = text; };
  const alertWith = (title, items) => { status.textContent = ''; fill(alertBox, el('p', { class: 'mreq-alert-title', text: title }), items?.length ? el('ul', {}, items.map((i) => el('li', { text: i }))) : null); alertBox.scrollIntoView?.({ block: 'nearest' }); };
  const clearMsg = () => { alertBox.replaceChildren(); };

  function updatePersistence(formValid) {
    formChanged = typeof formValid === 'boolean';
    const text = operation || (formValid === false ? 'Fix validation errors before applying these changes.'
      : formValid === true ? 'Unapplied changes. Apply these settings to include them in the draft.'
      : dirty() ? 'Unsaved changes. Open Review & publish to save the draft.'
      : st.published && JSON.stringify(st.published) === savedSnapshot ? `Published requirements · version ${st.published.revision}`
      : adapter?.storage === 'memory' ? 'Draft is available in this demo tab.' : 'Saved draft.');
    if (persistence.textContent !== text) persistence.textContent = text;
  }

  // ---- shared pieces ----
  const cat = () => catalog(st.pathway, graph);
  const resolved = () => resolveAll(st.pathway, graph);
  const sourceChip = (r) => el('span', { class: `mreq-chip level-${r.level}`, text: r.level === 'skill' ? 'Own setting' : r.level === 'area' ? 'Area setting' : r.level === 'class' ? 'Class defaults' : r.level === 'legacy' ? 'Earlier setting' : 'Not set' });
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function apply(result, { done }) {
    if (!result.ok) { updatePersistence(false); alertWith(result.blocked?.length ? 'These changes cannot be applied because the requirements cannot be met.' : 'The changes could not be applied.', result.errors.map((e) => e.message)); return false; }
    preview = null;
    st.pathway = result.pathway;
    st.ack = false;
    onChange?.(clone(st.pathway));
    const n = result.changed.length;
    const parts = [done ?? 'Changes applied.', n ? `${plural(n, 'skill')} changed.` : 'No skill changed.'];
    if (result.kept?.length) parts.push(result.kept.length === 1 ? '1 area or skill keeps its own setting.' : `${result.kept.length} areas or skills keep their own settings.`);
    const notes = (result.problems?.draftOnly.length ?? 0) + (result.problems?.warnings.length ?? 0);
    if (notes) parts.push(`${plural(notes, 'note')} to read on the Review tab.`);
    if (result.warnings?.length) parts.push(result.warnings.map((w) => w.message).join(' '));
    if (result.incomplete?.length) parts.push('Some skills still have no complete requirement.');
    render();
    say(parts.join(' '));
    status.focus();
    return true;
  }
  function confirmButton(label, key, question, action, { danger = true } = {}) {
    if (st.confirm === key) {
      return el('div', { class: 'mreq-confirm', role: 'group', 'aria-label': 'Confirm' }, el('span', { text: question }),
        el('button', { type: 'button', class: danger ? 'danger' : 'secondary', onclick: () => { st.confirm = null; action(); } }, 'Yes, continue'),
        el('button', { type: 'button', class: 'secondary', onclick: () => { st.confirm = null; render(); } }, 'Cancel'));
    }
    return el('button', { type: 'button', class: 'secondary', onclick: () => { st.confirm = key; render(); panel.querySelector('.mreq-confirm button')?.focus(); } }, label);
  }
  const checkbox = (label, checked, onchange, { id = uid('c'), hint = null, disabled = false, review = false } = {}) => el('label', { class: 'mreq-check', for: id, 'data-review-ack': review ? '' : undefined }, el('input', { type: 'checkbox', id, checked, disabled, onchange: (e) => onchange(e.target.checked) }), el('span', {}, label, hint ? el('small', { class: 'mreq-hint', text: ` ${hint}` }) : null));

  // ---- Class defaults ----
  function classPanel() {
    const view = levelView(st.pathway, 'class', null, graph), table = overridesTable(st.pathway, graph);
    const reach = [`${plural(table.counts.usingClass, 'skill')} use${table.counts.usingClass === 1 ? 's' : ''} the class defaults.`];
    const own = table.counts.usingArea + table.counts.ownSettings + table.counts.older;
    if (view.active && own) reach.push(`${plural(own, 'skill')} ${own === 1 ? 'has' : 'have'} area or skill settings that take priority.`);
    const form = createSettingsForm({ level: 'class', view, scopeName: 'the class', graph, onChange: (c) => { saveBtn.disabled = !c.ready; updatePersistence(c.valid); } });
    const saveBtn = el('button', { type: 'button', class: 'primary', disabled: !form.ready(), onclick: () => { const c = form.collect(); if (Object.keys(c.errors).length) return; apply(applyToClass(st.pathway, c.settings, ctx(), { clear: c.clear, replaceLowerOverrides: st.replaceLower }), { done: 'Class defaults applied.' }); } }, 'Apply class defaults');
    const hasLower = table.counts.usingArea + table.counts.ownSettings > 0 || readLevels(st.pathway).areas.size > 0;
    return el('div', { class: 'mreq-section' },
      el('h3', { text: 'Class defaults' }),
      el('p', { text: 'These settings apply to every skill in this class unless a learning area or an individual skill has its own.' }),
      el('p', { class: 'mreq-reach', text: reach.join(' ') }),
      form.element,
      hasLower ? checkbox('Also replace settings that learning areas or skills have chosen for the same things', st.replaceLower, (v) => { st.replaceLower = v; }, { hint: 'Left off, areas and skills keep their own choices.' }) : null,
      el('div', { class: 'mreq-actions' }, saveBtn,
        view.active ? confirmButton('Remove class defaults', 'remove-class', 'Skills that follow the class defaults will have no requirement. Continue?', () => apply(resetToInherited(st.pathway, { level: 'class' }, ctx()), { done: 'Class defaults removed from the draft.' })) : null));
  }

  // ---- Learning areas ----
  function areaPanel() {
    const c = cat(), r = resolved(), levels = readLevels(st.pathway);
    const selected = [...st.areas].filter((a) => c.areas.some((x) => x.id === a));
    const list = el('ul', { class: 'mreq-list', 'aria-label': 'Learning areas' }, c.areas.map((a, index) => {
      const own = levels.areas.has(a.id);
      const sample = r.find((x) => x.areaId === a.id);
      const id = `${ids.tabs}-area-${index}`; // stable across redraws, so keyboard focus stays on the checkbox
      return el('li', { class: `mreq-item${st.areas.has(a.id) ? ' selected' : ''}` },
        el('input', { type: 'checkbox', id, checked: st.areas.has(a.id), 'aria-label': `Select ${a.title}`, onchange: (e) => { e.target.checked ? st.areas.add(a.id) : st.areas.delete(a.id); render(); panel.querySelector(`#${id}`)?.focus(); } }),
        el('label', { for: id, class: 'mreq-item-main' }, el('span', { class: 'mreq-item-title', text: a.title }),
          el('span', { class: 'mreq-item-sub', text: `${plural(a.skills.length, 'skill')} · ${own ? briefSettings(levelView(st.pathway, 'area', a.id, graph).effective) : sample?.level === 'class' ? 'class defaults' : 'no requirement set'}` })),
        el('span', { class: `mreq-chip ${own ? 'level-area' : 'level-class'}`, text: own ? 'Own setting' : sample?.level === 'class' ? 'Class defaults' : 'Not set' }));
    }));
    const tools = el('div', { class: 'mreq-actions' },
      el('button', { type: 'button', class: 'secondary small', onclick: () => { c.areas.forEach((a) => st.areas.add(a.id)); render(); } }, 'Select all areas'),
      el('button', { type: 'button', class: 'secondary small', onclick: () => { st.areas.clear(); render(); } }, 'Clear selection'));
    let right;
    if (!selected.length) right = el('div', { class: 'mreq-empty' }, el('p', { text: 'Choose one or more learning areas on the left to set their requirements.' }), el('p', { class: 'mreq-hint', text: 'Areas without their own setting follow the class defaults.' }));
    else {
      const views = selected.map((a) => levelView(st.pathway, 'area', a, graph));
      const first = views[0], union = [...new Set(views.flatMap((v) => v.setHere))];
      const view = { ...first, setHere: union };
      const names = selected.map((a) => c.areas.find((x) => x.id === a).title);
      const form = createSettingsForm({ level: 'area', view, graph, scopeName: names.join(', '), nodeTitle: names.length === 1 ? names[0] : 'a skill in these areas', onChange: (x) => { save.disabled = !x.ready; updatePersistence(x.valid); } });
      const save = el('button', { type: 'button', class: 'primary', disabled: !form.ready(), onclick: () => { const x = form.collect(); if (Object.keys(x.errors).length) return; apply(applyToAreas(st.pathway, selected, x.settings, ctx(), { clear: x.clear, replaceLowerOverrides: st.replaceLower }), { done: `Changes applied for ${plural(selected.length, 'learning area')}.` }); } }, `Apply to ${plural(selected.length, 'learning area')}`);
      const withOwn = c.areas.filter((a) => levels.areas.has(a.id) && !selected.includes(a.id));
      const copyId = uid('copy'), copySel = el('select', { id: copyId }, el('option', { value: '', text: 'Choose an area to copy from' }), withOwn.map((a) => el('option', { value: a.id, text: a.title })));
      const hasSkillOverrides = [...levels.skills.keys()].length > 0;
      right = el('div', { class: 'mreq-section' }, el('h3', { text: selected.length === 1 ? `Settings for ${names[0]}` : `Settings for ${plural(selected.length, 'learning area')}` }), form.element,
        hasSkillOverrides ? checkbox('Also replace settings that individual skills here have chosen for the same things', st.replaceLower, (v) => { st.replaceLower = v; }) : null,
        el('div', { class: 'mreq-actions' }, save,
          confirmButton('Restore selected areas to class defaults', 'reset-areas', 'These areas will follow the class defaults again. Continue?', () => apply(resetToInherited(st.pathway, { level: 'area', ids: selected }, ctx()), { done: 'Selected areas restored to the class defaults.' }), { danger: false }),
          hasSkillOverrides ? confirmButton('Remove skill settings in selected areas', 'clear-skills', 'Every skill in these areas will follow the area settings. Continue?', () => apply(clearSkillOverridesInAreas(st.pathway, selected, ctx()), { done: 'Skill settings removed from the selected areas.' }), { danger: false }) : null),
        withOwn.length ? el('div', { class: 'mreq-copy' }, el('label', { for: copyId }, 'Copy settings from another area'), copySel,
          el('button', { type: 'button', class: 'secondary', onclick: () => { if (!copySel.value) { alertWith('Choose an area to copy from.'); return; } apply(copyAreaSettings(st.pathway, copySel.value, selected, ctx()), { done: 'Settings copied.' }); } }, `Copy to ${plural(selected.length, 'selected area')}`)) : null);
    }
    return el('div', { class: 'mreq-split' }, el('div', { class: 'mreq-side' }, el('h3', { text: 'Learning areas' }), tools, list), el('div', { class: 'mreq-main' }, right));
  }

  // ---- Individual skills ----
  function skillPanel() {
    const c = cat(), r = resolved(), levels = readLevels(st.pathway);
    const q = st.search.trim().toLowerCase();
    const shown = r.filter((x) => (!st.areaFilter || x.areaId === st.areaFilter) && (!q || x.title.toLowerCase().includes(q) || x.areaTitle.toLowerCase().includes(q)));
    const selected = [...st.skills].filter((s) => r.some((x) => x.nodeId === s));
    const fid = `${ids.tabs}-filter`, sid = `${ids.tabs}-search`; // stable across redraws, so typing and focus are not interrupted
    const filters = el('div', { class: 'mreq-filters' },
      el('div', { class: 'mreq-filter' }, el('label', { for: fid, text: 'Learning area' }), el('select', { id: fid, onchange: (e) => { st.areaFilter = e.target.value; render(); panel.querySelector(`#${fid}`)?.focus(); } }, el('option', { value: '', text: 'All areas' }), c.areas.map((a) => el('option', { value: a.id, text: a.title, selected: a.id === st.areaFilter })))),
      el('div', { class: 'mreq-filter' }, el('label', { for: sid, text: 'Search skills' }), el('input', { id: sid, type: 'search', value: st.search, autocomplete: 'off', oninput: (e) => { st.search = e.target.value; const pos = e.target.selectionStart; render(); const i = panel.querySelector(`#${sid}`); i?.focus(); i?.setSelectionRange(pos, pos); } })));
    const list = el('ul', { class: 'mreq-list', 'aria-label': 'Skills' }, shown.map((x) => {
      const id = `${ids.tabs}-skill-${r.indexOf(x)}`;
      return el('li', { class: `mreq-item${st.skills.has(x.nodeId) ? ' selected' : ''}` },
        el('input', { type: 'checkbox', id, checked: st.skills.has(x.nodeId), 'aria-label': `Select ${x.title}`, onchange: (e) => { e.target.checked ? st.skills.add(x.nodeId) : st.skills.delete(x.nodeId); render(); panel.querySelector(`#${id}`)?.focus(); } }),
        el('label', { for: id, class: 'mreq-item-main' }, el('span', { class: 'mreq-item-title', text: x.title }), el('span', { class: 'mreq-item-sub', text: `${x.areaTitle} · ${briefSettings(x.effective)}` })),
        sourceChip(x));
    }));
    const tools = el('div', { class: 'mreq-actions' },
      el('button', { type: 'button', class: 'secondary small', onclick: () => { shown.forEach((x) => st.skills.add(x.nodeId)); render(); } }, `Select all ${shown.length} shown`),
      el('button', { type: 'button', class: 'secondary small', onclick: () => { st.skills.clear(); render(); } }, 'Clear selection'));
    let right;
    if (!selected.length) right = el('div', { class: 'mreq-empty' }, el('p', { text: 'Choose one or more skills on the left to give them their own requirements.' }), el('p', { class: 'mreq-hint', text: 'Skills without their own setting follow their learning area, or the class defaults.' }));
    else {
      const views = selected.map((s) => levelView(st.pathway, 'skill', s, graph)), first = views[0], union = [...new Set(views.flatMap((v) => v.setHere))];
      const one = selected.length === 1 ? r.find((x) => x.nodeId === selected[0]) : null;
      const form = createSettingsForm({ level: 'skill', view: { ...first, setHere: union }, graph, scopeName: one?.title, nodeTitle: one?.title ?? 'a selected skill', profile: one ? facts.profileFor(one.nodeId) : null, onChange: (x) => { save.disabled = !x.ready; updatePersistence(x.valid); } });
      const save = el('button', { type: 'button', class: 'primary', disabled: !form.ready(), onclick: () => { const x = form.collect(); if (Object.keys(x.errors).length) return; apply(applyToSkills(st.pathway, selected, x.settings, ctx(), { clear: x.clear }), { done: `Changes applied for ${plural(selected.length, 'skill')}.` }); } }, `Apply to ${plural(selected.length, 'skill')}`);
      const anyOwn = selected.some((s) => levels.skills.has(s) || r.find((x) => x.nodeId === s)?.hasLegacyPolicy);
      right = el('div', { class: 'mreq-section' }, el('h3', { text: one ? `Settings for ${one.title}` : `Settings for ${plural(selected.length, 'skill')}` }), form.element,
        el('div', { class: 'mreq-actions' }, save, anyOwn ? confirmButton('Restore selected skills to inherited', 'reset-skills', 'These skills will follow their learning area or the class defaults again. Continue?', () => apply(resetToInherited(st.pathway, { level: 'skill', ids: selected }, ctx()), { done: 'Selected skills restored to inherited settings.' }), { danger: false }) : null));
    }
    return el('div', { class: 'mreq-split' }, el('div', { class: 'mreq-side' }, el('h3', { text: 'Skills' }), filters, tools, el('p', { class: 'mreq-hint', 'aria-live': 'polite', text: `${plural(shown.length, 'skill')} shown, ${selected.length} selected.${selected.length > shown.filter((x) => st.skills.has(x.nodeId)).length ? ` ${plural(selected.length - shown.filter((x) => st.skills.has(x.nodeId)).length, 'selected skill is', 'selected skills are')} hidden by the filter and will be included.` : ''}` }), list), el('div', { class: 'mreq-main' }, right));
  }

  // ---- Review & publish ----
  function reviewPanel() {
    const rev = reviewRequirements(st.pathway, st.published, graph, { facts, acknowledged: st.ack });
    const t = rev.table, d = rev.differences;
    const n = (k, one, many) => `${t.counts[k]} ${t.counts[k] === 1 ? one : many}`;
    const counts = el('p', { class: 'mreq-reach', text: `${plural(t.counts.skills, 'skill')} in this class: ${n('usingClass', 'uses class defaults', 'use class defaults')}, ${n('usingArea', 'uses an area setting', 'use an area setting')}, ${n('ownSettings', 'has its own settings', 'have their own settings')}${t.counts.older ? `, ${n('older', 'uses an earlier setting', 'use earlier settings')}` : ''}, ${n('notSet', 'has no requirement', 'have no requirement')}.` });
    const table = el('div', { class: 'mreq-table', role: 'table', 'aria-label': 'Defaults and overrides' },
      el('div', { class: 'mreq-tr head', role: 'row' }, ['Where', 'Requirement', 'Skills affected'].map((h) => el('div', { role: 'columnheader', text: h }))),
      t.rows.map((row) => el('div', { class: 'mreq-tr', role: 'row' },
        el('div', { role: 'cell', 'data-label': 'Where' }, el('strong', { text: row.name }), el('span', { class: 'mreq-item-sub', text: row.level === 'class' ? 'Applies to every skill without its own setting' : row.level === 'area' ? 'Learning area' : row.level === 'legacy' ? row.note : `Skill · ${row.area}` })),
        el('div', { role: 'cell', 'data-label': 'Requirement' }, row.settings, row.own.length && row.level !== 'class' ? el('span', { class: 'mreq-item-sub', text: `Set here: ${row.own.join(', ')}` }) : null),
        el('div', { role: 'cell', 'data-label': 'Skills affected', text: String(row.skills) }))));
    const changes = d.levels.length || d.skills.length
      ? el('div', {}, d.levels.length ? el('ul', {}, d.levels.map((x) => el('li', { text: x.text }))) : null,
        d.skills.length ? el('details', { class: 'mreq-details' }, el('summary', { text: `Effect on ${plural(d.changed, 'skill')}` }), el('ul', {}, d.skills.map((g) => el('li', {}, g.text, el('details', {}, el('summary', { text: 'Which skills' }), el('ul', {}, g.skills.map((s) => el('li', { text: s })))))))) : null)
      : el('p', { text: st.published ? 'No changes from the published version.' : 'Nothing has been set yet.' });
    const problems = rev.problems.length ? el('div', {}, rev.problems.map((g) => el('details', { class: `mreq-problem sev-${g.severity}`, open: g.severity !== 'warning' },
      el('summary', {}, el('strong', { text: g.heading }), ` · ${plural(g.items.length, 'skill')} · ${SEVERITY_HEADING[g.severity]} · ${g.verified ? 'verified limit' : 'estimate'}`),
      el('ul', {}, g.items.slice(0, 40).map((i) => el('li', { text: i.message })), g.items.length > 40 ? el('li', { text: `and ${g.items.length - 40} more` }) : null)))) : el('p', { text: 'No problems found.' });
    const ackId = uid('ack');
    const ack = rev.readiness.needsAcknowledgement ? checkbox('I have read these notes and want to continue', st.ack, (v) => { st.ack = v; render(); (panel.querySelector('#publish:enabled') ?? panel.querySelector('[data-review-ack] input'))?.focus(); }, { id: ackId, disabled: st.busy, review: true }) : null;
    const publishId = 'publish';
    const publish = el('button', { type: 'button', class: 'primary', id: publishId, disabled: !rev.readiness.canPublish || st.busy || !adapter?.publish || Boolean(adapter?.preview && !preview), onclick: () => doPublish() }, 'Publish requirements');
    const previewButton = adapter?.preview ? el('button', {
      type: 'button', class: 'secondary', 'data-preview-draft': '',
      disabled: !rev.readiness.canPublish || st.busy || dirty(), onclick: () => doPreview(),
    }, 'Preview saved draft') : null;
    const studentPreview = preview?.studentPreview ? el('details', { class: 'mreq-details', open: true },
      el('summary', { text: 'Student preview · unpublished draft' }), renderPathway(preview.studentPreview)) : null;
    const reasons = !rev.readiness.canPublish ? el('ul', { class: 'mreq-reasons' }, rev.readiness.reasons.map((x) => el('li', { text: x }))) : null;
    const versions = rev.pendingPolicies.length ? el('details', { class: 'mreq-details' }, el('summary', { text: `Versions that will be created on publish (${rev.pendingPolicies.length})` }),
      el('ul', {}, rev.pendingPolicies.map((p) => el('li', { text: p.label })), el('li', { class: 'mreq-hint', text: 'Earlier versions are kept. Publishing changes no student evidence and deletes nothing.' }))) : null;
    const history = st.history.length ? el('details', { class: 'mreq-details' }, el('summary', { text: 'Published versions' }), el('ul', {}, st.history.map((h) => el('li', { text: `Version ${h.revision}: ${h.summary}` })))) : null;
    return el('div', { class: 'mreq-section' }, el('h3', { text: 'Review before publishing' }), counts,
      el('h4', { text: 'Defaults and overrides' }), t.rows.length ? el('div', { class: 'mreq-scroll' }, table) : el('p', { text: 'No requirements are set yet.' }),
      el('h4', { text: 'Changes from the published version' }), changes,
      el('h4', { text: 'Problems and notes' }), problems, ack, versions, history,
      el('details', { class: 'mreq-details' }, el('summary', { text: 'How questions are counted' }), el('ul', {}, COUNTING_RULES.map((x) => el('li', { text: x })))),
      reasons,
      el('div', { class: 'mreq-actions' },
        el('button', { type: 'button', class: 'secondary', 'data-save-draft': '', disabled: !rev.readiness.canSaveDraft || st.busy || !adapter?.saveDraft, onclick: () => doSaveDraft() }, 'Save draft'), previewButton, publish),
      studentPreview,
      !adapter ? el('p', { class: 'mreq-hint', text: 'Saving and publishing are provided by the page that hosts this tool.' }) : null);
  }
  async function doSaveDraft() {
    st.busy = true; operation = 'Saving draft…'; render();
    try {
      await adapter.saveDraft(clone(st.pathway));
      preview = null;
      savedSnapshot = JSON.stringify(st.pathway);
      say(adapter.storage === 'memory' ? 'Draft saved for this demo tab.' : 'Draft saved. Publish to share these requirements with students.');
    } catch (error) {
      alertWith('The draft could not be saved.', [error.message]);
    } finally {
      st.busy = false; operation = ''; render();
      panel.querySelector('[data-save-draft]')?.focus({ preventScroll: true });
    }
  }
  async function doPreview() {
    st.busy = true; operation = 'Preparing preview…'; preview = null; render();
    try {
      preview = await adapter.preview(clone(st.pathway));
      say('Preview ready. Review what students will see, then publish when ready.');
    } catch (error) {
      alertWith('The draft could not be previewed.', [error.message]);
    } finally {
      st.busy = false; operation = ''; render();
      status.focus();
    }
  }
  async function doPublish() {
    st.busy = true; operation = 'Preparing to publish…'; render();
    try {
      const stamped = options.serverTimestamps ? st.pathway : stampPublishTime(st.pathway, st.published, (options.now ?? (() => new Date().toISOString()))());
      const out = await adapter.publish({ pathway: stamped, acknowledged: st.ack, preview });
      preview = null;
      st.pathway = out.pathway ?? stamped; st.published = out.published ?? clone(st.pathway); st.history = out.history ?? st.history; st.ack = false;
      savedSnapshot = JSON.stringify(st.pathway);
      onChange?.(clone(st.pathway)); say(out.message ?? 'Requirements published with the class pathway.');
      if(adapter.history) void loadHistory();
    } catch (error) {
      preview = null;
      alertWith('The requirements could not be published.', [error.message]);
    } finally {
      st.busy = false; operation = ''; render();
      panel.querySelector('#publish:enabled, [data-save-draft]:enabled')?.focus({ preventScroll: true });
    }
  }

  // ---- tabs ----
  function paintTabs() {
    const badge = { class: readLevels(st.pathway).class ? 'set' : '', areas: String(readLevels(st.pathway).areas.size || ''), skills: String(readLevels(st.pathway).skills.size || ''), review: '' };
    fill(tabList, TABS.map(([key, label]) => el('button', { type: 'button', role: 'tab', id: `${ids.tabs}-${key}`, 'aria-selected': String(st.tab === key), 'aria-controls': `${ids.tabs}-panel`, tabindex: st.tab === key ? '0' : '-1', 'data-tab': key,
      disabled: st.busy, onclick: () => selectTab(key), onkeydown: (e) => tabKey(e, key) }, label, key === 'areas' && badge.areas ? el('span', { class: 'mreq-count', text: badge.areas, 'aria-label': `${badge.areas} customized` }) : null, key === 'skills' && badge.skills ? el('span', { class: 'mreq-count', text: badge.skills, 'aria-label': `${badge.skills} customized` }) : null)));
  }
  function tabKey(e, key) {
    const keys = TABS.map((x) => x[0]), i = keys.indexOf(key);
    const next = e.key === 'ArrowRight' ? keys[(i + 1) % keys.length] : e.key === 'ArrowLeft' ? keys[(i + keys.length - 1) % keys.length] : e.key === 'Home' ? keys[0] : e.key === 'End' ? keys[keys.length - 1] : null;
    if (!next) return;
    e.preventDefault(); selectTab(next); tabList.querySelector(`[data-tab="${next}"]`)?.focus();
  }
  function selectTab(key) { if(st.busy)return; st.tab = key; st.confirm = null; clearMsg(); render(); }
  function render() {
    updatePersistence();
    paintTabs();
    panel.id = `${ids.tabs}-panel`;
    panel.setAttribute('aria-labelledby', `${ids.tabs}-${st.tab}`);
    fill(panel, st.tab === 'class' ? classPanel() : st.tab === 'areas' ? areaPanel() : st.tab === 'skills' ? skillPanel() : reviewPanel());
  }
  async function loadHistory() {
    try {
      st.history = await adapter.history() ?? [];
      if (st.tab === 'review' && !st.busy && !panel.contains(document.activeElement)) render();
    } catch {}
  }
  render();
  if (adapter?.history) void loadHistory();

  return {
    hasUnsavedChanges: () => formChanged || dirty(),
    getPathway: () => clone(st.pathway), getPublished: () => (st.published ? clone(st.published) : null),
    setPathway(p) { preview = null; st.pathway = p; render(); }, setPublished(p) { preview = null; st.published = p; render(); },
    showTab(key) { selectTab(key); }, destroy() { root.replaceChildren(); },
  };
}
