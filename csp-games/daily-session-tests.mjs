import assert from "node:assert/strict";
import { createSessionTracker, sessionTracker, roundSummary, SESSION_KEY, accuracy } from "./session.js";

let clock = new Date(2026, 9, 21, 15, 0, 0);
const values = new Map();
const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
const create = () => createSessionTracker({ storage, now: () => new Date(clock), id: () => "fixed-session" });
let tracker = create();
tracker.student("Learner", "Period 2");
const p1 = tracker.begin("string-lab", "String Lab", "string-lab/predict", "Predict the Output", "predict", "Predict the Output");
tracker.submit(p1, true);
const p2 = tracker.begin("string-lab", "String Lab", "string-lab/index", "Find the Index", "index", "Find the Index");
tracker.submit(p2, false);
assert.equal(tracker.snapshot().games["string-lab"].attempted, 2);
assert.equal(tracker.snapshot().games["string-lab"].topics["string-lab/predict"].firstTry, 1);
assert.equal(tracker.snapshot().games["string-lab"].topics["string-lab/index"].firstTry, 0);
assert.equal(tracker.snapshot().games["string-lab"].modes.predict.firstTry, 1);
assert.equal(accuracy(tracker.snapshot().games["string-lab"].modes.index), 0);

// Same-day reload preserves active session and a pending challenge.
const pending = tracker.begin("string-lab", "String Lab", "string-lab/trace", "Trace", "trace", "Trace");
tracker = create();
assert.equal(tracker.status(pending), "active");
assert.equal(tracker.snapshot().games["string-lab"].attempted, 2);

// A displayed pre-midnight challenge cannot add results to the following day.
clock = new Date(2026, 9, 22, 0, 1, 0);
assert.equal(tracker.submit(pending, true).accepted, false);
assert.equal(tracker.snapshot().totals.attempted, 0);
assert.equal(tracker.snapshot().sessionDate, "2026-10-22");
assert.equal(tracker.snapshot().student.name, "Learner");
assert.equal(tracker.snapshot().student.period, "Period 2");
assert.equal(tracker.snapshot().records[pending], undefined);

// Local calendar date, not a rolling 24-hour interval, controls the reset.
clock = new Date(2026, 9, 22, 23, 59, 59);
const sameDate = tracker.begin("boolean", "Boolean", "boolean/truthTable", "Truth Table Builder", "truthTable", "Truth Table Builder");
tracker.submit(sameDate, false);
tracker = create();
assert.equal(tracker.snapshot().totals.attempted, 1);
clock = new Date(2026, 9, 23, 0, 0, 1);
tracker.ensureCurrentDay();
assert.equal(tracker.snapshot().totals.attempted, 0);
assert.equal(tracker.snapshot().sessionDate, "2026-10-23");
assert.equal(values.has(SESSION_KEY), true);

// Legacy same-day records without per-mode buckets retain their totals on migration.
const legacyTracker = create();
const legacyChallenge = legacyTracker.begin("legacy", "Legacy Game", "legacy/topic", "Legacy Topic");
legacyTracker.submit(legacyChallenge, true);
const legacy = legacyTracker.snapshot();
delete legacy.sessionDate;
delete legacy.games.legacy.modes;
values.set(SESSION_KEY, JSON.stringify(legacy));
const migrated = create().snapshot();
assert.equal(migrated.totals.firstTry, 1);
assert.equal(migrated.games.legacy.firstTry, 1);
assert.deepEqual(migrated.games.legacy.modes, {});
assert.equal(migrated.sessionDate, "2026-10-23");

// Selected-mode and mixed lines read the same underlying attempt records.
globalThis.localStorage = storage;
const scoped = sessionTracker();
let a = scoped.begin("mode-check", "Mode Check", "topic/predict", "Some topic", "predict", "Predict the Output");
scoped.submit(a, true);
a = scoped.begin("mode-check", "Mode Check", "topic/index", "Some topic", "index", "Find the Index");
scoped.submit(a, false);
assert.match(roundSummary("mode-check", "predict"), /100% \(1\/1\)/);
assert.match(roundSummary("mode-check", "index"), /0% \(0\/1\)/);
assert.match(roundSummary("mode-check", "trace"), /— \(0\/0\) · No attempts yet/);
assert.match(roundSummary("mode-check", "mixed"), /50% \(1\/2\)/);
console.log("Session daily-boundary, legacy migration, and per-mode summary tests passed.");
