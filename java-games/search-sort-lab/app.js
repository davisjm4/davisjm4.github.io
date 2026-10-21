/* Search & Sort Lab — interface. All question logic lives in engine/ (no DOM there).
   Scoring follows CS Games: ONE submitted answer = ONE scored attempt; a wrong answer is revealed
   immediately and recorded as incorrect + revealed; stepping through the displayed trace is not scored. */
import { nextChallenge, createHistory, assess, GAME_ID, MODES, MODE_IDS, exactKey } from "./engine/generator.js";
import { DIFFICULTY_LABELS } from "./engine/difficulty.js";
import { makeRng } from "./engine/rng.js";

let sessionApi;
try {
  sessionApi = await import("../session.js?v=per-mode-daily-v1");
} catch {
  const f = await import("./engine/session-fallback.js");
  let t;
  sessionApi = { sessionTracker: () => (t = t || f.createFallbackTracker()), addSessionNavigation: f.fallbackNavigation, roundSummary: () => f.fallbackRoundSummary(t) };
}
const tracker = sessionApi.sessionTracker();

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const KEYWORDS = new Set(["int", "boolean", "for", "if", "else", "new", "return", "public", "static", "void", "while", "break", "true", "false", "class"]);
const TYPES = new Set(["Arrays", "String", "System", "java"]);
function highlight(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b\d+\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let out = "", m;
  while ((m = re.exec(src))) {
    const [t, com, str, num, word] = m;
    out += com ? `<span class="tk-com">${esc(com)}</span>` : str ? `<span class="tk-str">${esc(str)}</span>` : num ? `<span class="tk-num">${num}</span>` : word ? (KEYWORDS.has(word) ? `<span class="tk-kw">${word}</span>` : TYPES.has(word) ? `<span class="tk-type">${word}</span>` : esc(word)) : esc(t);
  }
  return out;
}

/* ----------------------- state ----------------------- */
let ch = null, instance = null, locked = true, selection = null, rng = Math.random;
let history = createHistory();
let local = []; // this page's attempts: {mode, difficulty, skill, algorithm, correct}
const ROLE_TEXT = { low: "low", mid: "mid", high: "high", out: "ruled out", min: "min", compare: "compare", sorted: "sorted", key: "key", shift: "shifted", gap: "gap" };
const ROLE_ORDER = ["mid", "low", "high", "key", "min", "compare", "shift", "gap", "sorted", "out"];

/* ----------------------- rendering helpers ----------------------- */
function strip(values, { roles = {}, indices = true, small = false } = {}) {
  if (!values.length) return `<div class="ssl-strip"><em class="ssl-legend">empty</em></div>`;
  const cells = values.map((v, i) => {
    const rs = (roles[i] || []).slice().sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
    const cls = rs.map((r) => "r-" + r).join(" ");
    const tag = rs.filter((r) => r !== "out" || rs.length === 1).map((r) => ROLE_TEXT[r]).join(" · ");
    return `<div class="ssl-slot ${cls}"><div class="ssl-cell">${esc(v)}</div>${indices ? `<div class="ssl-idx">${i}</div>` : ""}<div class="ssl-tag">${esc(tag)}</div></div>`;
  });
  return `<div class="ssl-strip" role="group" aria-label="${esc("Array: " + values.join(", "))}">${cells.join("")}</div>`;
}
const legendFor = (roles) => { const used = new Set(); Object.values(roles).forEach((a) => a.forEach((r) => used.add(r))); return used.size ? `<div class="ssl-legend">Labels under cells: ${[...used].map((r) => ROLE_TEXT[r]).join(", ")}.</div>` : ""; };
function visual(v) {
  if (v.type === "tree") return `<div><div class="ssl-vlabel">${esc(v.label || "")}</div><div class="ssl-tree">${v.rows.map((row, d) => `<div class="ssl-tree-row" aria-label="level ${d + 1}">${row.map((n) => `<span class="ssl-tree-node">${esc(n)}</span>`).join("")}</div>`).join("")}</div></div>`;
  return `<div><div class="ssl-vlabel">${esc(v.label || "")}</div>${strip(v.values, { roles: v.roles, indices: v.indices })}${legendFor(v.roles || {})}</div>`;
}
function choiceHtml(c) {
  if (c.kind === "array") return strip(c.value, { indices: false });
  if (c.kind === "code") return `<code>${highlight(c.value)}</code>`;
  if (c.kind === "trace") return `<pre>${c.value.map((a, i) => `Pass ${i + 1}: {${a.join(", ")}}`).join("\n")}</pre>`;
  if (c.kind === "lines") return `<pre>${esc(c.value.join("\n"))}</pre>`;
  return `<span>${esc(c.text)}</span>`;
}

/* ----------------------- challenge lifecycle ----------------------- */
function newChallenge() {
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  const mode = $("mode").value, difficulty = $("difficulty").value;
  ch = nextChallenge(mode, difficulty, rng, history);
  instance = tracker.begin(GAME_ID, "Search & Sort Lab", mode, MODES[mode].title, mode, MODES[mode].title);
  tracker.annotate?.(instance, { difficulty, skill: ch.skill, family: ch.family, seed: ch.seed });
  locked = false;
  selection = null;
  $("mode-label").textContent = MODES[mode].title;
  $("difficulty-chip").textContent = DIFFICULTY_LABELS[difficulty];
  $("skill-chip").textContent = ch.skill;
  $("question").textContent = ch.stem;
  $("rule").hidden = !ch.rule;
  $("rule").textContent = ch.rule || "";
  const d = ch.description;
  $("description").hidden = !d;
  $("description").textContent = d || "";
  $("code-wrap").hidden = !ch.code;
  $("code-label").textContent = ch.codeLabel || "Java";
  $("code").innerHTML = ch.code ? highlight(ch.code) : "";
  $("visuals").innerHTML = ch.visuals.map(visual).join("");
  $("choices").innerHTML = ch.choices.map((c, i) => `<button type="button" class="ssl-choice" role="radio" aria-checked="false" data-choice="${i}" tabindex="${i === 0 ? 0 : -1}"><span class="ssl-choice-body">${choiceHtml(c)}</span><span class="ssl-mark" aria-hidden="true"></span></button>`).join("");
  for (const b of $("choices").querySelectorAll("[data-choice]")) b.onclick = () => choose(Number(b.dataset.choice));
  $("feedback").hidden = true; $("feedback").className = "feedback ssl-feedback";
  $("reveal").hidden = true; $("reveal").innerHTML = "";
  $("submit").disabled = true; $("submit").hidden = false; $("skip").hidden = false; $("next").hidden = true;
  stats();
}
function choose(i) {
  if (locked) return;
  selection = i;
  for (const b of $("choices").querySelectorAll("[data-choice]")) {
    const on = Number(b.dataset.choice) === i;
    b.classList.toggle("selected", on); b.setAttribute("aria-checked", String(on)); b.setAttribute("tabindex", on ? "0" : "-1");
  }
  $("submit").disabled = false;
  tracker.interact?.(instance);
}
function submit() {
  if (locked || selection === null || tracker.status(instance) !== "active") return;
  const correct = assess(ch, selection);
  const res = tracker.submit(instance, correct);
  if (!res.accepted) return;           // one submitted answer = one scored attempt
  if (!correct) tracker.reveal(instance);
  locked = true;                       // no further scored guesses on this challenge
  local.push({ mode: ch.mode, difficulty: ch.difficulty, skill: ch.skill, algorithm: ch.algorithm, correct });
  finish(correct);
}
function finish(correct) {
  for (const b of $("choices").querySelectorAll("[data-choice]")) {
    const i = Number(b.dataset.choice);
    b.disabled = true;
    b.classList.remove("selected");
    const mark = b.querySelector(".ssl-mark");
    if (i === ch.answerIndex) { b.classList.add("is-correct"); mark.textContent = "✓ Correct"; }
    else if (i === selection) { b.classList.add("is-wrong"); mark.textContent = "✗ Your answer"; }
  }
  const why = !correct ? ch.choices[selection].why : "";
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback ssl-feedback ${correct ? "good" : "bad"}`;
  fb.innerHTML = `<strong>${correct ? "✓ Correct!" : "✗ Not quite."}</strong> ${correct ? "" : `The correct answer is <strong>${choiceHtml(ch.choices[ch.answerIndex])}</strong>. `}${ch.explanation.map(esc).join(" ")}${why ? `<span class="ssl-why">About your choice: ${esc(why)}</span>` : ""}`;
  const parts = [];
  for (const v of ch.reveal || []) parts.push(visual(v));
  if (ch.trace?.length) parts.push(`<details><summary>Full trace (review only, not scored)</summary><ol>${ch.trace.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></details>`);
  $("reveal").innerHTML = parts.join(""); $("reveal").hidden = !parts.length;
  $("submit").hidden = true; $("skip").hidden = true; $("next").hidden = false;
  // Focus the feedback region, not Next: Enter must not activate the newly shown button.
  fb.focus({ preventScroll: true });
  stats(); if (!$("summary").hidden) renderSummary();
}
const pct = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "—");
function stats() {
  const n = local.length, c = local.filter((x) => x.correct).length;
  $("stats").textContent = n ? `This session: ${c} of ${n} correct (${pct(c, n)}).` : "No answers submitted yet.";
}
function group(key) {
  const m = new Map();
  for (const a of local) { const k = a[key]; const g = m.get(k) || { n: 0, c: 0 }; g.n++; if (a.correct) g.c++; m.set(k, g); }
  return [...m.entries()];
}
function renderSummary() {
  const n = local.length, c = local.filter((x) => x.correct).length;
  if (!n) { $("summary-body").innerHTML = "<p>No answers yet. Submit an answer and your results will appear here.</p>"; return; }
  const table = (title, rows, label) => `<h3>${title}</h3><table><thead><tr><th>${label}</th><th>Attempts</th><th>Correct</th><th>Accuracy</th></tr></thead><tbody>${rows.map(([k, g]) => `<tr><td>${esc(label === "Practice mode" ? MODES[k].title : label === "Difficulty" ? DIFFICULTY_LABELS[k] : k)}</td><td>${g.n}</td><td>${g.c}</td><td>${pct(g.c, g.n)}</td></tr>`).join("")}</tbody></table>`;
  const needs = group("skill").filter(([, g]) => g.n >= 2 && g.c / g.n < 0.7).map(([k]) => k);
  $("summary-body").innerHTML = `<p><strong>Total attempts:</strong> ${n} · <strong>Correct:</strong> ${c} · <strong>Incorrect:</strong> ${n - c} · <strong>Accuracy:</strong> ${pct(c, n)}</p>` +
    table("By practice mode", group("mode"), "Practice mode") + table("By difficulty", group("difficulty"), "Difficulty") + table("By skill", group("skill"), "Skill") +
    (needs.length ? `<p class="ssl-need">Needs more practice: ${needs.map(esc).join("; ")}.</p>` : "<p>Keep going: no skill is below 70% with at least 2 attempts yet.</p>");
}

/* ----------------------- startup ----------------------- */
function init() {
  $("mode").innerHTML = MODE_IDS.map((m) => `<option value="${m}">${esc(MODES[m].title)}</option>`).join("");
  const p = new URLSearchParams(globalThis.location?.search || "");
  $("mode").value = MODE_IDS[0];
  $("difficulty").value = "intermediate";
  if (MODES[p.get("mode")]) $("mode").value = p.get("mode");
  if (["beginner", "intermediate", "advanced"].includes(p.get("difficulty"))) $("difficulty").value = p.get("difficulty");
  if (p.get("seed")) rng = makeRng(Number(p.get("seed")) || 1);
  sessionApi.addSessionNavigation?.("../");
  $("mode").onchange = $("difficulty").onchange = $("new").onclick = $("skip").onclick = $("next").onclick = () => newChallenge();
  $("mode").onchange = $("difficulty").onchange = () => { history.clear(); newChallenge(); };
  $("submit").onclick = submit;
  $("summary-toggle").onclick = () => { const open = $("summary").hidden; $("summary").hidden = !open; $("summary-toggle").setAttribute("aria-expanded", String(open)); if (open) renderSummary(); };
  $("restart").onclick = () => ($("restart-dialog").showModal ? $("restart-dialog").showModal() : $("restart-dialog").setAttribute("open", ""));
  $("restart-cancel").onclick = () => $("restart-dialog").close?.();
  $("restart-confirm").onclick = () => { local = []; history = createHistory(); $("restart-dialog").close?.(); newChallenge(); renderSummary(); };
  // keyboard: arrows move within the answer group, 1-4 choose, Enter submits
  $("choices").addEventListener("keydown", (e) => {
    const bs = [...$("choices").querySelectorAll("[data-choice]")];
    const i = bs.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key) && i >= 0 && !locked) {
      e.preventDefault();
      const j = (i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length;
      bs[j].focus(); choose(j);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (locked || e.ctrlKey || e.metaKey || e.altKey || /^(SELECT|INPUT|TEXTAREA)$/.test(e.target?.tagName || "")) return;
    if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
    else if (e.key === "Enter" && selection !== null && e.target?.tagName !== "BUTTON") { e.preventDefault(); submit(); }
  });
  globalThis.addEventListener?.("pagehide", () => { if (instance && tracker.status(instance) === "active") tracker.skip(instance); });
  newChallenge();
  globalThis.SearchSortLab = { current: () => ch, selection: () => selection, locked: () => locked, tracker, local: () => local, choose, submit, newChallenge, exactKey };
}
if (typeof document !== "undefined" && document.getElementById("stage")) init();
