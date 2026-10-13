/* Pure challenge logic. Shared by the games and automated tests. */
export const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (a) => a[int(0, a.length - 1)];
export const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    let j = int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const binaryValue = (bits) => bits.reduce((s, b) => s * 2 + b, 0);
export function expression(depth = 2) {
  if (!depth)
    return {
      op: pick([">", "<", "≥", "≤", "=", "≠"]),
      v: pick(["x", "y"]),
      n: int(0, 12),
    };
  let op = pick(["AND", "OR", "NOT"]);
  return {
    op,
    a: expression(depth - 1),
    ...(op === "NOT" ? {} : { b: expression(depth - 1) }),
  };
}
export function evaluate(e, v) {
  if (e.op === "AND") return evaluate(e.a, v) && evaluate(e.b, v);
  if (e.op === "OR") return evaluate(e.a, v) || evaluate(e.b, v);
  if (e.op === "NOT") return !evaluate(e.a, v);
  const x = v[e.v],
    n = e.n;
  return {
    ">": x > n,
    "<": x < n,
    "≥": x >= n,
    "≤": x <= n,
    "=": x === n,
    "≠": x !== n,
  }[e.op];
}
export function formatExpression(e) {
  return e.op === "NOT"
    ? `NOT (${formatExpression(e.a)})`
    : e.a
      ? `(${formatExpression(e.a)}) ${e.op} (${formatExpression(e.b)})`
      : `${e.v} ${e.op} ${e.n}`;
}
export function explainExpression(e, v) {
  return e.a
    ? `${formatExpression(e)} → ${evaluate(e, v) ? "TRUE" : "FALSE"}\n${explainExpression(e.a, v)}${e.b ? "\n" + explainExpression(e.b, v) : ""}`
    : `${e.v}=${v[e.v]}: ${formatExpression(e)} → ${evaluate(e, v) ? "TRUE" : "FALSE"}`;
}
export function booleanChallenge() {
  for (let i = 0; i < 200; i++) {
    let e = expression(),
      solutions = [];
    for (let x = 0; x <= 12; x++)
      for (let y = 0; y <= 12; y++)
        if (evaluate(e, { x, y })) solutions.push({ x, y });
    if (solutions.length && solutions.length < 169)
      return { e, solutions, values: { x: int(0, 12), y: int(0, 12) } };
  }
  return {
    e: { op: ">", v: "x", n: 5 },
    solutions: Array.from({ length: 7 }, (_, i) => ({ x: i + 6, y: 0 })),
    values: { x: 0, y: 0 },
  };
}
export function applyOperation(list, o) {
  let a = [...list];
  if (o.type === "APPEND") a.push(o.value);
  else {
    if (
      !Number.isInteger(o.index) ||
      o.index < 1 ||
      o.index > (o.type === "INSERT" ? a.length + 1 : a.length)
    )
      throw Error("Index is outside the list. Indices start at 1.");
    if (o.type === "INSERT") a.splice(o.index - 1, 0, o.value);
    else if (o.type === "REMOVE") a.splice(o.index - 1, 1);
    else throw Error("Unknown operation");
  }
  return a;
}
export const runOperations = (a, ops) => ops.reduce(applyOperation, [...a]);
export const operationText = (o) =>
  `${o.type}(numbers, ${o.type === "APPEND" ? o.value : o.index + (o.type === "INSERT" ? ", " + o.value : "")})`;
export function listChallenge() {
  let start = Array.from({ length: int(4, 6) }, () => int(1, 9)),
    a = [...start],
    ops = [];
  for (let i = 0; i < 4; i++) {
    let type = pick(["APPEND", "INSERT", "REMOVE"]);
    if (a.length < 2) type = "APPEND";
    let o = {
      type,
      index: int(1, type === "INSERT" ? a.length + 1 : a.length),
      value: int(1, 9),
    };
    ops.push(o);
    a = applyOperation(a, o);
  }
  if (equal(a, start)) return listChallenge();
  return { start, ops, target: a };
}
export function searchChallenge(n = 15, presence = "mixed") {
  let values = [],
    v = int(1, 5);
  for (let i = 0; i < n; i++) {
    v += int(2, 5);
    values.push(v);
  }
  let present =
    presence === "present" || (presence === "mixed" && Math.random() < 0.65);
  return { values, target: present ? pick(values) : pick(values) + 1, present };
}
export const midpoint = (lo, hi) => Math.floor((lo + hi) / 2);
export function searchTrace(values, target) {
  let lo = 0,
    hi = values.length - 1,
    trace = [];
  while (lo <= hi) {
    let m = midpoint(lo, hi);
    trace.push(m);
    if (values[m] === target) return trace;
    if (values[m] < target) lo = m + 1;
    else hi = m - 1;
  }
  return trace;
}
export function connected(n, edges, s = 0, t = n - 1, blocked = new Set()) {
  let seen = new Set([s]),
    q = [s];
  for (let v of q)
    for (let i = 0; i < edges.length; i++) {
      if (blocked.has(i)) continue;
      let [a, b] = edges[i],
        w = a === v ? b : b === v ? a : -1;
      if (w >= 0 && !seen.has(w)) {
        seen.add(w);
        q.push(w);
      }
    }
  return seen.has(t);
}
export function networkChallenge() {
  const n = 8,
    edges = [];
  for (let i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
  for (let i = 0; i < 4; i++) {
    let a = int(0, n - 1),
      b = int(0, n - 1);
    if (a !== b && !edges.some((e) => e.includes(a) && e.includes(b)))
      edges.push([a, b]);
  }
  let broken = new Set();
  for (let i of shuffle(edges.map((_, i) => i)).slice(0, int(1, 3))) {
    broken.add(i);
    if (!connected(n, edges, 0, 4, broken)) broken.delete(i);
  }
  return { n, edges, broken, start: 0, end: 4 };
}
export function validRoute(g, route) {
  if (route[0] !== g.start || route.at(-1) !== g.end) return false;
  for (let i = 1; i < route.length; i++) {
    if (route[i] === route[i - 1]) return false;
    let k = g.edges.findIndex(
      (e) => e.includes(route[i]) && e.includes(route[i - 1]),
    );
    if (k < 0 || g.broken.has(k)) return false;
  }
  return true;
}
export function runs(a) {
  let out = [];
  for (let x of a) {
    if (out.length && out.at(-1).symbol === x) out.at(-1).count++;
    else out.push({ count: 1, symbol: x });
  }
  return out;
}
export const rleText = (a) =>
  runs(a)
    .map((r) => `${r.count}:${r.symbol}`)
    .join(" ");
export function decodeRLE(text, alphabet) {
  let out = [];
  for (let token of text.trim().split(/\s+/)) {
    let m = token.match(/^(\d+):([A-Z0-9])$/);
    if (!m || +m[1] < 1 || +m[1] > 255 || !alphabet.includes(m[2]))
      throw Error(
        "Use count:symbol tokens, with counts 1–255, separated by spaces.",
      );
    if (out.length + +m[1] > 256) throw Error("Encoding is too long.");
    out.push(...Array(+m[1]).fill(m[2]));
  }
  return out;
}
export function flattenGrid(grid, order) {
  return order === "columns"
    ? grid[0].flatMap((_, c) => grid.map((r) => r[c]))
    : grid.flat();
}
export function compressionChallenge(mode) {
  let image = mode === "image" || (mode === "optimize" && Math.random() < 0.5);
  if (image) {
    let grid = Array.from({ length: 6 }, () => Array(6).fill("0")),
      pattern = pick(["rows", "columns", "noise"]),
      colors = Array.from({ length: 6 }, () => int(0, 2));
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 6; c++)
        grid[r][c] = String(
          pattern === "rows"
            ? colors[r]
            : pattern === "columns"
              ? colors[c]
              : int(0, 2),
        );
    return { image, grid, alphabet: ["0", "1", "2"], raw: 36, unit: 2 };
  }
  let a = [];
  for (let i = 0, n = int(8, 14); i < n; i++)
    a.push(...Array(int(1, 5)).fill(pick(["A", "B", "C", "D"])));
  return { image, a, alphabet: ["A", "B", "C", "D"], raw: a.length, unit: 2 };
}
export function compressionOptions(c) {
  return c.image
    ? ["rows", "columns"].flatMap((order) => [
        { order, method: "raw", size: c.raw },
        {
          order,
          method: "rle",
          size: 1 + 2 * runs(flattenGrid(c.grid, order)).length,
        },
      ])
    : [
        { order: "rows", method: "raw", size: c.raw },
        { order: "rows", method: "rle", size: 2 * runs(c.a).length },
      ];
}
export function optimalSchedule(times, p) {
  let best = times.reduce((a, b) => a + b, 0),
    loads = Array(p).fill(0),
    assignment = [],
    bestAssignment = [];
  const sorted = times.map((t, i) => ({ t, i })).sort((a, b) => b.t - a.t);
  function visit(k) {
    if (k === sorted.length) {
      let m = Math.max(...loads);
      if (m < best) {
        best = m;
        bestAssignment = [...assignment];
      }
      return;
    }
    let seen = new Set();
    for (let i = 0; i < p; i++) {
      if (seen.has(loads[i]) || loads[i] + sorted[k].t >= best) continue;
      seen.add(loads[i]);
      loads[i] += sorted[k].t;
      assignment[sorted[k].i] = i;
      visit(k + 1);
      loads[i] -= sorted[k].t;
    }
  }
  visit(0);
  return { time: best, assignment: bestAssignment };
}
export function simulateSchedule(
  times,
  assignment,
  p,
  deps = times.map(() => []),
) {
  let available = Array(p).fill(0),
    ends = [],
    starts = [];
  for (let i = 0; i < times.length; i++) {
    starts[i] = Math.max(
      available[assignment[i]],
      ...deps[i].map((j) => ends[j]),
      0,
    );
    ends[i] = starts[i] + times[i];
    available[assignment[i]] = ends[i];
  }
  return { time: Math.max(...ends), starts, ends, loads: available };
}
export function optimalDependent(times, p, deps) {
  let best = Infinity,
    bestAssignment = [],
    a = [];
  function visit(k) {
    if (k === times.length) {
      let t = simulateSchedule(times, a, p, deps).time;
      if (t < best) {
        best = t;
        bestAssignment = [...a];
      }
      return;
    }
    for (let i = 0; i < p; i++) {
      a[k] = i;
      visit(k + 1);
    }
  }
  visit(0);
  return { time: best, assignment: bestAssignment };
}
export function dataChallenge() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Team ${String.fromCharCode(65 + i)}`,
    hours: int(1, 12),
    score: int(40, 100),
    group: pick(["Robotics", "Design", "Coding"]),
  }));
}
export function correlation(points) {
  let n = points.length,
    sx = 0,
    sy = 0,
    xx = 0,
    yy = 0,
    xy = 0;
  for (let [x, y] of points) {
    sx += x;
    sy += y;
    xx += x * x;
    yy += y * y;
    xy += x * y;
  }
  let den = Math.sqrt((n * xx - sx * sx) * (n * yy - sy * sy));
  return den ? (n * xy - sx * sy) / den : 0;
}
export function phishingChallenge() {
  let org = pick(["Harbor Library", "Cedar Club", "Orbit School"]),
    slug = org.toLowerCase().replaceAll(" ", "-"),
    bad = new Set(),
    sender = `office@${slug}.example`,
    link = `https://${slug}.example/events`,
    request = "Check the event schedule on our usual portal.",
    attachment = pick(["agenda.pdf", "schedule.txt"]),
    urgent = pick(["Please review today.", "Review when convenient."]);
  let kind = int(0, 5);
  if (kind === 0 || kind === 4) {
    sender = `office@${slug}-support.example`;
    bad.add("sender");
  }
  if (kind === 1 || kind === 4) {
    link = `https://verify-${slug}.example/login`;
    bad.add("link");
  }
  if (kind === 2 || kind === 4) {
    request =
      "Reply with your account password and your one-time sign-in code.";
    bad.add("request");
  }
  if (kind === 3 || kind === 4) {
    attachment = "schedule.pdf.exe";
    bad.add("attachment");
  }
  return { org, slug, sender, link, request, attachment, urgent, bad };
}
export function passwordRules(value, min, phrase = false) {
  return {
    length: value.length >= min,
    letters: phrase
      ? value.trim().split(/\s+/).length >= 4
      : /[a-z]/.test(value) && /[A-Z]/.test(value),
    number: phrase || /[0-9]/.test(value),
    symbol: phrase || /[^A-Za-z0-9\s]/.test(value),
  };
}
export function raceChallenge(mode = "mixed") {
  let kind = mode === "mixed" ? pick(["search", "duplicates", "sum"]) : mode,
    n = pick([15, 31, 63, 127]),
    position = int(0, n - 1);
  if (kind === "search") {
    let values = Array.from({ length: n }, (_, i) => i * 2 + 2),
      target = values[position];
    return {
      kind,
      n,
      target,
      values,
      steps: [position + 1, searchTrace(values, target).length],
      labels: ["Linear search", "Binary search"],
      explain:
        "Count one comparison per inspected value. Binary search requires sorted data and eliminates half of the remaining range each step.",
    };
  }
  if (kind === "duplicates") {
    return {
      kind,
      n,
      steps: [(n * (n - 1)) / 2, n],
      labels: ["Compare every pair", "Check a lookup set"],
      explain:
        "In this model, each pair comparison costs one step and each combined set check/insertion costs one step. With all distinct inputs, every pair must be checked; the lookup-set algorithm visits each item once.",
    };
  }
  return {
    kind,
    n,
    steps: [n, (n * (n + 1)) / 2],
    labels: ["One running total", "Recompute each prefix"],
    explain:
      "Both compute the same final sum. Count additions: a running total adds each item once; recomputing prefixes adds 1 + 2 + … + n items.",
  };
}
// Supplemental generators: answers derive from explicit representation/cleaning rules.
export function binaryExtension(mode, bits) {
  if (![4, 6, 8, 16].includes(bits)) throw Error("Unsupported bit width");
  const capacity = 2 ** bits,
    max = capacity - 1;
  if (mode === "overflow") {
    const overflow = pick([true, false]),
      a = overflow
        ? int(Math.floor(capacity / 2), max)
        : int(0, Math.floor(max / 2)),
      b = overflow
        ? int(
            capacity - a,
            Math.min(max, capacity - a + Math.floor(capacity / 3)),
          )
        : int(0, max - a);
    return {
      mode,
      bits,
      a,
      b,
      overflow: a + b > max,
      result: (a + b) % capacity,
      capacity,
      max,
    };
  }
  if (mode === "pixels") {
    const pixels = Array.from({ length: 9 }, () => int(0, max)),
      index = int(0, 8);
    return {
      mode,
      bits,
      pixels,
      index,
      target: pixels[index],
      size: pixels.length * bits,
      capacity,
      max,
    };
  }
  return { mode, bits, capacity, max };
}
export function cleaningChallenge() {
  const categories = ["robotics", "design", "coding"],
    complete = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      category: pick(categories),
      cm: int(20, 300),
    }));
  const rows = complete.map((d) => ({
    id: d.id,
    category: pick([
      d.category.toUpperCase(),
      " " + d.category + " ",
      d.category,
    ]),
    meters: (d.cm / 100).toFixed(2),
  }));
  const duplicate = pick(rows);
  rows.push({ ...duplicate });
  rows.push({ id: 5, category: pick(categories), meters: "" });
  return { rows: shuffle(rows), complete };
}
export function validateCleaning(c, submitted) {
  const kept = submitted.filter((r) => r.keep);
  if (
    kept.length !== c.complete.length ||
    new Set(kept.map((r) => r.id)).size !== kept.length
  )
    return false;
  return c.complete.every((expected) =>
    kept.some(
      (r) =>
        r.id === expected.id &&
        r.category === expected.category &&
        String(r.cm).trim() !== "" &&
        Number(r.cm) === expected.cm,
    ),
  );
}
