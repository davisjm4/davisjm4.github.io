/* CSP Games session schema v1. Local only: no network or student-data uploads. */
export const SESSION_KEY = "cspGames.session.v1";
const fields = [
  "generated",
  "attempted",
  "firstTry",
  "afterRetry",
  "submissions",
  "incorrect",
  "skipped",
  "revealed",
];
const empty = () => Object.fromEntries(fields.map((k) => [k, 0]));
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export function accuracy(m) {
  return m.attempted ? (100 * m.firstTry) / m.attempted : null;
}
export function createSessionTracker({
  storage,
  now = () => new Date().toISOString(),
  id = uid,
  onWarning = () => {},
} = {}) {
  let data,
    volatile = false,
    warning = "";
  function warn(message) {
    warning = message;
    onWarning(message);
  }
  function fresh(student = { name: "", period: "" }) {
    const time = now();
    return {
      schema: 1,
      id: id(),
      startedAt: time,
      lastActivityAt: time,
      student,
      totals: empty(),
      games: {},
      records: {},
    };
  }
  function valid(x) {
    const metrics = (m) =>
      m &&
      fields.every((k) => Number.isSafeInteger(m[k]) && m[k] >= 0) &&
      m.attempted <= m.generated &&
      m.firstTry + m.afterRetry <= m.attempted &&
      m.submissions >= m.attempted &&
      m.submissions === m.incorrect + m.firstTry + m.afterRetry &&
      m.firstTry + m.afterRetry + m.skipped + m.revealed <= m.generated;
    return (
      x &&
      x.schema === 1 &&
      typeof x.id === "string" &&
      Number.isFinite(Date.parse(x.startedAt)) &&
      Number.isFinite(Date.parse(x.lastActivityAt)) &&
      x.student &&
      typeof x.student.name === "string" &&
      typeof x.student.period === "string" &&
      x.games &&
      typeof x.games === "object" &&
      !Array.isArray(x.games) &&
      x.records &&
      typeof x.records === "object" &&
      !Array.isArray(x.records) &&
      metrics(x.totals) &&
      fields.every(
        (k) => Number.isSafeInteger(x.totals?.[k]) && x.totals[k] >= 0,
      ) &&
      Object.values(x.games).every(
        (g) =>
          g &&
          typeof g.title === "string" &&
          g.topics &&
          !Array.isArray(g.topics) &&
          metrics(g) &&
          fields.every((k) => Number.isSafeInteger(g[k]) && g[k] >= 0) &&
          Object.values(g.topics).every(
            (t) =>
              t &&
              typeof t.title === "string" &&
              metrics(t) &&
              fields.every((k) => Number.isSafeInteger(t[k]) && t[k] >= 0),
          ),
      ) &&
      fields.every(
        (k) =>
          Object.values(x.games).reduce((sum, g) => sum + g[k], 0) ===
          x.totals[k],
      ) &&
      Object.values(x.games).every((g) =>
        fields.every(
          (k) =>
            Object.values(g.topics).reduce((sum, t) => sum + t[k], 0) === g[k],
        ),
      ) &&
      Object.values(x.records).every(
        (r) =>
          r &&
          ["active", "solved", "revealed", "skipped"].includes(r.status) &&
          typeof r.game === "string" &&
          typeof r.topic === "string" &&
          Number.isSafeInteger(r.submissions) &&
          r.submissions >= 0 &&
          x.games[r.game]?.topics[r.topic],
      )
    );
  }
  function read() {
    if (volatile) return;
    let saved;
    try {
      saved = storage?.getItem(SESSION_KEY);
    } catch {
      if (!data) data = fresh();
      volatile = true;
      warn(
        "Local storage is unavailable. This temporary session may disappear when this page closes or you change games.",
      );
      return;
    }
    if (!saved) {
      if (!data) data = fresh();
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch {}
    if (!valid(parsed)) {
      data = fresh();
      warn(
        "Saved session data was corrupted or used an unsupported older version. A new session has been started.",
      );
      save();
    } else data = parsed;
  }
  function save() {
    if (volatile) return;
    try {
      if (!storage) throw Error("Storage unavailable");
      storage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {
      volatile = true;
      warn(
        "Local storage is unavailable. This temporary session may disappear when this page closes or you change games.",
      );
    }
  }
  function bucket(game, title, topic, topicTitle) {
    if (!data.games[game]) data.games[game] = { title, ...empty(), topics: {} };
    const g = data.games[game];
    if (!g.topics[topic]) g.topics[topic] = { title: topicTitle, ...empty() };
    return [data.totals, g, g.topics[topic]];
  }
  function add(r, key) {
    for (let b of bucket(r.game, r.gameTitle, r.topic, r.topicTitle)) b[key]++;
  }
  function activity() {
    data.lastActivityAt = now();
    save();
  }
  function begin(game, title, topic, topicTitle = topic) {
    read();
    const record = {
      id: id(),
      game,
      gameTitle: title,
      topic,
      topicTitle,
      submissions: 0,
      status: "active",
      createdAt: now(),
    };
    data.records[record.id] = record;
    add(record, "generated");
    const keys = Object.keys(data.records);
    while (keys.length > 256) {
      const old = keys.shift(),
        r = data.records[old];
      if (r.status === "active") {
        r.status = "skipped";
        add(r, "skipped");
      }
      delete data.records[old];
    }
    activity();
    return record.id;
  }
  function submit(instance, correct) {
    read();
    const r = data.records[instance];
    if (!r || r.status !== "active")
      return { accepted: false, status: r?.status || "expired" };
    if (r.submissions === 0) add(r, "attempted");
    r.submissions++;
    add(r, "submissions");
    if (correct) {
      r.status = "solved";
      add(r, r.submissions === 1 ? "firstTry" : "afterRetry");
    } else add(r, "incorrect");
    activity();
    return {
      accepted: true,
      status: r.status,
      firstTry: correct && r.submissions === 1,
      submissions: r.submissions,
    };
  }
  function close(instance, status) {
    read();
    const r = data.records[instance];
    if (!r || r.status !== "active") return false;
    r.status = status;
    add(r, status);
    activity();
    return true;
  }
  function snapshot() {
    read();
    return JSON.parse(JSON.stringify(data));
  }
  function student(name, period) {
    read();
    data.student = {
      name: String(name).slice(0, 100),
      period: String(period).slice(0, 40),
    };
    activity();
  }
  function reset(confirmed) {
    if (!confirmed) return false;
    read();
    data = fresh({ ...data.student });
    save();
    return true;
  }
  function status(instance) {
    read();
    return data.records[instance]?.status || "expired";
  }
  read();
  save();
  return {
    begin,
    submit,
    reveal: (instance) => close(instance, "revealed"),
    skip: (instance) => close(instance, "skipped"),
    snapshot,
    student,
    reset,
    status,
    get warning() {
      return warning;
    },
    get temporary() {
      return volatile;
    },
  };
}
let singleton;
export function sessionTracker() {
  if (!singleton) {
    let storage;
    try {
      storage = globalThis.localStorage;
    } catch {}
    singleton = createSessionTracker({
      storage,
      onWarning: showStorageWarning,
    });
  }
  return singleton;
}
export function showStorageWarning(message) {
  if (typeof document === "undefined") return;
  let box = document.getElementById("session-storage-warning");
  if (!box) {
    box = document.createElement("p");
    box.id = "session-storage-warning";
    box.className = "feedback";
    box.setAttribute("role", "status");
    (document.querySelector("main") || document.body).prepend(box);
  }
  box.textContent = message;
}
export function addSessionNavigation(home = "../") {
  if (typeof document === "undefined") return;
  const header =
    document.querySelector("header") || document.querySelector("nav");
  if (header && !header.querySelector("[data-session-link]")) {
    const a = document.createElement("a");
    a.href = home + "session-summary/";
    a.textContent = "Session Summary";
    a.dataset.sessionLink = "true";
    header.appendChild(a);
  }
  const t = sessionTracker();
  if (t.warning) showStorageWarning(t.warning);
}
export function roundSummary(game) {
  const m = sessionTracker().snapshot().games[game];
  if (!m)
    return "No answers submitted yet. Open Session Summary to view this browser’s results.";
  return `First-try accuracy: ${accuracy(m) === null ? "N/A" : Math.round(accuracy(m)) + "%"} (${m.firstTry}/${m.attempted}) · Solved after retry: ${m.afterRetry} · Revealed: ${m.revealed} · Submissions: ${m.submissions}`;
}
