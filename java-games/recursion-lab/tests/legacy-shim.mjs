// Re-exports the engine with generateRecursion bound to the legacy generators only, so the ORIGINAL
// recursion-tests.mjs (from the base commit, unmodified) can run its legacy oracles at full volume.
export * from "../engine.js";
export { generateLegacyRecursion as generateRecursion } from "../engine.js";
