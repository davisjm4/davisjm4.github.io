/* Boolean & Conditional Lab: deterministic, deliberately limited Java Boolean semantics. */
export const booleanGame = {
  name: "Boolean & Conditional Lab",
  icon: "&&",
  description: "Evaluate Boolean logic, follow branches, and choose conditions that match Java requirements.",
  concepts: "Boolean logic · Conditions · Branches · Precedence · Short-circuiting",
  modes: {
    evaluate: "Evaluate Expressions",
    branch: "Follow the Branch",
    conditions: "Build Conditions",
    equivalent: "Equivalent Expressions",
    short: "Short-Circuit & Strings",
    identify: "Identify Conditions",
    construct: "Construct a Condition",
  },
};

const topics = booleanGame.modes;
const pick = (a, rng) => a[Math.floor(rng() * a.length)];
const shuffle = (a, rng) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const integer = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));
export function makeRng(seed = 1) { let s = (seed >>> 0) || 1; return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; }
const choices = (answer, distractors, rng, count = 4) => {
  const all = [answer, ...distractors].filter((x, i, a) => a.indexOf(x) === i).slice(0, count);
  while (all.length < count) all.push(`Option ${all.length + 1}`);
  return shuffle(all, rng);
};
const answerIndex = (arr, value) => arr.findIndex(x => x === value);
const result = (mode, variant, question, code, answer, distractors, explanation, rng, extra = {}) => {
  const vals = choices(answer, distractors, rng, extra.choiceCount || 4);
  return { mode, topic: mode, modeTitle: topics[mode], variant, kind: extra.kind || "choice", question, code, choices: vals, answer: answerIndex(vals, answer), answerText: answer, explanation, ...extra };
};
const boolResult = (mode, variant, question, code, answer, explanation, rng, extra = {}) => result(mode, variant, question, code, String(answer), [String(!answer)], explanation, rng, { choiceCount: 2, ...extra });

function evaluateFamily(rng) {
  const shape = integer(0, 5, rng);
  if (shape === 0) { const age = integer(13, 20, rng), min = pick([14, 15, 16, 17], rng); const member = rng() > .5; const ans = age >= min && member; return boolResult("evaluate", "comparison-and", "What is stored in eligible?", `int age = ${age};\nboolean member = ${member};\nboolean eligible = age >= ${min} && member;`, ans, `${age} >= ${min} is ${age >= min}, and member is ${member}. The && operator requires both operands to be true.`, rng); }
  if (shape === 1) { const temp = integer(-5, 35, rng), hot = integer(20, 30, rng); const emergency = rng() > .5; const ans = temp > hot || emergency; return boolResult("evaluate", "comparison-or", "What is stored in alert?", `int temperature = ${temp};\nboolean emergency = ${emergency};\nboolean alert = temperature > ${hot} || emergency;`, ans, `temperature > ${hot} is ${temp > hot}; OR needs only one true operand. emergency is ${emergency}.`, rng); }
  if (shape === 2) { const paused = rng() > .5; return boolResult("evaluate", "negation", "What is stored in running?", `boolean paused = ${paused};\nboolean running = !paused;`, !paused, `The ! operator reverses the Boolean value: !${paused} is ${!paused}.`, rng); }
  if (shape === 3) { const score = integer(50, 100, rng), pass = integer(60, 80, rng), project = rng() > .5, bonus = rng() > .5; const ans = (score >= pass && project) || bonus; return boolResult("evaluate", "grouped-mix", "What is stored in approved?", `int score = ${score};\nboolean project = ${project};\nboolean bonus = ${bonus};\nboolean approved = (score >= ${pass} && project) || bonus;`, ans, `The grouped AND is ${score >= pass && project}; bonus is ${bonus}. The outer || is true when either side is true.`, rng); }
  if (shape === 4) { const a = rng() > .5, b = rng() > .5; const ans = a !== b; return boolResult("evaluate", "boolean-inequality", "What is stored in different?", `boolean first = ${a};\nboolean second = ${b};\nboolean different = first != second;`, ans, `The != operator is true when the two Boolean values differ.`, rng); }
  const n = integer(1, 12, rng), lo = integer(2, 6, rng), hi = integer(7, 12, rng); const ans = n >= lo && n <= hi; return boolResult("evaluate", "inclusive-range", "What is stored in inside?", `int n = ${n};\nboolean inside = n >= ${lo} && n <= ${hi};`, ans, `Both comparisons include their boundary values, so n is inside only when it is from ${lo} through ${hi}.`, rng);
}

function branchFamily(rng) {
  const shape = integer(0, 4, rng);
  if (shape === 0) { const x = integer(1, 9, rng), threshold = integer(4, 7, rng); const out = x > threshold ? "High" : "Low"; return result("branch", "if-else", "What is displayed?", `int value = ${x};\nif (value > ${threshold}) {\n    System.out.println("High");\n} else {\n    System.out.println("Low");\n}`, out, [out === "High" ? "Low" : "High", "Nothing", "HighLow"], `The comparison value > ${threshold} is ${x > threshold}, so exactly one if/else branch runs.`, rng); }
  if (shape === 1) { const score = pick([59, 69, 70, 79, 80, 89, 90], rng); const out = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D"; return result("branch", "else-if-order", "What is displayed?", `int score = ${score};\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 80) {\n    System.out.println("B");\n} else if (score >= 70) {\n    System.out.println("C");\n} else {\n    System.out.println("D");\n}`, out, ["A", "B", "C", "D"].filter(x => x !== out), `The first true condition wins. For score ${score}, the selected branch prints ${out}.`, rng); }
  if (shape === 2) { const a = rng() > .5, b = rng() > .5; const lines = []; if (a) lines.push("A"); if (b) lines.push("B"); const out = lines.join(" ") || "None"; return result("branch", "independent-if", "What is displayed?", `boolean first = ${a};\nboolean second = ${b};\nif (first) System.out.println("A");\nif (second) System.out.println("B");`, out, ["A", "B", "A B", "None"].filter(x => x !== out), `These are two independent if statements, so both may run. first is ${a} and second is ${b}.`, rng); }
  if (shape === 3) { const n = integer(1, 12, rng), even = n % 2 === 0, large = n > 7; const out = even ? (large ? "Even large" : "Even small") : "Odd"; return result("branch", "nested", "What is displayed?", `int n = ${n};\nif (n % 2 == 0) {\n    if (n > 7) System.out.println("Even large");\n    else System.out.println("Even small");\n} else {\n    System.out.println("Odd");\n}`, out, ["Even large", "Even small", "Odd", "Nothing"].filter(x => x !== out), `n is ${even ? "even" : "odd"}; when it is even, the inner condition checks whether it is greater than 7.`, rng); }
  const a = rng() > .5, b = rng() > .5; const out = a && b ? "Both" : "At least one false"; return result("branch", "compound", "What is displayed?", `boolean ready = ${a};\nboolean paid = ${b};\nif (ready && paid) System.out.println("Both");\nelse System.out.println("At least one false");`, out, ["Both", "At least one false", "ready", "paid"].filter(x => x !== out), `&& requires ready and paid to both be true; they are ${a} and ${b}.`, rng);
}

function conditionFamily(rng) {
  const shape = integer(0, 5, rng);
  if (shape === 0) return result("conditions", "and-boundary", "Which condition implements the requirement? A student qualifies with a score of at least 70 AND a completed project.", "int score;\nboolean projectComplete;", "score >= 70 && projectComplete", ["score > 70 && projectComplete", "score >= 70 || projectComplete", "score >= 70 && !projectComplete"], "At least 70 includes 70, and AND requires both requirements.", rng);
  if (shape === 1) return result("conditions", "or-range", "Which condition is true when value is outside the inclusive range 10 through 20?", "int value;", "value < 10 || value > 20", ["value <= 10 || value >= 20", "value >= 10 && value <= 20", "value < 10 && value > 20"], "Outside means below 10 OR above 20; the endpoints belong inside the range.", rng);
  if (shape === 2) return result("conditions", "negated", "Which condition implements: a user is denied when they are not verified OR their account is suspended?", "boolean verified;\nboolean suspended;", "!verified || suspended", ["verified || !suspended", "!verified && suspended", "verified && !suspended"], "Not verified and suspended are separate denial cases, so || joins them.", rng);
  if (shape === 3) return result("conditions", "parentheses", "Which condition means: (a premium member OR a staff member) AND active?", "boolean premium;\nboolean staff;\nboolean active;", "(premium || staff) && active", ["premium || staff && active", "premium && staff || active", "!(premium || staff) && active"], "Parentheses make the OR group happen before the required active check.", rng);
  if (shape === 4) return result("conditions", "range-and-flag", "Which condition means temperature is between 60 and 80 inclusive AND the sensor works?", "int temperature;\nboolean sensorWorks;", "temperature >= 60 && temperature <= 80 && sensorWorks", ["temperature > 60 && temperature < 80 && sensorWorks", "temperature >= 60 || temperature <= 80 && sensorWorks", "temperature >= 60 && temperature <= 80 && !sensorWorks"], "Both inclusive comparisons and sensorWorks must be true.", rng);
  return result("conditions", "either-valid", "Which condition means a ticket is valid when it is paid OR it is complimentary, but never when it is cancelled?", "boolean paid;\nboolean complimentary;\nboolean cancelled;", "(paid || complimentary) && !cancelled", ["paid || complimentary && !cancelled", "(paid && complimentary) || cancelled", "!(paid || complimentary) && cancelled"], "Either payment status is acceptable, and cancellation must be false.", rng);
}

function equivalentFamily(rng) {
  const shape = integer(0, 4, rng);
  const data = shape === 0 ? ["!(age < 18 || hasPermission)", "age >= 18 && !hasPermission", ["age >= 18 || !hasPermission", "age < 18 && !hasPermission", "age >= 18 && hasPermission"], "De Morgan's law changes the OR to AND and reverses both comparisons."]
    : shape === 1 ? ["!(ready && paid)", "!ready || !paid", ["!ready && !paid", "ready || paid", "!(ready || paid)"], "Negating an AND produces an OR of the negated operands."]
      : shape === 2 ? ["!(x >= 5)", "x < 5", ["x <= 5", "x > 5", "x == 5"], "Negating x >= 5 means x is strictly less than 5."]
        : shape === 3 ? ["!!available", "available", ["!available", "available == false", "true"], "Two negations cancel, leaving the original Boolean value."]
          : ["!(left || right)", "!left && !right", ["!left || !right", "left && right", "!(left && right)"], "De Morgan's law changes a negated OR into AND of both negated operands."];
  const [original, answer, wrong, explanation] = data;
  return result("equivalent", `equiv-${shape}`, "Which expression is logically equivalent?", `boolean expression = ${original};`, answer, wrong, explanation, rng, { validator: vars => shape === 0 ? (!(vars.age < 18 || vars.hasPermission)) === (vars.age >= 18 && !vars.hasPermission) : true });
}

function shortFamily(rng) {
  const shape = integer(0, 5, rng);
  if (shape === 0) { const x = integer(-2, 2, rng); const out = "No"; return result("short", "and-guard", "What happens when the code runs?", `int x = ${x};\nif (x != 0 && 10 / x > 2) System.out.println("Yes");\nelse System.out.println("No");`, out, ["Yes", "It throws an exception", "It prints both"], `When x is ${x}, x != 0 is ${x !== 0}. If it is false, && skips 10 / x, so no division-by-zero occurs.`, rng); }
  if (shape === 1) { const flag = rng() > .5; return result("short", "or-skip", "What is printed?", `boolean flag = ${flag};\nif (flag || unknownCheck()) System.out.println("Open");\nelse System.out.println("Closed");`, flag ? "Open" : "Closed", ["Open", "Closed", "A runtime error", "Nothing"].filter(x => x !== (flag ? "Open" : "Closed")), `The left operand is ${flag}; with ||, a true left operand skips the method call.`, rng); }
  if (shape === 2) { const name = pick(["Alex", "Maya", "Jordan"], rng); return result("short", "string-equals", "What is displayed?", `String name = new String("${name}");\nif (name.equals("${name}")) System.out.println("Match");\nelse System.out.println("Different");`, "Match", ["Different", "true", "A compile error"], ".equals compares String contents, so the separately constructed String still matches.", rng); }
  if (shape === 3) { const name = pick(["Alex", "Maya"], rng); return result("short", "string-reference", "What is displayed?", `String a = new String("${name}");\nString b = new String("${name}");\nif (a == b) System.out.println("Same");\nelse System.out.println("Different");`, "Different", ["Same", "Match", "A compile error"], "The two new expressions create distinct String objects; == compares references, not text.", rng); }
  if (shape === 4) { const input = pick(["yes", "Yes", "no"], rng); const out = input === "yes" ? "Proceed" : "Stop"; return result("short", "case-sensitive", "What is displayed?", `String input = "${input}";\nif (input.equals("yes")) System.out.println("Proceed");\nelse System.out.println("Stop");`, out, ["Proceed", "Stop", "true", "A compile error"].filter(x => x !== out), `.equals is case-sensitive, so only the exact text yes produces Proceed.`, rng); }
  return result("short", "safe-null", "What is displayed?", `String code = null;\nif ("READY".equals(code)) System.out.println("Ready");\nelse System.out.println("Missing");`, "Missing", ["Ready", "NullPointerException", "true"], "Calling equals on the non-null literal is safe; a null argument simply does not match.", rng);
}

function identifyFamily(rng) {
  const templates = [
    { variant: "and", code: "if (score >= 70 && attendance >= 90) { eligible = true; }", prompt: "Select the operator that combines the two conditions.", answer: "&&", explanation: "&& combines the score and attendance comparisons and requires both." },
    { variant: "boundary", code: "if (temperature <= 32) { frozen = true; }", prompt: "Select the comparison that includes the boundary value.", answer: "temperature <= 32", explanation: "<= includes 32 as well as values below it." },
    { variant: "negation", code: "if (!isClosed || hasKey) { enter(); }", prompt: "Select the operator that reverses isClosed.", answer: "!", explanation: "! changes true to false and false to true." },
    { variant: "or", code: "if (paid || complimentary) { admit(); }", prompt: "Select the operator that allows either option.", answer: "||", explanation: "|| is true when at least one operand is true." },
    { variant: "condition", code: "if (score >= 70 && attendance >= 90) { eligible = true; }", prompt: "Select the complete condition controlling the if statement.", answer: "score >= 70 && attendance >= 90", explanation: "The complete condition is the expression between if parentheses." },
    { variant: "equals", code: "if (name.equals(\"Maya\")) { greet(); }", prompt: "Select the method call that tests String content.", answer: "name.equals(\"Maya\")", explanation: ".equals compares the characters stored in the Strings." },
  ];
  const t = pick(templates, rng); const tokens = t.code.match(/&&|\|\||<=|>=|==|!=|!|[A-Za-z]+\.equals\("[A-Za-z]+"\)|[A-Za-z]+\s*(?:>=|<=|==|!=)\s*\d+|[A-Za-z]+|\S/g) || [];
  if (!tokens.includes(t.answer)) tokens.splice(2, tokens.length - 2, t.answer, ")", "{", "eligible", "=", "true", ";", "}");
  const usable = tokens.map((text, i) => ({ id: i, text, correct: text === t.answer }));
  return { mode: "identify", topic: "identify", modeTitle: topics.identify, variant: t.variant, kind: "select", question: t.prompt, code: t.code, tokens: usable, answer: usable.findIndex(x => x.correct), answerText: t.answer, explanation: t.explanation };
}

function constructFamily(rng) {
  const data = pick([
    ["A value is outside the inclusive range 10 through 20.", "value < 10 || value > 20", ["value <= 10 || value >= 20", "value >= 10 && value <= 20", "value < 10 && value > 20"]],
    ["A user can enter when they have a key OR are an administrator, AND the system is online.", "(hasKey || admin) && online", ["hasKey || admin && online", "hasKey && admin || online", "!(hasKey || admin) && online"]],
    ["A score passes when it is at least 60 AND the attempt is not late.", "score >= 60 && !late", ["score > 60 && !late", "score >= 60 || !late", "score >= 60 && late"]],
    ["A number is even and positive.", "number % 2 == 0 && number > 0", ["number % 2 == 1 && number > 0", "number % 2 == 0 || number > 0", "number % 2 != 0 && number > 0"]],
  ], rng);
  return result("construct", `construct-${data[1]}`, `Which condition satisfies this requirement? ${data[0]}`, "Choose the complete Java Boolean condition.", data[1], data[2], "Check every requirement: boundaries, logical connector, and any negation must all match.", rng);
}

export function generate(mode = "mixed", rng = Math.random) {
  const actual = mode === "mixed" ? pick(Object.keys(booleanGame.modes), rng) : mode;
  if (actual === "evaluate") return evaluateFamily(rng);
  if (actual === "branch") return branchFamily(rng);
  if (actual === "conditions") return conditionFamily(rng);
  if (actual === "equivalent") return equivalentFamily(rng);
  if (actual === "short") return shortFamily(rng);
  if (actual === "identify") return identifyFamily(rng);
  return constructFamily(rng);
}
export function assess(q, response) { return q.kind === "select" ? Number(response) === q.answer : Number(response) === q.answer; }
export function signature(q) { return `${q.mode}|${q.variant}|${q.code}|${q.question}`; }
