/* Robot Algorithms UI. Uses the shared Java Games session tracker
   (localStorage key javaGames.session.v1) so results appear in the
   existing Session Summary. */
import * as E from "./engine.js?v=robot-v3";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=java-v1";

const GAME = "robot-algorithms";
const TITLE = "Robot Algorithms";
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ARROWS = ["▲", "▶", "▼", "◀"];
const STEP_MS = { move: 360, turn: 320, crash: 500, bump: 320, default: 140 };

const tracker = sessionTracker();
let ch = null,
  instance = null,
  selected = null,
  placed = null,
  submitted = false,
  lastMode = null,
  rng = Math.random;
const recent = [];
const anim = { timer: null, steps: [], index: 0, playing: false, traces: [], lines: [] };
const builder = { items: [], cursor: -1, history: [], runs: 0 };

/* ------------------------------------------------------------ */
/* Rendering helpers                                             */
/* ------------------------------------------------------------ */
function highlight(raw) {
  const re = /(\/\/.*$)|\b(for|while|if|else|int|void|true|false)\b|\b(robot)\b|\b(\d+)\b|(&amp;&amp;|\|\||!(?!=))/g;
  const safe = esc(raw);
  return safe.replace(re, (m, com, kw, rob, num, op) => {
    if (com) return `<span class="tk-com">${com}</span>`;
    if (kw) return `<span class="tk-kw">${kw}</span>`;
    if (rob) return `<span class="tk-obj">${rob}</span>`;
    if (num) return `<span class="tk-num">${num}</span>`;
    return `<span class="tk-op">${op}</span>`;
  });
}
function renderCode(lines) {
  anim.lines = lines;
  $("code").innerHTML = lines
    .map((l, i) => `<li data-line="${i + 1}"><code>${highlight(l) || "&nbsp;"}</code></li>`)
    .join("");
  $("code").hidden = !lines.length;
}
function setCurrentLine(n) {
  for (const li of document.querySelectorAll("#code li, #builder .ra-program li[data-line]")) {
    const on = Number(li.dataset.line) === n;
    li.classList.toggle("current", on);
    if (on) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  }
}
function robotSvg(d, crashed) {
  return `<svg class="ra-robot${crashed ? " crashed" : ""}" viewBox="0 0 40 40" style="transform:rotate(${d * 90}deg)" aria-hidden="true" focusable="false">
    <polygon class="ra-nose" points="20,1 28,10 12,10"/>
    <rect class="ra-body" x="8" y="10" width="24" height="24" rx="6"/>
    <circle class="ra-eye" cx="15" cy="17" r="3"/><circle class="ra-eye" cx="25" cy="17" r="3"/>
    <rect class="ra-mouth" x="14" y="25" width="12" height="3" rx="1.5"/>
  </svg>`;
}
function worldLabel(w, state) {
  const walls = w.walls.length
    ? `Obstacles at ${w.walls.map((k) => { const [r, c] = k.split(","); return `Row ${r} Col ${c}`; }).join("; ")}.`
    : "No obstacles.";
  const goal = w.goal ? ` Goal at Row ${w.goal.r}, Col ${w.goal.c}.` : "";
  return `${w.rows} rows by ${w.cols} columns. Robot at Row ${state.r}, Col ${state.c}, facing ${E.DIRS[state.d]}.${goal} ${walls}`;
}
function renderGrid(slot, w, state, { trail = [], crash = false, label = "", facing, interactive = false, startMark = null, pick = null } = {}) {
  const wallSet = new Set(w.walls);
  const trailSet = new Set(trail);
  const gridLabel = esc((label ? label + ": " : "") + worldLabel(w, state)) + (interactive ? " Click a cell to move the robot there; click a side of the robot's cell to face that way." : "");
  let html = `<div class="ra-grid${interactive ? " ra-interactive" : ""}" style="--cols:${w.cols};--rows:${w.rows}" role="${interactive ? "group" : "img"}" aria-label="${gridLabel}">`;
  html += `<div class="ra-axis ra-corner" aria-hidden="true">r\\c</div>`;
  for (let c = 0; c < w.cols; c++) html += `<div class="ra-axis" aria-hidden="true">${c}</div>`;
  for (let r = 0; r < w.rows; r++) {
    html += `<div class="ra-axis" aria-hidden="true">${r}</div>`;
    for (let c = 0; c < w.cols; c++) {
      const k = `${r},${c}`;
      const isGoal = w.goal && w.goal.r === r && w.goal.c === c;
      const cls = ["ra-cell", wallSet.has(k) ? "wall" : "", isGoal ? "goal" : "", trailSet.has(k) ? "trail" : ""].join(" ");
      let inner = "";
      if (isGoal) inner += `<span class="ra-star" aria-hidden="true">★</span>`;
      if (isGoal && facing !== undefined) inner += `<span class="ra-need" aria-hidden="true">${ARROWS[facing]}</span>`;
      if (trailSet.has(k) && !(state.r === r && state.c === c)) inner += `<span class="ra-dot" aria-hidden="true"></span>`;
      if (startMark && startMark.r === r && startMark.c === c && !(state.r === r && state.c === c))
        inner += `<span class="ra-start-mark" aria-hidden="true">start</span>`;
      if (pick && pick.r === r && pick.c === c)
        inner += `<span class="ra-pick ${pick.ok ? "ok" : "no"}" aria-hidden="true">${pick.ok ? "✓ you" : "✗ you"}</span>`;
      const here = state.r === r && state.c === c;
      if (here) inner += robotSvg(state.d, crash);
      if (here && interactive)
        inner += [0, 1, 2, 3].map((d) => `<span class="ra-face ra-face-${d}${d === state.d ? " on" : ""}" aria-hidden="true">${ARROWS[d]}</span>`).join("");
      const extra = interactive
        ? ` role="button" tabindex="0" aria-label="${here ? `Robot at Row ${r}, Col ${c}, facing ${E.DIRS[state.d]}. Click a side of this cell, or press an arrow key, to face that way; Enter turns right.` : wallSet.has(k) ? `Row ${r}, Col ${c}: obstacle` : `Move robot to Row ${r}, Col ${c}`}"`
        : "";
      html += `<div class="${cls}${pick && pick.r === r && pick.c === c ? " picked" : ""}" data-cell="${k}"${extra}>${inner}</div>`;
    }
  }
  html += `</div>`;
  slot.innerHTML = (label ? `<div class="ra-grid-label">${esc(label)}</div>` : "") + html;
}
function gridSlots(n) {
  $("grids").innerHTML = Array.from({ length: n }, (_, i) => `<figure class="ra-grid-wrap" data-grid="${i}"></figure>`).join("");
  return [...$("grids").querySelectorAll(".ra-grid-wrap")];
}
function showStart() {
  const worlds = ch.worlds || [ch.world];
  const slots = gridSlots(worlds.length);
  worlds.forEach((w, i) =>
    renderGrid(slots[i], w, w.start, { label: worlds.length > 1 ? `Grid ${"AB"[i]}` : "", facing: ch.req?.facing }),
  );
}

/* ------------------------------------------------------------ */
/* Animation (always skippable; never blocks Next Challenge)     */
/* ------------------------------------------------------------ */
const SHOWN = new Set(["move", "turn", "crash", "bump", "check", "loop", "branch", "call", "return", "var", "error", "end"]);
function stopAnim() {
  if (anim.timer) clearTimeout(anim.timer);
  anim.timer = null;
  anim.playing = false;
  $("pause").textContent = "Play";
}
function startAnimation(traces, worlds, pick = null) {
  stopAnim();
  anim.traces = traces.map((t) => t.filter((s) => SHOWN.has(s.kind) || s.kind === "start"));
  anim.worlds = worlds;
  anim.length = Math.max(...anim.traces.map((t) => t.length));
  anim.index = 0;
  anim.pick = pick;
  $("playback").hidden = false;
  drawFrame();
  revealGrid();
  play();
}
function revealGrid() {
  // On narrow screens the grid sits above the code; bring it into view so the
  // run is visible. Desktop layouts already show both side by side.
  const grid = $("grids");
  if (!grid?.getBoundingClientRect || !grid.scrollIntoView || (globalThis.innerWidth || 1000) > 820) return;
  const box = grid.getBoundingClientRect();
  if (box.top < 0 || box.bottom > (globalThis.innerHeight || 0)) grid.scrollIntoView({ behavior: "smooth", block: "start" });
}
function frameAt(t, i) {
  return t[Math.min(i, t.length - 1)];
}
function drawFrame() {
  const slots = gridSlots(anim.worlds.length);
  anim.worlds.forEach((w, gi) => {
    const t = anim.traces[gi];
    const f = frameAt(t, anim.index);
    const trail = t.slice(0, Math.min(anim.index, t.length - 1) + 1).map((s) => `${s.state.r},${s.state.c}`);
    renderGrid(slots[gi], w, f.state, {
      trail,
      crash: f.kind === "crash",
      label: anim.worlds.length > 1 ? `Grid ${"AB"[gi]}` : "",
      facing: ch.req?.facing,
      pick: gi === 0 ? anim.pick : null,
    });
  });
  const f = frameAt(anim.traces[0], anim.index);
  setCurrentLine(f.line);
  const done = anim.index >= anim.length - 1;
  let status = describe(f, done);
  if (done) {
    status = anim.traces
      .map((t, gi) => {
        const prefix = anim.traces.length > 1 ? `Grid ${"AB"[gi]}: ` : "";
        const bad = t.find((s) => s.kind === "crash" || s.kind === "error");
        if (bad?.kind === "crash") return `${prefix}Stopped: movement error on line ${bad.line}.`;
        if (bad) return `${prefix}Stopped on line ${bad.line}: ${bad.text}`;
        return prefix + describe(t[t.length - 1], true);
      })
      .join("  ");
    setCurrentLine(0);
  }
  $("exec-status").textContent = status;
  $("step-back").disabled = anim.index === 0;
  $("step-fwd").disabled = done;
  $("skip-anim").disabled = done;
}
function describe(f, done) {
  const where = `Row ${f.state.r}, Col ${f.state.c}, facing ${E.DIRS[f.state.d]}`;
  const at = f.line ? `Line ${f.line}: ` : "";
  switch (f.kind) {
    case "start":
      return `Start: ${where}`;
    case "move":
      return `${at}move() → ${where}`;
    case "turn":
      return `${at}turn → facing ${E.DIRS[f.state.d]}`;
    case "crash":
      return `${at}movement error! The next cell is ${f.reason === "edge" ? "off the grid" : "an obstacle"}.`;
    case "bump":
      return `${at}blocked`;
    default:
      return done ? `Finished: ${where}` : `${at}${f.text || f.kind}`;
  }
}
function play() {
  anim.playing = true;
  $("pause").textContent = "Pause";
  tick();
}
function tick() {
  if (!anim.playing) return;
  if (anim.index >= anim.length - 1) {
    stopAnim();
    $("pause").textContent = "Play";
    return;
  }
  const f = frameAt(anim.traces[0], anim.index + 1);
  const ms = STEP_MS[f.kind] || STEP_MS.default;
  anim.timer = setTimeout(() => {
    anim.index++;
    drawFrame();
    tick();
  }, ms);
}
function bindPlayback() {
  $("pause").onclick = () => {
    if (anim.playing) stopAnim();
    else {
      if (anim.index >= anim.length - 1) anim.index = 0;
      play();
    }
  };
  $("step-fwd").onclick = () => {
    stopAnim();
    anim.index = Math.min(anim.length - 1, anim.index + 1);
    drawFrame();
  };
  $("step-back").onclick = () => {
    stopAnim();
    anim.index = Math.max(0, anim.index - 1);
    drawFrame();
  };
  $("skip-anim").onclick = () => {
    stopAnim();
    anim.index = anim.length - 1;
    drawFrame();
  };
  $("replay").onclick = () => {
    stopAnim();
    anim.index = 0;
    drawFrame();
    play();
  };
}

/* ------------------------------------------------------------ */
/* Challenge lifecycle                                           */
/* ------------------------------------------------------------ */
function stats() {
  $("stats").textContent = roundSummary(GAME);
}
function newChallenge() {
  stopAnim();
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  const mode = $("mode").value;
  const avoid = new Set(recent);
  ch = E.generate(mode, rng, { exclude: mode === "mixed" && lastMode ? [lastMode] : [], avoid, lastFamily: ch?.family || null });
  lastMode = ch.mode;
  recent.push(E.signature(ch));
  if (recent.length > 40) recent.shift();
  instance = tracker.begin(GAME, TITLE, ch.mode, E.MODES[ch.mode]);
  selected = null;
  submitted = false;
  render();
  stats();
}
function render() {
  $("mode-label").textContent = ch.modeTitle;
  $("concept").textContent = ch.concept;
  $("prompt").textContent = ch.prompt;
  $("prompt").hidden = !ch.prompt;
  $("note").textContent = ch.note;
  $("note").hidden = !ch.note;
  $("question").textContent = ch.question;
  $("feedback").hidden = true;
  $("feedback").className = "feedback ra-feedback";
  $("playback").hidden = true;
  $("inspect").hidden = true;
  $("inspect").innerHTML = "";
  $("next").hidden = true;
  $("skip").hidden = false;
  $("solution").hidden = true;
  const build = ch.kind === "build";
  $("builder").hidden = !build;
  $("choices").hidden = build;
  $("submit").hidden = build;
  $("run").hidden = !build;
  showStart();
  if (build) {
    renderCode([]);
    builder.items = [];
    builder.cursor = -1;
    builder.history = [];
    builder.runs = 0;
    renderBuilder();
  } else {
    renderCode(ch.code.split("\n"));
    setCurrentLine(0);
    $("choices").classList.toggle("is-place", ch.answerMode === "place");
    $("choices").setAttribute("role", ch.answerMode === "place" ? "group" : "radiogroup");
    if (ch.answerMode === "place") startPlacing();
    else renderChoices();
  }
}

/* ------------------------------------------------------------ */
/* Place-the-robot answers: click a cell to move the robot there */
/* and click the robot to turn it right.                         */
/* ------------------------------------------------------------ */
const TURN_HINT = { location: "Only the cell is graded.", direction: "Only the direction is graded.", state: "Both the cell and the direction are graded." };
function startPlacing() {
  placed = { ...ch.world.start };
  $("choices").innerHTML =
    `<div class="ra-place" aria-live="polite">` +
    `<p class="ra-small muted ra-place-help">Click any open cell to move the robot there. To turn it, click the top, right, bottom, or left side of the robot's cell and it faces that way (clicking the middle turns it right; arrow keys work too). Use it to trace the program as many times as you like, then submit where it ends. ${TURN_HINT[ch.ask.type]}</p>` +
    `<p class="ra-place-answer">Your answer: <strong id="place-status"></strong></p>` +
    `<div class="row ra-place-tools"><button type="button" class="secondary" id="turn-right">Turn right ↻</button><button type="button" class="secondary" id="reset-place">Reset to start</button></div>` +
    `<p id="place-warn" class="ra-small ra-warn" hidden></p></div>`;
  $("turn-right").onclick = () => placeTurn();
  $("reset-place").onclick = () => {
    if (submitted) return;
    placed = { ...ch.world.start };
    drawPlacing();
  };
  $("submit").disabled = false;
  drawPlacing();
}
function placeText(pos) {
  return `Row ${pos.r}, Col ${pos.c}, facing ${E.DIRS[pos.d]}`;
}
function drawPlacing() {
  const slot = gridSlots(1)[0];
  renderGrid(slot, ch.world, placed, { interactive: true, startMark: ch.world.start });
  $("place-status").textContent = ch.ask.type === "location" ? `Row ${placed.r}, Col ${placed.c}` : ch.ask.type === "direction" ? `facing ${E.DIRS[placed.d]}` : placeText(placed);
  for (const cell of slot.querySelectorAll(".ra-cell[data-cell]")) {
    const [r, c] = cell.dataset.cell.split(",").map(Number);
    cell.onclick = (e) => placeAt(r, c, regionOf(cell, e));
    cell.onkeydown = (e) => {
      const arrow = ARROW_KEYS[e.key];
      if (arrow !== undefined && placed.r === r && placed.c === c) {
        // Arrow keys on the robot's cell face that way (keyboard equivalent
        // of clicking the top, right, bottom, or left side of the cell).
        e.preventDefault?.();
        placeFace(arrow);
        $("grids").querySelector(`[data-cell="${r},${c}"]`)?.focus?.();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault?.();
        placeAt(r, c);
        // keep keyboard focus on the cell that was activated
        $("grids").querySelector(`[data-cell="${r},${c}"]`)?.focus?.();
      }
    };
  }
}
const ARROW_KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
/* Which side of a cell was clicked: the cell is split by its diagonals into
   top (Up), right (Right), bottom (Down), and left (Left) triangles. Returns
   null (turn right) for the middle of the cell or when the click has no
   position (keyboard or scripted clicks). */
function regionOf(cell, e) {
  if (!e || typeof e.clientX !== "number" || !cell.getBoundingClientRect) return null;
  const box = cell.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const x = (e.clientX - box.left) / box.width - 0.5;
  const y = (e.clientY - box.top) / box.height - 0.5;
  // The middle of the cell (the robot's body) still turns it right.
  if (Math.abs(x) < 0.18 && Math.abs(y) < 0.18) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 1 : 3;
  return y > 0 ? 2 : 0;
}
function placeFace(d) {
  if (submitted) return;
  placed.d = d;
  tracker.interact(instance);
  drawPlacing();
}
function placeTurn() {
  if (submitted) return;
  placed.d = (placed.d + 1) % 4;
  tracker.interact(instance);
  drawPlacing();
}
function placeAt(r, c, side = null) {
  if (submitted) return;
  $("place-warn").hidden = true;
  if (placed.r === r && placed.c === c) return side === null ? placeTurn() : placeFace(side);
  if (ch.world.walls.includes(`${r},${c}`)) {
    $("place-warn").textContent = "The robot can't stand on an obstacle.";
    $("place-warn").hidden = false;
    return;
  }
  placed.r = r;
  placed.c = c;
  tracker.interact(instance);
  drawPlacing();
}
function submitPlacement() {
  if (submitted) return;
  submitted = true;
  const key = E.placementKey(ch.ask, placed);
  const right = ch.choices[ch.answer];
  const correct = key === right.key;
  const result = tracker.submit(instance, correct);
  if (!correct && result.accepted) tracker.reveal(instance);
  let why = "";
  if (!correct) {
    const m = ch.misconceptions.find((x) => x.key === key);
    if (m) why = m.why;
    else if (ch.ask.type === "state") {
      const [fr, fc, fd] = right.key.slice(2).split(",").map(Number);
      if (placed.r === fr && placed.c === fc) why = `You found the right cell, but the robot ends facing ${E.DIRS[fd]}, not ${E.DIRS[placed.d]}.`;
      else if (placed.d === fd) why = "The direction is right, but the cell is not. Trace each move() one cell at a time.";
    }
    if (!why) why = "Trace the program one line at a time and move the robot one cell for each move().";
  }
  $("submit").disabled = true;
  for (const id of ["turn-right", "reset-place"]) $(id).disabled = true;
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback ra-feedback ${correct ? "good" : "bad"}`;
  fb.innerHTML =
    `<strong>${correct ? "✓ Correct!" : "✗ Not quite."}</strong> ` +
    (correct ? "" : `You answered <strong>${esc(E.keyText(key))}</strong>. The correct answer is <strong>${esc(right.text)}</strong>. `) +
    explanationHtml(ch.explanation) +
    (!correct && why ? `<br><span class="ra-why">About your answer: ${esc(why)}</span>` : "") +
    `<br><span class="muted ra-small">${result.accepted ? (correct ? "First-try correct recorded." : "First attempt recorded. Watch the run below to see why.") : "This challenge was already scored; exploring will not change your result."}</span>`;
  $("skip").hidden = true;
  $("next").hidden = false;
  stats();
  const res = E.run(ch.code, ch.world);
  const pick = ch.ask.type === "direction" ? null : { r: placed.r, c: placed.c, ok: correct };
  startAnimation([res.trace], [ch.world], pick);
  $("next").focus({ preventScroll: true });
}
function renderChoices() {
  $("choices").innerHTML = ch.choices
    .map(
      (c, i) =>
        `<button type="button" class="secondary ra-choice" role="radio" aria-checked="false" data-choice="${i}"><span class="ra-letter" aria-hidden="true">${"ABCD"[i]}</span><span class="ra-choice-text">${formatChoice(c.text)}</span><span class="ra-mark" aria-hidden="true"></span></button>`,
    )
    .join("");
  for (const b of $("choices").querySelectorAll("[data-choice]")) b.onclick = () => choose(Number(b.dataset.choice));
  $("submit").disabled = true;
}
function explanationHtml(text) {
  const [first, ...rest] = String(text).split("\n");
  return esc(first) + (rest.length ? `<pre class="ra-solution">${rest.map(highlight).join("\n")}</pre>` : "");
}
function formatChoice(text) {
  return esc(text).replace(/`([^`]+)`/g, (m, code) => `<code>${code}</code>`);
}
function choose(i) {
  if (submitted) return;
  selected = i;
  for (const b of $("choices").querySelectorAll("[data-choice]")) {
    const on = Number(b.dataset.choice) === i;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-checked", String(on));
  }
  $("submit").disabled = false;
  tracker.interact(instance);
}
function submitChoice() {
  if (submitted || selected === null) return;
  submitted = true;
  const choice = ch.choices[selected];
  const correct = !!choice.correct;
  const result = tracker.submit(instance, correct);
  // The answer is revealed immediately, so an incorrect first answer can never
  // earn later independent credit (matches the shared session convention).
  if (!correct && result.accepted) tracker.reveal(instance);
  const right = ch.choices[ch.answer];
  for (const b of $("choices").querySelectorAll("[data-choice]")) {
    const i = Number(b.dataset.choice);
    b.disabled = true;
    const mark = b.querySelector(".ra-mark");
    if (i === ch.answer) {
      b.classList.add("is-correct");
      mark.textContent = "✓ Correct answer";
    } else if (i === selected) {
      b.classList.add("is-wrong");
      mark.textContent = "✗ Your answer";
    }
  }
  $("submit").disabled = true;
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback ra-feedback ${correct ? "good" : "bad"}`;
  fb.innerHTML =
    `<strong>${correct ? "✓ Correct!" : "✗ Not quite."}</strong> ` +
    (correct ? "" : `The correct answer is <strong>${formatChoice(right.text)}</strong>. `) +
    explanationHtml(ch.explanation) +
    (!correct && choice.why ? `<br><span class="ra-why">About your choice: ${esc(choice.why)}</span>` : "") +
    `<br><span class="muted ra-small">${result.accepted ? (correct ? "First-try correct recorded." : "First attempt recorded. Watch the run below to see why.") : "This challenge was already scored; exploring will not change your result."}</span>`;
  $("skip").hidden = true;
  $("next").hidden = false;
  stats();
  if (ch.kind === "debug") {
    setupInspect();
    runProgramView(right.lines, "fix");
  } else {
    const res = E.run(ch.code, ch.world);
    startAnimation([res.trace], [ch.world]);
  }
  $("next").focus({ preventScroll: true });
}
function runProgramView(lines, which) {
  renderCode(lines);
  const res = E.runSource(lines.join("\n"), ch.world);
  startAnimation([res.trace], [ch.world]);
  for (const b of $("inspect").querySelectorAll("button")) b.classList.toggle("selected", b.dataset.view === which);
}
function setupInspect() {
  const mine = ch.choices[selected];
  const right = ch.choices[ch.answer];
  $("inspect").hidden = false;
  $("inspect").innerHTML =
    `<span class="ra-small muted">Inspect (does not change your score):</span>` +
    `<button type="button" class="secondary" data-view="original">Run original program</button>` +
    (mine !== right ? `<button type="button" class="secondary" data-view="mine">Run your choice</button>` : "") +
    `<button type="button" class="secondary" data-view="fix">Run the correct fix</button>`;
  for (const b of $("inspect").querySelectorAll("button"))
    b.onclick = () => runProgramView(b.dataset.view === "original" ? ch.lines : b.dataset.view === "mine" ? mine.lines : right.lines, b.dataset.view);
}

/* ------------------------------------------------------------ */
/* Build the Route: tap-to-add program editor                    */
/* ------------------------------------------------------------ */
const BLOCK_HEADER = {
  whileCanMove: () => "while (robot.canMove()) {",
  whileNotGoal: () => "while (!robot.atGoal()) {",
};
const LOOP_VARS = ["i", "j", "k", "m"];
function builderLines() {
  const lines = [];
  let depth = 0;
  for (const it of builder.items) {
    if (it.type === "close") {
      depth--;
      lines.push({ text: "    ".repeat(depth) + "}", item: it });
      continue;
    }
    let text;
    if (it.type === "cmd") text = E.LINE[it.name];
    else if (it.kind === "for") {
      const v = LOOP_VARS[depth] || "x" + depth;
      text = `for (int ${v} = 0; ${v} < ${it.count}; ${v}++) {`;
    } else text = BLOCK_HEADER[it.kind]();
    lines.push({ text: "    ".repeat(depth) + text, item: it });
    if (it.type === "open") depth++;
  }
  return lines;
}
function builderCode() {
  return builderLines()
    .map((l) => l.text)
    .join("\n");
}
function snapshotBuilder() {
  builder.history.push(JSON.stringify({ items: builder.items, cursor: builder.cursor }));
  if (builder.history.length > 60) builder.history.shift();
}
function matching(index) {
  // index of the close matching the open at index
  let depth = 0;
  for (let i = index; i < builder.items.length; i++) {
    if (builder.items[i].type === "open") depth++;
    if (builder.items[i].type === "close" && --depth === 0) return i;
  }
  return index;
}
function addItem(kind) {
  if (builder.items.length >= 24) return;
  snapshotBuilder();
  const at = builder.cursor + 1;
  if (E.PALETTE[kind].block) {
    builder.items.splice(at, 0, { type: "open", kind, count: 3, id: Math.random() }, { type: "close", id: Math.random() });
    builder.cursor = at; // inside the new block
  } else {
    builder.items.splice(at, 0, { type: "cmd", name: kind, id: Math.random() });
    builder.cursor = at;
  }
  renderBuilder();
}
function removeItem(i) {
  snapshotBuilder();
  const it = builder.items[i];
  const end = it.type === "open" ? matching(i) : i;
  builder.items.splice(i, end - i + 1);
  builder.cursor = Math.min(i - 1, builder.items.length - 1);
  renderBuilder();
}
function renderBuilder() {
  const lines = builderLines();
  const pal = ch.palette
    .map((k) => `<button type="button" class="secondary ra-pal" data-add="${k}"><code>${esc(E.PALETTE[k].label)}</code></button>`)
    .join("");
  const limit = ch.req.maxStatements;
  let count = 0;
  try {
    count = lines.length ? E.countStatements(builderCode()) : 0;
  } catch {}
  const cursorRow = `<li class="ra-cursor" aria-label="Insertion point"><span>▸ new statements go here</span></li>`;
  const rows = [];
  if (builder.cursor === -1) rows.push(cursorRow);
  lines.forEach((l, i) => {
    const it = l.item;
    const controls = [];
    if (it.type === "open" && it.kind === "for")
      controls.push(
        `<button type="button" class="secondary ra-mini" data-dec="${i}" aria-label="Fewer repetitions">−</button><button type="button" class="secondary ra-mini" data-inc="${i}" aria-label="More repetitions">+</button>`,
      );
    if (it.type !== "close") controls.push(`<button type="button" class="secondary ra-mini" data-del="${i}" aria-label="Delete line ${i + 1}">✕</button>`);
    rows.push(
      `<li data-line="${i + 1}"><button type="button" class="ra-line${builder.cursor === i ? " at-cursor" : ""}" data-pos="${i}" aria-label="Insert after line ${i + 1}"><code>${highlight(l.text)}</code></button><span class="ra-line-tools">${controls.join("")}</span></li>`,
    );
    if (builder.cursor === i) rows.push(cursorRow);
  });
  $("builder").innerHTML =
    `<div class="ra-palette" aria-label="Commands">${pal}</div>` +
    `<ol class="ra-code ra-program" aria-label="Your program">${rows.join("")}</ol>` +
    `<div class="row ra-builder-tools"><span class="ra-small muted">Statements: <strong id="stmt-count">${count}</strong>${limit ? ` / ${limit} allowed` : ""}</span><button type="button" class="secondary ra-mini-wide" id="undo" ${builder.history.length ? "" : "disabled"}>Undo</button><button type="button" class="secondary ra-mini-wide" id="clear" ${lines.length ? "" : "disabled"}>Clear</button></div>` +
    `<p class="ra-small muted">Tap a command to insert it at the ▸ marker. Tap a line to move the marker after it.</p>`;
  for (const b of $("builder").querySelectorAll("[data-add]")) b.onclick = () => addItem(b.dataset.add);
  for (const b of $("builder").querySelectorAll("[data-pos]"))
    b.onclick = () => {
      builder.cursor = Number(b.dataset.pos);
      renderBuilder();
    };
  for (const b of $("builder").querySelectorAll("[data-del]")) b.onclick = () => removeItem(Number(b.dataset.del));
  for (const b of $("builder").querySelectorAll("[data-inc],[data-dec]"))
    b.onclick = () => {
      const i = Number(b.dataset.inc ?? b.dataset.dec);
      const it = builder.items[i];
      snapshotBuilder();
      it.count = Math.max(0, Math.min(9, it.count + (b.dataset.inc !== undefined ? 1 : -1)));
      renderBuilder();
    };
  $("undo").onclick = () => {
    const prev = builder.history.pop();
    if (!prev) return;
    Object.assign(builder, JSON.parse(prev));
    renderBuilder();
  };
  $("clear").onclick = () => {
    snapshotBuilder();
    builder.items = [];
    builder.cursor = -1;
    renderBuilder();
  };
  $("run").disabled = !lines.length;
  $("run").textContent = builder.runs === 0 ? "Run Program" : "Run Again";
}
function runBuild() {
  const code = builderCode();
  if (!code) return;
  stopAnim();
  const result = E.evaluateBuild(ch, code);
  const first = builder.runs === 0;
  builder.runs++;
  let scored = null;
  if (tracker.status(instance) === "active") scored = tracker.submit(instance, result.pass);
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback ra-feedback ${result.pass ? "good" : "bad"}`;
  let msg;
  if (result.pass)
    msg = `<strong>✓ ${first ? "Solved on your first run!" : "It works!"}</strong> Your program meets the objective${ch.worlds.length > 1 ? " on both grids" : ""} using ${result.statements} statement${result.statements === 1 ? "" : "s"}.`;
  else msg = `<strong>✗ Not yet.</strong> ${esc(result.reason)}`;
  let note;
  if (scored?.accepted) {
    if (scored.firstTry) note = "First-try correct recorded.";
    else if (first) note = "Your first run is recorded. Keep experimenting: a later success counts as Solved after retry and does not change first-try accuracy.";
    else if (result.pass) note = "Solved after retry recorded. Your first-run result is unchanged.";
    else note = "Keep experimenting. Your first-run result is unchanged.";
  } else note = "Practice run: this challenge's score is already recorded and will not change.";
  fb.innerHTML = `${msg}<br>${result.pass ? explanationHtml(ch.explanation) : ""}<span class="muted ra-small">${note}</span>`;
  renderCode([]); // the editor itself shows the running line
  renderBuilder();
  startAnimation(result.results.map((r) => r.trace), ch.worlds);
  $("solution").hidden = tracker.status(instance) !== "active" || result.pass;
  if (result.pass || tracker.status(instance) !== "active") {
    $("skip").hidden = true;
    $("next").hidden = false;
  } else $("next").hidden = true;
  stats();
}
function showSolution() {
  if (tracker.status(instance) === "active") tracker.reveal(instance);
  // Load the verified reference program into the editor.
  const items = [];
  for (const raw of ch.reference.split("\n")) {
    const t = raw.trim();
    if (t === "}") items.push({ type: "close", id: Math.random() });
    else if (t.startsWith("for")) items.push({ type: "open", kind: "for", count: Number(t.match(/< (\d+);/)[1]), id: Math.random() });
    else if (t.startsWith("while (robot.canMove())")) items.push({ type: "open", kind: "whileCanMove", id: Math.random() });
    else if (t.startsWith("while (!robot.atGoal())")) items.push({ type: "open", kind: "whileNotGoal", id: Math.random() });
    else items.push({ type: "cmd", name: t.slice(6, t.indexOf("(")), id: Math.random() });
  }
  snapshotBuilder();
  builder.items = items;
  builder.cursor = items.length - 1;
  renderBuilder();
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = "feedback ra-feedback";
  fb.innerHTML = `<strong>Solution shown.</strong> ${explanationHtml(ch.explanation)}<br><span class="muted ra-small">This challenge is recorded as revealed. Press Run Again to watch it.</span>`;
  $("solution").hidden = true;
  $("skip").hidden = true;
  $("next").hidden = false;
  stats();
}

/* ------------------------------------------------------------ */
/* Startup                                                       */
/* ------------------------------------------------------------ */
function init() {
  const params = new URLSearchParams(globalThis.location?.search || "");
  const m = params.get("mode");
  if (m && (m === "mixed" || E.MODES[m])) $("mode").value = m;
  if (params.get("seed")) rng = E.makeRng(Number(params.get("seed")) || 1);
  addSessionNavigation("../");
  bindPlayback();
  $("mode").onchange = newChallenge;
  $("new").onclick = newChallenge;
  $("skip").onclick = newChallenge;
  $("next").onclick = newChallenge;
  $("submit").onclick = () => (ch.answerMode === "place" ? submitPlacement() : submitChoice());
  $("run").onclick = runBuild;
  $("solution").onclick = showSolution;
  document.addEventListener("keydown", (e) => {
    if (!ch || ch.kind === "build" || ch.answerMode === "place" || submitted) return;
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "select" || tag === "input") return;
    if (["1", "2", "3", "4"].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) choose(Number(e.key) - 1);
  });
  // Leaving the page with an unanswered challenge records it as skipped, and a
  // page restored from the back/forward cache starts a fresh challenge
  // (same convention as Math Lab).
  globalThis.addEventListener?.("pagehide", () => {
    if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  });
  globalThis.addEventListener?.("pageshow", (event) => {
    if (event.persisted) newChallenge();
  });
  newChallenge();
  globalThis.RobotAlgorithms = {
    current: () => ch,
    instance: () => instance,
    builderCode,
    placed: () => placed && { ...placed },
    tracker,
    animation: anim,
    engine: E,
  };
}
init();
