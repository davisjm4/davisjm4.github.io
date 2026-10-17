/* Method & Constructor Lab UI. Results go to the shared Java Games session
   tracker (localStorage key javaGames.session.v1) used by Session Summary. */
import * as E from "./engine.js?v=mcl-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=active-time-v1";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tracker = sessionTracker();
let ch = null,
  instance = null,
  closed = false,
  rng = Math.random,
  lastMode = null,
  selection = null, // select: {block, span:[s,e]}
  chosen = null, // choice: index
  order = []; // order: token ids
const recent = [];

/* ------------------------------------------------------------ */
/* Code rendering                                                */
/* ------------------------------------------------------------ */
function tokenHtml(model, b, interactive) {
  return model.tokens
    .map((t) => {
      const cls = `tk tk-${t.kind}`;
      if (interactive && t.sel) return `<button type="button" class="${cls} tok" data-b="${b}" data-i="${t.i}">${esc(t.text)}</button>`;
      return `<span class="${cls}" data-b="${b}" data-i="${t.i}">${esc(t.text)}</span>`;
    })
    .join("");
}
function codeHtml(text) {
  try {
    return tokenHtml(E.markedModel(text), -1, false);
  } catch {
    return esc(text);
  }
}
function renderBlocks() {
  const interactive = ch.kind === "select";
  $("blocks").innerHTML = ch.blocks
    .map((blk, b) => `<figure class="mcl-block">${blk.label ? `<figcaption>${esc(blk.label)}</figcaption>` : ""}<pre class="mcl-code${interactive ? " is-selectable" : ""}" ${interactive ? `role="group" aria-label="Code: tap a word to select it"` : ""}><code>${tokenHtml(blk.model, b, interactive)}</code></pre></figure>`)
    .join("");
  if (interactive) for (const btn of $("blocks").querySelectorAll(".tok")) btn.onclick = () => tapToken(Number(btn.dataset.b), Number(btn.dataset.i));
}
function paintSpans() {
  for (const el of $("blocks").querySelectorAll("[data-i]")) {
    const b = Number(el.dataset.b),
      i = Number(el.dataset.i);
    const inSel = selection && selection.block === b && i >= selection.span[0] && i <= selection.span[1];
    el.classList.toggle("in-sel", !!inSel);
    if (el.classList.contains("tok")) el.setAttribute("aria-pressed", String(!!inSel));
    if (closed) {
      const isAns = ch.answers.some((a) => a.block === b && i >= a.span[0] && i <= a.span[1]);
      el.classList.toggle("is-answer", isAns);
      el.classList.toggle("is-wrong", !!inSel && !isAns);
    }
  }
}

/* ------------------------------------------------------------ */
/* Select: tap a token, tap again to expand                      */
/* ------------------------------------------------------------ */
function tapToken(b, i) {
  if (closed) return;
  const model = ch.blocks[b].model;
  const cur = selection && selection.block === b ? selection.span : null;
  selection = { block: b, span: E.nextSelection(model, cur, i) };
  tracker.interact(instance);
  updateSelect();
}
function expandSelection() {
  if (closed || !selection) return;
  const model = ch.blocks[selection.block].model;
  const tok = model.tokens.slice(selection.span[0], selection.span[1] + 1).find((t) => t.sel);
  if (!tok) return;
  const next = E.nextSelection(model, selection.span, tok.i);
  if (next[1] - next[0] > selection.span[1] - selection.span[0]) selection = { block: selection.block, span: next };
  updateSelect();
}
function canExpand() {
  if (!selection) return false;
  const model = ch.blocks[selection.block].model;
  const tok = model.tokens.slice(selection.span[0], selection.span[1] + 1).find((t) => t.sel);
  const next = tok && E.nextSelection(model, selection.span, tok.i);
  return !!next && next[1] - next[0] > selection.span[1] - selection.span[0];
}
function updateSelect() {
  paintSpans();
  const text = selection ? E.spanText(ch.blocks[selection.block].model, selection.span) : "";
  $("sel-text").innerHTML = selection ? `<code>${codeHtml(text)}</code>` : `<span class="muted">nothing yet</span>`;
  $("expand").disabled = closed || !canExpand();
  $("clear").disabled = closed || !selection;
  $("submit").disabled = closed || !selection;
}
function renderSelect() {
  $("interaction").innerHTML =
    `<div class="mcl-select-bar"><span>Selected: <strong id="sel-text"></strong></span>` +
    `<button type="button" class="secondary mcl-small-btn" id="expand">Expand selection</button>` +
    `<button type="button" class="secondary mcl-small-btn" id="clear">Clear</button></div>` +
    `<p class="muted mcl-tip">Tap a word in the code to select it. Tap it again (or press Expand selection) to grow the selection to the whole part around it, such as a full parameter or statement.</p>`;
  $("expand").onclick = expandSelection;
  $("clear").onclick = () => {
    selection = null;
    updateSelect();
  };
  updateSelect();
}

/* ------------------------------------------------------------ */
/* Multiple choice                                               */
/* ------------------------------------------------------------ */
function renderChoices() {
  $("interaction").innerHTML = `<div id="choices" class="mcl-choices" role="radiogroup" aria-labelledby="question">${ch.choices
    .map(
      (c, i) =>
        `<button type="button" class="secondary mcl-choice${ch.codeChoices ? " is-code" : ""}" role="radio" aria-checked="false" data-choice="${i}"><span class="mcl-letter" aria-hidden="true">${"ABCD"[i]}</span><span class="mcl-choice-text">${ch.codeChoices ? `<code>${codeHtml(c.text)}</code>` : esc(c.text)}</span><span class="mcl-mark" aria-hidden="true"></span></button>`,
    )
    .join("")}</div>`;
  for (const btn of $("interaction").querySelectorAll("[data-choice]"))
    btn.onclick = () => {
      if (closed) return;
      chosen = Number(btn.dataset.choice);
      for (const b of $("interaction").querySelectorAll("[data-choice]")) {
        const on = Number(b.dataset.choice) === chosen;
        b.classList.toggle("selected", on);
        b.setAttribute("aria-checked", String(on));
      }
      $("submit").disabled = false;
      tracker.interact(instance);
    };
}

/* ------------------------------------------------------------ */
/* Tap-to-order arguments                                        */
/* ------------------------------------------------------------ */
function renderOrder() {
  const goals = ch.goals.map((gl) => `<li><span class="mcl-goal-label">${esc(gl.label)}</span> <code>${codeHtml(gl.value)}</code></li>`).join("");
  $("interaction").innerHTML =
    `<ul class="mcl-goals" aria-label="Intended values">${goals}</ul>` +
    `<div class="mcl-call" aria-live="polite"><code id="call-line"></code></div>` +
    `<div class="mcl-bank" id="bank" aria-label="Argument tokens"></div>` +
    `<div class="row"><button type="button" class="secondary mcl-small-btn" id="reset-order">Reset</button><span class="muted mcl-tip">Tap a token to place it next. Tap a placed argument to take it back.</span></div>`;
  $("reset-order").onclick = () => {
    if (closed) return;
    order = [];
    drawOrder();
  };
  drawOrder();
}
function drawOrder() {
  const slots = ch.answerOrder.length;
  const text = (id) => ch.tokens.find((t) => t.id === id).text;
  const parts = [];
  for (let k = 0; k < slots; k++) {
    const id = order[k];
    parts.push(id ? `<button type="button" class="mcl-placed" data-placed="${k}" aria-label="Remove ${esc(text(id))}">${codeHtml(text(id))}</button>` : `<span class="mcl-slot" aria-label="empty slot">  ?  </span>`);
  }
  $("call-line").innerHTML = `<span class="tk tk-name">${esc(ch.method)}</span>(${parts.join(", ")});`;
  $("bank").innerHTML = ch.tokens
    .map((t) => `<button type="button" class="secondary mcl-token" data-token="${t.id}" ${order.includes(t.id) || closed ? "disabled" : ""}>${codeHtml(t.text)}</button>`)
    .join("");
  for (const b of $("bank").querySelectorAll("[data-token]"))
    b.onclick = () => {
      if (closed || order.length >= slots || order.includes(b.dataset.token)) return;
      order.push(b.dataset.token);
      tracker.interact(instance);
      drawOrder();
    };
  for (const b of $("call-line").querySelectorAll("[data-placed]"))
    b.onclick = () => {
      if (closed) return;
      order.splice(Number(b.dataset.placed), 1);
      drawOrder();
    };
  $("reset-order").disabled = closed || !order.length;
  $("submit").disabled = closed || order.length !== slots;
}

/* ------------------------------------------------------------ */
/* Lifecycle                                                     */
/* ------------------------------------------------------------ */
function stats() {
  $("stats").textContent = roundSummary(E.GAME_ID);
}
function newChallenge() {
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  const mode = $("mode").value;
  ch = E.generate(mode, rng, { exclude: mode === "mixed" && lastMode ? [lastMode] : [], avoid: new Set(recent), lastGenerator: ch?.generator || null });
  lastMode = ch.mode;
  recent.push(E.signature(ch));
  if (recent.length > 40) recent.shift();
  instance = tracker.begin(E.GAME_ID, E.methodLabGame.name, ch.mode, E.MODES[ch.mode]);
  closed = false;
  selection = null;
  chosen = null;
  order = [];
  $("mode-label").textContent = ch.modeTitle;
  $("concept").textContent = ch.concept;
  $("prompt").textContent = ch.prompt;
  $("prompt").hidden = !ch.prompt;
  $("question").textContent = ch.question;
  $("feedback").hidden = true;
  $("feedback").className = "feedback mcl-feedback";
  $("submit").disabled = true;
  $("skip").hidden = false;
  $("next").hidden = true;
  // For click-the-code questions the question goes above the code so students
  // know what to look for; otherwise the code is read first.
  if (ch.kind === "select") $("stage").insertBefore($("question"), $("blocks"));
  else $("stage").insertBefore($("question"), $("interaction"));
  renderBlocks();
  if (ch.kind === "select") renderSelect();
  else if (ch.kind === "choice") renderChoices();
  else renderOrder();
  stats();
}
function correctAnswerHtml() {
  if (ch.kind === "select") return `<code>${codeHtml(ch.answerText)}</code>`;
  if (ch.kind === "order") return `<code>${codeHtml(ch.answerText)}</code>`;
  const c = ch.choices[ch.answer];
  return ch.codeChoices ? `<code>${codeHtml(c.text)}</code>` : esc(c.text);
}
function submit() {
  if (closed || tracker.status(instance) !== "active") return;
  let response;
  if (ch.kind === "select") response = selection;
  else if (ch.kind === "choice") response = chosen;
  else response = order.slice();
  if (response === null || response === undefined || (Array.isArray(response) && response.length !== ch.answerOrder.length)) return;
  const correct = E.assess(ch, response);
  const result = tracker.submit(instance, correct);
  if (!result.accepted) return;
  // The answer is shown right away, so a wrong first answer is closed as
  // revealed (same convention as the other Java Games).
  if (!correct) tracker.reveal(instance);
  closed = true;
  let why = "";
  if (ch.kind === "choice") {
    for (const b of $("interaction").querySelectorAll("[data-choice]")) {
      const i = Number(b.dataset.choice);
      b.disabled = true;
      const mark = b.querySelector(".mcl-mark");
      if (i === ch.answer) {
        b.classList.add("is-correct");
        mark.textContent = "✓ Correct";
      } else if (i === chosen) {
        b.classList.add("is-wrong");
        mark.textContent = "✗ Your answer";
      }
    }
    if (!correct) why = ch.choices[chosen].why;
  } else if (ch.kind === "select") {
    updateSelect();
    if (!correct) {
      const model = ch.blocks[selection.block].model;
      const role = E.roleOf(model, selection.span);
      const picked = E.spanText(model, selection.span);
      why = role ? `You selected ${picked}, which is ${role.exact ? "" : "part of "}${role.text}.` : `You selected ${picked}.`;
    }
    for (const t of $("blocks").querySelectorAll(".tok")) t.disabled = true;
  } else {
    drawOrder();
    if (!correct) {
      const used = order.find((id) => ch.decoy && id === ch.decoy.id);
      why = used ? ch.decoy.why : `Your call was ${E.orderedCall(ch, order)}`;
    }
  }
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback mcl-feedback ${correct ? "good" : "bad"}`;
  fb.innerHTML =
    `<strong>${correct ? "✓ Correct!" : "✗ Not quite."}</strong> ` +
    (correct ? "" : `Correct answer: ${correctAnswerHtml()}<br>`) +
    `${esc(ch.explanation)}` +
    (why ? `<br><span class="mcl-why">${ch.kind === "choice" ? "About your choice: " : ""}${esc(why)}</span>` : "") +
    `<br><span class="muted mcl-small">${correct ? "First-try correct recorded." : "First attempt recorded."}</span>`;
  $("submit").disabled = true;
  $("skip").hidden = true;
  $("next").hidden = false;
  $("next").focus({ preventScroll: true });
  stats();
}
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
  globalThis.addEventListener?.("pagehide", () => {
    if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  });
  globalThis.addEventListener?.("pageshow", (e) => {
    if (e.persisted) newChallenge();
  });
  newChallenge();
  globalThis.MethodLab = {
    current: () => ch,
    selection: () => selection && { block: selection.block, span: [...selection.span] },
    order: () => order.slice(),
    tracker,
    engine: E,
  };
}
init();
