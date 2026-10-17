/* Inheritance & Polymorphism Lab UI. Results go to the shared Java Games
   session tracker (localStorage key javaGames.session.v1), one topic per
   practice mode. addSessionNavigation() also starts the shared active-time
   tracker, so this game needs no timer of its own. */
import * as E from "./engine.js?v=iplab-v1";
import { sessionTracker, addSessionNavigation, roundSummary } from "../session.js?v=active-time-v1";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tracker = sessionTracker();
let rng = Math.random,
  picker = null,
  ch = null,
  instance = null,
  closed = false,
  outcome = null,
  resp = null,
  swapObj = null;

/* ======================= Java syntax highlighting ======================= */
const KEYWORDS = new Set("public private protected static final void int double boolean char long class new return if else for while extends super this abstract throw try catch null true false".split(" "));
function highlight(text) {
  let out = "",
    i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith("//")) return out + `<span class="tk-com">${esc(rest)}</span>`;
    if (rest[0] === '"' || rest[0] === "'") {
      let j = 1;
      while (j < rest.length && rest[j] !== rest[0]) j += rest[j] === "\\" ? 2 : 1;
      out += `<span class="tk-str">${esc(rest.slice(0, j + 1))}</span>`;
      i += j + 1;
    } else if (rest[0] === "@" && /^@\w+/.test(rest)) {
      const m = rest.match(/^@\w+/)[0];
      out += `<span class="tk-ann">${esc(m)}</span>`;
      i += m.length;
    } else if (/[0-9]/.test(rest[0])) {
      const m = rest.match(/^[0-9][0-9_.]*/)[0];
      out += `<span class="tk-num">${esc(m)}</span>`;
      i += m.length;
    } else if (/[A-Za-z_$]/.test(rest[0])) {
      const m = rest.match(/^[A-Za-z_$][\w$]*/)[0];
      out += `<span class="${KEYWORDS.has(m) ? "tk-kw" : /^[A-Z]/.test(m) ? "tk-type" : "tk-id"}">${esc(m)}</span>`;
      i += m.length;
    } else {
      out += esc(rest[0]);
      i++;
    }
  }
  return out;
}
/* One element per line; indentation becomes padding so long lines wrap with
   a hanging indent instead of forcing sideways scrolling on phones. */
function codeHtml(code, opts = {}) {
  return code
    .split("\n")
    .map((line, i) => {
      const ind = line.match(/^ */)[0].length;
      const text = line.slice(ind);
      const cls = (opts.classFor && opts.classFor(i)) || "";
      const body = text ? highlight(text) : "&#8203;";
      if (opts.selectable && opts.selectable.includes(i))
        return `<button type="button" class="ln ln-btn ${cls}" style="--ind:${ind}" data-line="${i}" aria-pressed="false" aria-label="Line: ${esc(text)}">${body}</button>`;
      return `<div class="ln ${cls}" style="--ind:${ind}">${body}</div>`;
    })
    .join("");
}
const inlineCode = (t) => `<code class="ip-inline">${highlight(t)}</code>`;
const multiCode = (t) => `<code class="ip-inline">${t.split("\n").map(highlight).join("<br>")}</code>`;

/* ============================ radio groups ============================== */
function radioGroup(items, { name, code = false, letters = false, cls = "" } = {}) {
  return `<div class="ip-radios ${cls}" role="radiogroup" aria-label="${esc(name)}">${items
    .map(
      (t, i) =>
        `<button type="button" class="secondary ip-radio" role="radio" aria-checked="false" tabindex="${i ? -1 : 0}" data-i="${i}">${letters ? `<span class="ip-letter" aria-hidden="true">${"ABCDEFG"[i]}</span>` : ""}<span class="ip-radio-text">${code ? multiCode(t) : esc(t)}</span><span class="ip-mark" aria-hidden="true"></span></button>`,
    )
    .join("")}</div>`;
}
function wireRadios(root, onPick) {
  for (const group of root.querySelectorAll('[role="radiogroup"]')) {
    const btns = [...group.querySelectorAll('[role="radio"]')];
    btns.forEach((b, i) => {
      b.onclick = () => onPick(group, Number(b.dataset.i));
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
  const btns = [...group.querySelectorAll('[role="radio"]')];
  btns.forEach((b) => {
    const on = Number(b.dataset.i) === index;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  if (index == null && btns[0]) btns[0].tabIndex = 0;
}
function markRadios(group, correct, chosen, revealed) {
  for (const b of group.querySelectorAll('[role="radio"]')) {
    const i = Number(b.dataset.i);
    b.disabled = true;
    const mark = b.querySelector(".ip-mark");
    if (i === correct) {
      b.classList.add("is-correct");
      if (mark) mark.textContent = "✓";
    } else if (i === chosen && !revealed) {
      b.classList.add("is-wrong");
      if (mark) mark.textContent = "✗";
    }
  }
}

/* ============================ class diagram ============================= */
function layoutRows(names, parentOf) {
  const depthOf = (n, seen = new Set()) => {
    const p = parentOf[n];
    if (!p || seen.has(n) || !names.includes(p)) return 0;
    seen.add(n);
    return 1 + depthOf(p, seen);
  };
  const rows = [];
  for (const n of names) {
    const d = depthOf(n);
    (rows[d] = rows[d] || []).push(n);
  }
  const pos = {};
  return rows
    .filter(Boolean)
    .map((row) => {
      const sorted = row.slice().sort((a, b) => (pos[parentOf[a]] ?? -1) - (pos[parentOf[b]] ?? -1) || names.indexOf(a) - names.indexOf(b));
      sorted.forEach((n, i) => (pos[n] = i));
      return sorted;
    });
}
function diagramHtml(diagram, opts = {}) {
  const names = diagram.map((c) => c.name);
  const parentOf = opts.parents || Object.fromEntries(diagram.map((c) => [c.name, c.ext]));
  const rows = layoutRows(names, parentOf);
  const box = (name) => {
    const c = diagram.find((x) => x.name === name);
    const tag = opts.selectable ? "button" : "div";
    const methods = c.methods.length
      ? `<ul class="cls-methods">${c.methods
          .map((m) => `<li class="${m.abstract ? "m-abs" : ""} ${m.static ? "m-static" : ""} ${m.private ? "m-priv" : ""}">${m.private ? '<span class="m-flag">private</span> ' : ""}${m.static ? '<span class="m-flag">static</span> ' : ""}${esc(m.sig)}${m.abstract ? ' <span class="m-flag">abstract</span>' : ""}</li>`)
          .join("")}</ul>`
      : opts.showMethods === false
        ? ""
        : `<div class="cls-empty">(no methods of its own)</div>`;
    const pick = opts.connect
      ? `<label class="ext-pick">extends <select data-ext="${esc(name)}" ${closed ? "disabled" : ""}><option value="">— nothing —</option>${names
          .filter((x) => x !== name)
          .map((x) => `<option value="${esc(x)}" ${parentOf[name] === x ? "selected" : ""}>${esc(x)}</option>`)
          .join("")}</select></label>`
      : "";
    const attrs = opts.selectable ? `type="button" aria-pressed="false" aria-label="Class ${esc(name)}"` : "";
    return `${pick}<${tag} class="cls-box ${c.abstract ? "is-abstract" : ""}" data-cls="${esc(name)}" ${attrs}><div class="cls-name">${c.abstract ? '<span class="cls-stereo">«abstract»</span>' : ""}${esc(name)}</div>${methods}</${tag}>`;
  };
  return `<div class="diagram" data-parents='${esc(JSON.stringify(parentOf))}'><svg class="edges" aria-hidden="true"></svg>${rows
    .map((row) => `<div class="drow">${row.map((n) => `<div class="cell">${box(n)}</div>`).join("")}</div>`)
    .join("")}</div>`;
}
function drawEdges(root = document) {
  for (const dg of root.querySelectorAll(".diagram")) {
    const svg = dg.querySelector("svg.edges");
    const parents = JSON.parse(dg.dataset.parents);
    // Coordinates relative to the padding box, where the absolutely
    // positioned SVG lives (so it never overflows the diagram's border).
    const r0 = dg.getBoundingClientRect();
    const base = { left: r0.left + dg.clientLeft, top: r0.top + dg.clientTop };
    svg.setAttribute("width", dg.clientWidth);
    svg.setAttribute("height", dg.clientHeight);
    let html = `<defs><marker id="tri" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path d="M1,1 L11,6 L1,11 Z" fill="#152536" stroke="#9cc3dc" stroke-width="1.4"/></marker></defs>`;
    for (const [child, parent] of Object.entries(parents)) {
      if (!parent) continue;
      const a = dg.querySelector(`.cls-box[data-cls="${CSS.escape(child)}"]`)?.closest(".cell");
      const b = dg.querySelector(`.cls-box[data-cls="${CSS.escape(parent)}"]`);
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - base.left,
        y1 = ra.top - base.top;
      const x2 = rb.left + rb.width / 2 - base.left,
        y2 = rb.bottom - base.top;
      const up = y2 < y1;
      html += `<path d="M${x1},${y1} C${x1},${up ? (y1 + y2) / 2 : y1 - 30} ${x2},${up ? (y1 + y2) / 2 : y2 + 30} ${x2},${y2 + (up ? 2 : 0)}" fill="none" stroke="#9cc3dc" stroke-width="1.6" marker-end="url(#tri)"/>`;
    }
    svg.innerHTML = html;
  }
}
if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => drawEdges()).observe(document.documentElement);

/* ============================ object view =============================== */
function objectViewHtml(ref, layers, { clickable = false, obj } = {}) {
  return `<div class="objview" aria-label="Reference and object">
    <div class="ref-card"><div class="ov-label">reference variable</div>${inlineCode(`${ref.decl} ${ref.v}`)}</div>
    <div class="ov-arrow" aria-hidden="true">refers to →</div>
    <div class="obj-card"><div class="ov-label">object in memory</div><div class="obj-title">a <strong>${esc(obj)}</strong> object</div>
      ${layers
        .map(
          (L) => `<div class="layer"><div class="layer-name">methods declared in ${esc(L.cls)}</div>${
            L.methods.length
              ? L.methods
                  .map((m) =>
                    clickable
                      ? `<button type="button" class="lm ${m.abstract ? "m-abs" : ""}" data-impl="${esc(m.id)}" aria-pressed="false">${m.private ? '<span class="m-flag">private</span> ' : ""}${esc(L.cls)}.${esc(m.sig)}${m.abstract ? ' <span class="m-flag">abstract</span>' : ""}</button>`
                      : `<div class="lm static-lm">${esc(m.sig)}${m.abstract ? ' <span class="m-flag">abstract</span>' : ""}</div>`,
                  )
                  .join("")
              : '<div class="cls-empty">(none)</div>'
          }</div>`,
        )
        .join("")}
    </div></div>`;
}

/* ============================ rendering ================================= */
function renderBlocks() {
  const sel = ch.kind === "line" || ch.kind === "debug" ? ch.blocks[0].selectable : null;
  $("blocks").innerHTML = ch.blocks
    .map((b, bi) => {
      let code = b.code;
      let classFor = null;
      if (ch.kind === "header" && bi === 0) {
        code = headerPreviewCode();
        classFor = (i) => (i === ch.slot ? "ln-edited" : "");
      }
      const selectable = bi === 0 ? sel : null;
      return `<figure class="ip-block${selectable ? " is-selectable" : ""}"><figcaption>${esc(b.label)}</figcaption><div class="ip-code">${codeHtml(code, { selectable, classFor })}</div></figure>`;
    })
    .join("");
  if (sel)
    for (const btn of $("blocks").querySelectorAll(".ln-btn"))
      btn.onclick = () => {
        if (closed) return;
        const line = Number(btn.dataset.line);
        if (ch.kind === "line") resp = line;
        else resp = { ...resp, line };
        touch();
        paintLines();
        update();
      };
  paintLines();
}
function headerPreviewCode() {
  const lines = ch.blocks[0].code.split("\n");
  const ind = lines[ch.slot].match(/^ */)[0];
  const r = resp || {};
  const seg = ch.segments;
  const access = r.access == null ? "▢" : seg.access[r.access] || "";
  const ret = r.ret == null ? "▢" : seg.ret[r.ret];
  const params = r.params == null ? "(▢)" : seg.params[r.params].text;
  lines[ch.slot] = `${ind}${access ? access + " " : ""}${ret} ${ch.name}${params} {`;
  const bi = lines.findIndex((l) => l.trim() === "BODY");
  lines[bi] = lines[bi].replace("BODY", r.params == null ? "// …" : seg.params[r.params].body);
  return lines.join("\n");
}
function paintLines() {
  const chosen = ch.kind === "line" ? resp : resp?.line;
  for (const b of $("blocks").querySelectorAll(".ln-btn")) {
    const i = Number(b.dataset.line);
    b.classList.toggle("selected", i === chosen);
    b.setAttribute("aria-pressed", String(i === chosen));
    if (closed) {
      b.disabled = true;
      const right = ch.kind === "line" ? ch.answer.includes(i) : ch.badLines.includes(i);
      b.classList.toggle("is-answer", right);
      b.classList.toggle("is-wrong", i === chosen && !right && outcome !== "revealed");
    }
  }
  const echo = $("line-echo");
  if (echo && ch.blocks[0]) {
    const lines = ch.blocks[0].code.split("\n");
    echo.innerHTML = chosen == null ? '<span class="muted">none yet — tap a line in the code</span>' : inlineCode(lines[chosen].trim());
  }
}
function renderVisual() {
  const v = $("visual");
  v.innerHTML = "";
  v.className = "ip-visual";
  if (ch.kind === "connect") v.innerHTML = diagramHtml(ch.diagram, { connect: true, parents: resp });
  else if (ch.diagram) v.innerHTML = diagramHtml(ch.diagram, { selectable: ch.kind === "box", showMethods: ch.diagram.some((c) => c.methods.length) ? undefined : false });
  else if (ch.kind === "trace") v.innerHTML = objectViewHtml({ decl: ch.object.decl, v: ch.object.v }, ch.object.layers, { clickable: true, obj: ch.object.obj });
  else if (ch.swap) v.innerHTML = objectViewHtml({ decl: ch.swap.declType, v: ch.swap.v }, ch.swap.layers[swapObj], { obj: swapObj });
  $("workspace").classList.toggle("has-visual", !!v.innerHTML);
  if (ch.kind === "connect")
    for (const s of v.querySelectorAll("select[data-ext]"))
      s.onchange = () => {
        if (closed) return;
        resp = { ...resp, [s.dataset.ext]: s.value || null };
        touch();
        renderVisual();
        v.querySelector(`select[data-ext="${CSS.escape(s.dataset.ext)}"]`)?.focus();
        update();
      };
  if (ch.kind === "box")
    for (const b of v.querySelectorAll(".cls-box"))
      b.onclick = () => {
        if (closed) return;
        resp = b.dataset.cls;
        touch();
        paintBoxes();
        update();
      };
  if (ch.kind === "trace")
    for (const b of v.querySelectorAll("[data-impl]"))
      b.onclick = () => {
        if (closed) return;
        resp = { ...resp, impl: b.dataset.impl };
        touch();
        paintImpl();
        update();
      };
  requestAnimationFrame(() => drawEdges(v));
  paintBoxes();
  paintImpl();
}
function paintBoxes() {
  if (ch.kind !== "box") return;
  for (const b of $("visual").querySelectorAll(".cls-box")) {
    const on = b.dataset.cls === resp;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));
    if (closed) {
      b.disabled = true;
      b.classList.toggle("is-answer", b.dataset.cls === ch.answer);
      b.classList.toggle("is-wrong", on && b.dataset.cls !== ch.answer && outcome !== "revealed");
    }
  }
  const echo = $("box-echo");
  if (echo) echo.innerHTML = resp ? `<strong>${esc(resp)}</strong>` : '<span class="muted">none yet — tap a class box</span>';
}
function paintImpl() {
  if (ch.kind !== "trace") return;
  for (const b of $("visual").querySelectorAll("[data-impl]")) {
    const on = b.dataset.impl === resp?.impl;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));
    if (closed) {
      b.disabled = true;
      b.classList.toggle("is-answer", b.dataset.impl === ch.implAnswer);
      b.classList.toggle("is-wrong", on && b.dataset.impl !== ch.implAnswer && outcome !== "revealed");
    }
  }
  const echo = $("impl-echo");
  if (echo) echo.innerHTML = resp?.impl ? inlineCode(resp.impl) : '<span class="muted">none yet — tap a method in the object</span>';
}

const RENDER = {
  choice() {
    $("interaction").innerHTML = radioGroup(ch.options.map((o) => o.text), { name: ch.question, letters: true, cls: "ip-choices" });
    wireRadios($("interaction"), (g, i) => pick(() => (resp = i), g, i));
    if (resp != null) setRadio($("interaction").querySelector('[role="radiogroup"]'), resp);
  },
  line() {
    $("interaction").innerHTML = `<p class="ip-tip">Selected: <span id="line-echo"></span></p>`;
    paintLines();
  },
  box() {
    $("interaction").innerHTML = `<p class="ip-tip">Selected class: <span id="box-echo"></span></p>`;
    paintBoxes();
  },
  multi() {
    const sel = new Set(resp || []);
    $("interaction").innerHTML = `<p class="ip-tip muted">Select all that apply.</p><div class="ip-multi" role="group" aria-label="Choices">${ch.options
      .map((o, i) => `<button type="button" class="secondary ip-toggle${o === ch.exclusive ? " is-exclusive" : ""}" data-i="${i}" aria-pressed="${sel.has(o)}">${o === ch.exclusive ? esc(o) : inlineCode(o)}<span class="ip-mark" aria-hidden="true"></span></button>`)
      .join("")}</div><div id="multi-why"></div>`;
    for (const b of $("interaction").querySelectorAll(".ip-toggle"))
      b.onclick = () => {
        if (closed) return;
        const o = ch.options[Number(b.dataset.i)];
        const s = new Set(resp || []);
        if (s.has(o)) s.delete(o);
        else {
          if (o === ch.exclusive) s.clear();
          else s.delete(ch.exclusive);
          s.add(o);
        }
        resp = [...s];
        touch();
        for (const x of $("interaction").querySelectorAll(".ip-toggle")) x.setAttribute("aria-pressed", String(s.has(ch.options[Number(x.dataset.i)])));
        update();
      };
  },
  connect() {
    if (!resp) resp = Object.fromEntries(ch.classes.map((c) => [c, null]));
    $("interaction").innerHTML = `<p class="ip-tip muted">Use each box's <strong>extends</strong> menu. Arrows point from a subclass to its superclass, as in UML class diagrams. A class with no extends clause extends Object (not shown).</p>`;
  },
  rows() {
    if (!Array.isArray(resp)) resp = ch.rows.map(() => null);
    $("interaction").innerHTML = `<ol class="ip-rows">${ch.rows
      .map(
        (r, i) =>
          `<li data-row="${i}"><div class="ip-row-label">${r.code ? inlineCode(r.label) : `<strong>${esc(r.label)}</strong>`}${ch.swap ? ` <button type="button" class="ip-small secondary" data-show="${esc(r.obj)}" aria-label="Show the ${esc(r.obj)} object in the diagram">show object</button>` : ""}</div>${radioGroup(r.options, { name: r.label })}<p class="ip-row-why" hidden></p></li>`,
      )
      .join("")}</ol>`;
    wireRadios($("interaction"), (g, v) => {
      if (closed) return;
      const i = Number(g.closest("[data-row]").dataset.row);
      resp[i] = v;
      setRadio(g, v);
      touch();
      update();
    });
    $("interaction").querySelectorAll("[data-row]").forEach((li, i) => resp[i] != null && setRadio(li.querySelector('[role="radiogroup"]'), resp[i]));
    for (const b of $("interaction").querySelectorAll("[data-show]"))
      b.onclick = () => {
        swapObj = b.dataset.show;
        const blk = ch.blocks[1];
        blk.code = blk.code.replace(/new \w+\(\)/, `new ${swapObj}()`);
        renderBlocks();
        renderVisual();
        for (const x of $("interaction").querySelectorAll("[data-show]")) x.setAttribute("aria-pressed", String(x.dataset.show === swapObj));
      };
    if (ch.swap) for (const x of $("interaction").querySelectorAll("[data-show]")) x.setAttribute("aria-pressed", String(x.dataset.show === swapObj));
  },
  sequence() {
    if (!resp || !resp.order) resp = { order: [], output: null };
    $("interaction").innerHTML =
      `<div class="ip-step"><span class="ip-step-n">1</span> Order:</div><ol class="ip-seq" id="seq" aria-live="polite"></ol>` +
      `<div class="ip-bank" id="bank" aria-label="Available steps"></div><div class="row"><button type="button" class="secondary ip-small" id="seq-reset">Reset order</button><span class="muted ip-tip">Tap to add the next step; tap a placed step to remove it.</span></div>` +
      (ch.outputOptions ? `<div class="ip-step"><span class="ip-step-n">2</span> Output:</div>` + radioGroup(ch.outputOptions, { name: "Output", code: true, cls: "ip-outputs" }) : "");
    $("seq-reset").onclick = () => {
      if (closed) return;
      resp.order = [];
      drawSeq();
    };
    wireRadios($("interaction"), (g, i) => {
      if (closed) return;
      resp.output = i;
      setRadio(g, i);
      touch();
      update();
    });
    if (resp.output != null) setRadio($("interaction").querySelector(".ip-outputs"), resp.output);
    drawSeq();
  },
  trace() {
    if (!resp || typeof resp !== "object") resp = { compiler: null, impl: null, output: null };
    $("interaction").innerHTML =
      `<div class="ip-step"><span class="ip-step-n">1</span> Compile time: which class does the compiler check for this call?</div>` +
      radioGroup(ch.compilerOptions, { name: "Class the compiler checks", cls: "ip-compiler" }) +
      `<div class="ip-step"><span class="ip-step-n">2</span> Run time: which implementation runs? <span id="impl-echo"></span></div>` +
      `<div class="ip-step"><span class="ip-step-n">3</span> Output:</div>` +
      radioGroup(ch.outputOptions, { name: "Output", code: true, cls: "ip-outputs" });
    const groups = $("interaction").querySelectorAll('[role="radiogroup"]');
    wireRadios($("interaction"), (g, i) => {
      if (closed) return;
      if (g.classList.contains("ip-compiler")) resp.compiler = i;
      else resp.output = i;
      setRadio(g, i);
      touch();
      update();
    });
    if (resp.compiler != null) setRadio(groups[0], resp.compiler);
    if (resp.output != null) setRadio(groups[1], resp.output);
    paintImpl();
  },
  header() {
    if (!resp || typeof resp !== "object") resp = { access: null, ret: null, params: null };
    const seg = ch.segments;
    $("interaction").innerHTML =
      `<div class="ip-step">Access modifier</div>` + radioGroup(seg.access.map((a) => a || "(no modifier)"), { name: "Access", cls: "ip-seg", code: true }) +
      `<div class="ip-step">Return type</div>` + radioGroup(seg.ret, { name: "Return type", cls: "ip-seg", code: true }) +
      `<div class="ip-step">Parameter list</div>` + radioGroup(seg.params.map((p) => ch.name + p.text), { name: "Parameters", cls: "ip-seg", code: true });
    const groups = [...$("interaction").querySelectorAll('[role="radiogroup"]')];
    const keys = ["access", "ret", "params"];
    wireRadios($("interaction"), (g, i) => {
      if (closed) return;
      resp[keys[groups.indexOf(g)]] = i;
      setRadio(g, i);
      touch();
      renderBlocks();
      update();
    });
    groups.forEach((g, k) => resp[keys[k]] != null && setRadio(g, resp[keys[k]]));
  },
  debug() {
    if (!resp || typeof resp !== "object") resp = { outcome: null, line: null, fix: null };
    let n = 1;
    $("interaction").innerHTML =
      (ch.askOutcome ? `<div class="ip-step"><span class="ip-step-n">${n++}</span> What goes wrong?</div>` + radioGroup(ch.outcomeOptions, { name: "Kind of problem", cls: "ip-outcome" }) : "") +
      `<div class="ip-step"><span class="ip-step-n">${n++}</span> Line that causes it: <span id="line-echo"></span></div>` +
      `<div class="ip-step"><span class="ip-step-n">${n++}</span> Fix:</div>` +
      radioGroup(ch.fixes.map((f) => f.label), { name: "Fix", code: true, cls: "ip-fixes" });
    wireRadios($("interaction"), (g, i) => {
      if (closed) return;
      if (g.classList.contains("ip-outcome")) resp.outcome = i;
      else resp.fix = i;
      setRadio(g, i);
      touch();
      update();
    });
    if (resp.outcome != null && ch.askOutcome) setRadio($("interaction").querySelector(".ip-outcome"), resp.outcome);
    if (resp.fix != null) setRadio($("interaction").querySelector(".ip-fixes"), resp.fix);
    paintLines();
  },
};
function pick(set, g, i) {
  if (closed) return;
  set();
  setRadio(g, i);
  touch();
  update();
}
function drawSeq() {
  const label = (id) => ch.chips.find((c) => c.id === id).label;
  $("seq").innerHTML = resp.order.length
    ? resp.order.map((id, k) => `<li><button type="button" class="ip-placed" data-k="${k}" ${closed ? "disabled" : ""} aria-label="Remove ${esc(label(id))}">${inlineCode(label(id))}</button></li>`).join("")
    : '<li class="muted ip-empty">(empty)</li>';
  $("bank").innerHTML = ch.chips.map((c) => `<button type="button" class="secondary ip-chipbtn" data-id="${esc(c.id)}" ${closed || resp.order.includes(c.id) ? "disabled" : ""}>${inlineCode(c.label)}</button>`).join("");
  for (const b of $("bank").querySelectorAll("[data-id]"))
    b.onclick = () => {
      if (closed || resp.order.includes(b.dataset.id)) return;
      resp.order.push(b.dataset.id);
      touch();
      drawSeq();
    };
  for (const b of $("seq").querySelectorAll("[data-k]"))
    b.onclick = () => {
      if (closed) return;
      resp.order.splice(Number(b.dataset.k), 1);
      drawSeq();
    };
  $("seq-reset").disabled = closed || !resp.order.length;
  update();
}

/* ============================ lifecycle ================================= */
function complete() {
  const r = resp;
  switch (ch.kind) {
    case "choice":
    case "line":
    case "box":
      return r != null;
    case "multi":
      return !!r && r.length > 0;
    case "connect":
      return !!r && Object.values(r).some(Boolean);
    case "rows":
      return Array.isArray(r) && r.every((x) => x != null);
    case "sequence":
      return !!r && r.order.length > 0 && (!ch.outputOptions || r.output != null);
    case "trace":
      return !!r && r.compiler != null && r.impl != null && r.output != null;
    case "header":
      return !!r && r.access != null && r.ret != null && r.params != null;
    case "debug":
      return !!r && (!ch.askOutcome || r.outcome != null) && r.line != null && r.fix != null;
  }
  return false;
}
function update() {
  $("submit").disabled = closed || !complete();
}
function touch() {
  if (instance) tracker.interact(instance);
}
function stats() {
  $("stats").textContent = roundSummary(E.GAME_ID);
}
function renderAll() {
  $("interaction").innerHTML = "";
  renderBlocks();
  renderVisual();
  RENDER[ch.kind]();
  update();
}
function newChallenge(item) {
  if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  ch = item ? E.instantiate(item, rng) : E.generate($("mode").value, picker, rng);
  instance = tracker.begin(E.GAME_ID, E.ipLabGame.name, ch.mode, E.MODES[ch.mode]);
  closed = false;
  outcome = null;
  resp = null;
  swapObj = ch.swap ? ch.swap.objs[0] : null;
  // The hierarchy builder starts with NO links, so the diagram can't give the answer away.
  if (ch.kind === "connect") resp = Object.fromEntries(ch.classes.map((c) => [c, null]));
  $("mode-label").textContent = ch.modeTitle;
  $("family").textContent = ch.familyTitle;
  $("instructions").textContent = ch.instructions;
  $("prompt").textContent = ch.prompt;
  $("prompt").hidden = !ch.prompt;
  $("question").textContent = ch.question;
  $("feedback").hidden = true;
  $("stage").dataset.kind = ch.kind;
  for (const id of ["submit", "show", "skip"]) $(id).hidden = false;
  $("next").hidden = true;
  renderAll();
  stats();
}
function submit() {
  if (closed || !complete() || tracker.status(instance) !== "active") return;
  const result = E.assess(ch, resp);
  const rec = tracker.submit(instance, result.correct);
  if (!rec.accepted) return;
  // The answer is shown right away, so a wrong first answer is closed as
  // revealed (the same convention as the other Java Games).
  if (!result.correct) tracker.reveal(instance);
  finish(result.correct ? "correct" : "wrong", result);
}
function showAnswer() {
  if (closed || tracker.status(instance) !== "active") return;
  tracker.reveal(instance);
  const a = E.answerFor(ch);
  resp = a && typeof a === "object" ? JSON.parse(JSON.stringify(a)) : a;
  closed = false;
  renderAll();
  finish("revealed", E.assess(ch, resp));
}

function finish(kind, result) {
  closed = true;
  outcome = kind;
  const notes = [];
  let correctHtml = "";
  const mine = kind === "wrong";
  const I = $("interaction");
  switch (ch.kind) {
    case "choice": {
      markRadios(I.querySelector('[role="radiogroup"]'), ch.answer, resp, kind === "revealed");
      correctHtml = esc(ch.options[ch.answer].text);
      if (mine) notes.push(["About your choice", ch.options[resp].why]);
      break;
    }
    case "line": {
      paintLines();
      correctHtml = inlineCode(ch.blocks[0].code.split("\n")[ch.answer[0]].trim());
      break;
    }
    case "box": {
      paintBoxes();
      correctHtml = `<strong>${esc(ch.answer)}</strong>`;
      break;
    }
    case "multi": {
      const sel = new Set(resp || []);
      for (const b of I.querySelectorAll(".ip-toggle")) {
        const o = ch.options[Number(b.dataset.i)];
        const right = ch.answer.includes(o);
        b.disabled = true;
        b.classList.add(right ? "is-correct" : sel.has(o) && kind !== "revealed" ? "is-wrong" : "is-dim");
        b.querySelector(".ip-mark").textContent = right ? "✓" : sel.has(o) && kind !== "revealed" ? "✗" : "";
      }
      $("multi-why").innerHTML = `<ul class="ip-why-list">${ch.options.map((o) => `<li class="${ch.answer.includes(o) ? "ok" : "no"}">${o === ch.exclusive ? esc(o) : inlineCode(o)} — ${esc(ch.explain[o])}</li>`).join("")}</ul>`;
      correctHtml = ch.answer.map((o) => (o === ch.exclusive ? esc(o) : inlineCode(o))).join(", ");
      break;
    }
    case "connect": {
      renderVisual();
      const wrong = ch.classes.filter((c) => (resp?.[c] ?? null) !== ch.answer[c]);
      correctHtml = ch.classes.map((c) => `${esc(c)} extends ${esc(ch.answer[c] || "Object")}`).join(" · ");
      if (mine) notes.push(["Check", wrong.map((c) => `${c}'s declaration says ${ch.answer[c] ? "extends " + ch.answer[c] : "no extends clause"}`).join("; ") + "."]);
      // show the correct diagram
      $("visual").insertAdjacentHTML("beforeend", `<div class="ip-correct-diagram"><div class="ov-label">correct hierarchy</div>${diagramHtml(ch.diagram)}</div>`);
      requestAnimationFrame(() => drawEdges($("visual")));
      break;
    }
    case "rows": {
      I.querySelectorAll("[data-row]").forEach((li, i) => {
        const r = ch.rows[i];
        markRadios(li.querySelector('[role="radiogroup"]'), r.answer, resp[i], kind === "revealed");
        const ok = resp[i] === r.answer;
        li.classList.add(ok || kind === "revealed" ? "row-ok" : "row-bad");
        const w = li.querySelector(".ip-row-why");
        w.hidden = false;
        w.textContent = `${kind === "revealed" ? "" : ok ? "✓ " : "✗ Answer: " + r.options[r.answer] + ". "}${r.why || ""}`;
      });
      correctHtml = "see each row above";
      break;
    }
    case "sequence": {
      drawSeq();
      if (ch.outputOptions) markRadios(I.querySelector(".ip-outputs"), ch.outputOptions.indexOf(ch.output), resp.output, kind === "revealed");
      const label = (id) => ch.chips.find((c) => c.id === id)?.label || id;
      correctHtml = ch.answer.map((id) => inlineCode(label(id))).join(" → ") + (ch.outputText != null ? `<br>Output: ${inlineCode(JSON.stringify(ch.outputText))}` : "");
      if (mine && !result.orderOk) notes.push(["Your order", resp.order.map(label).join(" → ") || "(empty)"]);
      break;
    }
    case "trace": {
      const g = I.querySelectorAll('[role="radiogroup"]');
      markRadios(g[0], ch.compilerOptions.indexOf(ch.compilerAnswer), resp.compiler, kind === "revealed");
      markRadios(g[1], ch.outputOptions.indexOf(ch.output), resp.output, kind === "revealed");
      paintImpl();
      correctHtml = `compiler checks <strong>${esc(ch.compilerAnswer)}</strong>; runs ${inlineCode(ch.implAnswer)}; prints ${inlineCode(JSON.stringify(ch.output))}`;
      break;
    }
    case "header": {
      for (const g of I.querySelectorAll('[role="radiogroup"]')) for (const b of g.querySelectorAll("button")) b.disabled = true;
      const valid = [];
      const S = ch.segments;
      for (let a = 0; a < S.access.length; a++) for (let t = 0; t < S.ret.length; t++) for (let p = 0; p < S.params.length; p++) if (E.headerValid(ch, { access: a, ret: t, params: p })) valid.push(E.headerText(ch, { access: a, ret: t, params: p }));
      correctHtml = `any of: ${valid.map(inlineCode).join(", ")}`;
      if (mine) notes.push(["Your header", E.headerText(ch, resp) + " — " + headerWhy(resp)]);
      break;
    }
    case "debug": {
      paintLines();
      if (ch.askOutcome) markRadios(I.querySelector(".ip-outcome"), ch.outcomeAnswer, resp.outcome, kind === "revealed");
      const fixG = I.querySelector(".ip-fixes");
      for (const b of fixG.querySelectorAll("button")) {
        const i = Number(b.dataset.i);
        b.disabled = true;
        if (ch.fixes[i].ok) {
          b.classList.add("is-correct");
          b.querySelector(".ip-mark").textContent = "✓";
        } else if (i === resp.fix && kind !== "revealed") {
          b.classList.add("is-wrong");
          b.querySelector(".ip-mark").textContent = "✗";
        }
      }
      const lines = ch.blocks[0].code.split("\n");
      correctHtml = `${ch.askOutcome ? esc(ch.outcomeOptions[ch.outcomeAnswer]) + "; " : ""}line ${inlineCode(lines[ch.badLines[0]].trim())}; fix ${ch.fixes.filter((f) => f.ok).map((f) => inlineCode(f.label)).join(" or ")}`;
      if (ch.actual != null) notes.push(["What it actually prints", ch.actual]);
      if (mine && result.outcomeOk === false) notes.push(["Kind of problem", `It ${["doesn't compile", "compiles but crashes at run time", "runs but prints the wrong result"][ch.outcomeAnswer]}.`]);
      if (mine && !result.lineOk) notes.push(["Line", "That line isn't where the defect is."]);
      if (mine && !result.fixOk && ch.fixes[resp.fix]) notes.push(["About your fix", ch.fixes[resp.fix].why]);
      break;
    }
  }
  const fb = $("feedback");
  fb.hidden = false;
  fb.className = `feedback ip-feedback ${kind === "correct" ? "good" : kind === "wrong" ? "bad" : "shown"}`;
  const head = kind === "correct" ? "✓ Correct!" : kind === "wrong" ? "✗ Not quite." : "Answer shown.";
  const review =
    ch.kind === "choice"
      ? `<details class="ip-review"><summary>Review every choice</summary><ul>${ch.options.map((o) => `<li><span class="${o.ok ? "ok" : "no"}">${o.ok ? "✓" : "✗"}</span> ${esc(o.text)}${o.ok ? "" : " — " + esc(o.why)}</li>`).join("")}</ul></details>`
      : "";
  fb.innerHTML =
    `<strong>${head}</strong>` +
    (kind !== "correct" && correctHtml ? `<span class="ip-correct">Correct answer: ${correctHtml}</span>` : "") +
    `<p>${esc(ch.explanation)}</p>` +
    notes.map(([t, w]) => `<p class="ip-why"><strong>${esc(t)}:</strong> ${esc(w)}</p>`).join("") +
    review +
    `<p class="muted ip-small-text">${kind === "correct" ? "First-try correct recorded." : kind === "wrong" ? "Your first attempt was recorded; this challenge is now revealed." : "Recorded as revealed (no credit)."}</p>`;
  for (const id of ["submit", "show", "skip"]) $(id).hidden = true;
  $("submit").disabled = true;
  $("next").hidden = false;
  $("next").focus({ preventScroll: true });
  stats();
}
function headerWhy(r) {
  const S = ch.segments,
    q = ch.required;
  const access = S.access[r.access];
  const rank = { private: 0, "": 1, protected: 2, public: 3 };
  if (JSON.stringify(S.params[r.params].types) !== JSON.stringify(q.types)) return `the parameter types (${S.params[r.params].types.join(", ") || "none"}) don't match (${q.types.join(", ")}), so this is an overload and the abstract method stays unimplemented.`;
  if (S.ret[r.ret] !== q.ret) return `the return type must be ${q.ret}.`;
  if (rank[access] < rank[q.access]) return `${access || "package access"} is weaker than the abstract method's ${q.access || "package access"}.`;
  return "this one is valid.";
}

function init() {
  const params = new URLSearchParams(globalThis.location?.search || "");
  const m = params.get("mode");
  if (m && (m === "mixed" || E.MODES[m])) $("mode").value = m;
  if (params.get("seed")) rng = E.makeRng(Number(params.get("seed")) || 1);
  picker = E.createPicker(rng);
  addSessionNavigation("../");
  $("mode").onchange = () => newChallenge();
  $("new").onclick = () => newChallenge();
  $("skip").onclick = () => newChallenge();
  $("next").onclick = () => newChallenge();
  $("submit").onclick = submit;
  $("show").onclick = showAnswer;
  globalThis.addEventListener?.("pagehide", () => {
    if (instance && tracker.status(instance) === "active") tracker.skip(instance);
  });
  newChallenge();
  globalThis.IPLab = {
    current: () => ch,
    response: () => (resp && typeof resp === "object" ? JSON.parse(JSON.stringify(resp)) : resp),
    tracker,
    engine: E,
    load: (id) => newChallenge(E.ITEMS.find((i) => i.id === id)),
  };
}
init();
