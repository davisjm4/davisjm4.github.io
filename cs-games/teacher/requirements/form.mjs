// The settings form, used for the class defaults, for one or many learning areas, and for one or many skills.
// Every setting is either inherited (shown read-only with where it comes from) or set at this level. Saving writes the settings set here
// and restores the ones switched back to inherited. Typed values are parsed exactly (percent as a percent, whole numbers as whole numbers).
import { DIFFICULTY_LABELS, DIFFICULTY_NAMES, FIELD_LABELS, FIELD_DEFAULTS, PRESETS, PRESET_NOTICE, explainRequirement, parsePercent, parseWholeNumber, presetFor, presetSettings,
  previewStudentStates, briefSettings } from '../../pathway/requirements/index.mjs';
import { fractionToPercent, formatPercent, toBasisPoints } from '../../pathway/mastery/arithmetic.mjs';
import { el, fill, humanize, plural, uid } from './dom.mjs';

const CORE = ['minimumQuestions', 'accuracy'];
const ADVANCED = ['minimumCorrect', 'difficulties', 'families', 'subskills', 'unscored', 'requiredForAreaCompletion', 'staleAfterDays'];
const pctText = (f) => (f == null ? '' : String(fractionToPercent(f)));
const numText = (n) => (n == null ? '' : String(n));
const dash = (v) => (v == null ? 'none' : v);

/** Short readable text for one inherited value. */
export function describeValue(field, v) {
  switch (field) {
    case 'minimumQuestions': return v == null ? 'not set' : plural(v, 'question');
    case 'accuracy': return v == null ? 'not set' : formatPercent(toBasisPoints(v) / 100);
    case 'minimumCorrect': return v == null ? 'no minimum' : `at least ${plural(v, 'correct answer')}`;
    case 'difficulties': return v.length ? v.map((d) => `${d.minQuestions} ${DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty}${d.minCorrect ? ` (${d.minCorrect} correct)` : ''}`).join(', ') : 'no difficulty requirement';
    case 'families': return v.minDistinct > 0 ? `${plural(v.minDistinct, 'kind')} of questions` : 'no variety requirement';
    case 'subskills': return v.length ? v.map((s) => s.label ?? s.id).join(', ') : 'no essential topics';
    case 'unscored': return ['skipped', 'revealed', 'assisted'].some((k) => v[k] === 'excluded') ? 'left out of the count (up to 10%)' : 'counted as incorrect';
    case 'requiredForAreaCompletion': return v ? 'needed to finish the area' : 'optional for the area';
    case 'staleAfterDays': return v == null ? 'no reminder' : `after ${plural(v, 'day')}`;
    default: return String(dash(v));
  }
}

export function createSettingsForm({ level, view, scopeName, nodeTitle = null, profile = null, graph, onChange, targetCount = 1, initialPreset = null }) {
  const base = uid('f');
  const fieldsRoot = el('div', { class: 'mreq-fields' });
  const explainBox = el('div', { class: 'mreq-explain', role: 'status', 'aria-live': 'polite', id: `${base}-explain` });
  const previewBox = el('div', { class: 'mreq-preview' });
  const state = { mode: {}, errors: {}, raw: {}, preset: null, previewIndex: 0, touched: new Set() };
  const inheritedLabel = (f) => view.inheritedLabels[f];
  const own = new Set(view.setHere);

  // ---- per-field input builders: each returns {node, read(): {ok, value, error}} ----
  const text = (id, value, { inputmode = 'numeric', suffix = null, labelText, describedBy }) => {
    const input = el('input', { id, type: 'text', inputmode, autocomplete: 'off', spellcheck: 'false', value: value ?? '', 'aria-label': labelText, 'aria-describedby': describedBy });
    input.addEventListener('input', () => changed());
    return { input, node: suffix ? el('span', { class: 'mreq-suffix' }, input, el('span', { class: 'mreq-suffix-mark', 'aria-hidden': 'true', text: suffix })) : input };
  };
  const builders = {
    minimumQuestions(id, value, desc) {
      const t = text(id, numText(value), { labelText: FIELD_LABELS.minimumQuestions, describedBy: desc });
      return { node: t.node, focus: t.input, read: () => parseWholeNumber(t.input.value, { min: 1, label: 'Minimum questions' }) };
    },
    accuracy(id, value, desc) {
      const t = text(id, pctText(value), { inputmode: 'decimal', suffix: '%', labelText: 'Required accuracy as a percentage', describedBy: desc });
      return { node: t.node, focus: t.input, read: () => { const r = parsePercent(t.input.value); return r.ok ? { ok: true, value: r.fraction } : r; } };
    },
    minimumCorrect(id, value, desc) {
      const t = text(id, numText(value), { labelText: FIELD_LABELS.minimumCorrect, describedBy: desc });
      return { node: t.node, focus: t.input, read: () => (t.input.value.trim() === '' ? { ok: true, value: null } : parseWholeNumber(t.input.value, { min: 1, label: 'Minimum correct answers' })) };
    },
    families(id, value, desc) {
      const a = text(id, numText(value.minDistinct), { labelText: 'Different kinds of questions', describedBy: desc });
      const b = text(`${id}-each`, numText(value.minCorrectEach ?? 1), { labelText: 'Correct answers needed in each kind', describedBy: desc });
      return { node: el('div', { class: 'mreq-pair' }, el('label', { for: id }, 'Different kinds of questions ', el('small', { text: '(0 for none)' })), a.node, el('label', { for: `${id}-each` }, 'Correct answers in each kind'), b.node), focus: a.input,
        read: () => { const x = parseWholeNumber(a.input.value, { min: 0, max: 50, label: 'Kinds of questions' }), y = parseWholeNumber(b.input.value, { min: 1, max: 50, label: 'Correct answers in each kind' });
          return !x.ok ? x : !y.ok ? y : { ok: true, value: { minDistinct: x.value, minCorrectEach: y.value } }; } };
    },
    difficulties(id, value, desc) {
      const list = el('div', { class: 'mreq-rows', id });
      const rows = [];
      const add = (d = { difficulty: 'advanced', minQuestions: 5, minCorrect: 4 }) => {
        const rid = uid('d');
        const sel = el('select', { id: `${rid}-l`, 'aria-label': 'Difficulty level' }, DIFFICULTY_NAMES.map((n) => el('option', { value: n, text: DIFFICULTY_LABELS[n], selected: n === d.difficulty })));
        const q = el('input', { id: `${rid}-q`, type: 'text', inputmode: 'numeric', value: numText(d.minQuestions), 'aria-label': 'Questions required at this level' });
        const c = el('input', { id: `${rid}-c`, type: 'text', inputmode: 'numeric', value: numText(d.minCorrect), 'aria-label': 'Correct answers required at this level' });
        const row = { sel, q, c };
        const rm = el('button', { type: 'button', class: 'secondary small', 'aria-label': 'Remove this difficulty requirement', onclick: () => { rows.splice(rows.indexOf(row), 1); row.node.remove(); changed(); } }, 'Remove');
        row.node = el('div', { class: 'mreq-row' }, sel, el('span', {}, 'at least'), q, el('span', {}, 'questions, with'), c, el('span', {}, 'correct'), rm);
        for (const n of [sel, q, c]) n.addEventListener('input', () => changed());
        rows.push(row); list.append(row.node);
      };
      for (const d of value) add(d);
      const addBtn = el('button', { type: 'button', class: 'secondary small', onclick: () => { add(); changed(); } }, 'Add a difficulty requirement');
      return { node: el('div', {}, list, addBtn), focus: addBtn,
        read: () => { const out = []; for (const r of rows) {
          const q = parseWholeNumber(r.q.value, { min: 1, label: 'Questions' }), c = parseWholeNumber(r.c.value, { min: 0, label: 'Correct answers' });
          if (!q.ok) return q; if (!c.ok) return c; out.push({ difficulty: r.sel.value, minQuestions: q.value, minCorrect: c.value }); }
          return { ok: true, value: out }; } };
    },
    subskills(id, value, desc) {
      const kinds = profile?.boundFamilyIds ?? null;
      if (!kinds || !kinds.length) return { node: el('p', { class: 'mreq-hint', text: 'Essential topics can be chosen for skills whose questions are tagged by kind. This skill\'s questions are not tagged yet, so there is nothing to choose.' }), focus: null, read: () => ({ ok: true, value: value ?? [] }), unavailable: true };
      const mine = (value ?? []).filter((s) => s.id.startsWith('kind:') && s.match?.familyIds?.length === 1), others = (value ?? []).filter((s) => !mine.includes(s));
      const chosen = new Map(mine.map((s) => [s.match.familyIds[0], s]));
      const first = mine[0];
      const e = el('input', { id: `${id}-e`, type: 'text', inputmode: 'numeric', value: numText(first?.minExposure ?? 3), 'aria-label': 'Questions required in each chosen kind' });
      const c = el('input', { id: `${id}-c`, type: 'text', inputmode: 'numeric', value: numText(first?.minCorrect ?? 2), 'aria-label': 'Correct answers required in each chosen kind' });
      const boxes = kinds.map((k) => { const cb = el('input', { type: 'checkbox', id: `${id}-${k}`, value: k, checked: chosen.has(k) }); cb.addEventListener('change', () => changed()); return { k, cb }; });
      for (const n of [e, c]) n.addEventListener('input', () => changed());
      const group = el('fieldset', { class: 'mreq-checks' }, el('legend', {}, 'Kinds of questions that must be practiced'),
        boxes.map(({ k, cb }) => el('label', { class: 'mreq-check', for: cb.id }, cb, humanize(k))));
      return { node: el('div', {}, group, el('div', { class: 'mreq-row' }, el('span', {}, 'In each chosen kind: at least'), e, el('span', {}, 'questions, with'), c, el('span', {}, 'correct'))), focus: boxes[0].cb,
        read: () => { const x = parseWholeNumber(e.value, { min: 1, label: 'Questions per kind' }), y = parseWholeNumber(c.value, { min: 0, label: 'Correct per kind' });
          if (!x.ok) return x; if (!y.ok) return y; if (y.value > x.value) return { ok: false, error: 'Correct answers per kind cannot be more than the questions required.' };
          const picked = boxes.filter((b) => b.cb.checked).map(({ k }) => ({ id: `kind:${k}`, label: humanize(k), match: { familyIds: [k] }, minExposure: x.value, minCorrect: y.value, minAccuracy: null }));
          return { ok: true, value: [...others, ...picked] }; } };
    },
    unscored(id, value) {
      const excluded = ['skipped', 'revealed', 'assisted'].some((k) => value[k] === 'excluded');
      const mk = (v, label) => el('label', { class: 'mreq-check' }, el('input', { type: 'radio', name: id, value: v, checked: (v === 'excluded') === excluded, onchange: () => changed() }), label);
      const a = mk('incorrect', 'Count them as incorrect (recommended)'), b = mk('excluded', 'Leave a few out of the count (up to 10% of questions)');
      return { node: el('fieldset', { class: 'mreq-checks', id }, el('legend', {}, FIELD_LABELS.unscored), a, b), focus: a.querySelector('input'),
        read: () => { const v = (a.querySelector('input').checked ? 'incorrect' : 'excluded'); return { ok: true, value: { assisted: v, skipped: v, revealed: v, maxExcludedShare: value.maxExcludedShare ?? 0.1 } }; } };
    },
    requiredForAreaCompletion(id, value) {
      const cb = el('input', { type: 'checkbox', id, checked: value, onchange: () => changed() });
      return { node: el('label', { class: 'mreq-check', for: id }, cb, level === 'skill' ? 'This skill is needed to finish its learning area' : 'Skills are needed to finish their learning areas'), focus: cb, read: () => ({ ok: true, value: cb.checked }) };
    },
    staleAfterDays(id, value, desc) {
      const t = text(id, numText(value), { labelText: 'Days before a review reminder', describedBy: desc });
      return { node: t.node, focus: t.input, read: () => (t.input.value.trim() === '' ? { ok: true, value: null } : parseWholeNumber(t.input.value, { min: 1, max: 3650, label: 'Days' })) };
    },
  };
  const HINTS = {
    minimumQuestions: 'A whole number, like 30. Students may answer more.',
    accuracy: 'Type a percentage, like 90 (not 0.90). Based on each student\'s first try at each question.',
    minimumCorrect: 'Optional. Leave blank for none. If set, students need this many correct answers in total as well as the accuracy.',
    difficulties: 'Optional. Only levels that the skill\'s practice offers can be required.',
    families: 'Optional. Requires correct answers across different kinds of questions, so one easy kind can\'t carry a student.',
    subskills: 'Optional. Requires practice in specific kinds of questions for this skill.',
    unscored: 'How questions a student skips, reveals the answer to, or uses a hint on are counted. They are never counted as correct.',
    requiredForAreaCompletion: '',
    staleAfterDays: 'Optional. Leave blank for none. A reminder only; earned results are never removed.',
  };

  const rows = {};
  function buildField(f) {
    const id = `${base}-${f}`, descId = `${id}-hint`, errId = `${id}-err`;
    const initialSet = own.has(f) || (level === 'class' && CORE.includes(f));
    state.mode[f] = initialSet ? 'set' : 'inherit';
    const row = el('div', { class: `mreq-field${CORE.includes(f) ? ' core' : ''}`, 'data-field': f });
    const chip = el('span', { class: 'mreq-chip' });
    const body = el('div', { class: 'mreq-field-body' });
    const hint = el('p', { class: 'mreq-hint', id: descId, text: HINTS[f] });
    const err = el('p', { class: 'mreq-error', id: errId, hidden: true });
    const toggle = el('button', { type: 'button', class: 'mreq-link' });
    const startValue = initialSet ? view.effective[f] : view.inheritedValues[f] ?? FIELD_DEFAULTS[f];
    const inheritedText = el('p', { class: 'mreq-inherited' });
    const r = (rows[f] = { row, chip, body, err, toggle, inheritedText, built: builders[f](id, startValue ?? FIELD_DEFAULTS[f], `${descId} ${errId}`) });
    const lock = level === 'class' && CORE.includes(f);
    const paint = () => {
      const set = state.mode[f] === 'set';
      row.classList.toggle('is-set', set);
      chip.textContent = set ? view.labels[f] && own.has(f) ? view.labels[f] : (level === 'class' ? 'Set here (class defaults)' : level === 'area' ? 'Set for this area' : 'Set for this skill') : inheritedLabel(f);
      chip.className = `mreq-chip ${set ? 'is-set' : 'is-inherited'}`;
      inheritedText.textContent = set ? '' : `Currently ${describeValue(f, view.inheritedValues[f])}.`;
      inheritedText.hidden = set;
      body.hidden = !set || !r.built;
      hint.hidden = !set;
      toggle.hidden = lock || !r.built;
      toggle.textContent = set ? (own.has(f) || level !== 'class' ? 'Restore inherited value' : 'Turn off') : (level === 'class' ? 'Set a value' : 'Set a different value here');
      toggle.setAttribute('aria-label', `${toggle.textContent}: ${FIELD_LABELS[f]}`);
    };
    toggle.addEventListener('click', () => {
      state.mode[f] = state.mode[f] === 'set' ? 'inherit' : 'set';
      if (state.mode[f] === 'set') { // opening: fill with the inherited value as the starting point
        const fresh = builders[f](id, view.inheritedValues[f] ?? FIELD_DEFAULTS[f], `${descId} ${errId}`); r.built = fresh; body.replaceChildren(fresh.node);
      }
      paint(); changed({ focus: state.mode[f] === 'set' ? f : null });
    });
    row.setAttribute('role', 'group');
    const labelEl = el('span', { class: 'mreq-field-title', id: `${id}-t`, text: FIELD_LABELS[f] });
    row.setAttribute('aria-labelledby', `${id}-t`);
    body.append(r.built.node);
    row.append(el('div', { class: 'mreq-field-head' }, labelEl, chip), inheritedText, body, hint, err, toggle);
    paint();
    return row;
  }
  const coreRows = CORE.map(buildField);
  const advRows = ADVANCED.filter((f) => f !== 'subskills' || level === 'skill').map(buildField);

  // ---- presets ----
  const presetName = uid('preset');
  const presetBox = el('fieldset', { class: 'mreq-presets' }, el('legend', {}, 'Starting point'),
    el('div', { class: 'mreq-preset-list' }, PRESETS.map((p) => {
      const input = el('input', { type: 'radio', name: presetName, id: `${presetName}-${p.id}`, value: p.id, onchange: () => choosePreset(p.id) });
      return el('label', { class: 'mreq-preset', for: input.id }, input, el('span', { class: 'mreq-preset-name', text: p.label }), el('span', { class: 'mreq-preset-nums', text: p.id === 'custom' ? 'your numbers' : `${p.minimumQuestions} questions · ${p.accuracyPercent}%` }));
    })),
    el('p', { class: 'mreq-hint', text: PRESET_NOTICE }));
  function choosePreset(id) {
    state.preset = id;
    if (id !== 'custom') {
      const v = presetSettings(id);
      for (const f of CORE) {
        const r = rows[f];
        state.mode[f] = 'set';
        const fresh = builders[f](`${base}-${f}`, v[f], `${base}-${f}-hint ${base}-${f}-err`); r.built = fresh; r.body.replaceChildren(fresh.node);
        r.row.classList.add('is-set'); r.chip.textContent = level === 'class' ? 'Set here (class defaults)' : level === 'area' ? 'Set for this area' : 'Set for this skill'; r.chip.className = 'mreq-chip is-set';
        r.body.hidden = false; r.inheritedText.hidden = true; r.toggle.hidden = level === 'class'; r.toggle.textContent = 'Restore inherited value';
      }
    }
    changed({ keepPreset: true });
  }
  // ---- reading the form ----
  function collect() {
    const settings = {}, clear = [], errors = {};
    for (const f of Object.keys(rows)) {
      const r = rows[f];
      if (state.mode[f] === 'set' && r.built) { const v = r.built.read(); if (v.ok) settings[f] = v.value; else errors[f] = v.error; }
      else if (state.mode[f] === 'inherit' && own.has(f)) clear.push(f);
    }
    return { settings, clear, errors };
  }
  const effectiveNow = () => {
    const { settings } = collect();
    return { ...Object.fromEntries(Object.keys(view.inheritedValues).map((f) => [f, view.inheritedValues[f]])), ...settings };
  };
  function paintErrors(errors) {
    for (const f of Object.keys(rows)) {
      const r = rows[f], msg = state.touched.has(f) ? errors[f] : null;
      r.err.hidden = !msg; r.err.textContent = msg ?? '';
      for (const i of r.row.querySelectorAll('input[type=text]')) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
    }
  }
  function renderExplain() {
    const { errors, settings } = collect();
    paintErrors(errors);
    state.errors = errors;
    const eff = effectiveNow();
    if (Object.keys(errors).length) {
      const visible = Object.keys(errors).some((f) => state.touched.has(f));
      fill(explainBox, el('p', { class: 'mreq-explain-line', text: visible ? 'Fix the highlighted setting to see what students will need to do.' : 'Choose a starting point, or type a minimum number of questions and a required accuracy, to see what students will need to do.' })); fill(previewBox); return;
    }
    const ex = explainRequirement(eff);
    const merged = { ...eff, ...settings };
    fill(explainBox, el('h4', { text: level === 'class' ? 'What this means for students' : 'What students will need to do' }), ex.lines.map((l, i) => el('p', { class: `mreq-explain-line${i === 0 ? ' lead' : ''}`, text: l })));
    // preset radios follow the typed numbers
    if (!state.keepPreset) {
      const p = presetFor({ minimumQuestions: merged.minimumQuestions, accuracy: merged.accuracy });
      for (const input of presetBox.querySelectorAll('input[type=radio]')) input.checked = input.value === p;
    }
    renderPreview(merged);
  }
  function renderPreview(eff) {
    const result = previewStudentStates({ effective: eff, title: nodeTitle ?? (level === 'skill' ? 'this skill' : 'a skill'), graph });
    if (!result.states.length) { fill(previewBox, el('p', { class: 'mreq-hint', text: result.note })); return; }
    const sid = `${base}-sample`;
    const sel = el('select', { id: sid, 'aria-describedby': `${sid}-card` }, result.states.map((s, i) => el('option', { value: String(i), text: s.label, selected: i === Math.min(state.previewIndex, result.states.length - 1) })));
    const card = el('div', { class: 'mreq-sample', id: `${sid}-card` });
    const show = () => {
      state.previewIndex = Number(sel.value);
      const s = result.states[state.previewIndex], v = s.view;
      const share = v.progress ? Math.round(v.progress.questionsShare * 100) : 0;
      fill(card,
        el('div', { class: 'mreq-sample-head' }, el('strong', { text: v.title }), el('span', { class: `mreq-chip status-${v.status}`, text: v.statusLabel })),
        v.requirement.headline ? el('p', { text: v.requirement.headline }) : null,
        v.progress ? el('div', { class: 'mreq-progress' }, el('div', { class: 'mreq-bar', role: 'img', 'aria-label': `${v.progress.answeredLabel}` }, el('span', { style: `width:${share}%` })),
          el('p', { class: 'mreq-progress-text' }, v.progress.answered ? `${v.progress.answeredLabel} answered · ${v.progress.correct} correct · accuracy ${v.progress.accuracyLabel}` : `${v.progress.answeredLabel} answered`)) : null,
        el('p', { class: 'mreq-sample-text', text: v.explanation.text }),
        v.requirement.keepGoing ? el('p', { class: 'mreq-hint', text: v.requirement.keepGoing }) : null,
        v.standardsNote ? el('p', { class: 'mreq-hint', text: v.standardsNote }) : null);
    };
    sel.addEventListener('change', show);
    fill(previewBox, el('h4', { text: 'What students will see' }), el('label', { class: 'mreq-sample-pick', for: sid }, 'Example student', sel), card,
      result.note ? el('p', { class: 'mreq-hint', text: result.note }) : null, el('p', { class: 'mreq-hint', text: 'Calculated by the same rules that score student practice.' }));
    show();
  }
  function changed(opts = {}) {
    state.keepPreset = Boolean(opts.keepPreset);
    renderExplain();
    state.keepPreset = false;
    if (opts.focus && rows[opts.focus]?.built?.focus) rows[opts.focus].built.focus.focus();
    const c = collect(); onChange?.({ ...c, valid: Object.keys(c.errors).length === 0, ready: Object.keys(c.errors).length === 0 && (Object.keys(c.settings).length > 0 || c.clear.length > 0) });
  }

  const adv = el('details', { class: 'mreq-adv' }, el('summary', {}, 'Advanced settings ', el('span', { class: 'mreq-hint', text: level === 'skill' ? '(essential topics, difficulty, question variety, skipped questions)' : '(minimum correct, difficulty, question variety, skipped questions)' })), advRows);
  if (ADVANCED.some((f) => own.has(f))) adv.open = true;
  const element = el('div', { class: 'mreq-form' }, presetBox, el('div', { class: 'mreq-core' }, coreRows), adv, explainBox, previewBox);
  // select the preset that matches the starting numbers
  const startPreset = initialPreset ?? presetFor({ minimumQuestions: view.effective.minimumQuestions, accuracy: view.effective.accuracy });
  for (const input of presetBox.querySelectorAll('input[type=radio]')) input.checked = input.value === startPreset && view.effective.minimumQuestions != null ? true : (input.value === 'custom' && view.effective.minimumQuestions == null && !own.has('minimumQuestions'));
  element.addEventListener('input', (e) => { const f = e.target.closest?.('[data-field]')?.dataset.field; if (f) state.touched.add(f); }, true);
  element.addEventListener('change', (e) => { const f = e.target.closest?.('[data-field]')?.dataset.field; if (f) state.touched.add(f); }, true);
  renderExplain();
  const isEmpty = () => { const c = collect(); return Object.keys(c.settings).length === 0 && c.clear.length === 0; };
  return { element, collect, effective: effectiveNow, valid: () => Object.keys(collect().errors).length === 0, empty: isEmpty, ready: () => Object.keys(collect().errors).length === 0 && !isEmpty(), focusFirst: () => rows.minimumQuestions.built?.focus?.focus() };
}
