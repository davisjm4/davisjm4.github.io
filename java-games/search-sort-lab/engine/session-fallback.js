/* Minimal in-memory stand-in for java-games/session.js, used ONLY when ../session.js cannot be loaded
   (running the lab outside the repository). Same method names as the shared tracker. Nothing is persisted. */
export function createFallbackTracker() {
  const records = {};
  let n = 0;
  const totals = () => Object.values(records).reduce((t, r) => { t.generated++; if (r.submissions) t.attempted++; if (r.status === "solved" && r.submissions === 1) t.firstTry++; t.submissions += r.submissions; if (r.status === "revealed") t.revealed++; if (r.status === "skipped") t.skipped++; return t; }, { generated: 0, attempted: 0, firstTry: 0, submissions: 0, revealed: 0, skipped: 0 });
  return {
    fallback: true,
    begin(game, title, topic, topicTitle) { const id = "f" + ++n; records[id] = { id, game, topic, topicTitle, submissions: 0, status: "active" }; return id; },
    submit(id, correct) { const r = records[id]; if (!r || r.status !== "active") return { accepted: false, status: r?.status || "expired" }; r.submissions++; if (correct) r.status = "solved"; return { accepted: true, status: r.status, firstTry: correct && r.submissions === 1, submissions: r.submissions }; },
    reveal(id) { const r = records[id]; if (!r || r.status !== "active") return false; r.status = "revealed"; return true; },
    skip(id) { const r = records[id]; if (!r || r.status !== "active") return false; r.status = "skipped"; return true; },
    interact(id) { return records[id]?.status === "active"; },
    status(id) { return records[id]?.status || "expired"; },
    annotate(id, d) { if (records[id]) records[id].details = { ...(records[id].details || {}), ...d }; return !!records[id]; },
    snapshot() { return { schema: 1, totals: totals(), records: JSON.parse(JSON.stringify(records)) }; },
    reset() { for (const k of Object.keys(records)) delete records[k]; return true; },
  };
}
export const fallbackNavigation = () => {};
export const fallbackRoundSummary = (t) => { const s = t.snapshot().totals; return `Attempted: ${s.attempted} · First-try correct: ${s.firstTry}`; };
