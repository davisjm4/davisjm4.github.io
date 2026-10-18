/* Documentation Lab UI. Results go to the shared Java Games session tracker
   (localStorage key javaGames.session.v1) used by Session Summary:
   one topic per practice mode, one scored submission per challenge. */
import * as E from "./engine.js?v=doclab-v1";
import * as API from "./api-project-builder-ui.js?v=api-builder-v28";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=active-time-v1";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tracker = sessionTracker();

let rng = Math.random;
let picker = null;
let ch = null;
let instance = null;
let closed = false;
let outcome = null; // "correct" | "wrong" | "revealed"
let resp = null; // current response (shape depends on ch.kind)
let apiSession = null;

/* ==================================================================== */
/* Java syntax highlighting (line by line, block-comment aware)          */
/* ==================================================================== */
const KEYWORDS = new Set(
  "public private protected static final void int double boolean char long float byte short class new return if else for while do true false null this throw throws extends implements import package break continue switch case default try catch finally super interface abstract var".split(" "),
);
function commentHtml(text) {
  return `<span class="tk-com">${esc(text).replace(/(@(?:param|return|throws)\b)/g, '<span class="tk-tag">$1</span>')}</span>`;
}
function highlight(text, state) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (state.block) {
      const end = text.indexOf("*/", i);
      if (end < 0) {
        out += commentHtml(text.slice(i));
        return out;
      }
      out += commentHtml(text.slice(i, end + 2));
      i = end + 2;
      state.block = false;
      continue;
    }
    const rest = text.slice(i);
    if (rest.startsWith(E.SLOT_MARK)) {
      out += esc(E.SLOT_MARK);
      i += E.SLOT_MARK.length;
    } else if (rest.startsWith("//")) {
      return out + commentHtml(rest);
    } else if (rest.startsWith("/*")) {
      state.block = true;
      out += "";
      continue;
    } else if (rest[0] === '"' || rest[0] === "'") {
      const q = rest[0];
      let j = 1;
      while (j < rest.length && rest[j] !== q) j += rest[j] === "\\" ? 2 : 1;
      out += `<span class="tk-str">${esc(rest.slice(0, j + 1))}</span>`;
      i += j + 1;
    } else if (/[0-9]/.test(rest[0])) {
      const m = rest.match(/^[0-9][0-9_.]*/)[0];
      out += `<span class="tk-num">${esc(m)}</span>`;
      i += m.length;
    } else if (/[A-Za-z_$]/.test(rest[0])) {
      const m = rest.match(/^[A-Za-z_$][\w$]*/)[0];
      const cls = KEYWORDS.has(m) ? "tk-kw" : /^[A-Z]/.test(m) ? "tk-type" : "tk-id";
      out += `<span class="${cls}">${esc(m)}</span>`;
      i += m.length;
    } else {
      out += esc(rest[0]);
      i++;
    }
  }
  return out;
}
/* Render code as one element per line. Indentation becomes padding so that
   long lines wrap with a hanging indent instead of breaking the layout. */
function codeHtml(code, opts = {}) {
  const state = { block: false };
  const lines = code.split("\n");
  return lines
    .map((line, i) => {
      const indent = line.match(/^ */)[0].length;
      const text = line.slice(indent);
      const pad = `style="--ind:${indent}"`;
      const extra = (opts.classFor && opts.classFor(i)) || "";
      if (text === E.SLOT_MARK) return `<div class="ln ln-slot ${extra}" ${pad}><span class="slot">comment goes here</span></div>`;
      const body = text ? highlight(text, state) : "&#8203;";
      if (opts.selectable && opts.selectable.includes(i))
        return `<button type="button" class="ln ln-btn ${extra}" ${pad} data-line="${i}" aria-pressed="false" aria-label="Line ${i + 1}: ${esc(text)}">${body}</button>`;
      return `<div class="ln ${extra}" ${pad}>${body}</div>`;
    })
    .join("");
}
function codeFigure(block, inner, cls = "") {
  return `<figure class="dl-block ${cls}">${block.label ? `<figcaption>${esc(block.label)}</figcaption>` : ""}<div class="dl-code">${inner}</div></figure>`;
}
const inlineCode = (text) => `<code class="dl-inline">${highlight(text, { block: false })}</code>`;
const multiCode = (text) =>
  `<code class="dl-inline">${text.split("\n").map((l) => highlight(l, { block: false })).join("<br>")}</code>`;

/* ==================================================================== */
/* API documentation panels                                              */
/* ==================================================================== */
function docHtml(key, clickable) {
  const d = E.DOCS[key];
  const lines = E.docLines(key);
  let section = null;
  let html = `<article class="api-doc" aria-label="Documentation: ${esc(d.sig)}"><div class="api-class">${esc(d.cls)}</div>`;
  for (const l of lines) {
    if (l.id === "sig") {
      html += clickable
        ? `<button type="button" class="api-line api-sig" data-docline="sig" aria-pressed="false">${highlight(d.sig, { block: false })}</button>`
        : `<div class="api-sig">${highlight(d.sig, { block: false })}</div>`;
      continue;
    }
    if (l.section !== section) {
      if (section) html += "</div>";
      section = l.section;
      html += `<div class="api-sec${section === "Lab note" ? " api-note" : ""}"><h4>${esc(section)}</h4>`;
    }
    const content = l.name ? `<code>${esc(l.name)}</code> – ${esc(l.text)}` : esc(l.text);
    html += clickable
      ? `<button type="button" class="api-line" data-docline="${esc(l.id)}" aria-pressed="false">${content}</button>`
      : `<p class="api-line">${content}</p>`;
  }
  if (section) html += "</div>";
  return html + "</article>";
}

/* ==================================================================== */
/* Rendering per challenge kind                                          */
/* ==================================================================== */
/* Option text written as an English sentence is shown as prose even in a
   code-option list (e.g. "It throws an exception."). */
const isProse = (t) => /^[A-Z][a-z]/.test(t) && /[.!?]$/.test(t.trim()) && / /.test(t);
const commentText = (t) => `<code class="dl-inline"><span class="tk-com">${esc(t)}</span></code>`;
function radioGroup(items, { name, code = false, letters = true, comment = false }) {
  return `<div class="dl-choices" role="radiogroup" aria-label="${esc(name)}">${items
    .map(
      (text, i) =>
        `<button type="button" class="secondary dl-choice${code ? " is-code" : ""}" role="radio" aria-checked="false" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">${letters ? `<span class="dl-letter" aria-hidden="true">${"ABCDEFG"[i]}</span>` : ""}<span class="dl-choice-text">${comment ? commentText(text) : code && !isProse(text) ? multiCode(text) : esc(text)}</span><span class="dl-mark" aria-hidden="true"></span></button>`,
    )
    .join("")}</div>`;
}
/* Roving arrow-key navigation for every radiogroup. */
function wireRadios(root, onPick) {
  for (const group of root.querySelectorAll('[role="radiogroup"]')) {
    const btns = [...group.querySelectorAll('[role="radio"]')];
    btns.forEach((b, i) => {
      b.onclick = () => onPick(group, Number(b.dataset.i), b);
      b.onkeydown = (e) => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const t = btns[(i + d + btns.length) % btns.length];
        t.focus();
        t.click();
      };
    });
  }
}
function setRadio(group, index) {
  [...group.querySelectorAll('[role="radio"]')].forEach((b) => {
    const on = Number(b.dataset.i) === index;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

function renderBlocks() {
  if (ch.kind === "build") {
    renderBuildPreview();
    return;
  }
  const sel = ch.kind === "line" || ch.kind === "repair" ? ch.selectable : null;
  $("blocks").innerHTML = ch.blocks.map((b, bi) => codeFigure(b, codeHtml(b.code, { selectable: bi === 0 ? sel : null }), sel && bi === 0 ? "is-selectable" : "")).join("");
  if (sel)
    for (const btn of $("blocks").querySelectorAll(".ln-btn"))
      btn.onclick = () => {
        if (closed) return;
        const line = Number(btn.dataset.line);
        if (ch.kind === "line") resp = line;
        else resp = { ...(resp || {}), line };
        touch();
        paintLines();
        if (ch.kind === "repair") paintRepairPreview();
        updateSubmit();
      };
}
function renderDocs() {
  const clickable = ch.kind === "docline";
  $("docs").innerHTML = ch.docs.length
    ? `<div class="dl-docs-head">${clickable ? "Java API documentation — click a line" : `Java API documentation${ch.docs.length > 1 ? ` (${ch.docs.length} entries)` : ""}`}</div>` +
      ch.docs.map((k) => docHtml(k, clickable)).join("")
    : "";
  $("workspace").classList.toggle("has-docs", ch.docs.length > 0);
  $("workspace").classList.toggle("docs-only", ch.docs.length > 0 && !ch.blocks.length && ch.kind !== "build");
  if (clickable)
    for (const btn of $("docs").querySelectorAll("[data-docline]"))
      btn.onclick = () => {
        if (closed) return;
        resp = btn.dataset.docline;
        touch();
        paintDocLines();
        updateSubmit();
      };
}

/* ---- line selection painting (line + repair kinds) ---- */
/* The code has no line numbers, so lines are named by their text. */
function lineName(i) {
  const t = ch.blocks[0].code.split("\n")[i].trim().replace(/^(\/\/|\*)\s*/, "");
  return `the line “${t.length > 46 ? t.slice(0, 44) + "…" : t}”`;
}
function paintLines() {
  const chosen = ch.kind === "line" ? resp : resp?.line;
  for (const b of $("blocks").querySelectorAll(".ln-btn")) {
    const i = Number(b.dataset.line);
    b.classList.toggle("selected", i === chosen);
    b.setAttribute("aria-pressed", String(i === chosen));
    if (closed) {
      b.disabled = true;
      const right = ch.kind === "line" ? ch.answer.includes(i) : i === ch.bad;
      b.classList.toggle("is-answer", right);
      b.classList.toggle("is-wrong", i === chosen && !right && outcome !== "revealed");
    }
  }
  const label = $("line-choice");
  if (label) label.innerHTML = chosen == null ? '<span class="muted">none yet</span>' : esc(lineName(chosen));
}
function paintDocLines() {
  for (const b of $("docs").querySelectorAll("[data-docline]")) {
    const id = b.dataset.docline;
    b.classList.toggle("selected", id === resp);
    b.setAttribute("aria-pressed", String(id === resp));
    if (closed) {
      b.disabled = true;
      b.classList.toggle("is-answer", ch.answer.includes(id));
      b.classList.toggle("is-wrong", id === resp && !ch.answer.includes(id) && outcome !== "revealed");
    }
  }
}

/* ---- choice ---- */
function renderChoice() {
  $("interaction").innerHTML = radioGroup(
    ch.options.map((o) => o.text),
    { name: ch.question, code: !!ch.codeOptions },
  );
  wireRadios($("interaction"), (group, i) => {
    if (closed) return;
    resp = i;
    setRadio(group, i);
    touch();
    updateSubmit();
  });
}

/* ---- click a line ---- */
function renderLine() {
  $("interaction").innerHTML = `<p class="dl-tip">Selected: <strong id="line-choice"></strong> <span class="muted">— tap or click a comment line in the code. Keyboard: Tab to a line, then Enter.</span></p>`;
  paintLines();
}
function renderDocline() {
  $("interaction").innerHTML = `<p class="dl-tip muted">Tap or click a line in the documentation panel. Keyboard: Tab to a line, then Enter.</p>`;
}

/* ---- repair: line + fix ---- */
function renderRepair() {
  $("interaction").innerHTML =
    `<div class="dl-step"><span class="dl-step-n">1</span> Faulty line: <strong id="line-choice"></strong> <span class="muted">(click a comment line in the code)</span></div>` +
    `<div class="dl-step"><span class="dl-step-n">2</span> Choose the repair for that line:</div>` +
    radioGroup(ch.fixes.map(E.fixLabel), { name: "Repair options", comment: true }) +
    `<div id="repair-preview" class="dl-preview" aria-live="polite"></div>`;
  wireRadios($("interaction"), (group, i) => {
    if (closed) return;
    resp = { ...(resp || {}), fix: i };
    setRadio(group, i);
    touch();
    paintRepairPreview();
    updateSubmit();
  });
  paintLines();
  paintRepairPreview();
}
function commentRange(lines, at) {
  // The comment that contains line `at`: a Javadoc block or a single // line.
  if (lines[at].trim().startsWith("//")) return [at, at];
  let s = at,
    e = at;
  while (s > 0 && !lines[s].trim().startsWith("/**")) s--;
  while (e < lines.length - 1 && !lines[e].trim().startsWith("*/")) e++;
  return [s, e];
}
function repairPreviewHtml(line, fix) {
  const lines = ch.blocks[0].code.split("\n");
  const [s, e] = commentRange(lines, line);
  const after = E.applyRepair(ch, line, fix).split("\n");
  const removed = ch.fixes[fix].del;
  const slice = after.slice(s, removed ? e : e + 1);
  const changed = line - s;
  const html = codeHtml(slice.join("\n"), { classFor: (i) => (!removed && i === changed ? "ln-edited" : "") });
  return `<div class="dl-preview-head">${removed ? "Preview: that line deleted" : "Preview of the comment after your repair"}</div><div class="dl-code">${html || '<div class="ln muted">(comment removed)</div>'}</div>`;
}
function paintRepairPreview() {
  const box = $("repair-preview");
  if (!box) return;
  box.innerHTML = resp && resp.line != null && resp.fix != null ? repairPreviewHtml(resp.line, resp.fix) : "";
}

/* ---- Javadoc builder ---- */
function methodLineIndex(lines) {
  return lines.findIndex((l) => /^\s*(public|private|protected)\b[^=]*\(.*\)\s*\{\s*$/.test(l) && !/\bclass\b/.test(l));
}
function renderBuildPreview() {
  const b = ch.blocks[0];
  const lines = b.code.split("\n");
  const at = methodLineIndex(lines);
  const indent = lines[at].match(/^ */)[0];
  const picks = Array.isArray(resp) ? resp : [];
  const doc = E.buildJavadoc(ch, picks, indent).split("\n");
  const all = [...lines.slice(0, at), ...doc, ...lines.slice(at)];
  const html = codeHtml(all.join("\n"), { classFor: (i) => (i >= at && i < at + doc.length ? "ln-preview" : "") });
  $("blocks").innerHTML = codeFigure({ label: b.label + " — your Javadoc appears above the method" }, html);
}
function renderBuild() {
  if (!Array.isArray(resp)) resp = ch.slots.map(() => null);
  $("interaction").innerHTML = ch.slots
    .map(
      (s, si) =>
        `<fieldset class="dl-slot" data-slot="${si}"><legend><span class="dl-slot-tag">${esc(s.label)}</span><span class="dl-slot-mark" aria-hidden="true"></span></legend>${radioGroup(
          s.options.map((o) => (o.omit ? "— Leave this tag out —" : o.text)),
          { name: s.label, letters: false },
        )}<p class="dl-slot-why" hidden></p></fieldset>`,
    )
    .join("");
  wireRadios($("interaction"), (group, i) => {
    if (closed) return;
    const si = Number(group.closest("[data-slot]").dataset.slot);
    resp[si] = i;
    setRadio(group, i);
    touch();
    renderBuildPreview();
    updateSubmit();
  });
}

/* ---- classify ---- */
function renderClassify() {
  if (!Array.isArray(resp)) resp = ch.statements.map(() => null);
  $("interaction").innerHTML = `<ol class="dl-classify">${ch.statements
    .map(
      (s, i) =>
        `<li data-st="${i}"><p class="dl-st-text">${esc(s.text)}</p><div class="dl-toggle" role="radiogroup" aria-label="Statement ${i + 1}"><button type="button" class="secondary" role="radio" aria-checked="false" tabindex="0" data-i="1">Guaranteed</button><button type="button" class="secondary" role="radio" aria-checked="false" tabindex="-1" data-i="0">Not guaranteed</button></div><p class="dl-st-why" hidden></p></li>`,
    )
    .join("")}</ol>`;
  wireRadios($("interaction"), (group, v) => {
    if (closed) return;
    const i = Number(group.closest("[data-st]").dataset.st);
    resp[i] = v === 1;
    setRadio(group, v);
    touch();
    updateSubmit();
  });
}

/* ---- assemble a call ---- */
function renderAssemble() {
  if (!resp || !resp.args) resp = { method: ch.methods.length === 1 ? ch.methods[0] : null, args: [] };
  const methodPicker =
    ch.methods.length > 1
      ? `<div class="dl-step"><span class="dl-step-n">1</span> Method:</div><div class="dl-methods" role="radiogroup" aria-label="Method">${ch.methods
          .map((m, i) => `<button type="button" class="secondary" role="radio" aria-checked="false" tabindex="${i ? -1 : 0}" data-i="${i}"><code>${esc(m)}</code></button>`)
          .join("")}</div><div class="dl-step"><span class="dl-step-n">2</span> Arguments, in order:</div>`
      : `<div class="dl-step">Tap the arguments in order:</div>`;
  $("interaction").innerHTML =
    methodPicker +
    `<div class="dl-call" aria-live="polite"><code id="call-line"></code></div>` +
    `<div class="dl-bank" id="bank" aria-label="Argument tokens"></div>` +
    `<div class="row"><button type="button" class="secondary dl-small" id="reset-call">Reset</button><span class="muted dl-tip">Tap a token to place it in the next empty slot. Tap a placed argument to remove it.</span></div>` +
    `<div id="call-result" class="dl-call-result" hidden></div>`;
  wireRadios($("interaction"), (group, i) => {
    if (closed) return;
    resp.method = ch.methods[i];
    setRadio(group, i);
    touch();
    drawCall();
  });
  $("reset-call").onclick = () => {
    if (closed) return;
    resp.args = [];
    drawCall();
  };
  drawCall();
}
function drawCall() {
  const parts = [];
  for (let k = 0; k < ch.slots; k++) {
    const t = resp.args[k];
    parts.push(
      t != null
        ? `<button type="button" class="dl-placed" data-placed="${k}" ${closed ? "disabled" : ""} aria-label="Remove ${esc(ch.tokens[t].text)}">${highlight(ch.tokens[t].text, { block: false })}</button>`
        : `<span class="dl-slot-gap" aria-label="empty argument slot">&nbsp;▢&nbsp;</span>`,
    );
  }
  const call = `<span class="tk-id">${esc(ch.receiver.name)}</span>.<span class="tk-id">${resp.method ? esc(resp.method) : '<span class="dl-slot-gap">method</span>'}</span>(${parts.join(", ")})`;
  const [pre, post] = ch.template.split("{call}");
  $("call-line").innerHTML = highlight(pre, { block: false }) + call + esc(post);
  $("bank").innerHTML = ch.tokens
    .map((t, i) => `<button type="button" class="secondary dl-token" data-token="${i}" ${resp.args.includes(i) || closed ? "disabled" : ""}>${highlight(t.text, { block: false })}</button>`)
    .join("");
  for (const b of $("bank").querySelectorAll("[data-token]"))
    b.onclick = () => {
      const i = Number(b.dataset.token);
      if (closed || resp.args.length >= ch.slots || resp.args.includes(i)) return;
      resp.args.push(i);
      touch();
      drawCall();
    };
  for (const b of $("call-line").querySelectorAll("[data-placed]"))
    b.onclick = () => {
      if (closed) return;
      resp.args.splice(Number(b.dataset.placed), 1);
      drawCall();
    };
  $("reset-call").disabled = closed || !resp.args.length;
  updateSubmit();
}

/* ==================================================================== */
/* Lifecycle                                                             */
/* ==================================================================== */
function complete() {
  if (resp == null) return false;
  switch (ch.kind) {
    case "repair":
      return resp.line != null && resp.fix != null;
    case "build":
    case "classify":
      return resp.every((x) => x != null);
    case "assemble":
      return !!resp.method && resp.args.length === ch.slots;
    default:
      return true;
  }
}
function updateSubmit() {
  $("submit").disabled = closed || !complete();
}
function touch() {
  if (instance) tracker.interact(instance);
}
function stats() {
  $("stats").textContent = roundSummary(E.GAME_ID);
}

function newChallenge() {
  if (apiSession) { apiSession.stop(); apiSession = null; }
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  $("submit").onclick = submit;
  $("show").onclick = showAnswer;
  $("skip").onclick = newChallenge;
  $("next").onclick = newChallenge;
  const selectedMode = $("mode").value;
  if (selectedMode === "api-builder") {
    $("blocks").innerHTML = "";
    $("docs").innerHTML = "";
    $("interaction").innerHTML = "";
    $("feedback").hidden = true;
    apiSession = API.mount({
      root: $("stage"),
      tracker,
      dev: new URLSearchParams(globalThis.location?.search || "").get("apiDev") === "1",
      controls: {
        submit: $("submit"), show: $("show"), skip: $("skip"), nextButton: $("next"),
        roundSummary: () => roundSummary(E.GAME_ID),
        next: newChallenge,
      },
    });
    return;
  }
  ch = E.generate(selectedMode, picker, rng);
  instance = tracker.begin(E.GAME_ID, E.docLabGame.name, ch.mode, E.MODES[ch.mode]);
  closed = false;
  outcome = null;
  resp = null;
  $("mode-label").textContent = ch.modeTitle;
  $("family").textContent = ch.familyTitle;
  $("instructions").textContent = ch.instructions;
  $("prompt").textContent = ch.prompt || "";
  $("prompt").hidden = !ch.prompt;
  $("question").textContent = ch.question;
  $("feedback").hidden = true;
  $("feedback").className = "feedback dl-feedback";
  $("stage").dataset.kind = ch.kind;
  $("stage").dataset.mode = ch.mode;
  renderBlocks();
  renderDocs();
  ({ choice: renderChoice, line: renderLine, docline: renderDocline, repair: renderRepair, build: renderBuild, classify: renderClassify, assemble: renderAssemble })[ch.kind]();
  $("submit").hidden = false;
  $("show").hidden = false;
  $("skip").hidden = false;
  $("next").hidden = true;
  updateSubmit();
  stats();
}

function submit() {
  if (closed || !complete() || tracker.status(instance) !== "active") return;
  const result = E.assess(ch, resp);
  const rec = tracker.submit(instance, result.correct);
  if (!rec.accepted) return;
  // The correct answer is shown right away, so a wrong first answer is
  // closed as revealed (the same convention as the other Java Games).
  if (!result.correct) tracker.reveal(instance);
  finish(result.correct ? "correct" : "wrong", result);
}
function showAnswer() {
  if (closed || tracker.status(instance) !== "active") return;
  tracker.reveal(instance);
  resp = cloneAnswer();
  if (ch.kind === "build" || ch.kind === "classify" || ch.kind === "repair" || ch.kind === "assemble") rerenderWithResponse();
  finish("revealed", E.assess(ch, resp));
}
function cloneAnswer() {
  const a = E.answerFor(ch);
  return a && typeof a === "object" ? JSON.parse(JSON.stringify(a)) : a;
}
function rerenderWithResponse() {
  // Re-draw interactive widgets so they show the revealed answer.
  if (ch.kind === "build") {
    renderBuild();
    renderBuildPreview();
  } else if (ch.kind === "classify") renderClassify();
  else if (ch.kind === "repair") renderRepair();
  else if (ch.kind === "assemble") renderAssemble();
}

function finish(kind, result) {
  closed = true;
  outcome = kind;
  const notes = [];
  let correctHtml = "";
  const mine = kind === "wrong";

  if (ch.kind === "choice") {
    for (const b of $("interaction").querySelectorAll("[data-i]")) {
      const i = Number(b.dataset.i);
      b.disabled = true;
      const mark = b.querySelector(".dl-mark");
      if (i === ch.answer) {
        b.classList.add("is-correct");
        mark.textContent = "✓ Best answer";
      } else if (i === resp && kind !== "revealed") {
        b.classList.add("is-wrong");
        mark.textContent = "✗ Your answer";
      }
    }
    const o = ch.options[ch.answer];
    correctHtml = ch.codeOptions && !isProse(o.text) ? multiCode(o.text) : esc(o.text);
    if (mine) notes.push(["About your choice", ch.options[resp].why]);
  } else if (ch.kind === "line") {
    paintLines();
    correctHtml = esc(lineName(ch.answer[0]));
    if (mine && ch.lineWhy?.[resp]) notes.push([`About ${lineName(resp)}`, ch.lineWhy[resp]]);
  } else if (ch.kind === "docline") {
    paintDocLines();
    const names = ch.answer.map((id) => ch.lines.find((l) => l.id === id)).map((l) => (l.name ? `${l.section}: ${l.name}` : l.section));
    correctHtml = esc(names.join(" or "));
    if (mine) notes.push(["About the line you picked", ch.lineWhy?.[resp] || "That line is accurate, but it doesn't answer this question."]);
  } else if (ch.kind === "repair") {
    paintLines();
    for (const b of $("interaction").querySelectorAll('[role="radio"]')) {
      const i = Number(b.dataset.i);
      b.disabled = true;
      if (i === ch.fixAnswer) {
        b.classList.add("is-correct");
        b.querySelector(".dl-mark").textContent = "✓ Best repair";
      } else if (i === resp.fix && kind !== "revealed") {
        b.classList.add("is-wrong");
        b.querySelector(".dl-mark").textContent = "✗ Your repair";
      }
    }
    $("repair-preview").innerHTML = repairPreviewHtml(ch.bad, ch.fixAnswer).replace("after your repair", "after the correct repair");
    correctHtml = `${esc(lineName(ch.bad))} → ${commentText(E.fixLabel(ch.fixes[ch.fixAnswer]))}`;
    if (mine && !result.lineOk) notes.push([`About ${lineName(resp.line)}`, "That line already matches the code. Compare each comment line with what the code actually does."]);
    if (mine && !result.fixOk) notes.push(["About your repair", ch.fixes[resp.fix].why]);
  } else if (ch.kind === "build") {
    $("interaction").querySelectorAll("[data-slot]").forEach((fs, si) => {
      const s = ch.slots[si];
      const ok = resp[si] === s.answer;
      fs.classList.add(ok || kind === "revealed" ? "slot-ok" : "slot-bad");
      fs.querySelector(".dl-slot-mark").textContent = kind === "revealed" ? "" : ok ? "✓" : "✗";
      for (const b of fs.querySelectorAll('[role="radio"]')) {
        const i = Number(b.dataset.i);
        b.disabled = true;
        if (i === s.answer) b.classList.add("is-correct");
        else if (i === resp[si] && kind !== "revealed") b.classList.add("is-wrong");
      }
      const why = fs.querySelector(".dl-slot-why");
      const text = !ok && kind !== "revealed" ? s.options[resp[si]].why : s.options[s.answer].omit ? s.options[s.answer].why : "";
      if (text) {
        why.hidden = false;
        why.textContent = (!ok && kind !== "revealed" ? "Your choice: " : "") + text;
      }
    });
    const right = ch.slots.map((s) => s.answer);
    const lines = ch.blocks[0].code.split("\n");
    const indent = lines[methodLineIndex(lines)].match(/^ */)[0];
    correctHtml = `<div class="dl-code dl-answer-code">${codeHtml(E.buildJavadoc(ch, right, "").replace(new RegExp("^" + indent, "gm"), ""))}</div>`;
  } else if (ch.kind === "classify") {
    $("interaction").querySelectorAll("[data-st]").forEach((li, i) => {
      const s = ch.statements[i];
      const ok = resp[i] === s.g;
      li.classList.add(ok || kind === "revealed" ? "st-ok" : "st-bad");
      for (const b of li.querySelectorAll('[role="radio"]')) {
        b.disabled = true;
        const v = b.dataset.i === "1";
        if (v === s.g) b.classList.add("is-correct");
        else if (v === resp[i] && kind !== "revealed") b.classList.add("is-wrong");
      }
      const why = li.querySelector(".dl-st-why");
      why.hidden = false;
      const ans = s.g ? "Guaranteed" : "Not guaranteed";
      why.textContent = `${kind === "revealed" ? ans : ok ? "✓ " + ans : "✗ Answer: " + ans}. ${s.why}`;
    });
    correctHtml = "see each statement above";
  } else if (ch.kind === "assemble") {
    drawCall();
    for (const b of $("interaction").querySelectorAll('[role="radio"]')) b.disabled = true;
    const sol = E.solveAssemble(ch)[0];
    const right = E.evaluateCall(ch, sol.method, sol.args);
    correctHtml = inlineCode(ch.template.replace("{call}", right.callText));
    const box = $("call-result");
    box.hidden = false;
    const out = result.out;
    box.className = `dl-call-result ${result.correct ? "good" : kind === "revealed" ? "" : "bad"}`;
    box.innerHTML = `${kind === "revealed" ? "This call" : "Your call"} ${inlineCode(out.callText)} ${esc(out.message)}`;
  }

  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback dl-feedback ${kind === "correct" ? "good" : kind === "wrong" ? "bad" : "shown"}`;
  const head = kind === "correct" ? "✓ Correct!" : kind === "wrong" ? "✗ Not quite." : "Answer shown.";
  const showCorrect = kind !== "correct" && ch.kind !== "classify";
  const review =
    ch.kind === "choice"
      ? `<details class="dl-review"><summary>Review every choice</summary><ul>${ch.options
          .map((o) => `<li><span class="${o.ok ? "ok" : "no"}">${o.ok ? "✓" : "✗"}</span> ${ch.codeOptions && !isProse(o.text) ? multiCode(o.text) : esc(o.text)}${o.ok ? "" : ` — ${esc(o.why)}`}</li>`)
          .join("")}</ul></details>`
      : "";
  fb.innerHTML =
    `<strong>${head}</strong> ` +
    (showCorrect ? `<span class="dl-correct">${ch.kind === "build" ? "Accurate Javadoc:" : "Correct answer:"} ${correctHtml}</span>` : "") +
    `<p>${esc(ch.explanation)}</p>` +
    notes.map(([t, w]) => `<p class="dl-why"><strong>${esc(t)}:</strong> ${esc(w)}</p>`).join("") +
    review +
    `<p class="muted dl-small">${kind === "correct" ? "First-try correct recorded." : kind === "wrong" ? "Your first attempt was recorded; this challenge is now revealed." : "Recorded as revealed (no credit)."}</p>`;
  $("submit").disabled = true;
  $("submit").hidden = true;
  $("show").hidden = true;
  $("skip").hidden = true;
  $("next").hidden = false;
  $("next").focus({ preventScroll: true });
  fb.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  stats();
}

function init() {
  const params = new URLSearchParams(globalThis.location?.search || "");
  const m = params.get("mode");
  if (m && (m === "mixed" || E.MODES[m] || m === "api-builder")) $("mode").value = m;
  if (params.get("seed")) rng = E.makeRng(Number(params.get("seed")) || 1);
  picker = E.createPicker(rng);
  addSessionNavigation("../");
  $("mode").onchange = newChallenge;
  $("new").onclick = newChallenge;
  $("skip").onclick = newChallenge;
  $("next").onclick = newChallenge;
  $("submit").onclick = submit;
  $("show").onclick = showAnswer;
  globalThis.addEventListener?.("pagehide", () => {
    if (apiSession) apiSession.stop();
    if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  });
  globalThis.addEventListener?.("pageshow", (e) => {
    if (e.persisted) newChallenge();
  });
  newChallenge();
  globalThis.DocLab = {
    current: () => ch,
    response: () => (resp && typeof resp === "object" ? JSON.parse(JSON.stringify(resp)) : resp),
    tracker,
    engine: E,
    /* test hook: load a specific bank item */
    load(id) {
      if (instance && tracker.status(instance) === "active") tracker.skip(instance);
      const item = Object.values(E.ITEMS).flat().find((i) => i.id === id);
      const save = picker;
      picker = { pick: () => item };
      newChallenge();
      picker = save;
    },
  };
}
init();
