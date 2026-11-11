/* Math Lab Mixed Practice across every scored mode, plus the evidence annotation Math Lab sends.
 *
 * Mixed Practice used to draw only the five original modes (the expansion modes Math Methods and Numeric Limits were added later with
 * their own difficulty levels and never joined the rotation), so answers to those two modes could only be earned in focused practice.
 * This deck rotates all seven modes in shuffled rounds (each mode once per round, never the same mode twice in a row). Every question
 * comes from its own mode's generator, so mode-specific question generation, explanations and scoring are untouched:
 *   - original modes:  deck.next(mode)                    (existing createDeck; difficulty does not apply)
 *   - expansion modes: expansionDeck.next(mode, difficulty) (existing createExpansionDeck; the chosen difficulty applies)
 * Credit follows the question actually shown: q.mode is the node-bearing mode, and the difficulty recorded is the one presented.
 */
import { structures } from "./engine.js?v=math-v1";
import { EXPANSION_MODES } from "./expansion/generator.js?v=math-exp-v1";

export const MIXED_MODES = [...Object.keys(structures), ...Object.keys(EXPANSION_MODES)];
const isExpansion = (mode) => Object.prototype.hasOwnProperty.call(EXPANSION_MODES, mode);

export function createMixedDeck({ deck, expansionDeck, rng = Math.random }) {
  let bag = [], last = null;
  function refill() {
    bag = MIXED_MODES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // The previous round's last mode must not open the next round.
    if (bag[0] === last && bag.length > 1) [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  return {
    next(difficulty = "beginner") {
      if (!bag.length) refill();
      const mode = bag.shift();
      last = mode;
      return isExpansion(mode) ? expansionDeck.next(mode, difficulty) : deck.next(mode);
    },
  };
}

/* Evidence annotation for any Math Lab question. Original-mode questions carry a structure id (family "<mode>:<shape>", the id the
   curriculum graph binds); expansion questions carry difficulty, family and skill from their generator. Pure; never changes the question. */
export function mathEvidence(q) {
  if (!q || typeof q !== "object") return null;
  if (isExpansion(q.mode)) return { practiceMode: q.mode, mode: q.mode, difficulty: q.difficulty, reasoningFamily: q.family, skill: q.skill, seed: q.seed };
  if (Object.prototype.hasOwnProperty.call(structures, q.mode) && q.shape) return { practiceMode: q.mode, mode: q.mode, reasoningFamily: `${q.mode}:${q.shape}` };
  return null;
}
