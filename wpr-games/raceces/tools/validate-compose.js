#!/usr/bin/env node
/* Schema and relationship checks for content/compositional kits. Run by `npm run validate`.
   Exits non-zero on any error so a malformed kit can never reach the bundle unnoticed. */
const lib = require('../js/data/compose-bundle.js');
const bundle = require('../js/data/content-bundle.js');
const C = require('../js/compose/compose.js');
const errors = [], warn = [];
const topics = new Set(bundle.topics.map(t => t.id));
const need = (o, keys, where) => keys.forEach(k => { if (o[k] === undefined || o[k] === '' || o[k] === null) errors.push(`${where}: missing ${k}`); });
for (const kit of lib.kits) {
  const w = kit.id;
  if (!topics.has(kit.topicId)) errors.push(`${w}: topicId ${kit.topicId} is not an existing topic`);
  need(kit, ['names', 'off'], w);
  if ((kit.names || []).length < 5) errors.push(`${w}: needs at least 5 fictional names for surface variety`);
  if (new Set(kit.names).size !== kit.names.length) errors.push(`${w}: duplicate names`);
  if ((kit.off || []).length < 2) errors.push(`${w}: needs at least 2 off-topic facts`);
  (kit.off || []).forEach((o, i) => need(o, ['text', 'tag', 'add', 'exp'], `${w}/off${i}`));
  if (kit.type === 'design') {
    need(kit, ['kind', 'kindPl', 'member', 'memberPl', 'descr', 'live', 'home', 'goal', 'otherGoals', 'myths', 'nonAnswers', 'conds', 'features', 'settings', 'confounds'], w);
    const condIds = Object.keys(kit.conds || {});
    const fc = (kit.features || []).map(f => f.cond);
    if ((kit.features || []).length < 4) errors.push(`${w}: needs 4 features`);
    if (new Set(fc).size !== fc.length) errors.push(`${w}: each feature must answer a different condition`);
    (kit.features || []).forEach(f => {
      need(f, ['id', 'np', 'bare', 'the', 'short', 'mech', 'benefit', 'cond', 'metric'], `${w}/${f.id}`);
      if (!condIds.includes(f.cond)) errors.push(`${w}/${f.id}: unknown cond ${f.cond}`);
      if (f.metric) need(f.metric, ['past', 'unit', 'np', 'cmp', 'better', 'lo', 'hi'], `${w}/${f.id}.metric`);
      if (f.metric && f.metric.hi - f.metric.lo < 6) errors.push(`${w}/${f.id}: metric range too narrow`);
      if (f.cost) { need(f.cost, ['clause', 'cond'], `${w}/${f.id}.cost`); if (!condIds.includes(f.cost.cond)) errors.push(`${w}/${f.id}: unknown cost cond`); if (fc.includes(f.cost.cond)) errors.push(`${w}/${f.id}: cost condition must not be a feature condition`); }
      if (/^(one|a single one)\b/i.test(f.np)) warn.push(`${w}/${f.id}: np starting with "one" reads badly after "One feature of..."`);
    });
    condIds.forEach(id => need(kit.conds[id], ['clause', 'absent', 'np'], `${w}/cond ${id}`));
    fc.forEach(id => { if (kit.conds[id] && !kit.conds[id].risk) errors.push(`${w}/cond ${id}: feature condition needs a risk clause`); });
    (kit.settings || []).forEach(s => {
      need(s, ['id', 'np', 'the', 'at', 'has', 'lacks'], `${w}/setting ${s.id}`);
      const present = s.has.filter(x => fc.includes(x));
      if (present.length !== 2) errors.push(`${w}/setting ${s.id}: must have exactly 2 feature conditions (has ${present.length})`);
      fc.filter(x => !s.has.includes(x)).forEach(x => { if (!s.lacks.includes(x)) errors.push(`${w}/setting ${s.id}: must list absent feature condition ${x} in lacks`); });
      s.has.concat(s.lacks).forEach(x => { if (!condIds.includes(x)) errors.push(`${w}/setting ${s.id}: unknown cond ${x}`); });
      s.has.forEach(x => { if (s.lacks.includes(x)) errors.push(`${w}/setting ${s.id}: ${x} both present and absent`); });
    });
    if ((kit.settings || []).length < 3) errors.push(`${w}: needs 3 settings`);
    (kit.confounds || []).forEach(k => need(k, ['id', 'clause', 'tag', 'why', 'np', 'same', 'alt', 'ruleOut', 'ruleTag'], `${w}/confound ${k.id}`));
  } else if (kit.type === 'process') {
    need(kit, ['descr', 'outcome', 'stages', 'conds', 'myths', 'otherFocus', 'nonAnswers'], w);
    if ((kit.stages || []).length < 3) errors.push(`${w}: needs at least 3 stages`);
    (kit.stages || []).forEach(s => {
      need(s, ['id', 'text', 'tag', 'from', 'product', 'less', 'does', 'why'], `${w}/${s.id}`);
      if (s.needs) { if (!kit.conds[s.needs]) errors.push(`${w}/${s.id}: unknown cond ${s.needs}`); need(s, ['needWhy'], `${w}/${s.id}`); }
    });
    if ((kit.stages || []).filter(s => s.needs).length < 2) errors.push(`${w}: at least 2 stages need a condition`);
    Object.keys(kit.conds || {}).forEach(id => need(kit.conds[id], ['clause', 'absent', 'np'], `${w}/cond ${id}`));
    (kit.rates || []).forEach((r, i) => { need(r, ['stage', 'factor', 'setup', 'result', 'claim', 'why'], `${w}/rate${i}`); if (!kit.stages.some(s => s.id === r.stage)) errors.push(`${w}/rate${i}: unknown stage`); if (!/\{x\}/.test(r.result.clause) || !/\{y\}/.test(r.result.clause)) errors.push(`${w}/rate${i}: result clause needs {x} and {y}`); });
  } else if (kit.type === 'observation') {
    need(kit, ['descr', 'observers', 'cases', 'otherFocus', 'nonAnswers'], w);
    (kit.cases || []).forEach(k => {
      need(k, ['id', 'event', 'q', 'restate', 'answer', 'sum', 'myth', 'mythClause', 'cause', 'alt', 'altText', 'patternQ', 'patternA', 'patternSum', 'observerNote', 'obs'], `${w}/${k.id}`);
      ['onset', 'mechanism', 'reverse', 'against'].forEach(r => { if (!k.obs.some(o => o.role === r)) errors.push(`${w}/${k.id}: needs an observation with role ${r}`); });
      k.obs.forEach(o => { need(o, ['id', 'role', 'text', 'tag', 'exps'], `${w}/${k.id}/${o.id}`); if ((o.exps || []).length < 2) errors.push(`${w}/${k.id}/${o.id}: needs at least 2 explanation wordings`); });
      if (k.prediction && !k.obs.some(o => o.role === 'against' && o.predExps)) errors.push(`${w}/${k.id}: a prediction needs at least one against-observation with predExps`);
      const nums = (k.obs.map(o => o.text).join(' ').match(/\{n(\d)\}/g) || []).map(x => +x.slice(2, -1));
      nums.forEach(n => { if (!k.numbers || !k.numbers[n]) errors.push(`${w}/${k.id}: {n${n}} has no number range`); });
    });
  } else errors.push(`${w}: unknown kit type ${kit.type}`);
}
// Every topic should have all three kit types.
for (const t of topics) for (const type of ['design', 'process', 'observation']) if (!lib.kits.some(k => k.topicId === t && k.type === type)) warn.push(`topic ${t}: no ${type} kit`);
// Capacity per topic and level.
const idx = C.index(lib, bundle);
const cap = {};
idx.entries.forEach(e => { const k = e.topicId + '/' + e.level; cap[k] = cap[k] || { n: 0, s: new Set() }; cap[k].n++; cap[k].s.add(e.structure); });
warn.forEach(x => console.log('warn:', x));
if (errors.length) { errors.forEach(e => console.error('ERROR:', e)); console.error(errors.length + ' compositional content error(s).'); process.exit(1); }
console.log(`Compositional kits valid: ${lib.kits.length} kits, ${idx.entries.length} configurations.`);
if (process.argv.includes('--capacity')) Object.keys(cap).sort().forEach(k => console.log('  ' + k + ': ' + cap[k].n + ' configurations, ' + cap[k].s.size + ' structures'));
