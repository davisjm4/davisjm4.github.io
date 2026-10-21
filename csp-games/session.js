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
const localDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
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
      sessionDate: localDate(time),
      id: id(),
      startedAt: time,
      lastActivityAt: time,
      activeSeconds: 0,
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
          ) &&
          (!g.modes || (typeof g.modes === "object" && !Array.isArray(g.modes) &&
            Object.values(g.modes).every((m) => m && typeof m.title === "string" && metrics(m) && fields.every((k) => Number.isSafeInteger(m[k]) && m[k] >= 0)) &&
            fields.every((k) => Object.values(g.modes).reduce((sum, m) => sum + m[k], 0) <= g[k]))),
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
          (r.mode === undefined || r.mode === null || typeof r.mode === "string") &&
          Number.isSafeInteger(r.submissions) &&
          r.submissions >= 0 &&
          x.games[r.game]?.topics[r.topic],
      )
    );
  }
  function read() {
    if (volatile) {
      if (data && data.sessionDate !== localDate(now())) data = fresh({ ...data.student });
      return;
    }
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
      else if (data.sessionDate !== localDate(now())) { data = fresh({ ...data.student }); save(); }
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
    } else {
      const oldDate = parsed.sessionDate || localDate(parsed.startedAt);
      if (oldDate !== localDate(now())) {
        // The previous local-day session is no longer active. Keep optional identity,
        // while dropping only the active performance record as intended.
        data = fresh({ ...parsed.student });
        save();
      } else {
        data = parsed;
        let migratedModes = false;
        for (const g of Object.values(data.games)) if (!g.modes) { g.modes = {}; migratedModes = true; }
        if (migratedModes) save();
        if (!data.sessionDate) { data.sessionDate = oldDate; save(); }
      }
      if (!Number.isSafeInteger(data.activeSeconds) || data.activeSeconds < 0) {
        data.activeSeconds = 0;
        save();
      }
    }
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
    if (!data.games[game]) data.games[game] = { title, ...empty(), topics: {}, modes: {} };
    const g = data.games[game];
    if (!g.modes) g.modes = {};
    if (!g.topics[topic]) g.topics[topic] = { title: topicTitle, ...empty() };
    return [data.totals, g, g.topics[topic]];
  }
  function add(r, key) {
    const [, gameBucket] = bucket(r.game, r.gameTitle, r.topic, r.topicTitle);
    for (let b of [data.totals, gameBucket, gameBucket.topics[r.topic]]) b[key]++;
    if (r.mode) {
      if (!gameBucket.modes[r.mode]) gameBucket.modes[r.mode] = { title: r.modeTitle || r.mode, ...empty() };
      gameBucket.modes[r.mode][key]++;
    }
  }
  function activity() {
    data.lastActivityAt = now();
    save();
  }
  function begin(game, title, topic, topicTitle = topic, mode = null, modeTitle = mode) {
    read();
    const record = {
      id: id(),
      game,
      gameTitle: title,
      topic,
      topicTitle,
      mode,
      modeTitle,
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
  function addActiveSeconds(seconds) {
    read();
    const amount = Math.max(0, Math.min(60, Math.floor(Number(seconds) || 0)));
    if (amount) {
      data.activeSeconds = (data.activeSeconds || 0) + amount;
      save();
    }
    return data.activeSeconds || 0;
  }
  function snapshot() {
    read();
    return JSON.parse(JSON.stringify(data));
  }
  function annotate(instance, details) {
    read();
    const record = data.records[instance];
    if (!record || !details || typeof details !== "object") return false;
    record.details = { ...(record.details || {}), ...details };
    activity();
    return true;
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
  function closeIncorrect(instance) {
    read();
    const r = data.records[instance];
    if (!r || r.status !== "active" || r.submissions < 1) return false;
    r.status = "solved";
    activity();
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
    interact: (instance) => {
      read();
      if (data.records[instance]?.status !== "active") return false;
      activity();
      return true;
    },
    reveal: (instance) => close(instance, "revealed"),
    skip: (instance) => close(instance, "skipped"),
    snapshot,
    ensureCurrentDay: () => { read(); return data.sessionDate; },
    student,
    reset,
    status,
    annotate,
    closeIncorrect,
    addActiveSeconds,
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
const ACTIVE_IDLE_MS = 2 * 60 * 1000,
  ACTIVE_TICK_MS = 10 * 1000,
  ACTIVE_LEASE_MS = 25 * 1000;
let activeController;
export function startActivePractice() {
  if (typeof document === "undefined" || typeof window === "undefined" || activeController) return;
  const tracker = sessionTracker(),
    tabId = uid(),
    leaseKey = SESSION_KEY + ".activeLease";
  let lastInteraction = Date.now(),
    lastTick = lastInteraction,
    timer;
  const readLease = () => {
    try { return JSON.parse(globalThis.localStorage?.getItem(leaseKey) || "null"); }
    catch { return null; }
  };
  const release = () => {
    try { if (readLease()?.owner === tabId) globalThis.localStorage.removeItem(leaseKey); } catch {}
  };
  const claim = () => {
    try {
      const now = Date.now(), current = readLease();
      if (current && current.owner !== tabId && current.until > now) return false;
      globalThis.localStorage.setItem(leaseKey, JSON.stringify({ owner: tabId, until: now + ACTIVE_LEASE_MS }));
      return true;
    } catch { return true; }
  };
  const tick = () => {
    const now = Date.now();
    if (document.visibilityState === "hidden" || now - lastInteraction > ACTIVE_IDLE_MS) {
      lastTick = now;
      release();
      return;
    }
    const elapsed = Math.min(15 * 1000, Math.max(0, now - lastTick));
    if (elapsed >= 1000 && claim()) tracker.addActiveSeconds(Math.floor(elapsed / 1000));
    lastTick = now;
  };
  const signal = () => { if (document.visibilityState !== "hidden") lastInteraction = Date.now(); };
  const visible = () => { lastInteraction = Date.now(); lastTick = lastInteraction; };
  const checkDay = () => tracker.ensureCurrentDay();
  const checkDayOnVisible = () => { if (document.visibilityState === "visible") checkDay(); };
  const tickVisibility = () => { if (document.visibilityState === "hidden") tick(); else visible(); };
  const stop = () => {
    tick();
    release();
    clearInterval(timer);
    for (const event of ["pointerdown", "keydown", "input", "touchstart", "scroll"]) document.removeEventListener(event, signal);
    document.removeEventListener("visibilitychange", tickVisibility);
    document.removeEventListener("visibilitychange", checkDayOnVisible);
    window.removeEventListener("pageshow", visible);
    window.removeEventListener("pageshow", checkDay);
    window.removeEventListener("pagehide", stop);
    window.removeEventListener("beforeunload", stop);
    activeController = null;
  };
  for (const event of ["pointerdown", "keydown", "input", "touchstart", "scroll"]) document.addEventListener(event, signal, { passive: true });
  document.addEventListener("visibilitychange", tickVisibility);
  window.addEventListener("pageshow", visible);
  window.addEventListener("pageshow", checkDay);
  document.addEventListener("visibilitychange", checkDayOnVisible);
  window.addEventListener("pagehide", stop);
  window.addEventListener("beforeunload", stop);
  timer = setInterval(tick, ACTIVE_TICK_MS);
  activeController = { stop };
  tick();
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
  startActivePractice();
}
export function roundSummary(game, mode = "mixed") {
  const g = sessionTracker().snapshot().games[game];
  const m = mode && mode !== "mixed" ? g?.modes?.[mode] : g;
  const stats = m || empty();
  const pct = accuracy(stats);
  return `First-try accuracy: ${pct === null ? "—" : Math.round(pct) + "%"} (${stats.firstTry}/${stats.attempted})${stats.attempted ? "" : " · No attempts yet"} · Solved after retry: ${stats.afterRetry} · Revealed: ${stats.revealed} · Submissions: ${stats.submissions}`;
}
