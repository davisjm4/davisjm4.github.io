/* Registry of compositional families, by mode. Weights are relative to the legacy generator (weight LEGACY_WEIGHT[mode]). */
import base from "./base.js?v=compositional-v1";
import returns from "./returns.js?v=compositional-v1";
import output from "./output.js?v=compositional-v1";
import arrays from "./arrays.js?v=compositional-v1";
import debug from "./debug.js?v=compositional-v1";
import searchsort from "./searchsort.js?v=compositional-v1";
import { Reject, LEVEL } from "./core.js?v=compositional-v1";
export { Reject };
export const FAMILIES = { base, returns, output, arrays, debug, searchsort };
/** Legacy share per mode: the legacy generator is one entry with this weight; every new family has weight 1 (debug's single generator covers four question types, weight 4). */
export const LEGACY_WEIGHT = { base: 1, returns: 1.5, output: 1.5, arrays: 2, debug: 0.75, searchsort: 1.5 };
const FAMILY_WEIGHT = { "knob-bug": 4 };
export function entriesFor(mode, difficulty) {
  const L = LEVEL[difficulty];
  return [{ id: "legacy", weight: LEGACY_WEIGHT[mode] }, ...FAMILIES[mode].filter(f => f.levels.includes(L)).map(f => ({ id: f.id, weight: FAMILY_WEIGHT[f.id] || 1, family: f }))];
}
export function composeQuestion(family, difficulty, r, attempts = 40) {
  for (let k = 0; k < attempts; k++) { try { const q = family.build(difficulty, r); q.composer = family.id; return q; } catch (e) { if (!(e instanceof Reject)) throw e; } }
  return null;
}
