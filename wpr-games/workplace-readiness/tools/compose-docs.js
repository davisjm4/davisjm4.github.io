#!/usr/bin/env node
'use strict';
/* Writes DIVERSITY_REPORT.md from tests/results/compose-audit.json (run tools/compose-audit.js first). */
const fs = require('fs'), path = require('path');
const A = require('../tests/results/compose-audit.json'), s = A.summary;
const LV = { beginner: 'Beg', intermediate: 'Int', advanced: 'Adv' };
const o = [];
o.push('# Diversity report: authored-only vs compositional generator', '',
  'Generated ' + A.generatedAt.slice(0, 10) + ' by `npm run docs:compose` from `tests/results/compose-audit.json`. Baseline = the 140-template authored generator (`js/core/generator.js`, unchanged). New = the hybrid selector (`js/compose/selector.js`) over the same 140 templates plus the compositional catalog.', '',
  '## What counts as a distinct reasoning problem', '',
  'Authored templates keep their `family:pattern` signature. A composed challenge\'s signature contains only facts that change the professional decision:', '',
  '- **Decision / Best Next Step:** the skill, the decisive issue\'s principle, the other active issues and any higher-priority constraint stated as already resolved (`first:…|also:…|resolved:…`), or the prerequisite stated as satisfied (`clear:…`). The mode is *not* part of the signature: the same state asked as a decision and as a next step counts once.',
  '- **Put the Steps in Order:** the kit and the exact set of steps (a different prerequisite set gives a different dependency graph).',
  '- **Find the Problem:** the defect principle.', '- **Numeric:** the configuration principle (which calculation or constraint decides).', '',
  'Names, settings, setting-specific vocabulary, wording variants, irrelevant detail sentences, pressure sentences, numbers that do not change the decision, and option order never change a signature. Composed and authored signatures are in separate namespaces, so totals are plain sums with no overlap.', '');
o.push('## Summary', '', '| Measure | Existing system | New compositional system |', '|---|---|---|',
  '| Authored templates | 140 | 140 (unchanged, still used) |',
  '| Reasoning frameworks | — | ' + s.frameworks + ' |',
  '| Compositional kits (situation types) | — | ' + s.kits + ' |',
  '| Meaningful reasoning configurations | 140 authored patterns | ' + s.totalSignatures + ' (140 authored + ' + s.composedConfigurations + ' composed) |',
  '| Skill/difficulty combinations with 20+ configurations | ' + s.cellsAt20Before + ' of 66 | ' + s.cellsAt20After + ' of 66 |',
  '| Filter combinations with 20+ configurations | ' + s.filtersAt20Before + ' of ' + s.filterCount + ' audited | ' + s.filtersAt20After + ' of ' + s.filterCount + ' audited |',
  '| Exact repeats in 20-question sessions (sum over the 66 cells, mean of 3 seeds) | see session table | ' + s.cellExactRepeats20After + ' |',
  '| Reasoning repeats in 20-question sessions (sum over the 66 cells, mean of 3 seeds) | ' + s.cellReasoningRepeats20Before + ' | ' + s.cellReasoningRepeats20After + ' |', '');
o.push('Composed configurations by engine: ' + Object.entries(s.configurationsByEngine).map(([k, v]) => k + ' ' + v).join(', ') + '. Composed units (configuration × mode) before rendering: ' + s.composedUnits + '. Decision-rule ids in use: ' + s.decisionRules + '.', '',
  'State configurations by shape: ' + Object.entries(s.stateShapes).map(([k, v]) => k + ' = ' + v).join('; ') + '.', '',
  'Surface variety: rendering one configuration 8 times across its allowed settings gives on average ' + s.avgDistinctScenariosPerConfigurationIn8Renders + ' distinct scenario texts. This is surface variety only and is **not** counted as reasoning variety.', '');
o.push('## Sessions (mean of 3 seeds)', '', '| Selection | Length | Exact repeats (before → after) | Reasoning repeats (before → after) | Distinct families (before → after) |', '|---|---|---|---|---|');
A.sessions.forEach(x => x.before.forEach((b, i) => { const a = x.after[i]; o.push('| ' + x.label + ' | ' + b.n + ' | ' + b.exactRepeats + ' → ' + a.exactRepeats + ' | ' + b.reasoningRepeats + ' → ' + a.reasoningRepeats + ' | ' + b.familyDistinct + ' → ' + a.familyDistinct + ' |'); }));
o.push('', 'In 500-question sessions, any configuration repeat happens only after the eligible pool is used, and never within 20 challenges when 20 or more are eligible (asserted in `tests/compose-diversity.test.js`).', '');
o.push('## All 66 skill/difficulty combinations', '', 'Before = authored patterns. After = authored + composed configurations. Mode columns count configurations available when that mode alone is selected; Decision and Next Step share state configurations, so mode columns do not add up to the total.', '',
  '| Skill | Level | Before | Authored | Composed | **Total** | Decisions | Next Step | Order | Find |', '|---|---|---|---|---|---|---|---|---|---|');
A.cells.forEach(c => o.push('| ' + c.number + '. ' + c.name + ' | ' + LV[c.level] + ' | ' + c.before + ' | ' + c.authored + ' | ' + c.composed + ' | **' + c.total + '** | ' + c.modes.decision + ' | ' + c.modes.nextstep + ' | ' + c.modes.order + ' | ' + c.modes.find + ' |'));
const thin = A.filters.filter(r => r.after < 20);
const byKind = {}; thin.forEach(r => { const p = r.selection.split('/'); const k = (p[0] === 'all-skills' ? 'all skills' : 'one skill') + ' + ' + p[1]; byKind[k] = (byKind[k] || 0) + 1; });
o.push('', '## Narrow filters below 20 (disclosed)', '', thin.length + ' of ' + A.filters.length + ' audited filters have fewer than 20 configurations. By kind: ' + Object.entries(byKind).map(([k, v]) => k + ' ' + v).join(', ') + '. All 156 all-skills × mode × difficulty × career-setting filters reach 20. When a selection has fewer than 20, the home screen says so (existing warning, now based on reasoning configurations), unused configurations are served first, and review practice continues.', '',
  'Empty selections (no authored or composed content; Start stays disabled): ' + A.filters.filter(r => r.after === 0).map(r => '`' + r.selection + '`').join(', ') + '. These were empty before as well.', '',
  '<details><summary>All ' + A.filters.length + ' audited filters (before → after)</summary>', '', '| Selection | Before | After |', '|---|---|---|');
A.filters.forEach(r => o.push('| ' + r.selection + ' | ' + r.before + ' | ' + r.after + ' |'));
o.push('', '</details>', '', '## Distractors', '', 'In 3,000 sampled composed choice challenges, every non-best option carried a misconception (' + s.distractorsWithMisconception + '). Sources: ' + Object.entries(s.distractorSources).map(([k, v]) => k + ' ' + v).join(', ') + '. (`sc` = issue-specific shortcut; `plan` = plan options; `redo` = repeating a step the scenario says is already done; `over` = over-caution in a satisfied state; `w1`–`w3`, `a`–`d` = numeric misconception options.)', '',
  '## Difficulty', '', 'Mean decision-relevant facts per state configuration: ' + Object.entries(s.difficultyMetrics).map(([k, v]) => k + ' ' + v.facts + ' (active priorities ' + v.priorities + ')').join('; ') + '. Ordering steps: ' + Object.entries(s.difficultyMetrics).map(([k, v]) => k + ' ' + v.orderSteps).join(', ') + ' (maximum valid orders ' + Object.entries(s.difficultyMetrics).map(([k, v]) => k + ' ' + v.orderValidOrdersMax).join(', ') + ').', '',
  '## Performance', '', 'Catalog build at page load: ' + s.catalogBuildMs + ' ms (Node, this machine). Mean generation + validation per challenge: ' + s.msPerChallenge + ' ms. Compose bundle: ' + Math.round(s.bundleBytes / 1024) + ' KB uncompressed. Chromebook timings were not measured.', '');
fs.writeFileSync(path.join(__dirname, '..', 'DIVERSITY_REPORT.md'), o.join('\n'));
console.log('Wrote DIVERSITY_REPORT.md');
