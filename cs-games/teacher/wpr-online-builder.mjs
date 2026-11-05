import { getHybrid, adaptWorkplaceChallenge } from './workplace-adapter.js';
import { MAX_QUESTIONS, MODES, LEVELS, validateSnapshot } from '../../wpr-games/workplace-readiness/online/model.mjs';
const W = globalThis.WRG;

function eligible(filters, quota) {
  const h = getHybrid();
  return W.selector.eligibleUnits(h, {
    ...filters,
    topics: quota?.scope === 'topic' ? [quota.id] : filters.topics,
    subtopics: quota?.scope === 'subtopic' ? [quota.id] : filters.subtopics,
    skills: quota?.scope === 'skill' ? [quota.id] : filters.skills
  }).filter(u => !(u.kind === 'authored' && u.mode === 'find' && u.template.segments.length < 4));
}
export function availability(filters, quota) {
  const units = eligible(filters, quota);
  return { families: new Set(units.map(u => u.family)).size, questions: new Set(units.map(W.selector.reasoningOf)).size };
}
export function generateDiagnostic(filters, quotas, seed, preserved = []) {
  const h = getHybrid(), rng = W.rng.create(seed);
  const counts = quotas.map(q => q.count);
  const total = counts.reduce((a,b)=>a+b,0);
  if (!quotas.length || quotas.some(q => !Number.isInteger(q.count) || q.count < 1) ||
      total > MAX_QUESTIONS || !LEVELS.includes(filters.difficulty) || filters.modes.some(m=>!MODES.includes(m)))
    throw new Error('Enter whole question counts totaling 1–50 and valid settings.');
  const taken = new Set(preserved.filter(Boolean).map(q => q.reasoningSignature));
  const familyCounts = new Map();
  for (const q of preserved.filter(Boolean)) familyCounts.set(q.family, (familyCounts.get(q.family) || 0) + 1);
  const pools = quotas.map(q => {
    const units = rng.shuffle(eligible(filters, q));
    if (new Set(units.map(W.selector.reasoningOf)).size < q.count)
      throw new Error('Insufficient distinct questions for ' + q.name + '. Choose a broader filter or a smaller count.');
    return units;
  });
  const slots = quotas.flatMap((q,i) => Array.from({length:q.count},()=>i));
  const result = slots.map((_,i)=>preserved[i] || null);
  const remaining = slots.map((pool,index)=>({pool,index})).filter(s=>!result[s.index]);
  remaining.sort((a,b)=>pools[a.pool].length-pools[b.pool].length);
  const candidates = (slot) => {
    const variants = pools[slot.pool];
    return variants.slice().sort((a,b)=>(familyCounts.get(a.family)||0)-(familyCounts.get(b.family)||0));
  };
  // Assign each quota its own distinct signatures, even if topic pools overlap.
  const owners = new Map(), assigned = new Map();
  function allocate(slot, seen) {
    for (const u of candidates(slot)) {
      const sig = 'workplace-reasoning|' + W.selector.reasoningOf(u);
      if (taken.has(sig) || seen.has(sig)) continue;
      seen.add(sig);
      const previous = owners.get(sig);
      if (previous && !allocate(previous,seen)) continue;
      owners.set(sig,slot); assigned.set(slot.index,u);
      if (!previous) familyCounts.set(u.family, (familyCounts.get(u.family)||0)+1);
      return true;
    }
    return false;
  }
  for (const slot of remaining) if (!allocate(slot,new Set()))
    throw new Error('The selected groups overlap too much to meet the requested counts with distinct reasoning. Reduce a quota or broaden filters.');
  for (const [index,u] of assigned) {
    const settings = filters.contexts?.length ? u.contexts.filter(id=>filters.contexts.includes(id)) : u.contexts;
    let item;
    for (let attempt=0;attempt<8&&!item;attempt++) {
      const c = W.selector.renderUnit(h,u,{seed:seed+'|'+index+'|'+attempt,id:String(index),contextId:rng.pick(settings)});
      if (!W.selector.validate(h,c)) item = adaptWorkplaceChallenge(c);
    }
    if (!item) throw new Error('A question could not be validated in its assigned pool. Regenerate or change settings.');
    result[index] = item;
  }
  if (new Set(result.map(q=>q.reasoningSignature)).size !== result.length) throw new Error('Question reasoning must be unique.');
  return result;
}
export { validateSnapshot };
