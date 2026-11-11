// Demonstration of the mastery challenge engine with six synthetic students. No network, no clock, no real records.
//   node cs-games/pathway/mastery/demo.mjs          readable report
//   node cs-games/pathway/mastery/demo.mjs --json   full machine-readable result
// Every policy used here is an ILLUSTRATION from examples.mjs, not an approved requirement.
import fs from 'node:fs';
import { createPathway, validatePathway } from '../model.mjs';
import { exampleAdvancedArrayReasoning, exampleAdvancedArrayReasoningV2, exampleMathLabStandard, exampleQuickRecognitionDivision } from './examples.mjs';
import { contentProfileFromGraph, emptyHistory, normalizeEvents, nodeProgress, pathwayProgress, restartAttempt, syncAttempt, validateMasteryPolicy } from './index.mjs';
import { focused, mixed, minutesAfterStart } from './synthetic.mjs';

const DIV = 'node:advanced:math-lab:division', ARR = 'node:advanced:array-lab:trace-2d';
const policy = (raw) => validateMasteryPolicy(raw).policy;
const families = (graph, nodeId) => graph.questionFamilies.filter((f) => f.nodeIds[0] === nodeId).map((f) => f.sourceFamilyId);
const calendar = { start: '2026-11-02', end: '2027-01-15', weekdays: [1, 2, 3, 4, 5], minutes: 80, rotation: ['A', 'B'], classRotations: ['A'], rotationOffset: 0, overrides: [] };

export function runDemo({ graph }) {
  const out = {};
  const scopeOf = (student) => ({ profileId: `synthetic-student-${student.toLowerCase()}`, classId: 'synthetic-class-1' });
  const node = (id) => graph.nodes.find((n) => n.id === id);
  // The graph reports difficulty levels as unknown; the demo states them for the array lab as an assumption, so the difficulty rule can be exercised.
  const profile = (id) => ({ ...contentProfileFromGraph(graph, id), ...(id === ARR ? { difficulties: ['beginner', 'intermediate', 'advanced'] } : {}) });
  const view = ({ student, nodeId, pol, raw, history, now, policies }) => {
    const scope = scopeOf(student);
    const norm = normalizeEvents(raw, { graph, scope, now });
    return nodeProgress({ node: node(nodeId), policy: policy(pol), history: history ?? emptyHistory(scope, nodeId), events: norm.events, now, policies: (policies ?? [pol]).map(policy), contentProfile: profile(nodeId) });
  };
  const step = (steps, label, res) => { steps.push({ label, progress: res.progress }); return res.history; };

  // A: quick foundational node, 48 of 50 first tries correct (96%) against a 95% requirement.
  {
    const raw = focused({ student: 'a', session: 's1', assessedMode: 'division', families: families(graph, DIV), count: 50, results: (i) => ![17, 41].includes(i) }).events;
    const steps = []; let h;
    h = step(steps, 'after 24 questions', view({ student: 'A', nodeId: DIV, pol: exampleQuickRecognitionDivision, raw: raw.slice(0, 24), now: minutesAfterStart(30) }));
    h = step(steps, 'after 50 questions', view({ student: 'A', nodeId: DIV, pol: exampleQuickRecognitionDivision, raw, history: h, now: minutesAfterStart(60) }));
    out.A = { title: 'A: quick foundational node at 95%', steps, history: h };
  }
  // B: reaches the minimum at 85%, keeps answering, recovers without restarting.
  {
    const ar = families(graph, ARR);
    const first = focused({ student: 'b', session: 's1', activity: 'array-lab', assessedMode: 'trace-2d', families: ar, difficulty: 'advanced', count: 20, results: (i) => ![3, 9, 14].includes(i) });
    const more = focused({ student: 'b', session: 's2', activity: 'array-lab', assessedMode: 'trace-2d', families: ar, difficulty: 'advanced', count: 10, start: { n: 1, at: 40 }, results: [true] });
    const raw = [...first.events, ...more.events], steps = []; let h;
    h = step(steps, 'at the 20-question minimum (17 correct)', view({ student: 'B', nodeId: ARR, pol: exampleAdvancedArrayReasoning, raw: first.events, now: minutesAfterStart(30) }));
    h = step(steps, 'after 5 more correct answers', view({ student: 'B', nodeId: ARR, pol: exampleAdvancedArrayReasoning, raw: raw.slice(0, 25), history: h, now: minutesAfterStart(50) }));
    h = step(steps, 'after 10 more correct answers', view({ student: 'B', nodeId: ARR, pol: exampleAdvancedArrayReasoning, raw, history: h, now: minutesAfterStart(60) }));
    out.B = { title: 'B: recovers accuracy by continuing', steps, history: h };
  }
  // C: 98% accuracy, but never meets the double-division questions and sees only two question families.
  {
    const raw = focused({ student: 'c', session: 's1', assessedMode: 'division', families: ['division:integer', 'division:widened'], count: 50, results: (i) => i !== 11 }).events;
    const steps = [];
    const h = step(steps, 'after 50 questions', view({ student: 'C', nodeId: DIV, pol: exampleQuickRecognitionDivision, raw, now: minutesAfterStart(60) }));
    out.C = { title: 'C: good accuracy, missing an essential subskill', steps, history: h };
  }
  // D: finishes the seven Math Lab skills through Mixed Practice only; the area completes.
  {
    const modes = ['modulus', 'division', 'casting', 'expressions', 'reverse', 'math-methods', 'numeric-limits'];
    const plan = modes.map((m) => ({ assessedMode: m, families: families(graph, `node:advanced:math-lab:${m}`) }));
    const pathway = createPathway(graph, { id: 'demo-pathway', classId: 'synthetic-class-1', courseId: 'advanced', calendar });
    const lab = new Set(modes.map((m) => `node:advanced:math-lab:${m}`));
    pathway.sequence = pathway.sequence.filter((id) => lab.has(id));
    pathway.checkpoints = pathway.checkpoints.filter((c) => lab.has(c.nodeId));
    pathway.policies.push({ ...exampleMathLabStandard });
    for (const c of pathway.checkpoints) { c.policyId = exampleMathLabStandard.id; c.policyVersion = exampleMathLabStandard.version; }
    validatePathway(pathway, graph, { validateSessions: false, validateTargets: false });
    const oneMiss = (i, s) => Math.floor(i / s.length) !== 3;
    const phase1 = [...mixed({ student: 'd', session: 'm1', rounds: 10, plan: plan.slice(0, 5), results: (i) => Math.floor(i / 5) !== 3 }).events,
      ...mixed({ student: 'd', session: 'm2', rounds: 4, plan: plan.slice(5), start: { n: 1, at: 200 }, results: [true] }).events];
    const phase2 = mixed({ student: 'd', session: 'm3', rounds: 6, plan: plan.slice(5), start: { n: 1, at: 400 }, results: [true] }).events;
    void oneMiss;
    const read = (raw, histories, now) => pathwayProgress({ graph, pathway, profileId: 'synthetic-student-d', rawEvents: raw, histories, now });
    const first = read(phase1, {}, minutesAfterStart(300));
    const second = read([...phase1, ...phase2], first.histories, minutesAfterStart(600));
    out.D = { title: 'D: a learning area finished through Mixed Practice', steps: [{ label: 'after the first Mixed sessions', area: first.areas[0], nodes: first.nodes }, { label: 'after more Mixed Practice', area: second.areas[0], nodes: second.nodes }], histories: second.histories };
  }
  // E: restarts an unsuccessful challenge. The first attempt stays in history and the second starts from zero.
  {
    const ar = families(graph, ARR);
    const first = focused({ student: 'e', session: 's1', activity: 'array-lab', assessedMode: 'trace-2d', families: ar, difficulty: 'advanced', count: 20, results: (i) => i % 5 < 3 }).events;
    const second = focused({ student: 'e', session: 's2', activity: 'array-lab', assessedMode: 'trace-2d', families: ar, difficulty: 'advanced', count: 20, start: { n: 1, at: 100 }, results: [true] }).events;
    const scope = scopeOf('E'), steps = [];
    const now1 = minutesAfterStart(60), norm1 = normalizeEvents(first, { graph, scope, now: now1 });
    let r = restartAttempt(syncAttempt(emptyHistory(scope, ARR), { policy: policy(exampleAdvancedArrayReasoning), events: norm1.events, now: now1, contentProfile: profile(ARR) }).history,
      { requestId: 'restart-e-1', policy: policy(exampleAdvancedArrayReasoning), events: norm1.events, now: now1, contentProfile: profile(ARR) });
    const again = restartAttempt(r.history, { requestId: 'restart-e-1', policy: policy(exampleAdvancedArrayReasoning), events: norm1.events, now: minutesAfterStart(61) });
    steps.push({ label: 'restart requested twice with the same request id', restarted: r.ok, repeatedRequestChangedNothing: again.idempotent === true && again.history === r.history });
    const h = step(steps, 'after 20 new correct answers', view({ student: 'E', nodeId: ARR, pol: exampleAdvancedArrayReasoning, raw: [...first, ...second], history: r.history, now: minutesAfterStart(200) }));
    out.E = { title: 'E: restart with history preserved', steps, history: h };
  }
  // F: meets version 1, then the teacher publishes a more demanding version 2. Earned mastery stays; a new challenge opens.
  {
    const ar = families(graph, ARR);
    const v1 = focused({ student: 'f', session: 's1', activity: 'array-lab', assessedMode: 'trace-2d', families: ar, difficulty: 'advanced', count: 20, results: (i) => i !== 6 }).events;
    const v2 = focused({ student: 'f', session: 's2', activity: 'array-lab', assessedMode: 'trace-2d', families: ar, difficulty: 'advanced', count: 25, start: { n: 1, at: 20160 }, results: [true] }).events;
    const both = [exampleAdvancedArrayReasoning, exampleAdvancedArrayReasoningV2], steps = [];
    const v2Policy = { ...exampleAdvancedArrayReasoningV2, effectiveFrom: minutesAfterStart(20000) };
    let h = step(steps, 'under version 1', view({ student: 'F', nodeId: ARR, pol: exampleAdvancedArrayReasoning, raw: v1, now: minutesAfterStart(60), policies: both }));
    h = step(steps, 'version 2 published', view({ student: 'F', nodeId: ARR, pol: v2Policy, raw: v1, history: h, now: minutesAfterStart(20100), policies: [exampleAdvancedArrayReasoning, v2Policy] }));
    h = step(steps, 'after practicing under version 2', view({ student: 'F', nodeId: ARR, pol: v2Policy, raw: [...v1, ...v2], history: h, now: minutesAfterStart(25000), policies: [exampleAdvancedArrayReasoning, v2Policy] }));
    out.F = { title: 'F: moves to a newer policy without losing history', steps, history: h };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const graph = JSON.parse(fs.readFileSync(new URL('../curriculum-graph.json', import.meta.url), 'utf8'));
  const result = runDemo({ graph });
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('Mastery challenge engine demonstration (synthetic students, illustrative policies)\n');
    for (const s of Object.values(result)) {
      console.log(s.title);
      for (const st of s.steps) {
        if (st.progress) console.log(`  ${st.label}: ${st.progress.status} (${st.progress.attemptStatus}), ${st.progress.attempt?.attempted ?? 0} answered, ${st.progress.attempt?.correct ?? 0} correct\n    ${st.progress.explanation.text}`);
        else if (st.area) console.log(`  ${st.label}: ${st.area.label} (${st.area.status}); qualified ${st.area.qualified}, verified ${st.area.verified}`);
        else console.log(`  ${st.label}: ${JSON.stringify({ ...st, label: undefined })}`);
      }
      console.log('');
    }
  }
}
