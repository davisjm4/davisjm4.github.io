// Replays the UI's generator call sequence (seeded by a pinned Date.now) and prints the expected answers.
import { createRecursionGenerator } from "../engine.js";
const [seed, plan] = [Number(process.argv[2]), JSON.parse(process.argv[3])];
const g = createRecursionGenerator(seed);
console.log(JSON.stringify(plan.map(([m, d]) => { const q = g.next(m, d); return { mode: q.mode, difficulty: q.difficulty, answer: q.answer, family: q.family, displayFamily: q.displayFamily || q.family, generator: q.generator, hasFeedback: !!q.choiceFeedback, diverges: !!q.diverges }; })));
