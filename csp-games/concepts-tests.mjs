import assert from "node:assert/strict";
import {
  generateConcept,
  categories,
  variants,
  components,
  source,
  assess,
  answerText,
} from "./concepts-engine.js";
let seed = 271828;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let checks = 0;
const ok = (v, m) => {
    assert.ok(v, m);
    checks++;
  },
  same = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
const expectedRoles = {
  procedures: {
    definition: "procedure-definition",
    name: "procedure-name",
    parameter: "parameter",
    parameters: "parameter",
    call: "procedure-call",
    argument: "argument",
    arguments: "argument",
    match: "argument",
    "return-value": "value",
    "return-instruction": "return-instruction",
    "same-procedure": "procedure-name",
  },
  selection: {
    statement: "selection-statement",
    condition: "boolean-expression",
    "true-body": "statement",
    "false-body": "statement",
    compound: "boolean-expression",
    "boolean-condition": "boolean-expression",
  },
  iteration: {
    statement: "iteration-statement",
    body: "statement",
    "until-condition": "boolean-expression",
    item: "traversal-item",
  },
  variables: {
    variable: "variable",
    value: "value",
    assignment: "assignment-statement",
    comparison: "boolean-expression",
    "boolean-expression": "boolean-expression",
    "boolean-value": "boolean-value",
    "boolean-result": "boolean-expression",
  },
  lists: {
    name: "list-name",
    list: "list-value",
    index: "index",
    "insert-value": "value",
    element: "element",
    append: "list-operation",
    insert: "list-operation",
    remove: "list-operation",
    location: "index",
  },
};
let count = 0;
for (let category of categories)
  for (let variant of variants[category])
    for (let i = 0; i < 500; i++) {
      const q = generateConcept(category, variant),
        nodes = components(q.root),
        byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
      count++;
      same(q.category, category);
      same(q.variant, variant);
      same(q.code, source(q.root));
      ok(
        q.code.split("\n").length >= 3 && q.code.split("\n").length <= 8,
        `${variant} short snippet`,
      );
      same(new Set(nodes.map((n) => n.id)).size, nodes.length);
      for (let node of nodes) {
        if (node.parent && node.parent !== "snippet") {
          ok(
            node.text !== byId[node.parent].text,
            "No identical selectable parent/child regions",
          );
        }
      }
      ok(q.prompt && q.explanation && answerText(q));
      let balance = 0;
      for (let ch of q.code) {
        if (ch === "(") balance++;
        if (ch === ")") balance--;
        ok(balance >= 0);
      }
      same(balance, 0);
      same(
        (q.code.match(/{/g) || []).length,
        (q.code.match(/}/g) || []).length,
      );
      if (q.interaction === "select") {
        ok(q.answerIds.length > 0);
        for (let id of q.answerIds) {
          ok(byId[id], `${category}/${variant}: valid answer ID`);
          same(byId[id].role, expectedRoles[category][variant]);
        }
        same(q.multiple, q.answerIds.length > 1);
        ok(assess(q, q.answerIds));
        ok(!assess(q, []));
        let wrong = nodes.find(
          (n) => n.id !== "snippet" && !q.answerIds.includes(n.id),
        );
        ok(!assess(q, [wrong.id]));
        ok(!assess(q, [...q.answerIds, wrong.id]));
        if (q.multiple) ok(!assess(q, q.answerIds.slice(1)));
      } else {
        same(q.interaction, "count");
        ok(assess(q, q.answer));
        ok(!assess(q, q.answer === "unknown" ? 1 : q.answer + 1));
      }
      if (category === "procedures") {
        if (q.facts) {
          let { parameters, args } = q.facts;
          for (let j = 0; j < 2; j++) {
            same(byId["p" + (j + 1)].text, parameters[j]);
            same(Number(byId["a" + (j + 1)].text), q.facts.arguments[j]);
            ok(parameters[j] !== String(q.facts.arguments[j]));
          }
          if (variant === "match") same(q.answerIds, ["a2"]);
          if (variant === "return-value")
            same(Number(byId.returned.text), q.facts.returned);
        }
        if (variant === "same-procedure") {
          same(byId.name1.text, byId.name2.text);
          ok(
            byId["first-arg"].text !== byId["third-arg"].text ||
              byId["second-arg"].text !== byId["fourth-arg"].text,
          );
        }
      }
      if (category === "selection") {
        let whole = byId.selection.text,
          condition = byId.condition.text;
        ok(whole.startsWith("IF ("));
        ok(!condition.includes("IF"));
        ok(whole.includes(condition));
        ok(whole.length > condition.length);
        if (variant === "false-body") {
          ok(q.facts.hasElse);
          ok(whole.includes("ELSE"));
          same(q.answerIds, ["false-body"]);
        }
        if (variant === "compound") ok(/AND|OR|NOT/.test(condition));
        if (variant === "statement") {
          ok(!assess(q, ["condition"]));
          same(q.answerIds, ["selection"]);
        } else if (
          ["condition", "compound", "boolean-condition"].includes(variant)
        ) {
          ok(!assess(q, ["selection"]));
        }
      }
      if (category === "iteration") {
        if (variant === "repeat-count") {
          same(q.answer, Number(byId.count.text));
          ok(!q.allowUnknown);
        }
        if (variant === "traversal-count") {
          same(q.answer, q.facts.values.length);
          ok(q.code.includes("FOR EACH"));
        }
        if (variant === "until-unknown") {
          same(q.answer, "unknown");
          ok(q.allowUnknown);
          ok(q.code.includes("INPUT()"));
          ok(q.code.includes('response ← ""'));
        }
        if (variant === "until-condition") {
          same(q.answerIds, ["condition"]);
          ok(byId.condition.text.includes('"stop"'));
        }
      }
      if (category === "variables") {
        ok(byId.assignment.text.includes("←"));
        ok(!byId.comparison.text.includes("←"));
        ok(["=", "≠", ">", "<", "≥", "≤"].includes(q.facts.op));
        ok(["TRUE", "FALSE"].includes(byId["boolean-value"].text));
      }
      if (category === "lists") {
        ok(q.facts.index >= 1 && q.facts.index <= q.facts.values.length);
        same(new Set(q.facts.values).size, q.facts.values.length);
        if (variant === "element")
          same(
            Number(byId[q.answerIds[0]].text),
            q.facts.values[q.facts.index - 1],
          );
        if (variant === "insert-value")
          same(Number(byId.inserted.text), q.facts.value);
        if (variant === "index" || variant === "location")
          same(Number(byId.index.text), q.facts.index);
        if (["append", "insert", "remove"].includes(variant))
          same(byId["operation-name"].text, variant.toUpperCase());
      }
    }
let seen = new Set();
for (let i = 0; i < 5000; i++) seen.add(generateConcept().category);
same([...seen].sort(), [...categories].sort());
assert.throws(() => generateConcept("missing"));
assert.throws(() => generateConcept("lists", "invalid"));
console.log(
  `PASS: ${count} generated Code Concepts challenges, ${checks} structural/answer assertions, all five Mixed Practice categories.`,
);
