import { int, pick, shuffle } from "./engine.js?v=platform-expansion-v2";
export const responseModes = {
  guided: "Guided Sentence Builder",
  explanation: "Explanation Builder",
  reduced: "Reduced Scaffold",
  testing: "Test Explanation",
  abstraction: "Abstraction Explanation",
};
export const supportNames = {
  full: "Full Support",
  partial: "Partial Support",
  minimal: "Minimal Support",
};
const display = (v) =>
  typeof v === "boolean"
    ? v
      ? "TRUE"
      : "FALSE"
    : typeof v === "string"
      ? JSON.stringify(v)
      : JSON.stringify(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function procedureModel(forced) {
  const structure =
      forced ||
      pick([
        "count",
        "sum",
        "product",
        "first-index",
        "filter",
        "maximum",
        "all",
        "range",
        "scale",
        "reverse",
      ]),
    t = int(0, 3),
    factor = int(2, 4),
    numeric = ["range", "scale"].includes(structure),
    name = {
      count: "countMatches",
      sum: "totalValues",
      product: "multiplyValues",
      "first-index": "findFirst",
      filter: "keepMatches",
      maximum: "largest",
      all: "allPositive",
      range: "classify",
      scale: "adjust",
      reverse: "reverseValues",
    }[structure];
  let params = numeric
      ? structure === "range"
        ? ["value", "low", "high"]
        : ["value", "factor", "offset"]
      : [
          "values",
          ...(["count", "first-index", "filter"].includes(structure)
            ? ["target"]
            : []),
        ],
    body,
    run,
    purpose,
    wrongPurpose,
    evidence,
    wrongEvidence,
    reason,
    wrongReason,
    needles;
  if (structure === "count") {
    body =
      "count ← 0\nFOR EACH value IN values\n{\n    IF (value ≥ target) { count ← count + 1 }\n}\nRETURN(count)";
    run = (args) => args[0].filter((v) => v >= args[1]).length;
    purpose = "The procedure counts values that meet or exceed its target.";
    wrongPurpose = [
      "The procedure totals the values that meet or exceed its target.",
      "The procedure counts values that are strictly below its target.",
    ];
    evidence = "The conditional count + 1 adds one for each qualifying value.";
    wrongEvidence = [
      "The initialization count ← 0 prevents later changes to the counter.",
      "The final RETURN(count) displays each element inside the procedure.",
    ];
    reason =
      "One increment per qualifying element measures a count rather than a sum.";
    wrongReason = [
      "Adding one per match accumulates each matching value rather than its count.",
      "Every traversal step increases count, even when the comparison is false.",
    ];
    needles = ["count ← count + 1"];
  } else if (structure === "sum") {
    body =
      "total ← 0\nFOR EACH value IN values\n{\n    total ← total + value\n}\nRETURN(total)";
    run = (args) => args[0].reduce((s, v) => s + v, 0);
    purpose =
      "The procedure returns the total of all values in its input list.";
    wrongPurpose = [
      "The procedure returns the number of values in its input list.",
      "The procedure returns the product of all values in its input list.",
    ];
    evidence =
      "The assignment total + value contributes each element to the total.";
    wrongEvidence = [
      "The initialization total ← 0 makes every completed call return zero.",
      "The final RETURN(total) repeats the addition once more before returning.",
    ];
    reason =
      "Starting at zero and adding each value accumulates the complete sum.";
    wrongReason = [
      "Adding each value once makes total equal the number of visited elements.",
      "Starting at zero causes negative values to be ignored throughout traversal.",
    ];
    needles = ["total ← total + value"];
  } else if (structure === "product") {
    body =
      "product ← 1\nFOR EACH value IN values\n{\n    product ← product × value\n}\nRETURN(product)";
    run = (args) => args[0].reduce((p, v) => p * v, 1);
    purpose =
      "The procedure multiplies all input values to obtain their product.";
    wrongPurpose = [
      "The procedure adds all input values to obtain their combined total.",
      "The procedure counts input values using the product variable as a counter.",
    ];
    evidence =
      "The repeated product × value combines each element by multiplication.";
    wrongEvidence = [
      "The initialization product ← 1 adds one to the answer on every visit.",
      "The final RETURN(product) multiplies the product by the list length.",
    ];
    reason =
      "The initial value one preserves each factor and also handles zero repetitions.";
    wrongReason = [
      "The initial value one makes an empty traversal return zero automatically.",
      "Multiplying a factor by zero has no effect on the accumulated product.",
    ];
    needles = ["product ← product × value", "product ← 1"];
  } else if (structure === "first-index") {
    body =
      "index ← 1\nFOR EACH value IN values\n{\n    IF (value = target) { RETURN(index) }\n    index ← index + 1\n}\nRETURN(-1)";
    run = (args) =>
      args[0].includes(args[1]) ? args[0].indexOf(args[1]) + 1 : -1;
    purpose =
      "The procedure returns the first matching position, or -1 when absent.";
    wrongPurpose = [
      "The procedure returns the last matching position, or zero when absent.",
      "The procedure returns the matching value itself, or the list length.",
    ];
    evidence =
      "The matching branch returns index immediately instead of continuing traversal.";
    wrongEvidence = [
      "The initial index ← 1 means the first element is never examined.",
      "The final RETURN(-1) overwrites any matching position already returned.",
    ];
    reason =
      "An early RETURN stops the procedure, so later matches cannot replace the first.";
    wrongReason = [
      "After an early RETURN, the loop continues and replaces the index at every match.",
      "The index update occurs only when the compared value equals the requested target.",
    ];
    needles = ["IF (value = target) { RETURN(index) }"];
  } else if (structure === "filter") {
    body =
      "kept ← []\nFOR EACH value IN values\n{\n    IF (value > target) { APPEND(kept, value) }\n}\nRETURN(kept)";
    run = (args) => args[0].filter((v) => v > args[1]);
    purpose =
      "The procedure returns a new list containing values strictly above target.";
    wrongPurpose = [
      "The procedure returns a count of all values strictly above target.",
      "The procedure returns a new list including values equal to target.",
    ];
    evidence =
      "The guarded APPEND(kept, value) copies matching values into the new list.";
    wrongEvidence = [
      "The initialization kept ← [] makes the original input list empty as well.",
      "The final RETURN(kept) removes matching elements from the original input list.",
    ];
    reason =
      "Only matching values are appended, preserving their original order and duplicates.";
    wrongReason = [
      "Appending a value sorts the result and removes any duplicate automatically.",
      "Values failing the condition are appended before values that satisfy the condition.",
    ];
    needles = ["APPEND(kept, value)"];
  } else if (structure === "maximum") {
    body =
      'IF (LENGTH(values) = 0) { RETURN("NONE") }\nbest ← values[1]\nFOR EACH value IN values\n{\n    IF (value > best) { best ← value }\n}\nRETURN(best)';
    run = (args) => (args[0].length ? Math.max(...args[0]) : "NONE");
    purpose =
      'The procedure returns the largest value, or "NONE" for an empty list.';
    wrongPurpose = [
      "The procedure returns the smallest value, or zero for an empty list.",
      "The procedure returns the last value, or raises an error for every empty list.",
    ];
    evidence =
      "The comparison replaces best only when the current value is larger.";
    wrongEvidence = [
      "The initialization best ← values[1] skips every later value in the list.",
      'The empty-list guard returns "NONE" even when the input contains values.',
    ];
    reason =
      "Keeping the largest value seen so far leaves the overall maximum after traversal.";
    wrongReason = [
      "Replacing best with a larger value eventually preserves only the smallest value.",
      "Initializing from the first element always makes the first value the final answer.",
    ];
    needles = ["IF (value > best) { best ← value }", "IF (LENGTH(values) = 0)"];
  } else if (structure === "all") {
    body =
      "FOR EACH value IN values\n{\n    IF (value ≤ 0) { RETURN(FALSE) }\n}\nRETURN(TRUE)";
    run = (args) => args[0].every((v) => v > 0);
    purpose =
      "The procedure returns TRUE when every element is positive, including the empty case.";
    wrongPurpose = [
      "The procedure returns TRUE whenever at least one element is positive.",
      "The procedure returns FALSE whenever at least one element is positive.",
    ];
    evidence =
      "A nonpositive value immediately returns FALSE; finishing traversal returns TRUE.";
    wrongEvidence = [
      "The final RETURN(TRUE) replaces every FALSE already returned by the procedure.",
      "The FOR EACH statement visits a made-up zero when its input list is empty.",
    ];
    reason =
      "One failing element disproves the all-positive claim; without a failure it remains true.";
    wrongReason = [
      "A single positive element proves that every other list element must be positive.",
      "An early FALSE returns only from the IF statement, allowing a later TRUE to replace it.",
    ];
    needles = ["IF (value ≤ 0)", "RETURN(TRUE)"];
  } else if (structure === "range") {
    body =
      'IF ((value ≥ low) AND (value ≤ high))\n{\n    RETURN("inside")\n}\nRETURN("outside")';
    run = (args) =>
      args[0] >= args[1] && args[0] <= args[2] ? "inside" : "outside";
    purpose =
      "The procedure classifies membership in a range that includes both endpoints.";
    wrongPurpose = [
      "The procedure classifies membership in a range that excludes both endpoints.",
      "The procedure returns inside when either boundary comparison is true by itself.",
    ];
    evidence =
      "Both inclusive comparisons must be TRUE for the inside branch to return.";
    wrongEvidence = [
      'The final RETURN("outside") replaces the earlier inside result on every call.',
      "The AND operator requires exactly one of the two comparisons to be TRUE.",
    ];
    reason =
      "The lower and upper checks jointly restrict the value to the inclusive interval.";
    wrongReason = [
      "Passing the lower check alone proves the upper limit must also be satisfied.",
      "Equality at either endpoint makes its inclusive comparison evaluate to FALSE.",
    ];
    needles = ["IF ((value ≥ low) AND (value ≤ high))"];
  } else if (structure === "scale") {
    body = "result ← value × factor\nresult ← result + offset\nRETURN(result)";
    run = (args) => args[0] * args[1] + args[2];
    purpose =
      "The procedure multiplies value by factor, then adds offset to the result.";
    wrongPurpose = [
      "The procedure adds offset to value, then multiplies their sum by factor.",
      "The procedure multiplies factor by offset, then adds value to the result.",
    ];
    evidence =
      "The second assignment adds offset to the result of the first multiplication.";
    wrongEvidence = [
      "The first assignment changes the argument factor before calculating the result.",
      "The RETURN(result) statement displays data without returning anything to the caller.",
    ];
    reason =
      "Parameters receive the arguments in order, so one definition can transform different inputs.";
    wrongReason = [
      "Parameters are fixed constants, so changing the call arguments cannot change the result.",
      "Arguments change the procedure definition itself instead of supplying its input values.",
    ];
    needles = ["result ← result + offset", "result ← value × factor"];
  } else {
    body =
      "reversed ← []\nindex ← LENGTH(values)\nREPEAT UNTIL (index = 0)\n{\n    APPEND(reversed, values[index])\n    index ← index − 1\n}\nRETURN(reversed)";
    run = (args) => [...args[0]].reverse();
    purpose =
      "The procedure returns the input values in reverse positional order.";
    wrongPurpose = [
      "The procedure returns the input values sorted from smallest to largest.",
      "The procedure returns the input values unchanged after deleting duplicates.",
    ];
    evidence =
      "The index starts at the list length and decreases after each append.";
    wrongEvidence = [
      "The initialization index ← LENGTH(values) starts at the first list position.",
      "The index update makes APPEND sort the numeric values before storing them.",
    ];
    reason =
      "Visiting positions from last to first reverses order without changing stored values.";
    wrongReason = [
      "Visiting positions from last to first compares neighboring values to sort the list.",
      "Appending each indexed value once removes repetitions because the result began empty.",
    ];
    needles = ["index ← index − 1", "APPEND(reversed, values[index])"];
  }
  const candidates =
    structure === "all"
      ? [[[]], [[1]], [[0]], [[2, -1, 3]], [[1, 2, 3]]]
      : numeric
        ? structure === "range"
          ? [
              [t, t, t + 2],
              [t - 1, t, t + 2],
              [t + 2, t, t + 2],
              [t + 3, t, t + 2],
            ]
          : [
              [0, factor, t],
              [2, factor, t],
              [-1, factor, t],
              [3, factor, t + 1],
            ]
        : params.length === 2
          ? [
              [[], t],
              [[t], t],
              [[t - 1, t, t + 2], t],
              [[t + 2, t, t + 2], t],
            ]
          : [[[]], [[t]], [[t - 1, t, t + 2]], [[t + 2, t - 1, t + 2]]];
  const sample = pick(candidates),
    other = pick(candidates.filter((a) => !same(run(a), run(sample))));
  if (!other) throw Error("Procedure needs contrasting calls");
  const publicName = pick([
    "analyze",
    "process",
    "summarize",
    "evaluate",
    "transform",
  ]);
  const call = (args) => `${publicName}(${args.map(display).join(", ")})`;
  const code = `PROCEDURE ${publicName}(${params.join(", ")})\n{\n${body
    .split("\n")
    .map((l) => "    " + l)
    .join("\n")}\n}\nDISPLAY(${call(sample)})\nDISPLAY(${call(other)})`;
  const lines = code.split("\n"),
    validLines = lines
      .map((line, i) => (needles.some((n) => line.includes(n)) ? i + 1 : null))
      .filter(Boolean);
  return {
    structure,
    name: publicName,
    params,
    body,
    run,
    sample,
    other,
    call,
    code,
    lines,
    validLines,
    purpose,
    wrongPurpose,
    evidence,
    wrongEvidence,
    reason,
    wrongReason,
    t,
  };
}
export function generateResponse(mode = "mixed", support = "full", forced) {
  const selected = mode === "mixed" ? pick(Object.keys(responseModes)) : mode;
  if (!responseModes[selected] || !supportNames[support])
    throw Error("Unknown response practice setting");
  const p = procedureModel(forced),
    out = p.run(p.sample),
    otherOut = p.run(p.other),
    isList = Array.isArray(p.sample[0]),
    isEmpty = isList && p.sample[0].length === 0,
    single = isList && p.sample[0].length === 1;
  let C = [p.purpose, ...p.wrongPurpose],
    E = [p.evidence, ...p.wrongEvidence],
    R = [p.reason, ...p.wrongReason],
    prompt = `Explain what ${p.name} computes, using its code as evidence.`;
  if (selected === "reduced") {
    const noReturn = Symbol("no return");
    const alternatives = Array.isArray(out)
      ? [out.concat(p.t), out.length ? out.slice(1) : [p.t, p.t]]
      : typeof out === "number"
        ? [out + 1, out - 1]
        : typeof out === "boolean"
          ? [!out, noReturn]
          : out === "NONE"
            ? [0, noReturn]
            : [out === "inside" ? "outside" : "inside", noReturn];
    const statement = (value) =>
      value === noReturn
        ? "The first displayed call displays its result without returning a value to its caller."
        : `The first displayed call returns ${display(value)} to its caller.`;
    C = [statement(out), ...alternatives.map(statement)];
    prompt =
      "Explain the first displayed call’s returned value. Connect code evidence to your conclusion.";
  }
  if (selected === "testing") {
    prompt = `Explain what testing ${p.call(p.sample)} checks and what it cannot establish.`;
    C = isEmpty
      ? [
          "This test examines the procedure’s handling of an empty input list.",
          "This test demonstrates how the procedure behaves with one list element.",
          "This test checks a typical nonempty traversal with several list values.",
        ]
      : single
        ? [
            "This test exercises behavior with exactly one supplied list element.",
            "This test exercises a traversal where no list element is supplied.",
            "This test proves behavior for every possible list length and value.",
          ]
        : isList
          ? [
              "This test checks one specific multi-element input, not every possible input.",
              "This test proves every possible list input produces the required result.",
              "This test examines only the empty-input behavior of the procedure.",
            ]
          : [
              "This test checks the particular arguments in the first displayed call.",
              "This test proves correctness for every possible combination of arguments.",
              "This test supplies no arguments, so no procedure statements can run.",
            ];
    E = [
      `${p.call(p.sample)} returns ${display(out)} when evaluated with the supplied arguments.`,
      `${p.call(p.sample)} returns ${display(otherOut)} regardless of the supplied arguments.`,
      `${p.call(p.sample)} changes its definition to match the supplied arguments.`,
    ];
    R = [p.reason, ...p.wrongReason].map(
      (text) => text + " This describes the behavior exercised by this test.",
    );
  }
  if (selected === "abstraction") {
    const listFocus = isList && pick([true, false]);
    prompt = listFocus
      ? "Explain how this procedure’s list use manages complexity."
      : "Explain how this procedure and its parameters manage complexity.";
    C = listFocus
      ? [
          "A list lets one traversal handle varying collections without a separate variable for each item.",
          "A list requires a different named variable and new procedure body for every additional item.",
          "A list removes the need to understand how the procedure processes its individual elements.",
        ]
      : [
          "Parameters allow the same procedure definition to operate on different supplied arguments.",
          "Parameters force every procedure call to use the same hardcoded values as its first call.",
          "Parameters cause each call to rewrite the procedure body before carrying out its statements.",
        ];
    E = [
      `The two calls use one definition and return ${display(out)} and ${display(otherOut)} for different arguments.`,
      `The two calls use one definition and return ${display(otherOut)} and ${display(out)} for different arguments.`,
      `The two calls create different definitions by changing the same procedure’s parameter names.`,
    ];
    R = listFocus
      ? [
          `The loop applies ${p.structure === "reverse" ? "indexed list access" : "the same processing"} to the supplied list, so separate per-item statements are unnecessary.`,
          `The loop fixes the list at its original size, so larger inputs require another procedure definition.`,
          `The loop removes all boundaries and preconditions, so every possible list access must be valid.`,
        ]
      : [
          `${p.reason} Callers can reuse this behavior with different arguments.`,
          `${p.wrongReason[0]} Callers cannot reuse the same definition with different arguments.`,
          `${p.wrongReason[1]} Return values change the procedure definition for each caller.`,
        ];
  }
  R = R.map((text) => "This evidence supports the conclusion: " + text);
  const roles = { claim: C, evidence: E, reason: R },
    ids = shuffle(Array.from({ length: 9 }, (_, i) => "sentence-" + i)),
    items = [],
    correct = {};
  let index = 0;
  for (const [role, texts] of Object.entries(roles))
    texts.forEach((text, j) => {
      const item = {
        id: ids[index++],
        role,
        text,
        correct: j === 0,
        misconception:
          j === 0
            ? "Supported by the generated procedure."
            : role === "claim"
              ? "The supported conclusion is: " + C[0]
              : role === "evidence"
                ? "The actual evidence is: " + E[0]
                : "The relevant relationship is: " + R[0],
      };
      items.push(item);
      if (j === 0) correct[role] = item.id;
    });
  return {
    game: "response-builder",
    title: "Response Builder",
    mode: selected,
    support,
    topic: selected + "." + support,
    topicTitle: responseModes[selected] + " · " + supportNames[support],
    structure: p.structure,
    evidencePrompt: {
      count: "Select the statement that updates the number of matches.",
      sum: "Select the repeated update that adds an element to the accumulated total.",
      product:
        "Select the initialization or repeated update of the running product.",
      "first-index":
        "Select the condition that immediately returns a matching position.",
      filter:
        "Select the statement that adds a matching element to the result list.",
      maximum:
        "Select the empty-input guard or the comparison that controls the selected result.",
      all: "Select a statement that returns the Boolean outcome of the positivity test.",
      range: "Select the condition that decides range membership.",
      scale: "Select an assignment that transforms the input data.",
      reverse:
        "Select a line that reads a list element or advances the index to the next position.",
    }[p.structure],
    prompt,
    procedure: p,
    items: shuffle(items),
    correct,
    code: p.code,
    policy: "single",
    layout:
      support === "minimal"
        ? "code"
        : support === "full"
          ? "sections"
          : "order",
    solution: {
      claim: correct.claim,
      evidence: correct.evidence,
      reason: correct.reason,
      order: [correct.claim, correct.evidence, correct.reason],
      line: p.validLines[0],
    },
  };
}
export function evaluateResponse(q, r) {
  const minimal = q.support === "minimal",
    selected =
      q.layout === "sections" ? [r.claim, r.evidence, r.reason] : r.order || [],
    required = minimal
      ? [q.correct.claim, q.correct.reason]
      : Object.values(q.correct),
    chosen = [...new Set(selected)],
    all =
      selected.length === required.length &&
      required.length === chosen.length &&
      required.every((id) => chosen.includes(id));
  let coherent = q.layout === "sections" || chosen.at(-1) === q.correct.reason;
  const line = Number(r.line),
    evidenceOK = !minimal || q.procedure.validLines.includes(line);
  const correct = all && coherent && evidenceOK,
    p = q.procedure,
    chosenItems = selected
      .map((id) => q.items.find((i) => i.id === id))
      .filter(Boolean);
  const problems = chosenItems
    .filter((i) => !i.correct)
    .map((i) => `“${i.text}” — ${i.misconception}`);
  return {
    correct,
    details: `${p.call(p.sample)} returns ${display(p.run(p.sample))}; ${p.call(p.other)} returns ${display(p.run(p.other))}.\nClaim: ${q.items.find((i) => i.id === q.correct.claim).text}\nRelevant code: ${p.validLines.map((i) => p.lines[i - 1].trim()).join(" / ")}\nEvidence: ${q.items.find((i) => i.id === q.correct.evidence).text}\nConnection: ${q.items.find((i) => i.id === q.correct.reason).text}${minimal ? `\nYour code selection: ${p.lines[line - 1]?.trim() || "no line selected"}. ${evidenceOK ? "This is relevant to the requested computation." : "This does not directly demonstrate the computation being explained."}` : ""}${!coherent ? "\nThe connecting explanation refers to the preceding claim and evidence, so it must follow them. Either claim/evidence or evidence/claim is accepted before the connection." : ""}${!all ? "\nInclude the required supported claim, evidence and connection (code evidence replaces the evidence sentence at Minimal Support)." : ""}${problems.length ? "\nMisconceptions in your response:\n" + problems.join("\n") : ""}`,
  };
}
