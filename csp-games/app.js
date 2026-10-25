import { mountCollectionEditor } from "./collection-editor.js?v=java-v1";
import { practiceGames } from "./practice-engine.js?v=platform-expansion-v2";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=per-mode-daily-v1";
import * as E from "./engine.js?v=platform-expansion-v2";
import { startCodeConcepts } from "./concepts-ui.js?v=platform-expansion-v2";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
export const catalog = [
  ["internet-layers-lab", "Internet Layers & Protocol Roles Lab", "4 · Networks", "4.1–4.3", "NET", "Reason about protocol roles, communication steps and resilient packet paths."],
  ["vocabulary-fill-in-lab", "AP CSP Vocabulary Fill-in Lab", "All five Big Ideas", "1–5", "WORDS", "Complete contextual vocabulary statements with a plausible word bank and immediate explanation."],
  ["roundoff-overflow-lab", "Roundoff vs. Overflow Lab", "2 · Data", "2.1", "RANGE", "Distinguish insufficient range, insufficient precision and exact numerical representation."],
  ["lossless-lossy-lab", "Lossless vs. Lossy Compression Lab", "2 · Data", "2.2", "COMPRESSION", "Choose compression from exact-restoration and fidelity requirements."],
  ["analog-digital-lab", "Analog vs. Digital Lab", "2 · Data", "2.1", "SIGNALS", "Classify continuous quantities and discrete representations in quick two-choice rounds."],
  ["ascii-binary-builder", "ASCII Binary Name Builder", "2 · Data", "2.1", "ASCII", "Build characters and text with eight-bit binary and live ASCII decoding."],
  ["rgb-color-builder", "RGB Color Code Builder", "2 · Data", "2.1", "RGB", "Build a target color by toggling RGB bits or changing hexadecimal digits, with live color feedback."],
  ...Object.entries(practiceGames).map(([slug, g]) => [
    slug,
    g.title,
    g.group,
    g.topics,
    g.icon,
    g.description,
  ]),
  [
    "code-concepts",
    "Code Concepts",
    "3 · Algorithms and Programming",
    "3.1–3.6 / 3.8 / 3.10 / 3.12–3.13",
    "{ }",
    "Identify code components and computing concepts through forward and reverse practice.",
  ],
  [
    "binary-builder",
    "Binary Builder",
    "2 · Data",
    "2.1",
    "01",
    "Toggle bits and build unsigned binary numbers.",
  ],
  [
    "compression-challenge",
    "Compression Challenge",
    "2 · Data",
    "2.2",
    "▦",
    "Encode text and pixels, then optimize lossless storage.",
  ],
  [
    "data-detective",
    "Data Detective",
    "2 · Data",
    "2.3–2.4",
    "▥",
    "Explore tables, inspect graphs, and build visualizations.",
  ],
  [
    "boolean-gatekeeper",
    "Boolean Gatekeeper",
    "3 · Algorithms and Programming",
    "3.5",
    "∧",
    "Evaluate nested expressions and adjust their inputs.",
  ],
  [
    "list-lab",
    "List Lab",
    "3 · Algorithms and Programming",
    "3.2 / 3.10",
    "[ ]",
    "Manipulate lists and assemble working list operations.",
  ],
  [
    "binary-search-hunt",
    "Binary Search Hunt",
    "3 · Algorithms and Programming",
    "3.11",
    "⌕",
    "Choose midpoints and narrow a hidden sorted list.",
  ],
  [
    "algorithm-race",
    "Algorithm Race",
    "3 · Algorithms and Programming",
    "3.17",
    "⇄",
    "Predict efficiency and compare counted execution steps.",
  ],
  [
    "network-breaker",
    "Network Breaker",
    "4 · Computer Systems and Networks",
    "4.1–4.2",
    "⌁",
    "Remove the fewest links to disconnect two targets.",
  ],
  [
    "packet-router",
    "Packet Router",
    "4 · Computer Systems and Networks",
    "4.1–4.2",
    "⇢",
    "Plan packet routes and reroute around failed links.",
  ],
  [
    "parallel-processing-race",
    "Parallel Processing Race",
    "4 · Computer Systems and Networks",
    "4.3",
    "▤",
    "Assign tasks to processors and minimize finishing time.",
  ],
  [
    "cybersecurity-defender",
    "Cybersecurity Defender",
    "5 · Impact of Computing",
    "5.6",
    "◇",
    "Inspect fictional messages and design safer account protection.",
  ],
];
const slug = document.body.dataset.game || "",
  game = catalog.find((g) => g[0] === slug);
let currentInstance = null,
  roundTopic = "",
  inCheck = false,
  generating = false;
const tracker = sessionTracker();
const gameHints = {
  "binary-builder": [
    "Each 1 contributes its place value; each 0 contributes nothing.",
    "Add the values under your 1 bits and compare that total with the target.",
    "Start with the largest place value that fits, then consider the remaining amount.",
  ],
  "boolean-gatekeeper": [
    "A Boolean expression evaluates to TRUE or FALSE.",
    "Evaluate comparisons before applying AND, OR, and NOT.",
    "AND needs both sides true, OR needs at least one, and NOT reverses a truth value.",
  ],
  "list-lab": [
    "List indices start at one and refer to the current list.",
    "After insertion or removal, later positions shift.",
    "Work through operations in order; compare the resulting ordered values with the requested state.",
  ],
  "binary-search-hunt": [
    "Binary search inspects the midpoint of the active range.",
    "Eliminate the side ruled out by the inspected value, then find the new midpoint.",
    "Use the lower midpoint of an even-sized range. Absence is established only when the active range is empty.",
  ],
  "packet-router": [
    "A route needs a working connection between every consecutive pair of nodes.",
    "Inspect unavailable links and look for alternate connections.",
    "A valid route begins at the source, ends at the destination, and uses only available links.",
  ],
  "compression-challenge": [
    "Lossless encoding must reconstruct every original symbol in order.",
    "Each run needs a count and symbol; scan order affects where runs begin and end.",
    "Compare run overhead with raw storage and merge adjacent runs of the same symbol when permitted.",
  ],
  "data-detective": [
    "Use the stated goal and the data shown; avoid unsupported assumptions.",
    "Check every required condition and the meaning of each axis or selected row.",
    "Distinguish categorical comparisons, changes over time, and relationships between numeric variables.",
  ],
  "algorithm-race": [
    "Efficiency depends on the specified input and step model.",
    "Compare how much work each algorithm performs, not just its name.",
    "Count repeated work or shrinking search regions under the conditions in this round.",
  ],
  "cybersecurity-defender": [
    "Evaluate evidence and protections in context. Urgency alone is not phishing evidence.",
    "Check known identities, actual destinations, requests, and account protections.",
    "Separate suspicious evidence from ordinary context; long unique credentials and an additional factor address different risks.",
  ],
  "parallel-processing-race": [
    "The finishing time is determined by the last processor to finish.",
    "Balance workloads; dependencies can cause waiting time.",
    "Consider both total work and prerequisite tasks, not just the number of processors.",
  ],
};
function beginRound(topic = roundTopic || slug) {
  if (currentInstance) tracker.skip(currentInstance);
  currentInstance = tracker.begin(
    slug,
    game[1],
    topic,
    topic.replaceAll("-", " "),
    topic,
    topic.replaceAll("-", " "),
  );
}
function feedback(ok, message, score = inCheck) {
  let outcome = null;
  if (score) {
    outcome = tracker.submit(currentInstance, ok);
    if (!outcome.accepted) {
      $("feedback").hidden = false;
      $("feedback").className = "feedback";
      $("feedback").textContent =
        "This challenge is already complete or belongs to a reset session. Choose New Challenge to continue.";
      return;
    }
  }
  if (score && !ok) {
    const record = tracker.snapshot().records[currentInstance],
      hints = (slug === "binary-builder" &&
      !roundTopic.startsWith("representation")
        ? [
            "Bit patterns determine capacity; distinguish a count of possible values from the greatest value.",
            "Each additional bit doubles the possibilities. Keep zero in the representable range and distinguish raw pixel data from metadata.",
            "For overflow, compare the mathematical sum with the unsigned range, then apply only the stated wrap rule. For an image, count pixels and bits per pixel.",
          ]
        : gameHints[slug]) || ["Review the concept and retry."];
    message = hints[Math.min(2, record.submissions - 1)];
    if ($("simulation")) $("simulation").innerHTML = "";
  }
  $("feedback").className = "feedback " + (ok ? "good" : "bad");
  $("feedback").textContent = (ok ? "✓ " : "↻ ") + message;
  $("feedback").hidden = false;
  $("stats").textContent = roundSummary(slug, roundTopic || slug);
  $("feedback").focus();
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", () => {
    if (currentInstance) tracker.skip(currentInstance);
  });
if (typeof document !== "undefined") {
  for (const type of ["click", "change", "input"])
    document.addEventListener(type, (event) => {
      if (event.target.closest?.("#stage") && currentInstance)
        tracker.interact?.(currentInstance);
    });
}
function clearFeedback() {
  $("feedback").hidden = true;
}
function mount(content) {
  if (generating) {
    beginRound();
    generating = false;
  }
  $("stage").innerHTML = content;
}
const button = (id, text, secondary = false) =>
  `<button id="${id}" ${secondary ? 'class="secondary"' : ""}>${text}</button>`;
const select = (id, label, options) =>
  `<label>${label} <select id="${id}">${options.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>`;
const numeric = (id, label, value, min = 0, max = 12) =>
  `<label>${label} <input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="1"></label>`;
function setup(controls, newRound) {
  $("controls").innerHTML = controls;
  const generate = () => {
    generating = true;
    roundTopic = slug;
    newRound();
    generating = false;
  };
  for (const control of $("controls").querySelectorAll("select"))
    control.addEventListener("change", generate);
  $("new").onclick = generate;
  generate();
}
function check(id, fn) {
  $(id).onclick = () => {
    if (tracker.status(currentInstance) !== "active") {
      feedback(false, "", true);
      return;
    }
    inCheck = true;
    try {
      fn();
    } catch (e) {
      feedback(false, e.message, false);
    } finally {
      inCheck = false;
    }
  };
}
const modeOptions = (items) => [["mixed", "Mixed Practice"], ...items];
function chosenMode(items) {
  roundTopic = $("mode").value === "mixed" ? E.pick(items) : $("mode").value;
  return roundTopic;
}
if (!game) {
  document.title = "CSP Games | DevCat Studios";
  $("main").innerHTML =
    `<div class="eyebrow">DevCat Studios · AP Computer Science Principles</div><h1>Think it. Try it.<br>Make it work.</h1><p class="intro">Interactive practice for curious problem solvers. Build, route, search, and experiment—with fresh challenges every time.</p><p><span class="status">${catalog.length} games</span> &nbsp; No sign-in · Unlimited practice · Immediate feedback</p>` +
    [...new Set(catalog.map((g) => g[2]))]
      .map(
        (group) =>
          `<section><h2>${group === "All five Big Ideas" ? "Mixed AP Practice" : "Big Idea " + group}</h2><div class="grid">${catalog
            .filter((g) => g[2] === group)
            .map(
              (g) =>
                `<article class="card"><div class="icon" aria-hidden="true">${g[4]}</div><h3>${g[1]}</h3><small>Topics ${g[3]}</small><p>${g[5]}</p><a class="button" href="${g[0]}/">Play <span class="sr-only">${g[1]}</span> →</a></article>`,
            )
            .join("")}</div></section>`,
      )
      .join("") +
    `<section class="panel roadmap"><div class="eyebrow">Development roadmap</div><h2>Platform expansion roadmap</h2><p><a href="coverage.html">View the 35-topic curriculum coverage matrix</a> · <a href="session-summary/">Open your Session Summary</a></p><p>The shared Session Summary is available across all games. New activities include expanded Code Concepts, Response Builder, Test Case Builder, Algorithm Architect, Computing Impact Lab, Simulation Lab, and Mixed AP Exam Practice.</p><p class="muted">Browser activities supplement authentic projects, collaboration, and teacher-reviewed writing. Consult the coverage matrix for limitations and remaining gaps.</p></section>`;
} else {
  document.title = game[1] + " | CSP Games";
  $("main").innerHTML =
    `<div class="eyebrow">Big Idea ${game[2]} · Topics ${game[3]}</div><h1>${game[1]}</h1><p class="intro">${game[5]}</p><div class="toolbar"><div id="controls" class="row"></div>${button("new", "New Challenge", true)}</div><section id="stage" class="panel"></section><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div><p id="stats" class="stats">Practice results are stored in this browser. Open Session Summary to share a report.</p>`;
  const loaders = {
    "code-concepts": startCodeConcepts,
    "binary-builder": binary,
    "boolean-gatekeeper": booleanGame,
    "list-lab": listLab,
    "binary-search-hunt": search,
    "packet-router": router,
    "compression-challenge": compression,
    "data-detective": detective,
    "algorithm-race": race,
    "cybersecurity-defender": security,
    "parallel-processing-race": parallel,
  };
  loaders[slug]?.();
}
function binary() {
  let n, target, bits, mode, extension;
  setup(
    select(
      "mode",
      "Mode",
      modeOptions([
        ["representation", "Decimal to binary"],
        ["capacity", "Capacity & maximum"],
        ["overflow", "Unsigned overflow"],
        ["pixels", "Pixel representation"],
      ]),
    ) +
      select(
        "length",
        "Bit length",
        [4, 6, 8, 16].map((n) => [n, n + " bits"]),
      ),
    () => {
      clearFeedback();
      n = +$("length").value;
      mode = chosenMode(["representation", "capacity", "overflow", "pixels"]);
      roundTopic = mode + " / " + n + "-bit";
      extension = E.binaryExtension(mode, n);
      if (mode === "capacity") {
        mount(
          `<p>An unsigned identifier uses <strong>${n} bits</strong>. Configure its capacity and greatest representable value.</p>${numeric("capacity-answer", "Distinct values", "", 0, 65536)}${numeric("maximum-answer", "Greatest unsigned value", "", 0, 65535)}${button("check", "Check Answer")}`,
        );
        check("check", () => {
          if (
            !$("capacity-answer").value.trim() ||
            !$("maximum-answer").value.trim()
          )
            throw Error("Enter both whole-number answers.");
          feedback(
            +$("capacity-answer").value === extension.capacity &&
              +$("maximum-answer").value === extension.max,
            `Correct. ${n} bits represent ${extension.capacity} distinct values, from 0 through ${extension.max}.`,
          );
        });
        return;
      }
      if (mode === "overflow") {
        mount(
          `<p>A device stores unsigned ${n}-bit values. It adds <strong>${extension.a} + ${extension.b}</strong>.</p><p>For this model only, a result too large wraps modulo 2^${n}. Actual systems may handle overflow differently.</p>${select(
            "overflow-answer",
            "Does the mathematical sum exceed the representable range?",
            [
              ["", "Choose…"],
              ["yes", "Yes"],
              ["no", "No"],
            ],
          )}${numeric("wrapped-answer", "Value stored under the stated wrap rule", "", 0, 65535)}${button("check", "Check Answer")}`,
        );
        check("check", () => {
          if (!$("overflow-answer").value || !$("wrapped-answer").value.trim())
            throw Error("Complete both parts before checking.");
          feedback(
            $("overflow-answer").value ===
              (extension.overflow ? "yes" : "no") &&
              +$("wrapped-answer").value === extension.result,
            `The mathematical sum is ${extension.a + extension.b}. The greatest ${n}-bit value is ${extension.max}. Under this stated wrap rule, the stored result is ${extension.result}.`,
          );
        });
        return;
      }
      target = mode === "pixels" ? extension.target : E.int(0, 2 ** n - 1);
      bits = Array(n).fill(0);
      mount(
        `${mode === "pixels" ? `<p>A 3 × 3 grayscale image stores one unsigned ${n}-bit intensity per pixel. 0 is black; ${extension.max} is white. Encode the outlined pixel and calculate storage for the raw pixel data (no metadata or compression).</p><div class="pixel-practice">${extension.pixels.map((v, i) => `<div class="pixel-cell ${i === extension.index ? "pixel-target" : ""}" style="background:rgb(${Math.round((255 * v) / extension.max)} ${Math.round((255 * v) / extension.max)} ${Math.round((255 * v) / extension.max)})"><span>${v}</span></div>`).join("")}</div>` : ""}<p>Toggle each bit. Place values double as you move left.</p><p>Target decimal: <span class="big-number">${target}</span></p><div class="bits">${bits.map((_, i) => `<div class="bit"><button id="bit${i}" aria-label="Bit with place value ${2 ** (n - i - 1)}" aria-pressed="false">0</button><small>${2 ** (n - i - 1)}</small></div>`).join("")}</div><p>Your decimal value: <strong id="value">0</strong></p>${mode === "pixels" ? numeric("pixel-size", "Raw image size (bits)", "", 0, 100000) : ""}${button("check", "Check Answer")}`,
      );
      bits.forEach((_, i) => {
        $("bit" + i).onclick = () => {
          bits[i] ^= 1;
          $("bit" + i).textContent = bits[i];
          $("bit" + i).classList.toggle("selected", !!bits[i]);
          $("bit" + i).setAttribute("aria-pressed", !!bits[i]);
          $("value").textContent = E.binaryValue(bits);
          clearFeedback();
        };
      });
      check("check", () => {
        let v = E.binaryValue(bits);
        if (mode === "pixels" && !$("pixel-size").value.trim())
          throw Error("Enter the raw image size before checking.");
        feedback(
          v === target &&
            (mode !== "pixels" || +$("pixel-size").value === extension.size),
          v === target
            ? `${target} = ${bits.join("")} in binary. Each 1 contributes its place value.${mode === "pixels" ? ` Nine pixels at ${n} bits per pixel require ${extension.size} bits of raw data.` : ""}`
            : `Your bits total ${v}; the target is ${target}. Add the place values under your 1 bits, then adjust and retry.`,
        );
      });
    },
  );
}
function booleanGame() {
  let c,
    mode,
    answer = null;
  setup(
    select(
      "mode",
      "Mode",
      modeOptions([
        ["evaluate", "Evaluate expression"],
        ["make", "Make it TRUE"],
      ]),
    ),
    () => {
      clearFeedback();
      c = E.booleanChallenge();
      mode = chosenMode(["evaluate", "make"]);
      if (mode === "make" && E.evaluate(c.e, c.values)) {
        let found = false;
        for (let x = 0; x <= 12 && !found; x++) {
          for (let y = 0; y <= 12; y++) {
            if (!E.evaluate(c.e, { x, y })) {
              c.values = { x, y };
              found = true;
              break;
            }
          }
        }
      }
      answer = null;
      mount(
        `<p>${mode === "evaluate" ? "Set the output switch to the result of this expression." : "Adjust x and y (whole numbers 0–12) to open the gate. A valid combination exists."}</p>${mode === "evaluate" ? `<pre>x ← ${c.values.x}\ny ← ${c.values.y}</pre>` : `<div class="row">${numeric("x", "x", c.values.x)}${numeric("y", "y", c.values.y)}</div>`}<pre>${esc(E.formatExpression(c.e))}</pre>${mode === "evaluate" ? `<div class="row">${button("true", "Output: TRUE", true)}${button("false", "Output: FALSE", true)}</div>` : ""}<div class="actions">${button("check", "Check Answer")}</div>`,
      );
      if (mode === "evaluate")
        for (let v of [true, false])
          $(String(v)).onclick = () => {
            answer = v;
            for (let b of [true, false])
              $(String(b)).classList.toggle("selected", b === v);
            clearFeedback();
          };
      check("check", () => {
        let v =
          mode === "make" ? { x: +$("x").value, y: +$("y").value } : c.values;
        if (
          !Object.values(v).every(
            (x) => Number.isInteger(x) && x >= 0 && x <= 12,
          )
        )
          throw Error("Use whole numbers from 0 through 12.");
        if (mode === "evaluate" && answer === null)
          throw Error("Set the output switch before checking.");
        let result = E.evaluate(c.e, v);
        feedback(
          mode === "make" ? result : answer === result,
          `${mode === "make" ? (result ? "The gate opens!" : "The gate stays closed. Adjust the inputs and retry.") : answer === result ? "Correct evaluation." : "The output switch does not match the expression."}\n${E.explainExpression(c.e, v)}`,
        );
      });
    },
  );
}
function listLab() {
  let c,
    mode,
    working,
    editor,
    ops = [];
  function renderList() {
    if (mode === "execute") {
      editor = mountCollectionEditor($("list"), {
        initial: c.start,
        bank: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        indexBase: 1,
        onChange: (values) => {
          working = values;
          clearFeedback();
        },
        active: () => tracker.status(currentInstance) === "active",
      });
      $("list").cspEditor = editor;
      return;
    }
    $("list").innerHTML =
      working
        .map(
          (x, i) =>
            `<div class="token"><small>index ${i + 1}</small><strong>${x}</strong>${mode === "execute" ? `<button data-remove="${i}" class="secondary" aria-label="Remove element at index ${i + 1}">Remove</button><button data-left="${i}" class="secondary" ${i === 0 ? "disabled" : ""} aria-label="Move element ${i + 1} left">←</button><button data-right="${i}" class="secondary" ${i === working.length - 1 ? "disabled" : ""} aria-label="Move element ${i + 1} right">→</button>` : ""}</div>`,
        )
        .join("") || "<p>Empty list</p>";
    for (let b of $("list").querySelectorAll("[data-remove]"))
      b.onclick = () => {
        working.splice(+b.dataset.remove, 1);
        clearFeedback();
        renderList();
      };
    for (let side of ["left", "right"])
      for (let b of $("list").querySelectorAll(`[data-${side}]`))
        b.onclick = () => {
          let i = +b.dataset[side],
            j = i + (side === "left" ? -1 : 1);
          [working[i], working[j]] = [working[j], working[i]];
          clearFeedback();
          renderList();
        };
  }
  function renderOps() {
    $("ops").innerHTML =
      ops
        .map(
          (o, i) =>
            `<div class="row"><code>${esc(E.operationText(o))}</code><button data-up="${i}" class="secondary" ${!i ? "disabled" : ""}>↑</button><button data-down="${i}" class="secondary" ${i === ops.length - 1 ? "disabled" : ""}>↓</button><button data-delete="${i}" class="secondary">Delete</button></div>`,
        )
        .join("") || '<p class="muted">Your program is empty.</p>';
    for (let action of ["up", "down", "delete"])
      for (let b of $("ops").querySelectorAll(`[data-${action}]`))
        b.onclick = () => {
          let i = +b.dataset[action];
          if (action === "delete") ops.splice(i, 1);
          else {
            let j = i + (action === "up" ? -1 : 1);
            [ops[i], ops[j]] = [ops[j], ops[i]];
          }
          clearFeedback();
          renderOps();
        };
  }
  setup(
    select(
      "mode",
      "Mode",
      modeOptions([
        ["execute", "Execute the code"],
        ["build", "Build the code"],
      ]),
    ),
    () => {
      clearFeedback();
      c = E.listChallenge();
      mode = chosenMode(["execute", "build"]);
      working = [...c.start];
      ops = [];
      mount(
        `<p>Indices start at 1. INSERT shifts items right; REMOVE shifts items left.</p><pre>numbers ← [${c.start.join(", ")}]${mode === "execute" ? "\n\n" + c.ops.map(E.operationText).join("\n") : ""}</pre>${mode === "build" ? `<p>Target list: <strong>[${c.target.join(", ")}]</strong></p><p>Add and arrange operations. Any valid program that produces the target is accepted.</p>` : "<p>Manipulate the working list to show the final state. The list can grow and shrink; no final length is provided.</p>"}<div id="list" class="tokens"></div>${
          mode === "build"
            ? `<div class="row">${select("operation", "Operation", [
                ["INSERT", "INSERT"],
                ["APPEND", "APPEND"],
                ["REMOVE", "REMOVE"],
              ])}${numeric("index", "Index", 1, 1, 40)}${numeric("item", "Value", 1, 0, 99)}${button("add", mode === "build" ? "Add operation" : "Apply edit", true)}</div>`
            : ""
        }${mode === "build" ? '<div id="ops"></div>' : ""}<div class="actions">${mode === "build" ? button("reset", "Reset work", true) : ""}${button("check", "Check Answer")}</div>`,
      );
      renderList();
      if (mode === "build") renderOps();
      if ($("add"))
        $("add").onclick = () => {
          let o = {
            type: $("operation").value,
            index: +$("index").value,
            value: +$("item").value,
          };
          if (!Number.isInteger(o.value) || o.value < 0 || o.value > 99) {
            feedback(false, "Use whole-number values 0–99.");
            return;
          }
          clearFeedback();
          if (mode === "build") {
            ops.push(o);
            renderOps();
          } else
            try {
              working = E.applyOperation(working, o);
              renderList();
            } catch (e) {
              feedback(false, e.message);
            }
        };
      if ($("reset"))
        $("reset").onclick = () => {
          if (tracker.status(currentInstance) !== "active") return;
          working = [...c.start];
          ops = [];
          clearFeedback();
          renderList();
          if (mode === "build") renderOps();
        };
      check("check", () => {
        let result = mode === "build" ? E.runOperations(c.start, ops) : working;
        feedback(
          E.equal(result, c.target),
          E.equal(result, c.target)
            ? `Correct! Final list: [${result.join(", ")}].`
            : `Your final list is [${result.join(", ")}]. ${mode === "execute" ? "Expected: [" + c.target.join(", ") + "]. Trace each operation in order; later indices refer to the updated list." : "It does not match the target. Adjust your operations and retry."}`,
        );
      });
    },
  );
}
function search() {
  let c, lo, hi, history, errors, found, finished;
  function draw() {
    $("cards").innerHTML = c.values
      .map(
        (v, i) =>
          `<button id="card${i}" class="search-card ${i < lo || i > hi ? "eliminated" : ""} ${found === i ? "found" : ""}" ${finished || history.includes(i) || i < lo || i > hi ? "disabled" : ""}><small>index ${i + 1}</small>${history.includes(i) ? v : "?"}</button>`,
      )
      .join("");
    $("range").textContent =
      lo <= hi
        ? `Active range: indices ${lo + 1}–${hi + 1}`
        : "The active range is empty.";
    c.values.forEach((_, i) => {
      let b = $("card" + i);
      b.onclick = () => {
        if (finished) return;
        let correct = i === E.midpoint(lo, hi);
        if (!correct)
          errors.push(
            `At range ${lo + 1}–${hi + 1}, selected ${i + 1}; midpoint was ${E.midpoint(lo, hi) + 1}.`,
          );
        history.push(i);
        let v = c.values[i];
        if (v === c.target) {
          found = i;
          finished = true;
        } else if (v < c.target) lo = i + 1;
        else hi = i - 1;
        if (lo > hi) finished = true;
        $("revealed").textContent =
          `Card ${i + 1}: ${v}. ${v === c.target ? "Target found." : v < c.target ? "Eliminate this card and all lower indices." : "Eliminate this card and all higher indices."}`;
        draw();
      };
    });
  }
  setup(
    select(
      "size",
      "List size",
      [7, 15, 31].map((n) => [n, n + " cards"]),
    ) +
      select("presence", "Target", [
        ["mixed", "Present or absent"],
        ["present", "Always present"],
        ["absent", "Always absent"],
      ]),
    () => {
      clearFeedback();
      c = E.searchChallenge(+$("size").value, $("presence").value);
      lo = 0;
      hi = c.values.length - 1;
      history = [];
      errors = [];
      found = null;
      finished = false;
      mount(
        `<p>The hidden list is sorted from low to high. Choose the midpoint of the active range each time. Use the lower midpoint if a range has an even number of cards.</p><p>Target: <span class="big-number">${c.target}</span></p><p id="range"></p><div id="cards" class="search-cards"></div><p id="revealed">Choose your first midpoint.</p><div class="actions">${button("found", "Submit: target found")}${button("absent", "Submit: target absent", true)}${button("retry", "Retry this search", true)}</div>`,
      );
      draw();
      $("retry").onclick = () => {
        lo = 0;
        hi = c.values.length - 1;
        history = [];
        errors = [];
        found = null;
        finished = false;
        clearFeedback();
        $("revealed").textContent = "Choose your first midpoint.";
        draw();
      };
      for (let result of ["found", "absent"])
        check(result, () => {
          let outcome =
            result === "found" ? found !== null : lo > hi && found === null;
          let ok = outcome && !errors.length;
          feedback(
            ok,
            ok
              ? `${c.present ? "Target found" : "Absence established"} in ${history.length} comparisons. Each correct midpoint cuts the remaining range roughly in half.`
              : `${!outcome ? "Finish the search and submit the matching outcome." : ""}${errors.length ? "\nMidpoint errors:\n" + errors.join("\n") + "\nRetry this search to follow binary search correctly." : ""}`,
          );
        });
    },
  );
}
function graphMarkup(g, route) {
  let points = Array.from({ length: g.n }, (_, i) => {
    let a = (i / g.n) * Math.PI * 2 - Math.PI / 2;
    return [300 + 210 * Math.cos(a), 235 + 180 * Math.sin(a)];
  });
  return `<svg class="network" viewBox="0 0 600 470" role="group" aria-label="Network. Use the node buttons below or select nodes on this diagram.">${g.edges.map(([a, b], k) => `<line x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}" class="${g.broken.has(k) ? "broken" : route.some((v, i) => i && [route[i - 1], v].includes(a) && [route[i - 1], v].includes(b)) ? "used" : ""}"/>`).join("")}${points.map(([x, y], i) => `<g class="node ${route.includes(i) ? "selected" : ""}" data-node="${i}" role="button" tabindex="0" aria-label="Node ${String.fromCharCode(65 + i)}${i === g.start ? ", start" : i === g.end ? ", destination" : ""}"><circle cx="${x}" cy="${y}" r="24"/><text x="${x}" y="${y + 5}" text-anchor="middle">${String.fromCharCode(65 + i)}</text></g>`).join("")}</svg>`;
}
function router() {
  let g,
    route,
    phase = 0;
  function draw() {
    $("diagram").innerHTML = graphMarkup(g, route);
    $("route").textContent = route
      .map((i) => String.fromCharCode(65 + i))
      .join(" → ");
    for (let b of $("diagram").querySelectorAll("[data-node]")) {
      const act = () => append(+b.dataset.node);
      b.onclick = act;
      b.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          act();
        }
      };
    }
  }
  function append(i) {
    if (route.length < 20) {
      route.push(i);
      clearFeedback();
      draw();
    }
  }
  setup("", () => {
    clearFeedback();
    g = E.networkChallenge();
    route = [g.start];
    phase = 0;
    mount(
      `<p>Route a packet from <strong>A</strong> to <strong>E</strong>. Click nodes in route order. Dashed red links are unavailable. Any complete working route is accepted.</p><p id="failure"></p><div id="diagram"></div><div class="row">${Array.from({ length: 8 }, (_, i) => button("node" + i, String.fromCharCode(65 + i), true)).join("")}</div><p>Your route: <strong id="route"></strong></p><div class="actions">${button("undo", "Undo node", true)}${button("reset", "Reset route", true)}${button("send", "Send Packet")}${button("fail", "Simulate another failure", true)}</div>`,
    );
    draw();
    for (let i = 0; i < 8; i++) $("node" + i).onclick = () => append(i);
    $("undo").onclick = () => {
      if (route.length > 1) route.pop();
      clearFeedback();
      draw();
    };
    $("reset").onclick = () => {
      route = [g.start];
      clearFeedback();
      draw();
    };
    check("send", () => {
      let ok = E.validRoute(g, route);
      feedback(
        ok,
        ok
          ? `Delivered in ${route.length - 1} links. ${phase ? "You rerouted around a network failure." : "Try another link failure to explore redundancy."} The shortest route is not required.`
          : "The route must start at A, end at E, and use an available link for every consecutive node. Inspect dashed links and missing connections, then retry.",
      );
    });
    $("fail").onclick = () => {
      let candidates = E.shuffle(
        g.edges.map((_, i) => i).filter((i) => !g.broken.has(i)),
      );
      candidates.sort((a, b) => {
        const used = (k) => g.edges[k].every((v) => route.includes(v));
        return Number(used(b)) - Number(used(a));
      });
      let blocked = false;
      for (let k of candidates) {
        g.broken.add(k);
        if (E.connected(g.n, g.edges, g.start, g.end, g.broken)) {
          blocked = true;
          break;
        }
        g.broken.delete(k);
      }
      if (blocked) beginRound("rerouting");
      phase++;
      $("failure").textContent = blocked
        ? "Another link failed. A working route still exists. Reset or edit your route and send again."
        : "Further failures would disconnect this pair. Start a New Challenge for another network.";
      clearFeedback();
      draw();
    };
  });
}
function compression() {
  let c, mode;
  setup(
    select(
      "mode",
      "Mode",
      modeOptions([
        ["text", "Text compression"],
        ["image", "Image compression"],
        ["optimize", "Compression optimization"],
      ]),
    ),
    () => {
      clearFeedback();
      mode = chosenMode(["text", "image", "optimize"]);
      c = E.compressionChallenge(mode);
      mount(
        `<p>${mode === "optimize" ? "Create the smallest lossless representation under these rules." : "Encode the data using run-length encoding (RLE)."} ${c.image ? "Choose a row or column scan, then encode that sequence." : "Read left to right."}</p><details open><summary>Encoding and storage rules</summary><p>Use tokens such as <code>3:A 2:B</code>: 3 copies of A, then 2 copies of B. Counts are unsigned 1-byte integers (1–255); each symbol is 1 byte. Each RLE token costs 2 bytes. Spaces and colons are entry notation and cost no bytes. Combining adjacent runs of the same symbol saves space.</p><p>Raw data costs 1 byte per symbol. ${c.image ? "Images add a 1-byte scan-order header to RLE; raw pixels use fixed row order. Known dimensions are excluded from both sizes." : "No other headers are counted."} ${mode === "optimize" ? "Raw storage or RLE are the only allowed representations." : "This mode requires RLE even when it increases storage size."}</p></details>${
          c.image
            ? `<div class="pixel-grid" aria-label="6 by 6 pixel grid">${c.grid
                .flat()
                .map((v) => `<div class="pixel c${v}">${v}</div>`)
                .join(
                  "",
                )}</div><p>Symbols 0, 1, and 2 identify pixel colors.</p>`
            : `<pre>${c.a.join("")}</pre>`
        }<p>Uncompressed: <strong>${c.raw} bytes</strong></p><div class="row">${
          c.image
            ? select("order", "Scan order", [
                ["rows", "Rows: left to right, top to bottom"],
                ["columns", "Columns: top to bottom, left to right"],
              ])
            : ""
        }${
          mode === "optimize"
            ? select("method", "Representation", [
                ["rle", "RLE"],
                ["raw", "Raw symbols"],
              ])
            : ""
        }</div><p><label for="encoding">Your representation</label></p><textarea id="encoding" spellcheck="false" placeholder="${c.image ? "2:0 4:1 …" : "3:A 2:B …"}"></textarea><div class="actions">${button("check", "Check Compression")}</div>`,
      );
      if ($("method"))
        $("method").onchange = () => {
          clearFeedback();
          $("encoding").placeholder =
            $("method").value === "raw"
              ? "Every raw symbol, no spaces"
              : "3:A 2:B …";
        };
      if ($("order")) $("order").onchange = clearFeedback;
      check("check", () => {
        let order = $("order")?.value || "rows",
          method = $("method")?.value || "rle",
          sequence = c.image
            ? E.flattenGrid(c.grid, method === "raw" ? "rows" : order)
            : c.a,
          decoded =
            method === "rle"
              ? E.decodeRLE($("encoding").value, c.alphabet)
              : $("encoding").value.trim().split("");
        let lossless = E.equal(sequence, decoded),
          size =
            method === "raw"
              ? decoded.length
              : $("encoding").value.trim().split(/\s+/).length * 2 +
                (c.image ? 1 : 0),
          options = E.compressionOptions(c).filter(
            (o) => mode === "optimize" || o.method === "rle",
          ),
          best = Math.min(...options.map((o) => o.size)),
          optimal = options.find((o) => o.size === best),
          ok = lossless && (mode !== "optimize" || size === best);
        feedback(
          ok,
          `Your size: ${size} bytes. Optimal ${mode === "optimize" ? "allowed representation" : "RLE size"}: ${best} bytes. Space ${c.raw - size >= 0 ? "saved" : "added"}: ${Math.abs(c.raw - size)} bytes (${Math.round((Math.abs(c.raw - size) / c.raw) * 100)}%).\n${!lossless ? "The decoded symbols do not match. Check counts, symbols, and scan order." : mode === "optimize" && size > best ? "Lossless, but a smaller representation exists. Try merging runs, another scan order, or raw storage." : "Lossless encoding verified."}\n${size > c.raw ? "Short runs can make compression increase size. " : ""}The optimum uses ${optimal.method.toUpperCase()}${c.image ? " with " + optimal.order + " order" : ""}.`,
        );
      });
    },
  );
}
function chartSVG(
  data,
  type,
  xkey,
  ykey,
  selected = new Set(),
  interactive = false,
) {
  const W = 640,
    H = 310,
    L = 55,
    R = 20,
    T = 20,
    B = 60,
    xs = data.map((d, i) => (xkey === "index" ? i + 1 : Number(d[xkey]))),
    ys = data.map((d) => Number(d[ykey])),
    mx = Math.max(...xs.filter(Number.isFinite), 1),
    my = Math.max(...ys, 1);
  const x = (v, i) =>
      type === "scatter"
        ? L + (v / mx) * (W - L - R)
        : L + ((i + 0.5) / data.length) * (W - L - R),
    y = (v) => H - B - (v / my) * (H - T - B);
  const attrs = (d, i) =>
    `class="mark ${selected.has(i) ? "selected" : ""}" data-point="${i}" ${interactive ? 'role="button" tabindex="0" aria-label="Select ' + esc(d.name || "Point " + (i + 1)) + '"' : ""}`;
  let marks =
    type === "bar"
      ? data
          .map(
            (d, i) =>
              `<rect ${attrs(d, i)} x="${x(xs[i], i) - 20}" y="${y(ys[i])}" width="40" height="${H - B - y(ys[i])}" fill="#66e4c4"/>`,
          )
          .join("")
      : (type === "line"
          ? `<polyline points="${data.map((d, i) => `${x(xs[i], i)},${y(ys[i])}`).join(" ")}" fill="none" stroke="#66e4c4" stroke-width="3"/>`
          : "") +
        data
          .map(
            (d, i) =>
              `<circle ${attrs(d, i)} cx="${x(xs[i], i)}" cy="${y(ys[i])}" r="${interactive ? 10 : 6}" fill="#66e4c4"/>`,
          )
          .join("");
  return `<svg class="chart" viewBox="0 0 640 310" role="group" aria-label="${type} graph: ${esc(xkey)} and ${esc(ykey)}"><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#9cbad1"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#9cbad1"/>${[0, 0.5, 1].map((f) => `<text x="${L - 8}" y="${y(f * my) + 4}" text-anchor="end">${Math.round(f * my)}</text>`).join("")}${marks}${data.map((d, i) => (type === "scatter" ? "" : `<text x="${x(xs[i], i)}" y="${H - B + 22}" text-anchor="middle">${esc(xkey === "name" ? d.name.replace("Team ", "") : xkey === "index" ? i + 1 : d[xkey])}</text>`)).join("")}${type === "scatter" ? `<text x="${L}" y="${H - B + 22}">0</text><text x="${W - R}" y="${H - B + 22}" text-anchor="end">${mx}</text>` : ""}<text x="320" y="300" text-anchor="middle">${esc(xkey === "index" ? "Day" : xkey)}</text><text x="12" y="150" transform="rotate(-90 12 150)" text-anchor="middle">${esc(ykey)}</text></svg>`;
}
function detective() {
  let mode,
    data,
    selected,
    sortKey = "id",
    sortAsc = true,
    threshold,
    group,
    graphType,
    task,
    expected,
    scenario;
  function renderGraph() {
    $("chart").innerHTML = chartSVG(
      data,
      graphType,
      graphType === "scatter"
        ? "hours"
        : graphType === "bar"
          ? "name"
          : "index",
      "score",
      selected,
      true,
    );
    for (let m of $("chart").querySelectorAll("[data-point]")) {
      let act = () => {
        let i = +m.dataset.point;
        selected.has(i) ? selected.delete(i) : selected.add(i);
        renderGraph();
        clearFeedback();
      };
      m.onclick = act;
      m.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          act();
        }
      };
    }
    for (let b of $("point-buttons").querySelectorAll("button"))
      b.classList.toggle("selected", selected.has(+b.dataset.p));
  }
  function renderTable() {
    let rows = data
      .filter(
        (d) =>
          ($("filter-group").value === "all" ||
            d.group === $("filter-group").value) &&
          d.score >= +$("filter-score").value,
      )
      .sort(
        (a, b) =>
          (a[sortKey] < b[sortKey] ? -1 : a[sortKey] > b[sortKey] ? 1 : 0) *
          (sortAsc ? 1 : -1),
      );
    $("table").innerHTML =
      `<table><thead><tr><th>Select</th>${["id", "name", "group", "hours", "score"].map((k) => `<th><button data-sort="${k}">${k}${sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}</button></th>`).join("")}</tr></thead><tbody>${rows.map((d) => `<tr><td><input type="checkbox" data-record="${d.id}" aria-label="Select ${d.name}" ${selected.has(d.id) ? "checked" : ""}></td><td>${d.id}</td><td>${d.name}</td><td>${d.group}</td><td>${d.hours}</td><td>${d.score}</td></tr>`).join("")}</tbody></table>`;
    for (let b of $("table").querySelectorAll("[data-sort]"))
      b.onclick = () => {
        if (sortKey === b.dataset.sort) sortAsc = !sortAsc;
        else {
          sortKey = b.dataset.sort;
          sortAsc = true;
        }
        renderTable();
      };
    for (let b of $("table").querySelectorAll("[data-record]"))
      b.onchange = () => {
        b.checked
          ? selected.add(+b.dataset.record)
          : selected.delete(+b.dataset.record);
        $("count").textContent =
          selected.size + " selected, including hidden rows.";
        clearFeedback();
      };
    $("count").textContent =
      selected.size + " selected, including hidden rows.";
  }
  setup(
    select(
      "mode",
      "Mode",
      modeOptions([
        ["table", "Table detective"],
        ["graph", "Graph detective"],
        ["visualize", "Data visualization"],
        ["cleaning", "Data cleaning"],
        ["metadata", "Metadata"],
        ["limitations", "Data limitations"],
      ]),
    ),
    () => {
      clearFeedback();
      mode = chosenMode([
        "table",
        "graph",
        "visualize",
        "cleaning",
        "metadata",
        "limitations",
      ]);
      if (["cleaning", "metadata", "limitations"].includes(mode)) {
        dataExtension(mode);
        return;
      }
      data = E.dataChallenge();
      selected = new Set();
      sortKey = "id";
      sortAsc = true;
      if (mode === "table") {
        group = E.pick(["Robotics", "Design", "Coding"]);
        threshold = E.int(55, 85);
        expected = new Set(
          data
            .filter((d) => d.group === group && d.score >= threshold)
            .map((d) => d.id),
        );
        if (!expected.size) {
          let d = E.pick(data);
          group = d.group;
          threshold = d.score;
          expected = new Set(
            data
              .filter((d) => d.group === group && d.score >= threshold)
              .map((d) => d.id),
          );
        }
        mount(
          `<p>Select every <strong>${group}</strong> record with a score <strong>at least ${threshold}</strong>. Sort or filter to investigate, then select matching rows.</p><div class="row">${select("filter-group", "Group", [["all", "All groups"], ...["Robotics", "Design", "Coding"].map((s) => [s, s])])}${numeric("filter-score", "Minimum score", 0, 0, 100)}${button("clear", "Clear selection", true)}</div><div class="table-wrap" id="table"></div><p id="count"></p>${button("check", "Check Selection")}`,
        );
        renderTable();
        for (let id of ["filter-group", "filter-score"])
          $(id).onchange = renderTable;
        $("clear").onclick = () => {
          selected.clear();
          renderTable();
          clearFeedback();
        };
        check("check", () => {
          let missing = [...expected].filter((i) => !selected.has(i)),
            extra = [...selected].filter((i) => !expected.has(i));
          feedback(
            !missing.length && !extra.length,
            !missing.length && !extra.length
              ? "Correct records selected. Both conditions hold."
              : `Missing IDs: ${missing.join(", ") || "none"}. Extra IDs: ${extra.join(", ") || "none"}. Check group AND score, including hidden selections.`,
          );
        });
      } else if (mode === "graph") {
        graphType = E.pick(["bar", "line", "scatter"]);
        task =
          graphType === "bar"
            ? "maximum"
            : graphType === "line"
              ? "increase"
              : "correlation";
        if (graphType === "line") data = data.slice(0, 7);
        if (graphType === "scatter") {
          let trend = E.pick([-1, 1, 0]);
          data = data.map((d, i) => ({
            ...d,
            hours: i + 1,
            score:
              trend === 0
                ? E.int(45, 95)
                : Math.round(70 + trend * 3 * (i - 4) + E.int(-2, 2)),
          }));
        }
        roundTopic = "graph / " + task;
        expected =
          task === "maximum"
            ? new Set(
                data
                  .map((d, i) =>
                    d.score === Math.max(...data.map((d) => d.score)) ? i : -1,
                  )
                  .filter((i) => i >= 0),
              )
            : task === "increase"
              ? new Set(
                  data
                    .map((d, i) => (i && d.score > data[i - 1].score ? i : -1))
                    .filter((i) => i >= 0),
                )
              : new Set();
        mount(
          `<p>${task === "maximum" ? "Select all bars tied for highest score." : task === "increase" ? "Select every day whose score increased from the previous day. Do not select day 1." : "Move the trend slider to match the relationship between practice hours and scores. Treat correlation above 0.5 as positive, below −0.5 as negative, and the middle range as weak."}</p><div id="chart"></div>${task === "correlation" ? '<label>Negative ← <input id="trend" type="range" min="-1" max="1" step="1" value="0"> → Positive</label><p id="trend-label">Weak / no clear linear relationship</p>' : ""}<div id="point-buttons" class="row">${task === "correlation" ? "" : data.map((d, i) => `<button data-p="${i}" class="secondary">${task === "maximum" ? d.name : "Day " + (i + 1)}: ${d.score}</button>`).join("")}</div><div class="actions">${button("check", "Check Finding")}</div>`,
        );
        renderGraph();
        for (let b of $("point-buttons").querySelectorAll("button"))
          b.onclick = () => {
            let i = +b.dataset.p;
            selected.has(i) ? selected.delete(i) : selected.add(i);
            renderGraph();
            clearFeedback();
          };
        if ($("trend"))
          $("trend").oninput = () => {
            $("trend-label").textContent =
              +$("trend").value === 0
                ? "Weak / no clear linear relationship"
                : +$("trend").value < 0
                  ? "Negative relationship"
                  : "Positive relationship";
            clearFeedback();
          };
        check("check", () => {
          if (task === "correlation") {
            let r = E.correlation(data.map((d) => [d.hours, d.score])),
              answer = r > 0.5 ? 1 : r < -0.5 ? -1 : 0;
            feedback(
              +$("trend").value === answer,
              `Correlation: ${r.toFixed(2)}. Above 0.5: positive; below −0.5: negative; middle range: weak. Correlation does not prove causation.`,
            );
          } else {
            let ok = E.equal(
              [...selected].sort((a, b) => a - b),
              [...expected].sort((a, b) => a - b),
            );
            feedback(
              ok,
              ok
                ? "Correct comparison."
                : `Expected ${task === "maximum" ? "teams" : "days"}: ${[...expected].map((i) => (task === "maximum" ? data[i].name : i + 1)).join(", ") || "none"}. Compare ${task === "maximum" ? "all scores, including ties" : "each day with its predecessor"}.`,
            );
          }
        });
      } else {
        scenario = E.pick(["relationship", "time", "category"]);
        roundTopic = "visualization / " + scenario;
        if (scenario === "time")
          data = data.slice(0, 7).map((d, i) => ({ ...d, day: i + 1 }));
        let x =
          scenario === "time"
            ? "day"
            : scenario === "category"
              ? "name"
              : "hours";
        mount(
          `<p>${scenario === "relationship" ? "Show the relationship between practice hours and scores." : scenario === "time" ? "Show how scores change over successive days." : "Compare scores across individual teams."} Configure and preview a graph, then submit.</p><div class="table-wrap"><table><thead><tr><th>Team</th>${scenario === "time" ? "<th>Day</th>" : ""}<th>Hours</th><th>Score</th></tr></thead><tbody>${data.map((d) => `<tr><td>${d.name}</td>${scenario === "time" ? "<td>" + d.day + "</td>" : ""}<td>${d.hours}</td><td>${d.score}</td></tr>`).join("")}</tbody></table></div><div class="row">${select(
            "chart-type",
            "Type",
            [
              ["bar", "Bar chart"],
              ["line", "Line graph"],
              ["scatter", "Scatterplot"],
            ],
          )}${select("x-axis", "Horizontal", [
            [x, x],
            ["score", "score"],
            [
              x === "hours" ? "name" : "hours",
              x === "hours" ? "name" : "hours",
            ],
          ])}${select("y-axis", "Vertical", [
            ["score", "score"],
            ["hours", "hours"],
          ])}${button("preview", "Preview chart", true)}</div><div id="chart"></div>${button("check", "Check Visualization")}`,
        );
        $("preview").onclick = () => {
          clearFeedback();
          let type = $("chart-type").value,
            xkey = $("x-axis").value,
            y = $("y-axis").value;
          if (type === "scatter" && xkey === "name") {
            $("chart").innerHTML =
              "<p>Scatterplots require two numeric variables.</p>";
            return;
          }
          $("chart").innerHTML = chartSVG(data, type, xkey, y);
        };
        check("check", () => {
          let expectedType = {
              relationship: "scatter",
              time: "line",
              category: "bar",
            }[scenario],
            ok =
              $("chart-type").value === expectedType &&
              $("x-axis").value === x &&
              $("y-axis").value === "score";
          feedback(
            ok,
            ok
              ? "The visualization matches the goal."
              : `Use a ${expectedType === "scatter" ? "scatterplot" : expectedType === "line" ? "line graph" : "bar chart"}, ${x} horizontally and score vertically. ${scenario === "relationship" ? "Numeric pairs show relationships, not proof of causation." : scenario === "time" ? "Lines emphasize change in time order." : "Bars compare categories."}`,
          );
        });
      }
    },
  );
}
function race() {
  let c,
    choice = null;
  setup(
    select(
      "mode",
      "Scenario",
      modeOptions([
        ["search", "Search sorted data"],
        ["duplicates", "Check distinct items"],
        ["sum", "Compute a total"],
      ]),
    ),
    () => {
      clearFeedback();
      c = E.raceChallenge($("mode").value);
      roundTopic = c.kind;
      choice = null;
      mount(
        `<p>${c.kind === "search" ? `Search ${c.n} sorted even numbers (2 through ${c.n * 2}) for target ${c.target}.` : c.kind === "duplicates" ? `Check whether ${c.n} items are all distinct. In this round every item is distinct.` : `Compute the total of ${c.n} numbers.`}</p><div class="split">${c.labels.map((name, i) => `<div><h3>${name}</h3><pre>${esc(c.kind === "search" ? (i === 0 ? "FOR EACH value IN numbers\n{\n  IF (value = target)\n  { RETURN(TRUE) }\n}\nRETURN(FALSE)" : "Compare the middle item with target.\nKeep the lower or upper half.\nRepeat until found or range is empty.") : c.kind === "duplicates" ? (i === 0 ? "Compare each item with every later item." : "Visit each item once: check the lookup\nset, then add the item.") : i === 0 ? "total ← 0\nFOR EACH value IN numbers\n{ total ← total + value }" : "For every prefix, recompute its total.\nReturn the last prefix total.")}</pre></div>`).join("")}</div><p>Step model: ${c.kind === "search" ? "one comparison per inspected value" : c.kind === "duplicates" ? "one step per pair comparison or combined lookup-set check/insertion" : "one step per addition"}. Place the finish flag on the algorithm that takes fewer steps.</p><div class="row">${button("a", c.labels[0], true)}${button("b", c.labels[1], true)}${button("tie", "Finish together", true)}</div><div class="actions">${button("check", "Run the race")}</div><div id="simulation"></div>`,
      );
      for (let [id, v] of [
        ["a", 0],
        ["b", 1],
        ["tie", 2],
      ])
        $(id).onclick = () => {
          choice = v;
          for (let [other, w] of [
            ["a", 0],
            ["b", 1],
            ["tie", 2],
          ])
            $(other).classList.toggle("selected", v === w);
          clearFeedback();
        };
      check("check", () => {
        if (choice === null) throw Error("Place a finish flag first.");
        let answer =
            c.steps[0] === c.steps[1] ? 2 : c.steps[0] < c.steps[1] ? 0 : 1,
          max = Math.max(...c.steps);
        if (choice === answer)
          $("simulation").innerHTML =
            `<div class="sim">${c.labels.map((name, i) => `<p>${name}: <strong>${c.steps[i]} steps</strong></p><div class="bar-track"><div class="bar-fill" style="--width:100%;--duration:${Math.max(0.2, (c.steps[i] / max) * 3)}s"></div></div>`).join("")}</div>`;
        feedback(
          choice === answer,
          `${choice === answer ? "Correct prediction." : "The prediction does not match the counts."} ${c.labels[0]}: ${c.steps[0]}; ${c.labels[1]}: ${c.steps[1]} steps.\n${c.explain}\nAnimation represents this step model, not real hardware timing.`,
        );
      });
    },
  );
}
function security() {
  let mode, c, selected, min, phrase, used, words;
  setup(
    select(
      "mode",
      "Mode",
      modeOptions([
        ["phishing", "Phishing detective"],
        ["password", "Password security"],
      ]),
    ),
    () => {
      clearFeedback();
      mode = chosenMode(["phishing", "password"]);
      selected = new Set();
      if (mode === "phishing") {
        c = E.phishingChallenge();
        mount(
          `<p>You normally receive ${c.org} messages from <code>@${c.slug}.example</code> and use <code>https://${c.slug}.example</code>. Select suspicious fields that require verification before acting. If no field is suspicious, submit with none selected.</p><p class="muted">Messages and domains are fictional. Urgency alone is not phishing evidence.</p>${[
            ["sender", "From", c.sender],
            [
              "link",
              "Displayed portal → actual destination",
              c.org + " portal → " + c.link,
            ],
            ["request", "Request", c.request],
            ["attachment", "Attachment", c.attachment],
            ["urgency", "Timing", c.urgent],
          ]
            .map(
              ([id, label, text]) =>
                `<button class="mail-field" data-field="${id}" aria-pressed="false"><span>${label}</span>${esc(text)}</button>`,
            )
            .join(
              "",
            )}<div class="actions">${button("check", "Submit Findings")}</div>`,
        );
        for (let b of $("stage").querySelectorAll("[data-field]"))
          b.onclick = () => {
            let id = b.dataset.field;
            selected.has(id) ? selected.delete(id) : selected.add(id);
            b.classList.toggle("selected", selected.has(id));
            b.setAttribute("aria-pressed", selected.has(id));
            clearFeedback();
          };
        check("check", () => {
          let missing = [...c.bad].filter((x) => !selected.has(x)),
            extra = [...selected].filter((x) => !c.bad.has(x)),
            ok = !missing.length && !extra.length;
          let reasons = {
            sender:
              "The sender uses a different domain from the established organization. Verify through a known channel.",
            link: "The actual link destination is outside the known portal domain. Displayed wording does not authenticate it.",
            request:
              "Never send passwords or one-time sign-in codes in a reply.",
            attachment:
              "The double extension ends in .exe; it is an executable, not a PDF.",
          };
          feedback(
            ok,
            `${ok ? "All evidence identified." : "Revise your selections."}\n${[...c.bad].map((x) => reasons[x]).join("\n")}\n${extra.length ? "Overselected: " + extra.join(", ") + ". " : ""}Urgency alone is not evidence. A familiar sender and ordinary attachment do not guarantee safety; verify unusual requests.`,
          );
        });
      } else {
        min = E.pick([14, 16, 18]);
        phrase = Math.random() < 0.5;
        words = E.shuffle([
          "comet",
          "willow",
          "harbor",
          "velvet",
          "orbit",
          "mango",
          "lantern",
          "canyon",
        ]);
        used = E.pick(["CedarMail!2026", "OrbitClub#2026", "HarborShop$2026"]);
        mount(
          `<p>Build a <strong>fictional practice password</strong>. Never enter a real password here.</p><p>Policy: at least ${min} characters; ${phrase ? "four or more space-separated words." : "uppercase and lowercase letters, a digit, and a symbol."} Use a unique password for this account and enable multifactor authentication.</p><p>Already used on another fictional account: <code>${used}</code></p>${phrase ? `<p>Tap word tiles or type your own invented passphrase.</p><div class="row">${words.map((w, i) => button("word" + i, w, true)).join("")}</div>` : ""}<p><label>Practice password <input id="password" type="text" autocomplete="off" spellcheck="false" placeholder="Fictional values only"></label></p><div class="row">${select(
            "reuse",
            "Account use",
            [
              ["shared", "Reuse across accounts"],
              ["unique", "Unique to this account"],
            ],
          )}${select("mfa", "Second factor", [
            ["none", "Password only"],
            ["app", "Authenticator app"],
            ["key", "Security key"],
            ["sms", "Text-message code"],
          ])}${button("clear", "Clear", true)}</div><p id="length">0 characters</p><div class="actions">${button("check", "Check Protection")}</div>`,
        );
        for (let i = 0; phrase && i < words.length; i++)
          $("word" + i).onclick = () => {
            $("password").value += ($("password").value ? " " : "") + words[i];
            $("password").dispatchEvent(new Event("input"));
          };
        $("password").oninput = () => {
          $("length").textContent = $("password").value.length + " characters";
          clearFeedback();
        };
        $("clear").onclick = () => {
          $("password").value = "";
          $("password").dispatchEvent(new Event("input"));
        };
        check("check", () => {
          let value = $("password").value,
            rules = E.passwordRules(value, min, phrase),
            unique = value !== used && $("reuse").value === "unique",
            mfa = $("mfa").value !== "none",
            ok = Object.values(rules).every(Boolean) && unique && mfa;
          feedback(
            ok,
            `${ok ? "Practice policy met." : "Adjust and retry."}\nLength: ${rules.length ? "met" : "needs " + min + " characters"}. ${phrase ? "Four words: " + (rules.letters ? "met" : "not met") : "Upper/lowercase: " + (rules.letters ? "met" : "not met") + "; digit: " + (rules.number ? "met" : "not met") + "; symbol: " + (rules.symbol ? "met" : "not met")}.\nUnique account password: ${unique ? "yes" : "no"}. MFA: ${mfa ? "enabled" : "missing"}.\nLong, unpredictable, unique passwords reduce guessing and reuse risks. MFA adds a factor; an authenticator or security key is preferable to text messages. These checks cannot prove unpredictability. The public word tiles are practice examples—never use them for a real account.`,
          );
        });
      }
    },
  );
}
function parallel() {
  let times, p, deps, assignment, dependent, opt;
  function render() {
    for (let j = 0; j < p; j++)
      $("processor" + j).innerHTML =
        times
          .map((t, i) =>
            assignment[i] === j
              ? `<span class="token" draggable="true" data-drag="${i}">${String.fromCharCode(65 + i)} · ${t}s</span>`
              : "",
          )
          .join("") || '<span class="muted">No tasks assigned</span>';
    for (let b of $("stage").querySelectorAll("[data-drag]"))
      b.ondragstart = (e) =>
        e.dataTransfer.setData("text/plain", b.dataset.drag);
  }
  setup(
    select("processors", "Processors", [
      [2, "2 processors"],
      [3, "3 processors"],
    ]) +
      select("dependencies", "Task type", [
        ["mixed", "Mixed Practice"],
        ["independent", "Independent tasks"],
        ["dependent", "With dependencies"],
      ]),
    () => {
      clearFeedback();
      p = +$("processors").value;
      dependent =
        $("dependencies").value === "mixed"
          ? E.pick([true, false])
          : $("dependencies").value === "dependent";
      roundTopic = dependent
        ? "dependent-scheduling"
        : "independent-scheduling";
      times = Array.from({ length: 6 }, () => E.int(1, 9));
      deps = times.map(() => []);
      if (dependent) {
        deps[2] = [0];
        deps[4] = [1, 2];
        deps[5] = [3];
      }
      assignment = Array(6).fill(0);
      opt = dependent
        ? E.optimalDependent(times, p, deps)
        : E.optimalSchedule(times, p);
      mount(
        `<p>Assign every task to a processor. Each processor runs one task at a time. Minimize the finishing time for all tasks.</p><p>${dependent ? "C waits for A; E waits for B and C; F waits for D. Each processor executes tasks in alphabetical order. Waiting for prerequisites can leave it idle." : "Tasks are independent, with no scheduling overhead in this model."}</p>${times
          .map(
            (t, i) =>
              `<div class="task"><strong>Task ${String.fromCharCode(65 + i)}: ${t} seconds</strong>${select(
                "assign" + i,
                "Assign to",
                Array.from({ length: p }, (_, j) => [
                  j,
                  "Processor " + (j + 1),
                ]),
              )}</div>`,
          )
          .join(
            "",
          )}<p class="muted">Use menus, or drag assigned tiles between processor areas.</p>${Array.from({ length: p }, (_, j) => `<div class="processor" data-drop="${j}"><strong>Processor ${j + 1}</strong><div class="tokens" id="processor${j}"></div></div>`).join("")}<div class="actions">${button("check", "Run Simulation")}</div><div id="simulation"></div>`,
      );
      render();
      for (let i = 0; i < 6; i++)
        $("assign" + i).onchange = () => {
          assignment[i] = +$("assign" + i).value;
          clearFeedback();
          render();
        };
      for (let z of $("stage").querySelectorAll("[data-drop]")) {
        z.ondragover = (e) => e.preventDefault();
        z.ondrop = (e) => {
          e.preventDefault();
          let text = e.dataTransfer.getData("text/plain"),
            i = Number(text),
            j = +z.dataset.drop;
          if (text !== "" && Number.isInteger(i) && i >= 0 && i < 6) {
            assignment[i] = j;
            $("assign" + i).value = j;
            clearFeedback();
            render();
          }
        };
      }
      check("check", () => {
        let r = E.simulateSchedule(times, assignment, p, deps),
          seq = times.reduce((s, t) => s + t, 0),
          max = r.time;
        if (r.time === opt.time)
          $("simulation").innerHTML =
            `${Array.from({ length: p }, (_, j) => `<p>Processor ${j + 1}</p><div class="bar-track" style="position:relative;height:42px">${times.map((t, i) => (assignment[i] === j ? `<div style="position:absolute;left:${(r.starts[i] / max) * 100}%;width:${(t / max) * 100}%;height:42px;background:${["#66e4c4", "#ffd37d", "#97bfff", "#dc9bff", "#fca6a6", "#a9dc88"][i]};color:#09201c;text-align:center;font-weight:800">${String.fromCharCode(65 + i)}</div>` : "")).join("")}<div class="time-mask" style="position:absolute;inset:0;background:#0c1c2b;animation:unmask 4s linear forwards;transform-origin:right"></div></div>`).join("")}<p>Sequential: <strong>${seq}s</strong> · Parallel: <strong>${r.time}s</strong> · Speedup: <strong>${(seq / r.time).toFixed(2)}×</strong></p><div class="table-wrap"><table><thead><tr><th>Task</th><th>Processor</th><th>Start</th><th>Finish</th></tr></thead><tbody>${times.map((t, i) => `<tr><td>${String.fromCharCode(65 + i)}</td><td>${assignment[i] + 1}</td><td>${r.starts[i]}s</td><td>${r.ends[i]}s</td></tr>`).join("")}</tbody></table></div>`;
        feedback(
          r.time === opt.time,
          `${r.time === opt.time ? "Optimal arrangement!" : "A faster arrangement exists. Reassign and retry."} Your makespan: ${r.time}s. True optimum: ${opt.time}s.\n${dependent ? "The optimum covers all assignments under the stated alphabetical queue rule. Dependencies create waiting time." : "The optimum is calculated by exhaustive scheduling with symmetry pruning. The longest processor workload determines finishing time."}\nThe animation scales execution to four seconds of screen time.`,
        );
      });
    },
  );
}

addSessionNavigation(game ? "../" : "./");
function dataExtension(mode) {
  if (mode === "cleaning") {
    const c = E.cleaningChallenge();
    mount(
      `<h2>Clean a measurement dataset</h2><p>Normalize categories to lowercase with no surrounding spaces. Convert meters to centimeters. Remove rows with missing measurements and duplicate IDs, keeping either copy of a duplicate. Keep every complete, distinct record; do not invent missing values.</p><div class="table-wrap"><table><thead><tr><th>Keep</th><th>ID</th><th>Source category</th><th>Source distance (m)</th><th>Clean category</th><th>Distance (cm)</th></tr></thead><tbody>${c.rows.map((r, i) => `<tr><td><input id="clean-keep-${i}" type="checkbox" checked aria-label="Keep row ${i + 1}"></td><td>${r.id}</td><td><code>${esc(JSON.stringify(r.category))}</code></td><td>${r.meters || "Missing"}</td><td><input id="clean-category-${i}" value="${esc(r.category)}" aria-label="Clean category for row ${i + 1}"></td><td><input id="clean-cm-${i}" type="number" step="1" aria-label="Distance in centimeters for row ${i + 1}"></td></tr>`).join("")}</tbody></table></div>${button("check", "Check Cleaned Data")}`,
    );
    check("check", () => {
      const submitted = c.rows.map((r, i) => ({
        id: r.id,
        keep: $("clean-keep-" + i).checked,
        category: $("clean-category-" + i).value,
        cm: $("clean-cm-" + i).value,
      }));
      if (submitted.some((r) => r.keep && !r.cm.trim()))
        throw Error(
          "Supply a measurement for each row you keep, or remove incomplete rows.",
        );
      feedback(
        E.validateCleaning(c, submitted),
        "Correct. Each complete ID is represented once, categories have consistent formatting, and meters were converted to centimeters. Removing incomplete rows follows this challenge’s specified rule; other projects may need different missing-data policies.",
      );
    });
    return;
  }
  if (mode === "metadata") {
    const width = E.pick([8, 12, 16]),
      height = E.pick([6, 10, 12]),
      date = `2026-${String(E.int(1, 9)).padStart(2, "0")}-${String(E.int(1, 28)).padStart(2, "0")}`;
    const labels = E.shuffle([
      ["pixels", "Pixel content"],
      ["dimensions", `${width} × ${height} dimensions`],
      ["date", `Created ${date}`],
    ]);
    mount(
      `<h2>Separate data from metadata</h2><p>An image record has pixel colors, dimensions, and a creation date. Assign each component to its role.</p>${labels
        .map(([id, label]) =>
          select("meta-" + id, label, [
            ["", "Choose a role…"],
            ["data", "Image data"],
            ["metadata", "Metadata about the image"],
          ]),
        )
        .join("")}${button("check", "Check Roles")}`,
    );
    check("check", () => {
      if (labels.some(([id]) => !$("meta-" + id).value))
        throw Error("Assign a role to every component.");
      feedback(
        $("meta-pixels").value === "data" &&
          $("meta-dimensions").value === "metadata" &&
          $("meta-date").value === "metadata",
        "Pixel colors encode the visible image. Dimensions and creation date describe that image and are metadata. Metadata can help interpret, find, or organize data.",
      );
    });
    return;
  }
  const study = E.int(12, 80),
    sample = E.pick([
      "volunteers from one club",
      "students from one class",
      "people who chose to respond online",
    ]),
    change = E.int(3, 15);
  mount(
    `<h2>Match conclusions to evidence</h2><p>A survey of ${study} ${sample} found that frequent users of a practice app scored ${change} points higher on average. The survey did not randomly assign app use.</p>${select(
      "limit-generalize",
      "Generalization",
      [
        ["", "Choose…"],
        ["limited", "The sample may not represent all students."],
        ["all", "The sample proves the effect for every student."],
      ],
    )}${select("limit-cause", "Causation", [
      ["", "Choose…"],
      [
        "association",
        "The observed association does not establish that the app caused higher scores.",
      ],
      [
        "proved",
        "The observed association proves the app caused higher scores.",
      ],
    ])}${button("check", "Check Analysis")}`,
  );
  check("check", () => {
    if (!$("limit-generalize").value || !$("limit-cause").value)
      throw Error("Complete both evidence judgments.");
    feedback(
      $("limit-generalize").value === "limited" &&
        $("limit-cause").value === "association",
      "A selected sample can limit generalization. An observational association can be affected by other differences between students and does not establish causation.",
    );
  });
}
