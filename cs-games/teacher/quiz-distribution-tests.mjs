import assert from "node:assert/strict";
import { distributePairs } from "./quiz-distribution.js";

const pairs = [
  ...["decision", "nextstep", "order", "find"].map(modeId => ({ sourceId: "workplace-readiness", modeId })),
  ...["identify", "missing", "rearrange"].map(modeId => ({ sourceId: "raceces", modeId })),
  ...["branch", "conditions", "equivalent", "short", "construct"].map(modeId => ({ sourceId: "boolean", modeId }))
];
for (const count of [3, 6, 10, 20, 50]) {
  const distribution = distributePairs(pairs, count, 4817);
  assert.equal(distribution.length, count);
  const counts = Object.fromEntries(["workplace-readiness", "raceces", "boolean"].map(source => [source, distribution.filter(x => x.sourceId === source).length]));
  assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1, `${count} questions should balance sources: ${JSON.stringify(counts)}`);
  assert.deepEqual(distribution, distributePairs(pairs, count, 4817), "seeded distribution should be deterministic");
}
const single = distributePairs(pairs.filter(x => x.sourceId === "workplace-readiness"), 12, 7);
assert.equal(new Set(single.map(x => x.modeId)).size, 4, "one source should rotate through its selected modes");
console.log("Quiz source distribution: balanced and deterministic at 3, 6, 10, 20 and 50 items; a single source rotates through its selected modes.");
