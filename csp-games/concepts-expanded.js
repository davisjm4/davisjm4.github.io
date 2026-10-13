import * as Base from "./concepts-engine.js?v=platform-expansion-v2";
import { int, pick, shuffle } from "./engine.js?v=platform-expansion-v2";
export {
  components,
  source,
} from "./concepts-engine.js?v=platform-expansion-v2";
export const categoryLabels = {
  ...Base.categoryLabels,
  abstraction: "Abstraction",
  algorithms: "Algorithms & Errors",
  computing: "Computing Concepts",
};
const terminology = {
  procedures: {
    definition: "Procedure definition",
    name: "Procedure name",
    parameter: "Parameter",
    call: "Procedure call",
    argument: "Argument",
    match: "Argument",
    "return-value": "Returned value",
    "return-instruction": "Return statement",
  },
  selection: {
    statement: "Selection statement",
    condition: "Boolean expression",
    compound: "Boolean expression",
    "boolean-condition": "Boolean expression",
    "true-body": "True branch statement",
    "false-body": "False branch statement",
  },
  iteration: {
    statement: "Iteration statement",
    body: "Repeated statement",
    "until-condition": "Stopping condition",
    item: "Traversal item variable",
  },
  variables: {
    variable: "Variable",
    value: "Assigned value",
    assignment: "Assignment statement",
    comparison: "Comparison",
    "boolean-expression": "Boolean expression",
    "boolean-value": "Boolean value",
    "boolean-result": "Boolean expression",
  },
  lists: {
    name: "List name",
    list: "List value",
    index: "Index",
    "insert-value": "Inserted value",
    element: "List element",
    append: "APPEND operation",
    insert: "INSERT operation",
    remove: "REMOVE operation",
    location: "Index",
  },
};
const banks = {
  procedures: [
    "Parameter",
    "Argument",
    "Procedure call",
    "Procedure name",
    "Return statement",
    "Returned value",
    "Procedure definition",
  ],
  selection: [
    "Selection statement",
    "Boolean expression",
    "True branch statement",
    "False branch statement",
    "Iteration statement",
  ],
  iteration: [
    "Iteration statement",
    "Repeated statement",
    "Stopping condition",
    "Traversal item variable",
    "Selection statement",
  ],
  variables: [
    "Variable",
    "Assigned value",
    "Assignment statement",
    "Comparison",
    "Boolean expression",
    "Boolean value",
  ],
  lists: [
    "List name",
    "List value",
    "Index",
    "Inserted value",
    "List element",
    "APPEND operation",
    "INSERT operation",
    "REMOVE operation",
  ],
};
// Each scenario has one annotated evidence detail. Distractors refer to distinct mechanisms,
// not overlapping descriptions such as fault tolerance and redundant capacity.
export const scenarios = [
  [
    "computing",
    "development",
    "Iterative development",
    () => [
      "A school team prototypes a reminder app.",
      "The team tests a prototype, collects feedback, and revises the design in repeated cycles.",
      "The app stores dates in a list.",
      "A student signs in to an existing school system.",
    ],
    "Iterative development uses repeated testing and refinement rather than assuming a first design is final.",
  ],
  [
    "computing",
    "library",
    "Software library",
    () => [
      "A program needs to display charts.",
      "It imports an existing collection of reusable chart procedures instead of writing each one.",
      "It stores chart titles in variables.",
      "It compares two data values.",
    ],
    "A software library provides reusable code. Documentation specifies how its procedures are called and what they do.",
  ],
  [
    "algorithms",
    "string",
    "String",
    (n) => [
      `label ← "Room ${n}"\nDISPLAY(label)`,
      "The value is a sequence of characters enclosed in quotation marks.",
      "The value is stored in a named variable.",
      "A statement displays the stored value.",
    ],
    "A string represents a sequence of characters; its variable name is separate from its value.",
  ],
  [
    "abstraction",
    "data-abstraction",
    "Data abstraction",
    (n) => [
      `readings ← [${n}, ${n + 2}, ${n + 4}]\nFOR EACH reading IN readings\n{\n    DISPLAY(reading)\n}`,
      "An ordered collection holds many readings under one name.",
      "Each reading is displayed separately.",
      "A loop visits the readings.",
    ],
    "A list groups related data under one name and supports common operations.",
  ],
  [
    "abstraction",
    "procedural-abstraction",
    "Procedural abstraction",
    (n) => [
      `PROCEDURE showMessage(message)\n{\n    DISPLAY(message)\n}\nshowMessage("Welcome ${n}")`,
      "A named procedure packages reusable instructions behind an interface.",
      "The message is shown on the screen.",
      "A text argument is supplied.",
    ],
    "A procedure separates how an action is implemented from how callers invoke it.",
  ],
  [
    "algorithms",
    "sequence",
    "Sequencing",
    (n) => [
      `total ← ${n}\ntotal ← total + 2\nDISPLAY(total)`,
      "The statements execute in their written order.",
      "The total is stored in a variable.",
      "A value is displayed.",
    ],
    "Sequencing specifies the order in which instructions execute.",
  ],
  [
    "algorithms",
    "logic-error",
    "Logic error",
    (n) => [
      `// Requirement: display true for ages at least ${n}.\nIF (age > ${n})\n{\n    DISPLAY(true)\n}`,
      `The program excludes age ${n}, even though the requirement includes it.`,
      "The condition compares two values.",
      "The selected branch displays output.",
    ],
    "A logic error allows execution but produces behavior that violates the requirement.",
  ],
  [
    "algorithms",
    "test",
    "Boundary test",
    (n) => [
      `// Requirement: accept scores at least ${n}.\naccepted ← score ≥ ${n}\nDISPLAY(accepted)`,
      `A test supplies score ${n}, exactly at the threshold.`,
      `A test supplies score ${n + 10}, well above the threshold.`,
      "A comment explains the requirement.",
    ],
    "Boundary testing checks values at or adjacent to a limit where behavior changes.",
  ],
  [
    "algorithms",
    "undecidable",
    "Undecidable problem",
    () => [
      "A team asks for one algorithm that determines whether any possible program halts on any possible input.",
      "No algorithm can correctly answer the question for every program and input.",
      "Some individual programs have easy-to-check termination.",
      "A slow algorithm might still finish on a small input.",
    ],
    "Undecidable means no algorithm can solve all instances; it does not mean every instance is impossible to analyze.",
  ],
  [
    "computing",
    "collaboration",
    "Collaboration",
    () => [
      "A school team builds a reminder app.",
      "Team members review one another’s designs and combine feedback.",
      "One student changes the screen color alone.",
      "The finished app sends notifications.",
    ],
    "Collaboration involves people working together, communicating, and contributing to shared work.",
  ],
  [
    "computing",
    "documentation",
    "Documentation",
    () => [
      "A team maintains a route-planning program.",
      "Written comments describe a procedure’s inputs and intended behavior.",
      "A loop visits route segments.",
      "A test runs the program with one route.",
    ],
    "Documentation explains purpose, behavior, interfaces, or development decisions to readers.",
  ],
  [
    "computing",
    "purpose",
    "Program purpose",
    () => [
      "A volunteer group builds an app for locating nearby food donations.",
      "The app is intended to help volunteers find available donations.",
      "The app sorts locations by distance.",
      "The app stores location records in a list.",
    ],
    "Purpose is the need or problem a program is intended to address; behavior describes what it does.",
  ],
  [
    "computing",
    "metadata",
    "Metadata",
    (n) => [
      `An image contains ${n * 10} colored pixels.`,
      "A separate record stores the image’s creation date and dimensions.",
      "The pixel colors form the visible image.",
      "An algorithm displays the pixel colors.",
    ],
    "Metadata describes other data, such as its source, format, date, or dimensions.",
  ],
  [
    "computing",
    "lossless",
    "Lossless compression",
    () => [
      "A program encodes repeated letters as count-symbol pairs.",
      "Decoding restores every original character exactly.",
      "The stored size sometimes increases.",
      "The source contains repeated characters.",
    ],
    "Lossless compression permits exact reconstruction; it does not guarantee that every input becomes smaller.",
  ],
  [
    "computing",
    "lossy",
    "Lossy compression",
    () => [
      "A photo editor stores a smaller image.",
      "The encoding discards subtle color differences that cannot be recovered.",
      "The image has a file name.",
      "The editor runs on a laptop.",
    ],
    "Lossy compression discards information and prevents exact reconstruction.",
  ],
  [
    "computing",
    "correlation",
    "Correlation",
    () => [
      "A school compares weekly study hours and practice scores.",
      "Students who study more tend to have higher scores in the observations.",
      "The dataset does not randomly assign study hours.",
      "A program stores the observations.",
    ],
    "Correlation describes an observed relationship. It alone does not establish causation.",
  ],
  [
    "computing",
    "protocol",
    "Protocol",
    () => [
      "Two computers exchange messages over a network.",
      "Both follow agreed rules for formatting and interpreting messages.",
      "Each computer has a keyboard.",
      "A user chooses a document to send.",
    ],
    "Protocols establish rules for communication between computing devices.",
  ],
  [
    "computing",
    "address",
    "IP address",
    () => [
      "A packet is sent across interconnected networks.",
      "A numerical address identifies the destination device for delivery.",
      "The message is divided into packets.",
      "A router chooses a next connection.",
    ],
    "An IP address identifies a device on an IP network for addressing and delivery.",
  ],
  [
    "computing",
    "redundancy",
    "Redundancy",
    () => [
      "A school configures backup servers before any failure occurs.",
      "Additional servers can provide the same service as the primary server.",
      "The website uses a readable font.",
      "A student opens the website.",
    ],
    "Redundancy provides extra components or paths. Their existence alone does not demonstrate successful operation during failure.",
  ],
  [
    "computing",
    "fault-tolerance",
    "Fault tolerance",
    () => [
      "A school’s primary server stops responding during a test.",
      "Requests continue to succeed through a backup while the primary server is unavailable.",
      "A server has a label.",
      "The website contains images.",
    ],
    "Fault tolerance is demonstrated when a system continues operating despite a component failure.",
  ],
  [
    "computing",
    "parallel",
    "Parallel computing",
    () => [
      "A computer processes independent image regions.",
      "Multiple processors work on different regions at the same time.",
      "One processor reads the file name.",
      "The image is saved after all work finishes.",
    ],
    "Parallel computing performs parts of a computation simultaneously. Dependencies can limit the speedup.",
  ],
  [
    "computing",
    "simulation",
    "Simulation",
    () => [
      "A program estimates how long visitors wait at a school event.",
      "A model imitates arrivals and service without running the real event.",
      "A chart displays the estimated waits.",
      "The program saves a text file.",
    ],
    "A simulation models a process. Results depend on assumptions and need comparison with real observations.",
  ],
  [
    "computing",
    "divide",
    "Digital divide",
    () => [
      "A district surveys access to online school resources.",
      "Some homes have reliable internet access and others cannot afford it.",
      "Teachers post class notes.",
      "A webpage uses headings.",
    ],
    "The digital divide concerns unequal access to computing resources and their benefits.",
  ],
  [
    "computing",
    "bias",
    "Algorithmic bias",
    () => [
      "A screening tool is evaluated against equally qualified applicants.",
      "One group is consistently rejected more often because its examples were underrepresented in training data.",
      "The tool processes applications quickly.",
      "Applications have identifiers.",
    ],
    "Algorithmic bias can create systematically unfair outcomes; data and design decisions need examination.",
  ],
  [
    "computing",
    "consent",
    "Consent",
    () => [
      "A fictional study app requests location data.",
      "The app explains its collection purpose and allows a student to agree or decline before collection.",
      "The app has a blue icon.",
      "A menu lists classes.",
    ],
    "Consent requires an informed choice about the proposed data use, rather than assuming permission.",
  ],
  [
    "computing",
    "crowdsourcing",
    "Crowdsourcing",
    () => [
      "A museum builds a searchable collection.",
      "Many volunteers contribute transcriptions through an open online invitation.",
      "One curator chooses a title.",
      "A server stores the finished files.",
    ],
    "Crowdsourcing obtains contributions from a large group, often through an online invitation.",
  ],
  [
    "computing",
    "copyright",
    "Copyright",
    () => [
      "A student wants to reuse another creator’s photo.",
      "The creator’s rights govern copying and distribution unless permission or an applicable exception allows reuse.",
      "The photo has many pixels.",
      "The student’s laptop can open the file.",
    ],
    "Public availability does not automatically grant permission to copy or distribute a work.",
  ],
  [
    "computing",
    "mfa",
    "Multifactor authentication",
    () => [
      "A fictional account requires two checks at sign-in.",
      "It requires a password and a code from a separate authenticator device.",
      "It displays a welcome message.",
      "It asks for a username.",
    ],
    "Multifactor authentication combines distinct factor types; two passwords are still one factor type.",
  ],
];
const generalHints = [
  "Think about the role the component or detail plays, rather than its appearance.",
  "Distinguish the mechanism described from its inputs, outputs, and surrounding actions.",
  "Use only the highlighted component or the evidence in this scenario. A possible benefit is different from a demonstrated behavior.",
];
function scenario(category, forced) {
  const entry = pick(
    scenarios.filter((s) => s[0] === category && (!forced || s[1] === forced)),
  );
  if (!entry) throw Error("Unknown expanded concept");
  const [cat, variant, term, make, explanation] = entry,
    [context, ...details] = make(int(12, 40));
  const nodes = shuffle(
    details.map((text, i) => ({
      id: "detail" + i,
      text,
      role: i === 0 ? "evidence" : "context",
    })),
  );
  const root = {
    id: "snippet",
    role: "snippet",
    children: [context + "\n\n", ...nodes.flatMap((n) => [n, "\n"])],
  };
  return {
    category: cat,
    variant,
    root,
    code: Base.source(root),
    prompt: `Select the detail that specifically demonstrates ${term.toLowerCase()}.`,
    interaction: "select",
    multiple: false,
    answerIds: ["detail0"],
    explanation,
    term,
    hints: generalHints,
  };
}
export function generateConcept(mode = "mixed", forcedVariant, direction) {
  const category = mode === "mixed" ? pick(Object.keys(categoryLabels)) : mode;
  let q = Base.categories.includes(category)
    ? Base.generateConcept(category, forcedVariant)
    : scenario(category, forcedVariant);
  const term = q.term || terminology[q.category]?.[q.variant];
  // Numeric and genuinely multiple-component challenges remain direct interactions.
  if (
    term &&
    q.interaction !== "count" &&
    q.answerIds.length === 1 &&
    (direction === "reverse" || (!direction && Math.random() < 0.5))
  ) {
    const choices = banks[q.category] || [
      ...new Set(scenarios.filter((s) => s[0] === category).map((s) => s[2])),
    ];
    // Some valid descriptions overlap (a comparison is a Boolean expression).
    // Exclude synonymous/broader valid labels from single-answer reverse banks.
    const overlapping = {
      Comparison: ["Boolean expression"],
      "Boolean expression": ["Comparison"],
      "Boolean value": ["Assigned value"],
      "Iterative development": ["Collaboration"],
    };
    const distractors = shuffle(
      choices.filter(
        (t) => t !== term && !(overlapping[term] || []).includes(t),
      ),
    ).slice(0, 3);
    if (distractors.length < 2)
      distractors.push(
        ...["Selection", "Iteration", "Assignment"]
          .filter((t) => t !== term)
          .slice(0, 3 - distractors.length),
      );
    q = {
      ...q,
      interaction: "term",
      highlightIds: [...q.answerIds],
      answer: term,
      choices: shuffle([term, ...distractors]),
      prompt:
        "Identify the terminology for the highlighted component or detail.",
      direction: "reverse",
      hints: generalHints,
    };
  } else q.direction = "forward";
  q.topicTitle =
    categoryLabels[q.category] + " — " + q.variant.replaceAll("-", " ");
  return q;
}
export function answerText(q) {
  return q.interaction === "term" ? q.answer : Base.answerText(q);
}
