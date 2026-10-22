/* Class & Object Lab public engine API.
 * Backward-compatible adapter over the compositional object-state generator in ./compose/.
 * Every export of the original engine is preserved; the original 52-template engine is kept,
 * unmodified apart from a header comment, in class-engine-legacy.js. */
import { MODE_IDS, MODE_NAMES, LEVELS, generateChallenge, createPracticeSession, assessChallenge, seedFrom } from "./compose/engine.js";
import { FAMILIES } from "./compose/families/index.js";

export const modeNames = Object.fromEntries(MODE_IDS.map((m) => [m, MODE_NAMES[m]]));
export const difficulties = [...LEVELS];
export const DEFAULT_DIFFICULTY = "Beginner";
/* Unchanged from the original engine (same LCG, same Fisher-Yates) so existing callers behave identically. */
export function seededRandom(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function shuffle(v, r = Math.random) { const a = [...v]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* Number of compositional semantic families per mode (the original value was the template count, 4). */
export const challengeFamilies = Object.fromEntries(MODE_IDS.map((m) => [m, FAMILIES[m].length]));
export const classObjectGame = { name: "Class & Object Lab", icon: "◈", concepts: "Objects · State · Encapsulation · References", description: "Explore how Java objects store data, interact through methods, and share references.", modes: {} };

/* generateClassObject(mode, r, difficulty): r is a random function (as before); its next value seeds the challenge. */
export function generateClassObject(mode = "mixed", r = Math.random, difficulty = DEFAULT_DIFFICULTY) {
  if (mode !== "mixed" && !MODE_NAMES[mode]) throw Error(`Unknown mode ${mode}`);
  if (mode === "mixed") mode = MODE_IDS[Math.floor(r() * MODE_IDS.length)];
  return generateChallenge({ mode, difficulty, seed: seedFrom(r) });
}
/* createClassObjectGenerator(seed): stateful generator with recent-question avoidance.
 * next(mode = "mixed", difficulty = "Beginner"). Mixed Practice rotates through the 13 modes in order. */
export function createClassObjectGenerator(seed = Date.now(), { difficulty = DEFAULT_DIFFICULTY } = {}) {
  const session = createPracticeSession({ seed: seed >>> 0, mode: "mixed", difficulty });
  const recent = [];
  return {
    next(requested = "mixed", diff = difficulty) {
      const x = session.next({ mode: requested, difficulty: diff });
      recent.push(x.signature); if (recent.length > 30) recent.shift();
      return x;
    },
    get recent() { return [...recent]; },
    get stats() { return session.stats; },
  };
}
export function assessClassObject(question, response) { return assessChallenge(question, response); }

/* Structured API (new). */
export { generateChallenge, createPracticeSession, MODE_IDS };
