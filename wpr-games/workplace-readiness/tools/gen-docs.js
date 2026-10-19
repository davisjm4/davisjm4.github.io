'use strict';
/* Generates STANDARDS_COVERAGE.md and REASONING_DIVERSITY_REPORT.md from the real content and a fresh audit. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { loadLibrary } = require('./load-library.js');
const lib = loadLibrary();
const root = path.join(__dirname, '..');
const modes = ['decision', 'nextstep', 'order', 'find'], diffs = ['beginner', 'intermediate', 'advanced'];
const ML = { decision: 'Decisions', nextstep: 'Next Step', order: 'Order', find: 'Find Problem' };
const S = require('../js/data/schema.js');

/* ---------- STANDARDS_COVERAGE.md ---------- */
let md = '# Standards coverage\n\n';
md += 'Workplace Readiness Games is an **independent practice resource** aligned to the publicly published Workplace Readiness Skills (WRS) module pages of the Career and Technical Consortium of States (CTECS), reviewed 2026-10-18 at <https://wrs.ctecs.org/practice/>. It is not an official CTECS product, uses no official, retired or purchased assessment questions, and does not guarantee results on any assessment. All scenarios, options and feedback are original.\n\n';
md += 'The module pages for each skill list the concepts a student should be able to demonstrate. Each is recorded here as a stable **concept ID** (`skill-id:concept`), and every template declares the concepts it assesses. The validator rejects templates that cite unknown concepts, so this mapping is checked, not decorative.\n\n';
md += 'Definitional bullets ("defining integrity", "defining diversity", etc.) are **not** assessed directly, because the platform teaches applying skills in situations rather than recalling vocabulary. They are listed per skill under *Not assessed directly*.\n\n';
md += '## Coverage matrix\n\nCounts are authored templates. Every template can render in many settings, with varied names, numbers and details.\n\n';
md += '| # | Skill | Templates | Families | ' + modes.map(m => ML[m]).join(' | ') + ' | Beg | Int | Adv | Concepts |\n|---|---|---:|---:|' + modes.map(() => '---:').join('|') + '|---:|---:|---:|---:|\n';
const uncovered = [];
lib.skills.forEach(s => {
  const ts = lib.templatesBySkill[s.id], cov = new Set(); ts.forEach(t => t.concepts.forEach(c => cov.add(c)));
  s.concepts.forEach(c => { if (!cov.has(c.id)) uncovered.push(c.id); });
  md += `| ${s.number} | ${s.name} | ${ts.length} | ${new Set(ts.map(t => t.family)).size} | ${modes.map(m => ts.filter(t => t.mode === m).length).join(' | ')} | ${diffs.map(d => ts.filter(t => t.difficulty === d).length).join(' | ')} | ${cov.size}/${s.concepts.length} |\n`;
});
md += `| | **All skills** | **${lib.templates.length}** | **${lib.families.length}** | ${modes.map(m => '**' + lib.templates.filter(t => t.mode === m).length + '**').join(' | ')} | ${diffs.map(d => '**' + lib.templates.filter(t => t.difficulty === d).length + '**').join(' | ')} | **${Object.keys(lib.conceptIds).length - uncovered.length}/${Object.keys(lib.conceptIds).length}** |\n\n`;
md += `Uncovered concepts: ${uncovered.length ? uncovered.join(', ') : 'none (all ' + Object.keys(lib.conceptIds).length + ' concepts are assessed by at least one template)'}.\n\n`;
const noAdv = lib.skills.filter(s => !lib.templatesBySkill[s.id].some(t => t.difficulty === 'advanced')).map(s => s.name);
md += '## Known gaps\n\n';
md += `- **No Advanced template yet** for: ${noAdv.join(', ')}. Choosing one of these skills with *Advanced* difficulty shows a "no challenges match" message instead of an empty or wrong game.\n`;
md += `- Advanced is ${Math.round(100 * lib.templates.filter(t => t.difficulty === 'advanced').length / lib.templates.length)}% of templates, below Beginner (${Math.round(100 * lib.templates.filter(t => t.difficulty === 'beginner').length / lib.templates.length)}%) and Intermediate (${Math.round(100 * lib.templates.filter(t => t.difficulty === 'intermediate').length / lib.templates.length)}%).\n`;
md += '- Each reasoning family currently holds about one template, so each skill has 5 to 8 distinct reasoning patterns. See REASONING_DIVERSITY_REPORT.md.\n';
md += '- Legal, financial and jurisdiction-specific content is deliberately limited. Where a rule decides the answer, the rule is stated inside the scenario; no template teaches a real tax rate, law or regulation as fact.\n\n';
md += '## Skill-by-skill mapping\n\n';
lib.skills.forEach(s => {
  const ts = lib.templatesBySkill[s.id];
  md += `### ${s.number}. ${s.name}\n\n*${S.CATEGORIES[s.category].label}.* ${s.summary}  \nSource module: <${s.ctecsUrl}>\n\n| Concept | Assessed by |\n|---|---|\n`;
  s.concepts.forEach(c => { md += `| ${c.label} | ${ts.filter(t => t.concepts.includes(c.id)).map(t => t.id).join(', ') || 'none'} |\n`; });
  md += '\n';
  if (s.notAssessedDirectly.length) md += `Not assessed directly (definitional): ${s.notAssessedDirectly.join('; ')}.\n\n`;
  md += 'Reasoning families: ' + [...new Set(ts.map(t => t.family))].map(f => lib.familiesById[f].label).join('; ') + '.\n\n';
});
fs.writeFileSync(path.join(root, 'STANDARDS_COVERAGE.md'), md);

/* ---------- REASONING_DIVERSITY_REPORT.md ---------- */
const a = JSON.parse(cp.execSync('node ' + path.join(__dirname, 'diversity-audit.js') + ' 400 6 --json', { maxBuffer: 1e8 }).toString());
const pct = (n, t) => (100 * n / t).toFixed(1) + '%';
let r = '# Reasoning diversity report\n\n';
r += `Generated by \`tools/diversity-audit.js\` on a separate sample of **${a.sample.toLocaleString()} challenges** (${a.seeds} seeds x ${a.perSeed}), distinct from the seeds used in the automated tests.\n\n`;
r += '## What counts as a different question\n\nA new name, setting, number or twist is **surface variation**. A question is only counted as different when it poses a different **reasoning problem**, identified by `family:pattern`. Changing "restaurant" to "retail store" does not create a new reasoning pattern, and this report never counts it as one.\n\n';
r += '## Library size\n\n| Measure | Value |\n|---|---:|\n';
r += `| Skills | ${a.library.skills} |\n| Scenario templates | ${a.library.templates} |\n| Reasoning families | ${a.library.families} |\n| Distinct reasoning patterns | ${a.library.reasoningPatterns} |\n| Career contexts | ${a.library.contexts} |\n| Coherent setting bundles | ${a.library.bundles} |\n\n`;
r += '## Coverage in the sample\n\n| Measure | Value |\n|---|---:|\n';
r += `| Reasoning families seen | ${a.sampleCoverage.families} of ${a.library.families} |\n| Reasoning patterns seen | ${a.sampleCoverage.patterns} of ${a.library.reasoningPatterns} |\n| Skills seen | ${a.sampleCoverage.skills} of 22 |\n| Standards concepts assessed | ${a.sampleCoverage.concepts} of ${a.sampleCoverage.totalConcepts} |\n| Rejected instances (invalid, never shown) | ${a.rejected} |\n| Invalid instances shown | ${a.invalid} |\n\n`;
r += `### Skill balance (mixed practice)\n\nEach skill received between ${a.skillBalance.min} and ${a.skillBalance.max} challenges (even share: ${a.skillBalance.expected}).\n\n`;
r += '### Practice modes\n\n| Mode | Challenges | Share |\n|---|---:|---:|\n' + modes.map(m => `| ${ML[m]} | ${a.byMode[m]} | ${pct(a.byMode[m], a.sample)} |`).join('\n') + '\n\n';
r += '### Difficulty distribution\n\n| Level | Challenges | Share |\n|---|---:|---:|\n' + diffs.map(d => `| ${d} | ${a.byDifficulty[d]} | ${pct(a.byDifficulty[d], a.sample)} |`).join('\n') + '\n\n';
r += '### Career-context distribution\n\n| Context | Challenges | Share |\n|---|---:|---:|\n' + Object.keys(S.CONTEXTS).map(c => `| ${S.CONTEXTS[c]} | ${a.byContext[c]} | ${pct(a.byContext[c], a.sample)} |`).join('\n') + '\n\n';
r += '### Skill categories\n\n| Category | Challenges | Share |\n|---|---:|---:|\n' + Object.keys(S.CATEGORIES).map(c => `| ${S.CATEGORIES[c].label} | ${a.byCategory[c]} | ${pct(a.byCategory[c], a.sample)} |`).join('\n') + '\n\n';
r += '## Repetition by semantic signature\n\nThe signature is the reasoning pattern, not the wording.\n\n| Measure | Value |\n|---|---:|\n';
r += `| Minimum gap between the same reasoning pattern | ${a.repetition.minGap} challenges |\n| Median gap | ${a.repetition.medianGap} |\n| 10th percentile gap | ${a.repetition.p10Gap} |\n| Repeats within 5 challenges | ${a.repetition.repeatsWithin5} |\n| Repeats within 12 challenges | ${a.repetition.repeatsWithin12} (${a.repetition.repeatsWithin12Pct}%) |\n| Average appearances of each pattern per ${a.perSeed}-challenge session | ${a.repetition.challengesPerPatternExpected} |\n\n`;
r += '## Is surface variation masking repeated problems?\n\n';
r += `Of ${a.sample.toLocaleString()} challenges, ${a.surface.distinctRenderedScenarios.toLocaleString()} had distinct rendered scenario text, but only **${a.surface.distinctReasoning} distinct reasoning problems** exist in the library. So **yes, to a degree**: a student who completes several hundred challenges will meet every reasoning problem several times, in a new setting each time. The settings, names and numbers are real variation, but the underlying problem repeats. Ordering and find-the-problem templates have the least surface variation, so a student can see the same sentence set again.\n\n`;
r += `Frequency of each pattern is uneven (between ${a.patternShare.min} and ${a.patternShare.max} appearances in this sample, against an even share of ${a.patternShare.expected}). Patterns in skills that have only one template of some mode or difficulty are chosen more often when a student filters to that mode or difficulty.\n\n`;
r += '## Bias checks\n\n';
r += `| Check | Result |\n|---|---|\n| Correct-answer position (choice questions) | A ${a.positions.a}, B ${a.positions.b}, C ${a.positions.c}, D ${a.positions.d} |\n| Best answer is the unique longest option | ${a.bestUniquelyLongestPct}% (a random guess would be 25%; the validator limit is 40%) |\n\n`;
r += '## Honest limits\n\n';
r += `1. **${a.library.reasoningPatterns} reasoning problems is a finite library.** The generator supports unlimited practice sessions, but not unlimited distinct problems. The fix is more templates per family, not more settings.\n`;
r += `2. **Advanced is thin** (${pct(a.byDifficulty.advanced, a.sample)} of the sample) and three skills have none.\n`;
r += `3. **Best-answer length bias is reduced, not eliminated** (${a.bestUniquelyLongestPct}% vs 25% by chance).\n`;
r += '4. The semantic-signature measure treats each template as one reasoning problem. Two templates could still feel similar to a student; only human review can judge that.\n';
r += '5. Instructional quality was reviewed by the developer only (see GAME_DESIGN.md, *Instructional audit*). It has not had independent educator review.\n';
fs.writeFileSync(path.join(root, 'REASONING_DIVERSITY_REPORT.md'), r);
console.log('Wrote STANDARDS_COVERAGE.md and REASONING_DIVERSITY_REPORT.md');
