import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let clock = new Date(2026, 9, 21, 23, 59, 0).getTime();
const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const module = { exports: {} };
vm.runInNewContext(
  fs.readFileSync(new URL("../src/session.js", import.meta.url), "utf8"),
  { module, exports: module.exports, Date },
);
const { Tracker } = module.exports;
const create = () => new Tracker({ storage, now: () => clock });

let tracker = create();
tracker.beginChallenge({ id: "first", difficulty: "beginner" });
assert.equal(tracker.recordCheck(true), "first");
assert.equal(tracker.summary().firstAttemptCorrect, 1);

// Same-day reload preserves persisted results.
tracker = create();
assert.equal(tracker.summary().firstAttemptCorrect, 1);

// An overnight challenge cannot score on the next local calendar date.
tracker.beginChallenge({ id: "overnight", difficulty: "advanced" });
clock = new Date(2026, 9, 22, 0, 1, 0).getTime();
assert.equal(tracker.recordCheck(true), null);
assert.equal(tracker.summary().attempted, 0);
assert.equal(tracker.summary().firstAttemptCorrect, 0);

// The next day persists a fresh session, while same-day reload keeps that session.
tracker.beginChallenge({ id: "new-day", difficulty: "intermediate" });
assert.equal(tracker.recordCheck(false), "incorrect");
tracker = create();
assert.equal(tracker.summary().attempted, 1);
clock = new Date(2026, 9, 23, 0, 0, 1).getTime();
assert.equal(tracker.summary().attempted, 0);
assert.equal(tracker.summary().sessionDate, "2026-10-23");
console.log("Class Builder daily-session persistence and overnight challenge tests passed.");
