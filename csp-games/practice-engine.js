import {generateTestCase,evaluateTestCase} from "./test-case-engine.js?v=instructional-tcb-v2";
import { int, pick, shuffle } from "./engine.js?v=platform-expansion-v2";
export const practiceGames = {
  "response-builder": {
    title: "Response Builder",
    group: "1 · Creative Development",
    topics: "1.2–1.4 / 3.2 / 3.13",
    icon: "✎",
    description:
      "Build concise explanations from evidence, with support you can adjust.",
    modes: {
      guided: "Guided Sentence Builder",
      explanation: "Explanation Builder",
      reduced: "Reduced Scaffold",
      testing: "Test Explanation",
      abstraction: "Abstraction Explanation",
    },
  },
  "test-case-builder": {
    title: "Test Case Builder",
    group: "1 · Creative Development",
    topics: "1.4 / 3.4 / 3.6–3.10",
    icon: "✓",
    description: "Construct test inputs, predict results, and expose errors.",
    modes: {
      normal: "Normal Cases",
      boundary: "Boundary Values",
      branches: "Branch Coverage",
      lists: "Empty & Single-element Lists",
      strings: "Strings & Library Documentation",
      iteration: "Iteration",
      errors: "Logic Errors",
      invalid: "Error-producing Inputs",
      nonexposing: "Tests That Do Not Expose Errors",
    },
  },
  "algorithm-architect": {
    title: "Algorithm Architect",
    group: "3 · Algorithms and Programming",
    topics: "3.3–3.4 / 3.6–3.10 / 3.12–3.13",
    icon: "⌘",
    description:
      "Arrange and configure working algorithms, then test their behavior.",
    modes: {
      sequence: "Sequencing",
      selection: "Selection",
      iteration: "Iteration",
      nested: "Nested Loops",
      "nested-selection": "Nested Conditionals",
      counter: "Counters",
      accumulator: "Accumulators",
      search: "Searching",
      procedure: "Procedures & Parameters",
    },
  },
  "computing-impact-lab": {
    title: "Computing Impact Lab",
    group: "5 · Impact of Computing",
    topics: "1.1 / 5.1–5.6",
    icon: "◎",
    description:
      "Evaluate evidence, consequences, and trade-offs in computing scenarios.",
    modes: {
      innovation: "Innovations & Consequences",
      privacy: "Privacy & Consent",
      bias: "Bias & Evidence",
      access: "Digital Divide & Accessibility",
      crowd: "Crowdsourcing",
      rights: "Intellectual Property",
      tradeoffs: "Trade-offs",
    },
  },
  "simulation-lab": {
    title: "Simulation Lab",
    group: "3 · Algorithms and Programming",
    topics: "3.15–3.16",
    icon: "⚄",
    description:
      "Change model inputs, run reproducible trials, and examine limitations.",
    modes: {
      randomness: "Randomness & Probability",
      trials: "Repeated Trials",
      prediction: "Predictions",
      comparison: "Compare Models",
      limitations: "Model Limitations",
    },
  },
  "mixed-ap-practice": {
    title: "Mixed AP Exam Practice",
    group: "All five Big Ideas",
    topics: "Original AP-aligned practice",
    icon: "AP",
    description:
      "Practice original code, data, and scenario questions across the curriculum.",
    modes: {
      creative: "Creative Development",
      data: "Data",
      algorithms: "Algorithms & Programming",
      systems: "Computer Systems & Networks",
      impact: "Impact of Computing",
    },
  },
};
const option = (value, label = value) => ({
  value: String(value),
  label: String(label),
});
const chooseField = (id, label, correct, distractors) => ({
  id,
  label,
  type: "select",
  options: shuffle(
    [...new Set([correct, ...distractors].map(String))].map((v) => option(v)),
  ),
  correct: String(correct),
});
const numField = (id, label) => ({ id, label, type: "number" });
const textField = (id, label) => ({ id, label, type: "text" });
const hintLevels = [
  "Use the requirement and evidence in the challenge; distinguish what is stated from what is assumed.",
  "Check the role of each component. Consider boundary behavior and whether the explanation supports its conclusion.",
  "Review one component at a time, then make sure the complete response meets every stated requirement.",
];
function base(game, mode, prompt, context, extra = {}) {
  return {
    version: 1,
    game,
    mode,
    topic: mode,
    prompt,
    context,
    hints: hintLevels,
    ...extra,
  };
}
export function generatePractice(game, mode = "mixed", support = "full") {
  if (!practiceGames[game]) throw Error("Unknown game");
  const selected =
    mode === "mixed" ? pick(Object.keys(practiceGames[game].modes)) : mode;
  if (!practiceGames[game].modes[selected]) throw Error("Unknown mode");
  const q = generators[game](selected);
  q.support = support;
  const perGameHints = {
    "response-builder": [
      "Separate an answer, a code reference, and the reason that reference supports the answer.",
      "Check what each code operation does. A claim about the result needs relevant evidence and a link between them.",
      "Read the explanation as a whole. Remove unsupported guarantees and distinguish counting, adding, returning, and displaying.",
    ],
    "test-case-builder": [
      "Expected behavior comes from the requirement; actual behavior comes from the code.",
      "Check the valid input domain and the particular test goal. Boundary, branch, empty-input, and error tests serve different purposes.",
      "Evaluate your own input against the requirement, then the algorithm. An error-exposing test must make their behaviors differ; a nonexposing test must not.",
    ],
    "algorithm-architect": [
      "Think about the state each block needs and changes.",
      "A procedure stops when it returns. Consider whether each update uses initialized state and whether comparisons include the required boundaries.",
      "Trace your construction on an empty input, a boundary input, and a negative or zero value. Check that the same design works for all of them.",
    ],
    "computing-impact-lab": [
      "Separate an observed event from an assumption or a universal guarantee.",
      "Use evidence from this scenario to connect a mechanism with a consequence. A benefit does not rule out harm.",
      "Check the scope of the conclusion. Evidence about one group or one trial need not establish the same outcome for everyone.",
    ],
    "simulation-lab": [
      "Distinguish a model probability, an expected count, and an observed trial result.",
      "Use the challenge reference settings for your answer. Experiment settings are for exploration and may differ.",
      "A larger sample does not guarantee a particular result. Review whether the question asks about expectation, an estimate, or assumptions about the real world.",
    ],
  };
  if (perGameHints[game]) q.hints = perGameHints[game];
  return q;
}
export function validatePractice(q, r) {
  if (q.kind === "test") return validateTest(q, r);
  if (q.kind === "architect") return validateAlgorithm(q, r);
  if (q.kind === "simulation") return validateSimulation(q, r);
  if (q.kind === "order") {
    const ids = r.order || [];
    if (
      ids.length !== q.required.length ||
      new Set(ids).size !== ids.length ||
      !q.required.every((id) => ids.includes(id))
    )
      return false;
    return q.before.every(([a, b]) => ids.indexOf(a) < ids.indexOf(b));
  }
  if (q.kind === "multi") {
    const v = [...new Set(r.selected || [])].sort();
    return JSON.stringify(v) === JSON.stringify([...q.correct].sort());
  }
  return q.fields.every((f) => String(r[f.id]) === f.correct);
}
export function solutionPractice(q) {
  if (q.kind === "test") return q.example;
  if (q.kind === "architect")
    return { ...q.solution, order: q.blocks.map((b) => b.id) };
  if (q.kind === "order") return { order: q.solution };
  if (q.kind === "multi") return { selected: q.correct };
  if (q.kind === "simulation") return q.solution;
  return Object.fromEntries(q.fields.map((f) => [f.id, f.correct]));
}
function response(mode) {
  const name = pick(["ratings", "scores", "temperatures", "donations"]),
    p = pick(["countQualified", "countReady", "countPassing"]),
    n = int(30, 80),
    values = shuffle([n - 1, n, n + 3, n + 7]);
  const code = `PROCEDURE ${p}(values, limit)\n{\n    count ← 0\n    FOR EACH value IN values\n    {\n        IF (value ≥ limit)\n        {\n            count ← count + 1\n        }\n    }\n    RETURN(count)\n}\n${name} ← [${values.join(", ")}]\nDISPLAY(${p}(${name}, ${n}))`;
  const pieces = [
    {
      id: "answer",
      label: "Answer",
      text: "The procedure counts list elements that meet or exceed the limit.",
    },
    {
      id: "cite",
      label: "Cite evidence",
      text: "The comparison controls whether count is increased for each element.",
    },
    {
      id: "explain",
      label: "Explain",
      text: "Each qualifying element contributes one, so the returned counter represents the number that qualify.",
    },
    {
      id: "bad1",
      label: "Possible sentence",
      text: "The procedure returns the sum of every list value.",
    },
    {
      id: "bad2",
      label: "Possible sentence",
      text: "An element below the limit always increases the counter.",
    },
  ];
  if (mode === "explanation")
    return base(
      "response-builder",
      mode,
      "Build a concise explanation of how this procedure meets its counting goal.",
      code,
      {
        kind: "order",
        items: shuffle(pieces),
        required: ["answer", "cite", "explain"],
        before: [],
        solution: ["answer", "cite", "explain"],
        explanation:
          "State the behavior, cite the controlling comparison and update, then explain how one update per qualifying item produces the count. A separate restatement or summary is unnecessary here.",
      },
    );
  if (mode === "abstraction") {
    const list = pick([true, false]);
    return base(
      "response-builder",
      mode,
      `Explain how ${list ? "a list" : "this procedure"} manages complexity.`,
      code,
      {
        kind: "fields",
        fields: [
          chooseField(
            "claim",
            "Answer",
            list
              ? "The list groups many values under one name."
              : "The procedure packages a reusable counting action.",
            [
              "The program no longer needs any testing.",
              "The data must contain only one element.",
            ],
          ),
          chooseField(
            "evidence",
            "Cite evidence",
            list
              ? "FOR EACH visits values from the collection."
              : `Calls supply values and limit to ${p}.`,
            [
              "DISPLAY encrypts the output.",
              "The counter replaces all list elements.",
            ],
          ),
          chooseField(
            "reason",
            "Explain",
            list
              ? "One traversal works for different list lengths without separate variables and statements for every item."
              : "Callers reuse the action with different inputs without duplicating its implementation.",
            [
              "Every algorithm becomes faster automatically.",
              "No condition can ever be false.",
            ],
          ),
        ],
        explanation: list
          ? "The collection and common traversal replace separate variables and repeated code for each item."
          : "The named procedure hides the counting implementation behind an input/output interface that different callers can reuse.",
      },
    );
  }
  if (mode === "testing")
    return base(
      "response-builder",
      mode,
      "Explain why the threshold test is useful.",
      code + `\n// Test: values ← [${n}], limit ← ${n}`,
      {
        kind: "fields",
        fields: [
          chooseField("case", "Answer", "This is a boundary test.", [
            "This is an empty-list test.",
            "This proves every input is correct.",
          ]),
          chooseField(
            "cite",
            "Cite evidence",
            `The element equals the limit ${n}.`,
            [`The list has ${n} elements.`, "The argument is below the limit."],
          ),
          chooseField(
            "explain",
            "Explain",
            "It checks that equality is included by the requirement.",
            [
              "It demonstrates that all networks are fault tolerant.",
              "It proves the loop executes zero times.",
            ],
          ),
        ],
        explanation:
          "The single element equals the threshold. The ≥ comparison includes equality, so the counter should increase once. One test supports that boundary behavior; it does not prove every input correct.",
      },
    );
  return base(
    "response-builder",
    mode,
    mode === "reduced"
      ? "Complete the essential parts of a concise explanation."
      : "Complete an evidence-based explanation of this procedure.",
    code,
    {
      kind: "fields",
      fields: [
        chooseField(
          "answer",
          "Answer: The procedure…",
          "counts elements at or above the limit",
          ["adds all element values", "removes all qualifying elements"],
        ),
        chooseField(
          "cite",
          "Evidence: The code…",
          "tests each element and increments a counter for qualifying elements",
          [
            "updates count with every element’s value",
            "returns the original list",
          ],
        ),
        chooseField(
          "explain",
          "Reason: This works because…",
          "one increment per qualifying item makes the counter equal to the number that qualify",
          [
            "a Boolean expression always evaluates to true",
            "RETURN displays every value on the screen",
          ],
        ),
      ],
      explanation:
        "The condition identifies qualifying elements. Each one causes exactly one counter increment. RETURN supplies the resulting count to the caller. The response answers, cites, and explains without unnecessary extra sentences.",
    },
  );
}
function testCase(mode) {
  const q=generateTestCase(mode);
  q.explanation=evaluateTestCase(q,q.example).details;
  return q;
}
function whole(v) {
  return /^-?\d+$/.test(String(v).trim()) && Number.isSafeInteger(Number(v));
}
export function parseList(v) {
  if (String(v).trim() === "") return [];
  const s = String(v)
    .split(",")
    .map((x) => x.trim());
  if (!s.every(whole)) return null;
  return s.map(Number);
}
function validateTest(q,r) { return evaluateTestCase(q,r).correct; }
const block = (id, text) => ({ id, text });
function architect(mode) {
  const factor = int(2, 6),
    threshold = int(3, 9),
    p = pick(["processValues", "analyzeList", "calculateResult"]);
  const q = base(
    "algorithm-architect",
    mode,
    "Configure and arrange the procedure to meet the stated goal.",
    "",
    {
      kind: "architect",
      factor,
      threshold,
      fields: [],
      explanation:
        "Initialization must happen before repeated updates, and RETURN after processing. The test runner compares behavior with the requirement over exhaustive small inputs and additional edge cases. Any configuration that passes is accepted.",
    },
  );
  const filter = [
      "selection",
      "counter",
      "nested",
      "nested-selection",
      "search",
    ].includes(mode),
    count = ["counter", "search"].includes(mode),
    repeat = ["iteration", "accumulator"].includes(mode);
  if (mode === "sequence" || mode === "procedure") {
    q.context = `Goal: PROCEDURE ${p}(value) returns (${factor} × value) + ${threshold}.\nInputs may be negative, zero, or positive whole numbers.`;
    q.blocks = [
      block("init", `result ← value`),
      block("multiply", `result ← result × factor`),
      block("add", `result ← result + offset`),
      block("return", "RETURN(result)"),
    ];
    q.fields = [
      chooseField("factor", "factor", String(factor), [
        String(factor + 1),
        "0",
      ]),
      chooseField("offset", "offset", String(threshold), [
        String(threshold - 1),
        String(threshold / factor),
      ]),
    ];
    q.solution = { factor: String(factor), offset: String(threshold) };
  } else {
    const goal =
      mode === "search"
        ? `return TRUE if any list element is at least ${threshold}, otherwise FALSE`
        : mode === "counter"
          ? `count elements at least ${threshold}`
          : mode === "selection"
            ? `sum only elements at least ${threshold}`
            : mode === "nested-selection"
              ? `count elements in the inclusive range ${threshold} through ${threshold + 4}`
              : mode === "nested"
                ? `count pairs of list elements (including an item paired with itself) whose sum is at least ${threshold}`
                : mode === "iteration"
                  ? `return ${factor} times the number of list elements`
                  : "return the sum of all list elements";
    q.context = `Goal: PROCEDURE ${p}(values) must ${goal}.\nLists may be empty and may contain negative, zero, or positive whole numbers.\nEach block stays intact; configure its comparison/update and arrange the blocks.`;
    const initial = mode === "search" ? "false" : "0";
    const loop =
      mode === "nested-selection"
        ? `FOR EACH item IN values\n{\n    IF (comparison(item, ${threshold}))\n    {\n        IF (upperComparison(item, ${threshold + 4}))\n        {\n            result ← result + 1\n        }\n    }\n}`
        : mode === "nested"
          ? `FOR EACH left IN values\n{\n    FOR EACH right IN values\n    {\n        IF (comparison(left + right, ${threshold}))\n        {\n            result ← result + 1\n        }\n    }\n}`
          : filter
            ? `FOR EACH item IN values\n{\n    IF (comparison(item, ${threshold}))\n    {\n        result ← ${mode === "search" ? "true" : count ? "result + 1" : "result + item"}\n    }\n}`
            : `FOR EACH item IN values\n{\n    result ← result + update\n}`;
    q.blocks = [
      block("init", `result ← ${initial}`),
      block("process", loop),
      block("return", "RETURN(result)"),
    ];
    q.fields = filter
      ? [chooseField("comparison", "comparison", "≥", [">", "≤", "=", "NOT <"])]
      : [
          chooseField(
            "update",
            "update",
            mode === "iteration" ? String(factor) : "item",
            ["1", "0", mode === "iteration" ? "item" : String(factor)],
          ),
        ];
    if (mode === "nested-selection")
      q.fields.push(
        chooseField("upperComparison", "upperComparison", "≤", [
          "<",
          "≥",
          "NOT >",
        ]),
      );
    q.solution = Object.fromEntries(q.fields.map((f) => [f.id, f.correct]));
  }
  q.bank = shuffle(q.blocks);
  return q;
}
function compare(a, op, b) {
  return op === "NOT >"
    ? !(a > b)
    : op === "NOT <"
      ? !(a < b)
      : op === "≥"
        ? a >= b
        : op === ">"
          ? a > b
          : op === "≤"
            ? a <= b
            : op === "="
              ? a === b
              : false;
}
export function executeAlgorithm(q, r, input) {
  let result,
    returned = false;
  for (const id of r.order || []) {
    if (returned) break;
    if (id === "init")
      result =
        q.mode === "search"
          ? false
          : ["sequence", "procedure"].includes(q.mode)
            ? input
            : 0;
    else if (id === "multiply") result *= Number(r.factor);
    else if (id === "add") result += Number(r.offset);
    else if (id === "process") {
      if (!Array.isArray(input) || result === undefined) return { error: true };
      for (const item of input) {
        if (q.mode === "nested-selection") {
          if (
            compare(item, r.comparison, q.threshold) &&
            compare(item, r.upperComparison, q.threshold + 4)
          )
            result++;
        } else if (q.mode === "nested") {
          for (const right of input)
            if (compare(item + right, r.comparison, q.threshold)) result++;
        } else if (["selection", "counter", "search"].includes(q.mode)) {
          if (compare(item, r.comparison, q.threshold)) {
            if (q.mode === "search") result = true;
            else result += q.mode === "counter" ? 1 : item;
          }
        } else result += r.update === "item" ? item : Number(r.update);
      }
    } else if (id === "return") {
      returned = true;
      return { value: result };
    }
  }
  return { error: true };
}
export function algorithmTests(q) {
  if (["sequence", "procedure"].includes(q.mode))
    return Array.from({ length: 31 }, (_, i) => i - 15);
  const vals = [
      -2,
      0,
      q.threshold - 1,
      q.threshold,
      q.threshold + 1,
      q.threshold + 4,
      q.threshold + 5,
    ],
    out = [[], [100], [-100]];
  for (const a of vals) {
    out.push([a]);
    for (const b of vals) {
      out.push([a, b]);
      for (const c of vals) out.push([a, b, c]);
    }
  }
  return out;
}
export function expectedAlgorithm(q, input) {
  switch (q.mode) {
    case "sequence":
    case "procedure":
      return q.factor * input + q.threshold;
    case "search":
      return input.some((x) => x >= q.threshold);
    case "counter":
      return input.filter((x) => x >= q.threshold).length;
    case "selection":
      return input.filter((x) => x >= q.threshold).reduce((s, x) => s + x, 0);
    case "nested-selection":
      return input.filter((x) => x >= q.threshold && x <= q.threshold + 4)
        .length;
    case "nested":
      return input.reduce(
        (s, a) => s + input.filter((b) => a + b >= q.threshold).length,
        0,
      );
    case "iteration":
      return input.length * q.factor;
    default:
      return input.reduce((s, x) => s + x, 0);
  }
}
function validateAlgorithm(q, r) {
  if (
    !r.order ||
    r.order.length !== q.blocks.length ||
    new Set(r.order).size !== q.blocks.length ||
    !q.blocks.every((b) => r.order.includes(b.id))
  )
    return false;
  if (
    !q.fields.every((f) => f.options.some((o) => o.value === String(r[f.id])))
  )
    return false;
  return algorithmTests(q).every((input) => {
    const actual = executeAlgorithm(q, r, input);
    return !actual.error && actual.value === expectedAlgorithm(q, input);
  });
}
export const impactScenarios = {
  innovation: [
    [
      "A city introduces sensors that identify leaking water pipes. A pilot reduced lost water but recorded residents’ usage patterns.",
      "Detecting leaks can conserve water.",
      "Recording usage patterns creates a privacy concern.",
      "The pilot reduced water loss.",
      "Sensors ensure that every resident benefits equally.",
    ],
    [
      "A navigation app suggests alternate streets. Travel time falls on the main road, but nearby residential streets receive more traffic.",
      "Drivers on the main road can save time.",
      "Residents may face additional traffic.",
      "Traffic increased on residential streets.",
      "The app has no effects beyond its intended users.",
    ],
  ],
  privacy: [
    [
      "A study app collects precise location continuously although its flashcards do not use location. Students were not informed of this collection.",
      "Collecting unnecessary location data creates a privacy risk.",
      "Students lack an informed choice about collection.",
      "Collection occurs without disclosure.",
      "A popular app automatically has permission to collect any data.",
    ],
    [
      "A school app explains what data it collects and offers an opt-in before collecting it. Students can use its basic notes without opting in.",
      "The opt-in supports informed consent.",
      "Optional collection gives students a meaningful choice.",
      "Collection starts after the student opts in.",
      "Consent eliminates all future security risks.",
    ],
  ],
  bias: [
    [
      "A hiring tool was trained mostly on applicants from one region. Equally qualified applicants from another region are rejected more often in an evaluation.",
      "The evaluation supports a concern about algorithmic bias.",
      "Unrepresentative training data may contribute to unequal outcomes.",
      "Equally qualified groups have different rejection rates.",
      "Fast processing proves the decisions are fair.",
    ],
    [
      "A school studies an automated reading tool. It flags equally accurate responses more often for students using one dialect than another.",
      "The observed disparity warrants investigating bias.",
      "Language representation in the design may affect outcomes.",
      "Equally accurate responses are flagged at different rates.",
      "One accuracy average proves fairness for every group.",
    ],
  ],
  access: [
    [
      "Online appointments are the only way to book a service. Some residents lack reliable internet and cannot complete bookings.",
      "Unequal internet access creates a barrier to this service.",
      "Offline booking could reduce the access barrier.",
      "Residents without internet cannot complete bookings.",
      "Everyone can access the service because it is online.",
    ],
    [
      "A website’s buttons have no text labels and cannot be reached by keyboard. A keyboard user cannot submit its form.",
      "The interface creates an accessibility barrier.",
      "Keyboard operation and clear labels can improve access.",
      "The keyboard user cannot submit the form.",
      "A attractive color palette guarantees accessibility.",
    ],
  ],
  crowd: [
    [
      "A science project invites thousands of volunteers to label telescope images. Different volunteers disagree about some images.",
      "The project uses crowdsourcing.",
      "Quality checks are needed for inconsistent contributions.",
      "Many volunteers contribute labels through an open invitation.",
      "A large number of contributors guarantees every label is correct.",
    ],
    [
      "A community map allows residents to report broken sidewalks. Duplicate and outdated reports appear.",
      "Community contributions can broaden observations.",
      "Reports need validation and updates.",
      "Residents submit local observations.",
      "Every online contribution is reliable without review.",
    ],
  ],
  rights: [
    [
      "An artist publishes a drawing online with a notice reserving copying rights. A student wants to republish it in an app.",
      "Online availability alone does not grant reuse permission.",
      "The student should obtain permission or identify an applicable legal basis.",
      "The notice reserves copying rights.",
      "Anything found through a search engine is free to republish.",
    ],
    [
      "A creator releases a photo under a license requiring attribution for reuse. A student reuses it without providing attribution.",
      "The reuse does not satisfy the stated license condition.",
      "The student should provide the required attribution.",
      "The license requires attribution.",
      "Changing the file name removes the license conditions.",
    ],
  ],
  tradeoffs: [
    [
      "A school considers a delivery robot. It could reduce staff carrying work, but the pilot shows that it blocks narrow corridors.",
      "Automation may reduce carrying work.",
      "The design also creates an access concern.",
      "The pilot robot blocks narrow corridors.",
      "Reduced labor proves the design has no drawbacks.",
    ],
    [
      "A translation app sends text to an outside service. It helps communication, but private text leaves the user’s device.",
      "Translation can support communication.",
      "External processing introduces a data-disclosure trade-off.",
      "Text is sent to an outside service.",
      "Useful output proves external data collection is harmless.",
    ],
  ],
};
function impactSlot(mode) {
  if (mode === "bias") {
    const total = 20,
      first = int(2, 12),
      second = pick([first, Math.min(19, first + int(2, 6))]);
    const unequal = first !== second;
    return [
      `A screening tool evaluates two groups of ${total} equally qualified applicants each. It rejects ${first} in group A and ${second} in group B.`,
      unequal
        ? "The difference warrants investigating possible bias."
        : "This evaluation has equal rejection rates for the two groups.",
      unequal
        ? "Comparable qualifications with different rates raise a concern; the data do not uniquely establish its cause."
        : "Equal rates in this evaluation do not prove fairness in every other context.",
      `Group A has ${first}/${total} rejected; group B has ${second}/${total} rejected.`,
      "Fast processing alone proves that all decisions are fair.",
    ];
  }
  if (mode === "privacy") {
    const before = pick([true, false]);
    return [
      `An app collects optional location data. It explains the purpose and asks permission ${before ? "before starting" : "after starting"} collection.`,
      before
        ? "The described sequence supports informed consent."
        : "Collection began without prior informed consent.",
      before
        ? "A student can make an informed choice before the proposed collection."
        : "A later permission request does not supply a prior informed choice.",
      `Permission is requested ${before ? "before" : "after"} collection begins.`,
      "A free app has automatic permission to collect any data.",
    ];
  }
  if (mode === "rights") {
    const credited = pick([true, false]);
    return [
      `A fictional image license permits copying if the creator is credited. A student copies the image and ${credited ? "includes" : "omits"} that credit. No other license conditions are stated.`,
      credited
        ? "The student satisfies the stated copying condition."
        : "The student does not satisfy the stated copying condition.",
      credited
        ? "The permitted reuse includes the required attribution."
        : "Permitted reuse under this license requires the missing attribution.",
      `The student ${credited ? "includes" : "omits"} the required credit.`,
      "Finding an image online eliminates every license condition.",
    ];
  }
  if (mode === "innovation" || mode === "tradeoffs") {
    const before = int(30, 70),
      improvement = int(5, 15),
      after = before - improvement,
      harm = pick([
        "longer waits for residents without the app",
        "extra collection of precise locations",
      ]);
    return [
      `A pilot service app reduces average booking time from ${before} to ${after} minutes. The pilot also records ${harm}.`,
      "The pilot includes a measured benefit as well as an adverse effect.",
      "A useful innovation can create trade-offs for different users or interests.",
      `Booking time fell by ${improvement} minutes, and the pilot recorded ${harm}.`,
      "The measured benefit proves that no one can be harmed.",
    ];
  }
  return pick(impactScenarios[mode]);
}
function impact(mode) {
  const [context, claim, reason, evidence, bad] =
    Math.random() < 0.5 ? impactSlot(mode) : pick(impactScenarios[mode]);
  const location = pick(["Northfield", "Cedar Grove", "Lakeview"]);
  return base(
    "computing-impact-lab",
    mode,
    "Build a conclusion supported by the evidence. Personal policy preferences are not automatically scored.",
    `${location} case study\n${context}`,
    {
      kind: "fields",
      fields: [
        chooseField("claim", "Supported conclusion", claim, [
          bad,
          "No conclusion is possible about any stated event.",
        ]),
        chooseField("evidence", "Relevant evidence", evidence, [
          "The system runs on a computer.",
          "No users were mentioned in the case.",
        ]),
        chooseField("reason", "Explain the consequence or trade-off", reason, [
          "All effects must be beneficial.",
          "Computing eliminates the need for human evaluation.",
        ]),
      ],
      reflection:
        "Optional reflection (not scored): What response would you recommend, and what trade-off would you consider?",
      explanation: `${claim} ${reason} This is supported by: ${evidence.toLowerCase()} The evidence supports analysis of effects, not a universally correct ethical preference.`,
    },
  );
}
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
export function runModel({ seed, probability, trials }) {
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295 ||
    !Number.isInteger(probability) ||
    probability < 0 ||
    probability > 10 ||
    !Number.isInteger(trials) ||
    trials < 1 ||
    trials > 1000
  )
    throw Error("Invalid model settings");
  const random = seededRandom(seed),
    outcomes = [],
    running = [];
  let success = 0;
  for (let i = 0; i < trials; i++) {
    const event = Math.floor(random() * 10) < probability;
    success += Number(event);
    outcomes.push(event);
    running.push(success / (i + 1));
  }
  return {
    outcomes,
    running,
    success,
    trials,
    probability,
    seed,
    rate: success / trials,
  };
}
function simulation(mode) {
  const probability = int(2, 8),
    trials = pick([20, 50, 100]),
    seed = int(1, 100000),
    context = pick([
      "A visitor arrives during a one-minute interval.",
      "A packet requires retransmission.",
      "A simulated spinner lands on its marked section.",
    ]);
  const q = base(
    "simulation-lab",
    mode,
    "Explore the model and answer the focused question.",
    `${context}\nEach independent trial selects a uniform integer from 0 through 9. An event occurs when that integer is below ${probability}.\nChallenge reference: ${trials} trials; probability ${probability}/10.\nExperiment controls let you investigate other settings; they do not change the challenge reference.`,
    {
      kind: "simulation",
      probability,
      trials,
      seed,
      fields: [],
      explanation:
        "A seeded pseudorandom generator makes a model reproducible. Trial outcomes vary; an expected count is not a guarantee. Real-world events may violate the model’s assumptions of a constant probability and independent trials.",
    },
  );
  if (mode === "randomness") {
    q.prompt =
      "What is the event probability, as a percentage, in the challenge reference model?";
    q.fields = [numField("answer", "Probability (%)")];
    q.solution = { answer: probability * 10 };
  }
  if (mode === "prediction") {
    q.prompt =
      "Predict the expected number of events in the challenge reference (not a guaranteed outcome).";
    q.fields = [numField("answer", "Expected events")];
    q.solution = { answer: (trials * probability) / 10 };
  }
  if (mode === "trials") {
    q.prompt = "Explain what more independent trials can help estimate.";
    q.fields = [
      chooseField(
        "answer",
        "Supported explanation",
        "More trials can provide a more stable estimate of probability; an individual run is not guaranteed to be closer.",
        [
          "Every larger run must exactly match the expected probability.",
          "More trials change the model’s event probability.",
        ],
      ),
    ];
    q.solution = { answer: q.fields[0].correct };
  }
  if (mode === "comparison") {
    q.other = Math.min(10, probability + 2);
    q.context += `\nModel B uses ${q.other}/10 with the same ${trials} reference trials.`;
    q.prompt = "How many more events are expected in Model B than in Model A?";
    q.fields = [numField("answer", "Difference in expected counts")];
    q.solution = { answer: (trials * (q.other - probability)) / 10 };
  }
  if (mode === "limitations") {
    q.prompt =
      "Which real-world observation would challenge this model’s assumptions?";
    q.fields = [
      chooseField(
        "answer",
        "Model limitation",
        "The event probability changes by time of day and one event affects the next.",
        [
          "A single run differs from its expected count.",
          "A seed reproduces the same simulated results.",
        ],
      ),
    ];
    q.solution = { answer: q.fields[0].correct };
  }
  return q;
}
function validateSimulation(q, r) {
  return String(r.answer) === String(q.solution.answer);
}
function exam(mode) {
  const game = "mixed-ap-practice";
  let concept = "general";
  const single = (prompt, context, correct, wrong, explanation) =>
    base(game, mode, prompt, context, {
      kind: "fields",
      topic: mode + "/" + concept,
      fields: [chooseField("answer", "Your answer", correct, wrong)],
      explanation,
      hints: [
        "Identify the concept being tested before comparing the options.",
        "Use only the stated facts and the AP CSP definition. Do not assume a property that has not been demonstrated.",
        "Check what the code or evidence guarantees, rather than what might happen in a particular situation.",
      ],
    });
  if (mode === "creative") {
    const kind = pick(["testing", "collaboration", "purpose"]);
    concept = kind;
    if (kind === "testing") {
      let n = int(10, 70);
      return single(
        "Which input directly tests the equality boundary?",
        `Requirement: accept values at least ${n}.\nRETURN(value > ${n})`,
        String(n),
        [String(n - 2), String(n + 2), String(n + 3)],
        "The threshold itself distinguishes > from ≥. Values strictly above or below it do not expose the omitted equality.",
      );
    }
    if (kind === "collaboration")
      return single(
        "Which action demonstrates collaboration during development?",
        "A team is creating a classroom reminder app.",
        "Team members review and revise designs using one another’s feedback.",
        [
          "One member keeps all design decisions private.",
          "The team copies an app without permission.",
          "The app automatically sorts tasks.",
        ],
        "Collaboration involves shared contributions and communication, rather than merely using a computer or operating a finished app.",
      );
    return single(
      "Which statement describes program purpose?",
      "A library app sorts available books and helps readers locate titles.",
      "Help readers locate available books.",
      [
        "Sort records alphabetically.",
        "Store a list of book identifiers.",
        "Execute a loop once per record.",
      ],
      "Purpose describes the intended need being addressed; sorting and storing are implementation behaviors.",
    );
  }
  if (mode === "data") {
    const kind = pick(["capacity", "table", "two"]);
    concept = kind;
    if (kind === "capacity") {
      const bits = pick([4, 6, 8]);
      return single(
        "How many distinct unsigned values can these bits represent?",
        `An identifier uses ${bits} bits.`,
        String(2 ** bits),
        [String(2 ** bits - 1), String(bits * 2), String(2 ** (bits - 1))],
        `${bits} independent bits provide 2^${bits} combinations. The maximum value is one less than the number of distinct values.`,
      );
    }
    if (kind === "two") {
      const correct = [
        "Exact reconstruction is possible with lossless encoding.",
        "Some compressed files can be larger than their originals.",
      ];
      return base(
        game,
        mode,
        "Select TWO supported statements about compression.",
        "A count-symbol encoding uses two storage units per run.",
        {
          kind: "multi",
          topic: mode + "/compression",
          items: shuffle(
            [
              ...correct,
              "Lossy encoding always reconstructs every original bit.",
              "All inputs must become smaller.",
            ].map((text, i) => ({ id: String(i), text })),
          ),
          correct: ["0", "1"],
          explanation:
            "Lossless encoding preserves the information needed for exact reconstruction. Extra encoding overhead can increase size on inputs with few repetitions.",
        },
      );
    }
    const differences = shuffle([-int(1, 5), int(1, 4), int(5, 9)]),
      rows = ["A", "B", "C"].map((label, i) => {
        const first = int(10, 30);
        return [label, first, first + differences[i]];
      });
    const correct = rows[differences.indexOf(Math.max(...differences))][0];
    const q = single(
      "Which group has the greatest increase?",
      `Shared data passage: recorded values in week 1 and week 2\nGroup | Week 1 | Week 2\n${rows.map((r) => r.join(" | ")).join("\n")}\nThe data are observational.`,
      correct,
      rows
        .map((r) => r[0])
        .filter((label) => label !== correct)
        .concat("All groups increased equally."),
      "Compare week 2 minus week 1 for every group. Observational changes do not establish their cause.",
    );
    q.passage = { type: "table", rows, question: 0 };
    return q;
  }

  if (mode === "algorithms") {
    const kind = pick(["list", "code", "undecidable"]);
    concept = kind;
    if (kind === "undecidable")
      return single(
        "Which statement correctly describes an undecidable problem?",
        "Consider the general problem of determining whether any possible program halts on any possible input.",
        "No algorithm solves every possible instance.",
        [
          "No single instance can be analyzed.",
          "A faster computer will always solve every instance.",
          "Every slow algorithm is undecidable.",
        ],
        "Undecidability is a limitation of general algorithmic solvability, not just execution speed.",
      );
    if (kind === "list") {
      let a = Array.from({ length: 4 }, () => int(2, 30)),
        pos = int(1, 4);
      return single(
        "Which value is displayed?",
        `Shared code passage\nvalues ← [${a.join(", ")}]\nDISPLAY(values[${pos}])`,
        String(a[pos - 1]),
        shuffle([
          ...new Set([0, 31, 32, 33, ...a].filter((v) => v !== a[pos - 1])),
        ])
          .slice(0, 3)
          .map(String),
        "AP CSP lists use one-based indexing: index 1 refers to the first element.",
      );
    }
    const n = int(3, 8),
      step = int(2, 5);
    const q = single(
      "Which value does this accumulator return?",
      `Shared code passage\ntotal ← 0\nREPEAT ${n} TIMES\n{\n    total ← total + ${step}\n}\nDISPLAY(total)`,
      String(n * step),
      [String(n + step), String(n * step - step), String(n * step + step)],
      `The body adds ${step} on each of ${n} executions, for ${n * step}.`,
    );
    q.passage = { type: "code", n, step, question: 0 };
    return q;
  }
  if (mode === "systems") {
    const kind = pick(["parallel", "fault", "protocol"]);
    concept = kind;
    if (kind === "parallel") {
      const a = int(3, 9),
        b = int(10, 15);
      return single(
        "What is the parallel completion time under these conditions?",
        `Two independent tasks take ${a} and ${b} seconds. They run simultaneously on two processors with no overhead.`,
        String(b),
        [String(a + b), String(a), String(b - a)],
        "Independent simultaneous tasks finish when the longest task finishes. Real overhead and dependencies can reduce gains.",
      );
    }
    if (kind === "fault")
      return single(
        "Which observation demonstrates fault tolerance?",
        "A network has more than one path between two devices.",
        "Delivery continues after a connection fails using another available path.",
        [
          "Extra paths exist but have never been used during a failure.",
          "The network uses long cables.",
          "A device displays a file.",
        ],
        "Extra paths are redundancy; continuing to operate during a failure demonstrates fault tolerance.",
      );
    return single(
      "What allows different devices to interpret exchanged messages consistently?",
      "Two computers from different manufacturers communicate.",
      "Agreed communication protocols.",
      [
        "Identical screen dimensions.",
        "The same keyboard model.",
        "A shared student account.",
      ],
      "Protocols specify communication rules such as message format and interpretation.",
    );
  }
  const kind = pick(["privacy", "bias", "rights"]);
  concept = kind;
  if (kind === "rights")
    return single(
      "Which conclusion is supported?",
      "A photo is available online under a license that requires attribution.",
      "Reuse must satisfy the applicable license conditions.",
      [
        "Online availability removes copying rights.",
        "Renaming a file removes attribution requirements.",
        "All educational reuse is automatically unrestricted.",
      ],
      "Availability is different from permission. A stated attribution requirement applies to reuse under that license.",
    );
  if (kind === "bias")
    return single(
      "Which conclusion is supported by the evidence?",
      "A model rejects equally qualified applicants from one group more often than another.",
      "The disparity warrants investigating algorithmic bias.",
      [
        "Fast execution proves fairness.",
        "Every individual decision must be wrong.",
        "The model cannot contain bias because it uses numbers.",
      ],
      "The evidence supports investigating systematic differences; it does not establish every individual outcome or a unique cause.",
    );
  return single(
    "Which action supports informed consent?",
    "An app proposes optional collection of student location data.",
    "Explain the purpose and obtain opt-in before collecting data.",
    [
      "Collect first and disclose later.",
      "Assume permission because the app is free.",
      "Hide collection in an unrelated menu.",
    ],
    "Consent requires an informed choice about the proposed collection.",
  );
}
const generators = {
  "response-builder": response,
  "test-case-builder": testCase,
  "algorithm-architect": architect,
  "computing-impact-lab": impact,
  "simulation-lab": simulation,
  "mixed-ap-practice": exam,
};

export function passageFollowup(q) {
  if (!q.passage) throw Error("No shared passage");
  const p = { ...q.passage, question: (q.passage.question + 1) % 3 };
  let next;
  if (p.type === "code") {
    const count = p.question === 1;
    next = {
      ...q,
      prompt: count
        ? "How many times does the repeated statement execute?"
        : p.question === 2
          ? "What value would be displayed if this same repeated body executed once more?"
          : "Which value does this accumulator display?",
      fields: [
        chooseField(
          "answer",
          "Your answer",
          String(
            count ? p.n : p.question === 2 ? (p.n + 1) * p.step : p.n * p.step,
          ),
          [
            String(count ? p.n + 1 : p.n + p.step),
            String(count ? p.step : (p.n - 1) * p.step),
            String(count ? p.n - 1 : p.n * p.step + p.step + 1),
          ],
        ),
      ],
      explanation: count
        ? "REPEAT n TIMES executes its body exactly n times."
        : p.question === 2
          ? "One additional execution contributes one additional step amount."
          : "Each execution contributes the same step amount to the accumulator.",
    };
  } else if (p.question === 1) {
    const correct = p.rows.filter((r) => r[2] > r[1]).map((r) => r[0]);
    next = {
      ...q,
      kind: "multi",
      prompt: "Select TWO groups whose recorded value increased.",
      fields: [],
      items: shuffle(
        p.rows
          .map((r) => ({ id: r[0], text: "Group " + r[0] }))
          .concat({ id: "none", text: "No group increased." }),
      ),
      correct,
      explanation:
        "A group increased only when its second recorded value exceeds its first.",
    };
  } else {
    const evidence = p.question === 2;
    const correct = evidence
      ? "The data show changes, but do not identify what caused them."
      : p.rows.reduce((best, r) =>
          r[2] - r[1] > best[2] - best[1] ? r : best,
        )[0];
    next = {
      ...q,
      kind: "fields",
      prompt: evidence
        ? "Which conclusion is supported by this observational passage?"
        : "Which group has the greatest increase?",
      fields: [
        chooseField(
          "answer",
          "Your answer",
          correct,
          evidence
            ? [
                "The observations prove the cause of every change.",
                "Every group’s value increased.",
                "No measured values changed.",
              ]
            : p.rows
                .map((r) => r[0])
                .filter((label) => label !== correct)
                .concat("All groups increased equally."),
        ),
      ],
      explanation: evidence
        ? "Observational measurements show associations or changes; they alone do not establish causation."
        : "Compare the difference between the second and first values for each group.",
    };
  }
  next.passage = p;
  return next;
}
