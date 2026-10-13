import assert from "node:assert/strict";
import { createSessionTracker, accuracy, SESSION_KEY } from "./session.js";
let checks = 0;
const eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  },
  ok = (x) => {
    assert.ok(x);
    checks++;
  };
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) || null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};
let counter = 0;
const create = (storage) =>
  createSessionTracker({
    storage,
    id: () => String(++counter),
    now: () => new Date(1700000000000 + counter * 1000).toISOString(),
  });
let store = memory(),
  t = create(store);
eq(accuracy(t.snapshot().totals), null);
let c = t.begin("game", "Game", "topic", "Topic");
eq(t.snapshot().totals.generated, 1);
eq(t.snapshot().totals.attempted, 0);
t.submit(c, false);
t.submit(c, false);
t.submit(c, true);
let m = t.snapshot().totals;
eq(m, {
  generated: 1,
  attempted: 1,
  firstTry: 0,
  afterRetry: 1,
  submissions: 3,
  incorrect: 2,
  skipped: 0,
  revealed: 0,
});
eq(accuracy(m), 0);
ok(!t.submit(c, true).accepted);
ok(!t.reveal(c));
eq(t.snapshot().totals, m);
let r = t.begin("game", "Game", "other", "Other");
t.reveal(r);
eq(t.snapshot().totals.attempted, 1);
ok(!t.submit(r, true).accepted);
eq(t.snapshot().totals.revealed, 1);
let u = t.begin("second", "Second game", "first", "First");
t.submit(u, true);
eq(accuracy(t.snapshot().totals), 50);
eq(t.snapshot().games.second.firstTry, 1);
eq(t.snapshot().games.game.topics.topic.submissions, 3);
eq(t.snapshot().games.game.topics.other.revealed, 1);
let retry = t.begin("second", "Second game", "first", "First");
t.submit(retry, false);
t.reveal(retry);
ok(!t.submit(retry, true).accepted);
eq(t.snapshot().totals.afterRetry, 1);
let skip = t.begin("third", "Third game", "practice", "Practice");
ok(t.skip(skip));
ok(!t.skip(skip));
eq(t.snapshot().totals.skipped, 1);
t.student("<script>alert(1)</script>", "P4");
let saved = t.snapshot(),
  fresh = create(store);
eq(fresh.snapshot(), saved);
let next = fresh.begin("new", "New game", "new-topic", "New topic");
fresh.submit(next, true);
eq(create(store).snapshot().totals.firstTry, 2);
eq(create(store).snapshot().student.name, "<script>alert(1)</script>");
let before = fresh.snapshot();
eq(fresh.reset(false), false);
eq(fresh.snapshot(), before);
ok(fresh.reset(true));
let reset = fresh.snapshot();
ok(reset.id !== before.id);
ok(reset.startedAt !== before.startedAt);
eq(reset.student, before.student);
eq(reset.totals, {
  generated: 0,
  attempted: 0,
  firstTry: 0,
  afterRetry: 0,
  submissions: 0,
  incorrect: 0,
  skipped: 0,
  revealed: 0,
});
eq(reset.games, {});
eq(accuracy(reset.totals), null);
ok(!t.submit(u, true).accepted); // old tab cannot score into a reset session.
for (let bad of [
  "{oops",
  '{"schema":0}',
  '{"schema":1,"id":"bad"}',
  JSON.stringify({ ...reset, totals: { ...reset.totals, firstTry: -1 } }),
]) {
  let s = memory();
  s.setItem(SESSION_KEY, bad);
  let repaired = create(s);
  ok(repaired.warning.includes("corrupted"));
  eq(accuracy(repaired.snapshot().totals), null);
}
let inaccessible = createSessionTracker({
  storage: {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  },
});
ok(inaccessible.temporary);
ok(inaccessible.warning.includes("temporary"));
let v = inaccessible.begin("g", "G", "t", "T");
inaccessible.submit(v, true);
eq(inaccessible.snapshot().totals.firstTry, 1);
let quota = createSessionTracker({
  storage: {
    getItem() {
      return null;
    },
    setItem() {
      throw Error("quota");
    },
  },
});
ok(quota.temporary);
let large = create(memory());
for (let i = 0; i < 5000; i++) {
  let id = large.begin("long", "Long session", "same", "Same");
  large.submit(id, i % 2 === 0);
  large.skip(id);
}
let long = large.snapshot();
eq(long.totals.generated, 5000);
eq(long.totals.attempted, 5000);
eq(long.totals.firstTry, 2500);
eq(long.totals.skipped, 2500);
ok(Object.keys(long.records).length <= 256);
ok(JSON.stringify(long).length < 120000);
for (let game of Object.values(long.games)) {
  for (let f of [
    "generated",
    "attempted",
    "firstTry",
    "afterRetry",
    "submissions",
    "incorrect",
    "skipped",
    "revealed",
  ])
    eq(
      game[f],
      Object.values(game.topics).reduce((sum, t) => sum + t[f], 0),
    );
}
console.log(
  `PASS: ${checks} shared-session assertions: deduplication, first-try formula, retries, reveal/skip exclusion, cross-page persistence, reset, corrupt/older data, unavailable storage, and bounded 5,000-round history.`,
);
