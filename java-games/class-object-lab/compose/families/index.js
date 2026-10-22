/* Registry of semantic families per conventional mode. */
import objects from "./objects.js";
import state from "./state.js";
import methods from "./methods.js";
import reverse from "./reverse.js";
const parts = [objects, state, methods, reverse];
export const FAMILIES = {};
for (const p of parts) for (const [mode, fams] of Object.entries(p)) (FAMILIES[mode] ||= []).push(...fams);
