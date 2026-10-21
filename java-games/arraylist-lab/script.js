/* ArrayList Lab UI (Java Games · DevCat Studios).
   One challenge, one concept, one decision, one explanation.
   Results go to the shared Java Games session tracker (localStorage key
   javaGames.session.v1) used by ../session-summary/. One scored submission
   per challenge: a wrong first answer is shown immediately and recorded as
   revealed (same convention as Method & Constructor Lab). */
import * as E from "./engine.js?v=arraylist-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=per-mode-daily-v1";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/* `inline code` in prose */
const prose = (s) => esc(s).replace(/`([^`]+)`/g, (_, c) => `<code>${highlight(c.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"))}</code>`);

const KEYWORDS = new Set(["int", "double", "boolean", "char", "for", "if", "else", "new", "return", "import", "public", "class", "static", "void", "break", "while", "true", "false", "null"]);
const TYPES = new Set(["ArrayList", "Integer", "String", "Double", "Boolean", "Character", "Object", "System"]);
function highlight(src) {
  const re = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let out = "",
    m;
  while ((m = re.exec(src))) {
    const [t, com, str, num, word] = m;
    if (com) out += `<span class="tk-com">${esc(com)}</span>`;
    else if (str) out += `<span class="tk-str">${esc(str)}</span>`;
    else if (num) out += `<span class="tk-num">${esc(num)}</span>`;
    else if (word) out += KEYWORDS.has(word) ? `<span class="tk-kw">${word}</span>` : TYPES.has(word) ? `<span class="tk-type">${word}</span>` : esc(word);
    else out += esc(t);
  }
  return out;
}

const tracker = sessionTracker();
let ch = null,
  instance = null,
  closed = false,
  rng = Math.random,
  selection = null, // choice index | cell index | gap index
  multi = new Set(); // cells
const history = E.createHistory();

/* ------------------------------------------------------------------ */
/* ArrayList strip rendering                                           */
/* ------------------------------------------------------------------ */
const shown = (type, v) => E.lit(type, v);
function strip(type, values, { mode = null, indices = false, marks = null, was = null, label = "", small = false } = {}) {
  const cells = values.map((v, i) => {
    const mark = marks?.[i] ? ` is-${marks[i]}` : "";
    const inner = esc(shown(type, v));
    const cell =
      mode === "cell" || mode === "cells"
        ? `<button type="button" class="al-cell${mark}" data-cell="${i}" aria-pressed="false" aria-label="Element ${esc(shown(type, v))}">${inner}</button>`
        : `<span class="al-cell${mark}">${inner}</span>`;
    const idx = `<small class="al-idx"${indices ? "" : " hidden"}>${i}</small>`;
    const wasNote = was?.[i] !== null && was?.[i] !== undefined ? `<small class="al-was">was ${was[i]}</small>` : "";
    return `<div class="al-slot">${cell}${idx}${wasNote}</div>`;
  });
  let body;
  if (mode === "gap") {
    const gapLabel = (k) => (values.length === 0 ? "Insert into the empty list" : k === 0 ? `Gap before ${shown(type, values[0])} (front)` : k === values.length ? `Gap after ${shown(type, values[k - 1])} (end)` : `Gap between ${shown(type, values[k - 1])} and ${shown(type, values[k])}`);
    const gap = (k) => `<button type="button" class="al-gap" data-gap="${k}" aria-pressed="false" aria-label="${esc(gapLabel(k))}"><span aria-hidden="true"></span></button>`;
    body = values.map((_, i) => gap(i) + cells[i]).join("") + gap(values.length);
  } else body = cells.join("");
  if (!values.length && mode !== "gap") body = `<span class="al-empty">empty</span>`;
  return `<div class="al-strip-wrap${small ? " is-small" : ""}">${label ? `<div class="al-label">${label}</div>` : ""}<div class="al-strip${mode === "gap" ? " has-gaps" : ""}" role="group" aria-label="${esc(`ArrayList with ${values.length} element${values.length === 1 ? "" : "s"}${values.length ? ": " + values.map((v) => shown(type, v)).join(", ") : ""}`)}">${body}</div></div>`;
}
const typeLabel = (l) => `<code>${highlight(`ArrayList<${l.type}> ${l.name}`)}</code>`;

/* ------------------------------------------------------------------ */
/* Rendering a challenge                                               */
/* ------------------------------------------------------------------ */
function renderStart() {
  const interactive = ["cell", "cells", "gap"].includes(ch.kind) ? ch.kind : null;
  if (!ch.list) {
    $("start").innerHTML = "";
    return;
  }
  const hint = ch.kind === "gap" ? "Tap a gap between elements." : ch.kind === "cell" ? "Tap one element." : ch.kind === "cells" ? "Tap every element that applies, then Check Answer." : "";
  $("start").innerHTML = strip(ch.list.type, ch.list.values, { mode: interactive, indices: ch.showIndices && !interactive, label: `${typeLabel(ch.list)} <span class="muted">${ch.goal ? "· starting list" : interactive ? "" : "· starting list"}</span>` }) + (hint ? `<p class="muted al-tip">${hint}</p>` : "");
  for (const b of $("start").querySelectorAll("[data-cell]"))
    b.onclick = () => {
      if (closed) return;
      const i = Number(b.dataset.cell);
      if (ch.kind === "cells") multi.has(i) ? multi.delete(i) : multi.add(i);
      else selection = i;
      tracker.interact(instance);
      paintStart();
    };
  for (const b of $("start").querySelectorAll("[data-gap]"))
    b.onclick = () => {
      if (closed) return;
      selection = Number(b.dataset.gap);
      tracker.interact(instance);
      paintStart();
    };
}
function paintStart() {
  for (const b of $("start").querySelectorAll("[data-cell]")) {
    const i = Number(b.dataset.cell);
    const on = ch.kind === "cells" ? multi.has(i) : selection === i;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));
  }
  for (const b of $("start").querySelectorAll("[data-gap]")) {
    const on = selection === Number(b.dataset.gap);
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));
  }
  $("submit").disabled = closed || (ch.kind === "cells" ? multi.size === 0 : selection === null);
}
function choiceInner(c) {
  if (c.kind === "list") return strip(ch.list?.type || ch.goal?.type || (typeof c.value[0] === "number" ? "Integer" : "String"), c.value, { small: true });
  if (c.kind === "code") return `<code class="al-choice-code">${highlight(c.value)}</code>`;
  if (c.kind === "value") return `<code>${highlight(c.value)}</code>`;
  return `<span>${prose(c.value)}</span>`;
}
function renderChoices() {
  const listy = ch.choices.some((c) => c.kind === "list");
  const wide = ch.choices.some((c) => c.kind === "code" && c.value.includes("\n"));
  $("interaction").innerHTML = `<div id="choices" class="al-choices${listy ? " is-lists" : ""}${wide ? " is-wide" : ""}" role="radiogroup" aria-labelledby="question">${ch.choices
    .map((c, i) => `<button type="button" class="secondary al-choice" role="radio" aria-checked="false" data-choice="${i}"><span class="al-choice-body">${choiceInner(c)}</span><span class="al-mark" aria-hidden="true"></span></button>`)
    .join("")}</div>`;
  for (const b of $("interaction").querySelectorAll("[data-choice]"))
    b.onclick = () => {
      if (closed) return;
      selection = Number(b.dataset.choice);
      for (const x of $("interaction").querySelectorAll("[data-choice]")) {
        const on = Number(x.dataset.choice) === selection;
        x.classList.toggle("selected", on);
        x.setAttribute("aria-checked", String(on));
      }
      $("submit").disabled = false;
      tracker.interact(instance);
    };
}
function stats() {
  $("stats").textContent = roundSummary(E.GAME_ID, $("mode").value);
}
function newChallenge() {
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  ch = E.generate($("mode").value, rng, history);
  instance = tracker.begin(E.GAME_ID, E.arrayListGame.name, ch.mode, E.MODES[ch.mode], ch.mode, E.MODES[ch.mode]);
  closed = false;
  selection = null;
  multi = new Set();
  $("mode-label").textContent = ch.modeTitle;
  $("concept").textContent = ch.concept;
  $("question").innerHTML = prose(ch.question);
  $("code-wrap").hidden = !ch.code;
  $("code").innerHTML = ch.code ? highlight(ch.code) : "";
  $("goal").hidden = !ch.goal;
  $("goal").innerHTML = ch.goal ? strip(ch.goal.type, ch.goal.values, { label: `${typeLabel(ch.goal)} <span class="muted">· goal list</span>` }) : "";
  $("feedback").hidden = true;
  $("feedback").className = "feedback al-feedback";
  $("reveal").hidden = true;
  $("reveal").innerHTML = "";
  $("submit").disabled = true;
  $("submit").hidden = false;
  $("skip").hidden = false;
  $("show").hidden = false;
  $("next").hidden = true;
  renderStart();
  $("interaction").innerHTML = "";
  if (ch.kind === "choice") renderChoices();
  stats();
}

/* ------------------------------------------------------------------ */
/* Submission, reveal, feedback                                        */
/* ------------------------------------------------------------------ */
function response() {
  if (ch.kind === "cells") return [...multi];
  return selection;
}
function submit() {
  if (closed || tracker.status(instance) !== "active") return;
  const r = response();
  if (r === null || (Array.isArray(r) && !r.length)) return;
  const correct = E.assess(ch, r);
  const result = tracker.submit(instance, correct);
  if (!result.accepted) return;
  if (!correct) tracker.reveal(instance); // answer is shown right away
  finish(correct ? "correct" : "wrong");
}
function showAnswer() {
  if (closed || tracker.status(instance) !== "active") return;
  if (!tracker.reveal(instance)) return;
  finish("revealed");
}
function finish(outcome) {
  closed = true;
  for (const el of $("stage").querySelectorAll(".selected")) el.classList.remove("selected");
  let why = "";
  if (ch.kind === "choice") {
    for (const b of $("interaction").querySelectorAll("[data-choice]")) {
      const i = Number(b.dataset.choice);
      b.disabled = true;
      const mark = b.querySelector(".al-mark");
      if (i === ch.answer) {
        b.classList.add("is-correct");
        mark.textContent = "✓ Correct";
      } else if (i === selection && outcome === "wrong") {
        b.classList.add("is-wrong");
        mark.textContent = "✗ Your answer";
      }
    }
    if (outcome === "wrong") why = ch.choices[selection]?.why || "";
  } else {
    // mark cells / gaps; indices are revealed now
    const ans = ch.kind === "cells" ? new Set(ch.answer) : null;
    for (const b of $("start").querySelectorAll("[data-cell]")) {
      const i = Number(b.dataset.cell);
      b.disabled = true;
      const isAns = ans ? ans.has(i) : ch.kind === "cell" && i === ch.answer;
      const picked = ch.kind === "cells" ? multi.has(i) : selection === i;
      b.classList.toggle("is-answer", isAns);
      b.classList.toggle("is-wrong", picked && !isAns && outcome !== "revealed");
      if (ch.kind === "cells" && isAns && !picked && outcome === "wrong") b.classList.add("is-missed");
    }
    for (const b of $("start").querySelectorAll("[data-gap]")) {
      const k = Number(b.dataset.gap);
      b.disabled = true;
      b.classList.toggle("is-answer", k === ch.answer);
      b.classList.toggle("is-wrong", selection === k && k !== ch.answer && outcome !== "revealed");
    }
    for (const s of $("start").querySelectorAll(".al-idx")) s.hidden = false;
    if (outcome === "wrong" && ch.kind === "gap") why = `You chose index ${selection}. Index ${ch.answer} is ${ch.answer === 0 ? "the front" : ch.answer === ch.list.values.length ? "size(), the end" : `just before ${E.lit(ch.list.type, ch.list.values[ch.answer])}`}.`;
    if (outcome === "wrong" && ch.kind === "cell") why = `You tapped ${E.lit(ch.list.type, ch.list.values[selection])} at index ${selection}.`;
    if (outcome === "wrong" && ch.kind === "cells") {
      const missed = ch.answer.filter((i) => !multi.has(i)),
        extra = [...multi].filter((i) => !ch.answer.includes(i));
      why = [missed.length ? `Missed: ${missed.map((i) => `${E.lit(ch.list.type, ch.list.values[i])} (index ${i})`).join(", ")}.` : "", extra.length ? `These stay in the list: ${extra.map((i) => `${E.lit(ch.list.type, ch.list.values[i])} (index ${i})`).join(", ")}.` : ""].filter(Boolean).join(" ");
    }
  }
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback al-feedback ${outcome === "correct" ? "good" : outcome === "wrong" ? "bad" : ""}`;
  const head = outcome === "correct" ? "✓ Correct!" : outcome === "wrong" ? "✗ Not quite." : "Answer shown.";
  fb.innerHTML =
    `<strong>${head}</strong> ` +
    (outcome !== "correct" ? `Correct answer: ${answerHtml()}<br>` : "") +
    prose(ch.explanation) +
    (why ? `<br><span class="al-why">${ch.kind === "choice" ? "About your choice: " : ""}${prose(why)}</span>` : "") +
    `<br><span class="muted al-small">${outcome === "correct" ? "First-try correct recorded." : outcome === "wrong" ? "First attempt recorded." : "Recorded as revealed — not independently solved."}</span>`;
  renderReveal();
  $("submit").hidden = true;
  $("skip").hidden = true;
  $("show").hidden = true;
  $("next").hidden = false;
  $("next").focus({ preventScroll: true });
  stats();
}
function answerHtml() {
  if (ch.kind === "choice") {
    const c = ch.choices[ch.answer];
    if (c.kind === "list") return `<code>${esc(E.listStr(c.value.map((v) => (ch.list?.type === "String" || typeof v === "string" ? `"${v}"` : v))))}</code>`;
    if (c.kind === "text") return prose(c.value);
    return `<code class="al-answer-code">${highlight(c.value)}</code>`;
  }
  return prose(E.answerText(ch));
}
function renderReveal() {
  const parts = [];
  const rv = ch.reveal;
  if (rv) {
    const bMarks = rv.before.map((x) => x.mark),
      aMarks = rv.after.map((x) => x.mark),
      was = rv.after.map((x) => x.was);
    parts.push(
      `<div class="al-reveal-grid">${strip(rv.type, rv.before.map((x) => x.v), { indices: true, marks: bMarks, label: `Before <span class="muted">· size ${rv.beforeSize}</span>`, small: true })}<div class="al-arrow" aria-hidden="true">→</div>${strip(rv.type, rv.after.map((x) => x.v), { indices: true, marks: aMarks, was, label: `After <span class="muted">· size ${rv.afterSize}</span>`, small: true })}</div>` +
        `<p class="al-legend muted"><span class="al-key is-new"></span>inserted <span class="al-key is-removed"></span>removed <span class="al-key is-replaced"></span>replaced <span class="al-key is-moved"></span>shifted (was = old index)</p>`,
    );
  }
  if (ch.trace?.length) parts.push(`<details class="al-trace"><summary>Step-by-step trace</summary><ol>${ch.trace.map((t) => `<li>${prose(t)}</li>`).join("")}</ol></details>`);
  $("reveal").innerHTML = parts.join("");
  $("reveal").hidden = !parts.length;
}

/* ------------------------------------------------------------------ */
/* Startup                                                             */
/* ------------------------------------------------------------------ */
function init() {
  const params = new URLSearchParams(globalThis.location?.search || "");
  const m = params.get("mode");
  if (m && (m === "mixed" || E.MODES[m])) $("mode").value = m;
  if (params.get("seed")) rng = E.makeRng(Number(params.get("seed")) || 1);
  addSessionNavigation("../");
  $("mode").onchange = newChallenge;
  $("new").onclick = newChallenge;
  $("skip").onclick = newChallenge;
  $("next").onclick = newChallenge;
  $("submit").onclick = submit;
  $("show").onclick = showAnswer;
  globalThis.addEventListener?.("pagehide", () => {
    if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  });
  globalThis.addEventListener?.("pageshow", (e) => {
    if (e.persisted) newChallenge();
  });
  newChallenge();
  globalThis.ArrayListLab = { current: () => ch, selection: () => (ch?.kind === "cells" ? [...multi] : selection), tracker, engine: E, history };
}
if (typeof document !== "undefined" && document.getElementById("stage")) init();
