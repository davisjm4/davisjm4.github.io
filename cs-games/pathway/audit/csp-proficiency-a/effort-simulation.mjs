// Effort simulation: questions a student who answers everything correctly needs before Level 3 is demonstrated.
// Reproduce the repaired rule:    node cs-games/pathway/audit/csp-proficiency-a/effort-simulation.mjs
// Reproduce the previous rule:   ROOT=<checkout of main 440a7ef> TAG=old node <that checkout>/.../effort-simulation.mjs   (copy this file in)
import fs from 'node:fs';
const ROOT = process.env.ROOT ?? new URL('../../../../', import.meta.url).pathname.replace(/\/$/, ''), TAG = process.env.TAG ?? 'new', TRIALS = 40, CAP = 300;
const imp = p => import(ROOT + p);
const graph = JSON.parse(fs.readFileSync(ROOT + '/cs-games/pathway/curriculum-graph.json'));
const E = await imp('/csp-games/engine.js');
const { generateArchitect, architectModes } = await imp('/csp-games/architect-engine.js');
const { cleanGameAttempt } = await imp('/wpr-games/workplace-readiness/service/profile-evidence.mjs');
const { normalizeEvent } = await imp('/cs-games/pathway/mastery/events.mjs');
const { evaluateSkillProficiency } = await imp('/cs-games/pathway/proficiency/index.mjs');
const meta = TAG === 'new' ? await imp('/csp-games/proficiency-metadata.js') : null;
const node = key => graph.nodes.find(n => n.id.endsWith(':CSP-' + key));
const scope = { profileId: 'sim', classId: 'sim' }; let n = 0;
function event(nodeObj, activity, mode, family, selected) {
  const questionId = 'q' + (++n);
  const row = cleanGameAttempt({ id: questionId + ':1', questionId, sessionId: 's', activity, mode: selected, assessedMode: mode, topic: mode, familyId: family, courseId: 'csp', attempt: 1, correct: true, occurred: Date.parse('2026-11-11T12:00:00Z') + n }, () => true);
  const r = normalizeEvent(row, { graph, scope }); if (!r.ok) throw new Error(r.reason + ' ' + activity + mode + family); return r.event;
}
const oldBool = c => ['x', 'y'].every(i => Array.from({ length: 13 }, (_, v) => c.solutions.filter(p => p[i] === v).length).every(k => k < 13));
const draws = {
  BOOLEAN: nd => { const c = E.booleanChallenge(); let fam; if (TAG === 'new') fam = meta.booleanMakeEvidence(c.solutions, c.e.op).family; else if (oldBool(c)) fam = 'both-inputs:' + c.e.op.toLowerCase(); return event(nd, 'boolean-gatekeeper', 'make', fam, 'make'); },
  LISTS: nd => { const c = E.listChallenge(); return event(nd, 'list-lab', 'execute', 'list-execute:' + c.ops.map(o => o.type.toLowerCase()).join('-'), 'execute'); },
};
const architect = (modes, focus) => nd => { const rec = evaluateSkillProficiency(nd, []).tiers.intermediate.practice?.mode ?? modes[0]; const mode = focus ? rec : modes[Math.floor(Math.random() * modes.length)]; const q = generateArchitect(mode); const variant = q.structure.slice(q.mode.length + 1).split('-')[0];
  const comp = TAG === 'new' ? meta.architectComponent(q) : (q.format === 'arrange' ? 'arrange' : q.component.replaceAll(' ', '-')); return event(nd, 'algorithm-architect', mode, `${mode}:${variant}:${comp}`, focus ? mode : 'mixed'); };
const modesOf = { SELECTION: ['nested-selection', 'selection'], ITERATION: ['nested', 'iteration', 'counter', 'accumulator'], SEQUENCE: ['sequence'], ALGORITHMS: ['search'], PROCEDURES: ['procedure'] };
for (const [k, m] of Object.entries(modesOf)) { draws[k] = architect(m, true); draws[k + ' (mixed modes)'] = architect(m, false); }
const q = (a, p) => a.sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
console.log(`TAG=${TAG}  questions answered (all correct) until Level 3 is demonstrated; ${TRIALS} simulated students; cap ${CAP}`);
for (const [key, draw] of Object.entries(draws)) {
  const nd = node(key.split(' ')[0]); const need = []; let never = 0, qualifying = 0, total = 0;
  for (let t = 0; t < TRIALS; t++) { const evs = []; let got = null;
    for (let i = 1; i <= CAP; i++) { const e = draw(nd); evs.push(e); if (i >= 6 && i % 3 === 0) { const r = evaluateSkillProficiency(nd, evs); if (r.tiers.intermediate.status === 'demonstrated') { got = i; qualifying += r.evidenceQuality.classified; total += i; break; } } }
    if (got === null) never++; else need.push(got); }
  console.log(key.padEnd(30), need.length ? `median ${q(need, .5)}  p90 ${q(need, .9)}  max ${Math.max(...need)}` : 'never reached', never ? `  NOT reached by ${never}/${TRIALS}` : '');
}
