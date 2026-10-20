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
    truthTable: "Truth Table Builder",
    switchIf: "Switch vs. If/Else",
    coverage: "Conditional Coverage & Branch Reasoning",
  },
};

const topics = booleanGame.modes;
const pick = (a, rng) => a[Math.floor(rng() * a.length)];
const shuffle = (a, rng) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const integer = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));
export function makeRng(seed = 1) { let s = (seed >>> 0) || 1; const start=s; const next=() => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; next.seed=start; return next; }
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
  const shape = integer(0, 8, rng);
  const data = shape === 0 ? ["!(age < 18 || hasPermission)", "age >= 18 && !hasPermission", ["age >= 18 || !hasPermission", "age < 18 && !hasPermission", "age >= 18 && hasPermission"], "De Morgan's law changes the OR to AND and reverses both comparisons."]
    : shape === 1 ? ["!(ready && paid)", "!ready || !paid", ["!ready && !paid", "ready || paid", "!(ready || paid)"], "Negating an AND produces an OR of the negated operands."]
      : shape === 2 ? ["!(x >= 5)", "x < 5", ["x <= 5", "x > 5", "x == 5"], "Negating x >= 5 means x is strictly less than 5."]
        : shape === 3 ? ["!!available", "available", ["!available", "available == false", "true"], "Two negations cancel, leaving the original Boolean value."]
          : shape === 4 ? ["!(left || right)", "!left && !right", ["!left || !right", "left && right", "!(left && right)"], "De Morgan's law changes a negated OR into AND of both negated operands."]
            : shape === 5 ? ["!(a && (b || c))", "!a || (!b && !c)", ["!a && (!b || !c)", "!a || (!b || !c)", "a || (b && c)"], "Negate the outer AND to OR; then negate the grouped OR to AND of negations."]
              : shape === 6 ? ["!(a || (b && c))", "!a && (!b || !c)", ["!a || (!b && !c)", "!a && (!b && !c)", "a && (b || c)"], "Negate the outer OR to AND; then negate the grouped AND to OR of negations."]
                : shape === 7 ? ["!((a && b) || c)", "(!a || !b) && !c", ["(!a && !b) || !c", "(!a || !b) || !c", "(a || b) && c"], "Apply De Morgan's law twice, preserving the grouping at each step."]
                  : ["!((a || b) && c)", "(!a && !b) || !c", ["(!a || !b) && !c", "(!a && !b) && !c", "(a && b) || c"], "Negate the outer AND to OR, then negate the grouped OR to AND of negations."];
  const [original, answer, wrong, explanation] = data;
  return result("equivalent", `equiv-${shape}`, "Which expression is logically equivalent?", `boolean expression = ${original};`, answer, wrong, explanation, rng, { validator: vars => shape === 0 ? (!(vars.age < 18 || vars.hasPermission)) === (vars.age >= 18 && !vars.hasPermission) : true });
}

function shortFamily(rng) {
  const shape = integer(0, 5, rng);
  if (shape === 0) { const x = integer(-2, 2, rng); const out = "No"; return result("short", "and-guard", "What happens when the code runs?", `int x = ${x};\nif (x != 0 && 10 / x > 2) System.out.println("Yes");\nelse System.out.println("No");`, out, ["Yes", "It throws an exception", "It prints both"], x === 0 ? `x != 0 is false, so && skips 10 / x and prints No without division by zero.` : `x != 0 is true, so Java evaluates 10 / x; the comparison is false for x = ${x}, so the else branch prints No.`, rng); }
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

// These generators keep the supported expression language small enough to evaluate
// exhaustively. Every equivalence claim is checked over all rows, never sampled.
function boolExpr(rng, depth = 0, vars = ["a", "b", "c"], maxDepth = 2) {
  if (depth >= maxDepth || rng() < .25) return rng()<.18 ? `!${pick(vars,rng)}` : pick(vars, rng);
  const op = pick(["&&", "||"], rng);
  const left = boolExpr(rng, depth + 1, vars, maxDepth), right = boolExpr(rng, depth + 1, vars, maxDepth);
  return rng() < .28 ? `!(${left} ${op} ${right})` : `(${left} ${op} ${right})`;
}
function evalBool(source, env) {
  const t = source.match(/&&|\|\||!|\(|\)|true|false|[a-z]+/g) || []; let p = 0;
  function atom() { if (t[p] === "!") { p++; return !atom(); } if (t[p] === "(") { p++; const v = or(); if (t[p++] !== ")") throw Error("paren"); return v; } const x = t[p++]; return x === "true" ? true : x === "false" ? false : !!env[x]; }
  function and() { let v = atom(); while (t[p] === "&&") { p++; const r = atom(); v = v && r; } return v; }
  function or() { let v = and(); while (t[p] === "||") { p++; const r = and(); v = v || r; } return v; }
  const value = or(); if (p !== t.length) throw Error("expression"); return value;
}
export function evaluateBooleanExpression(source, env) { return evalBool(source, env); }
export function enumerateTruthTable(source, vars) { return truthRows(source, vars); }
function truthRows(expr, vars) { return Array.from({length: 1 << vars.length}, (_, i) => { const env = Object.fromEntries(vars.map((v, n) => [v, !!(i & (1 << (vars.length - n - 1)))])); return { ...env, result: evalBool(expr, env) }; }); }
function sameTruth(a, b, vars) { return truthRows(a, vars).every(row => evalBool(a, row) === evalBool(b, row)); }
function advancedResult(mode, variant, question, code, answer, wrong, explanation, rng, extra = {}) {
  return result(mode, variant, question, code, answer, wrong, explanation, rng, {kind:"choice", skill:variant, seed:null, family:variant, ...extra});
}
function truthTableFamily(rng, difficulty = "Intermediate") {
  const families = ["and-row", "or-row", "negation-row", "mixed-group", "nested-group", "demorgan-and", "demorgan-or", "equivalence", "find-error", "missing-result"];
  const available = difficulty === "Beginner" ? families.slice(0, 5) : difficulty === "Advanced" ? families : families.slice(0, 8);
  const family = pick(available, rng), needsC = ["mixed-group","nested-group","equivalence","find-error","missing-result"].includes(family) && difficulty !== "Beginner", vars = needsC || (difficulty === "Advanced" && rng() < .75) ? ["a","b","c"] : ["a","b"];
  const depthLimit=difficulty==="Advanced"?3:2;
  let expr = family === "demorgan-and" ? "!(a && b)" : family === "demorgan-or" ? "!(a || b)" : family === "and-row" ? `(${boolExpr(rng,1,vars,depthLimit)} && ${boolExpr(rng,1,vars,depthLimit)})` : family === "or-row" ? `(${boolExpr(rng,1,vars,depthLimit)} || ${boolExpr(rng,1,vars,depthLimit)})` : family === "negation-row" ? `!(${boolExpr(rng,1,vars,depthLimit)})` : family === "mixed-group" ? `(${boolExpr(rng,1,vars,depthLimit)} ${pick(["&&","||"],rng)} ${boolExpr(rng,1,vars,depthLimit)})` : family === "nested-group" ? `!(${boolExpr(rng,1,vars,depthLimit)} ${pick(["&&","||"],rng)} (${boolExpr(rng,1,vars,depthLimit)} ${pick(["&&","||"],rng)} ${boolExpr(rng,1,vars,depthLimit)}))` : boolExpr(rng, 0, vars, depthLimit);
  if (family === "equivalence") { const tableVars=["a","b","c"], left=pick(["a && b","a || b","!(a && b)","!(a || b)","(a && b) || c"],rng); const wantSame=rng()<.5; const good=left==="a && b"?"!(!a || !b)":left==="a || b"?"!(!a && !b)":left==="!(a && b)"?"!a || !b":left==="!(a || b)"?"!a && !b":"c || (b && a)"; let bad=left==="a && b"?"a || b":left==="a || b"?"a && b":left==="!(a && b)"?"!a && !b":left==="!(a || b)"?"!a || !b":"(a || b) && c"; const right=wantSame?good:bad, rows=truthRows(left,tableVars), isSame=sameTruth(left,right,tableVars); return advancedResult("truthTable",family,"Compare the expressions over every row of the table. Are they equivalent?",`boolean left = ${left};\nboolean right = ${right};`,isSame?"Equivalent":"Not equivalent",[isSame?"Not equivalent":"Equivalent"],`All ${rows.length} combinations were evaluated independently; the expressions ${isSame?"match on every row":"differ on at least one row"}.`,rng,{table:rows,expressions:[left,right],choiceCount:2}); }
  const exprVars=vars.filter(v=>new RegExp(`\\b${v}\\b`).test(expr)), rows = truthRows(expr, exprVars), row = pick(rows, rng), ans = String(row.result), assignment=Object.entries(row).filter(([k])=>k!=="result").map(([k,v])=>`boolean ${k} = ${v};`).join("\n");
  if (family === "find-error") { const badIndex=integer(0,rows.length-1,rng), shown=rows.map((r,i)=>i===badIndex?{...r,result:!r.result}:r), rowName=r=>Object.entries(r).filter(([k])=>k!=="result").map(([k,v])=>`${k}=${v}`).join(", "), answer=rowName(rows[badIndex]); const options=shuffle(rows.map(rowName).filter(x=>x!==answer),rng).slice(0,3); return advancedResult("truthTable",family,"One result in this truth table is incorrect. Which input row contains the error?",`boolean result = ${expr};`,answer,options,`For ${answer}, evaluating ${expr} gives ${rows[badIndex].result}; the displayed result in that row is incorrect.`,rng,{table:shown,allRows:rows,expression:expr,choiceCount:4,incorrectRow:badIndex}); }
  const highlightedRow=rows.indexOf(row), displayRows=rows.map((r,i)=>i===highlightedRow?{...r,result:null}:r);
  return advancedResult("truthTable", family, family === "find-error" ? "Choose the missing output for the highlighted truth-table row." : "What is the result for the highlighted input row?", `${assignment}\nboolean result = ${expr};`, ans, [String(!row.result)], `${Object.entries(row).filter(([k])=>k!=="result").map(([k,v])=>`${k}=${v}`).join(", ")}: evaluate ${expr} using the stated values.`, rng, {table:displayRows, allRows:rows, highlightedRow, expression:expr, choiceCount:2});
}
function switchFamily(rng, difficulty = "Intermediate") {
  const types = ["simple-break","break-exit","fall-through","default-hit","default-order","equivalent-chain","conversion-counterexample","combined-decision","multi-step"];
  const available = difficulty === "Beginner" ? ["simple-break","break-exit","default-hit","fall-through"] : difficulty === "Advanced" ? types : types.slice(0, 8);
  const family=pick(available,rng), value=integer(1,4,rng); let code, answer, explanation;
  if (family === "simple-break") { const n=integer(1,20,rng), other=n+1, x=pick(["A","B","C","E"],rng), y=pick(["G","H","J","K"],rng); code=`int choice = ${n};\nswitch (choice) {\n    case ${n}: System.out.print("${x}"); break;\n    case ${other}: System.out.print("${y}"); break;\n    default: System.out.print("Other");\n}`; answer=x; explanation=`choice matches case ${n}; break prevents later cases from running.`; }
  else if (family === "fall-through") { const hit=integer(2,8,rng), a=pick(["A","E","G"],rng), b=pick(["B","F","H"],rng); code=`int day = ${hit};\nswitch (day) {\n    case ${hit-1}:\n        System.out.print("X");\n        break;\n    case ${hit}:\n        System.out.print("${a}");\n    case ${hit+1}:\n        System.out.print("${b}");\n        break;\n    default:\n        System.out.print("D");\n}`; answer=a+b; explanation=`case ${hit} matches; without a break after ${a}, execution falls through to the next case and prints ${b}.`; }
  else if (family === "default-order") { const fallback=integer(1,12,rng), d=pick(["D","X","Z"],rng), c=pick(["A","C","Y"],rng); code=`int n = 99;\nswitch (n) {\n    default:\n        System.out.print("${d}");\n    case ${fallback}:\n        System.out.print("${c}");\n        break;\n}`; answer=d+c; explanation=`No case label matches, so default runs; it falls through to case ${fallback} and prints both characters.`; }
  else if (family === "equivalent-chain") { const one=integer(1,4,rng), two=one+integer(1,4,rng), v=pick([one,two,0,9],rng), a=pick(["A","C","E"],rng), b=pick(["B","D","F"],rng); code=`int choice = ${v};\nswitch (choice) {\n    case ${one}: System.out.print("${a}"); break;\n    case ${two}: System.out.print("${b}"); break;\n    default: System.out.print("Other");\n}`; const correct=`if (choice == ${one}) System.out.print("${a}"); else if (choice == ${two}) System.out.print("${b}"); else System.out.print("Other");`; const wrong=[`if (choice == ${one}) System.out.print("${b}"); else if (choice == ${two}) System.out.print("${a}"); else System.out.print("Other");`,`if (choice >= ${one}) System.out.print("${a}"); else if (choice == ${two}) System.out.print("${b}"); else System.out.print("Other");`,`if (choice == ${one}) System.out.print("${a}"); else if (choice == ${two}) System.out.print("${b}");`]; return advancedResult("switchIf",family,"Which if/else chain has the same result for every integer selector?",code,correct,wrong,"Each switch case uses equality and break, and the default branch is represented by the final else.",rng,{choiceCount:4,javaCode:code}); }
  else if (family === "default-hit") { const n=integer(5,99,rng); code=`int n = ${n};\nswitch (n) {\n    case 1: System.out.print("A"); break;\n    case 2: System.out.print("B"); break;\n    default: System.out.print("D");\n}`; answer="D"; explanation=`Neither case matches ${n}, so default runs.`; }
  else if (family === "break-exit") { const one=integer(1,8,rng), two=one+integer(1,8,rng), a=pick(["A","C","E","G"],rng), b=pick(["B","D","F","H"],rng), c=pick(["J","K","M"],rng); code=`int n = ${one};\nswitch (n) {\n    case ${one}:\n        System.out.print("${a}");\n        break;\n    case ${two}:\n        System.out.print("${b}");\n        System.out.print("${c}");\n        break;\n    default:\n        System.out.print("X");\n}`; answer=a; explanation=`case ${one} matches, and break exits before the later case can print.`; }
  else if (family === "equivalent-chain") { code=`int option = ${value};\nswitch (option) {\n    case 1: System.out.print("A"); break;\n    case 2: System.out.print("B"); break;\n    default: System.out.print("Other");\n}`; answer=value===1?"A":value===2?"B":"Other"; explanation="Each case ends with break, matching the corresponding if/else if branch."; }
  else if (family === "conversion-counterexample") { code=`int n = 1;\nswitch (n) {\n    case 1: System.out.print("A");\n    case 2: System.out.print("B"); break;\n    default: System.out.print("D");\n}`; answer="AB"; explanation="The switch falls through from case 1 into case 2, so it differs from an if/else chain that prints only A."; }
  else if (family === "combined-decision") { code=`int n = ${value};\nswitch (n) {\n    case 1: System.out.print("Small"); break;\n    case 2: if (n % 2 == 0) System.out.print("Even"); break;\n    default: System.out.print("Other");\n}`; answer=value===1?"Small":value===2?"Even":"Other"; explanation="The matching switch label selects the branch; case 2 then evaluates its nested condition."; }
  else if (family === "multi-step") { const n=integer(2,8,rng), a=pick(["A","C","E"],rng), b=pick(["B","D","F"],rng); code=`int n = ${n};\nString out = "";\nswitch (n) {\n    case ${n}: out += "${a}";\n    case ${n+1}: out += "${b}"; break;\n    default: out += "X";\n}\nSystem.out.print(out);`; answer=a+b; explanation=`Case ${n} matches, adds ${a}, then falls through to case ${n+1}; break ends the switch after ${b}.`; }
  else { code=`int option = ${value};\nswitch (option) {\n    case 1: System.out.print("A"); break;\n    case 2: System.out.print("B"); break;\n    default: System.out.print("D");\n}`; answer=value===1?"A":value===2?"B":"D"; explanation="A matching case runs until break; if no case matches, default runs."; }
  return advancedResult("switchIf",family,"What exact text is printed?",code,answer,["Nothing",answer+"D",answer==="A"?"B":"A"],explanation,rng,{javaCode:code,trace:answer});
}
function coverageFamily(rng, difficulty = "Intermediate") {
  const families=["unreachable","missing-case","boundary-below","boundary-at","boundary-above","order-change","redundant","domain-coverage","reach-branch","counterexample","fix-order","compound"];
  const available = difficulty === "Beginner" ? ["boundary-below","boundary-at","boundary-above","missing-case"] : difficulty === "Advanced" ? families : families.slice(0, 10);
  const family=pick(available,rng); let question,code,answer,wrong,explanation,domain;
  if(family==="unreachable"||family==="redundant"){const low=integer(20,65,rng), high=integer(low+1,95,rng), sample=integer(high,100,rng);question="Which statement about the second branch is correct?";code=`int score = ${sample};\nif (score >= ${low}) System.out.println("Pass");\nelse if (score >= ${high}) System.out.println("Excellent");`;answer=`It is unreachable because every value >= ${high} already matches the first branch.`;wrong=["It runs after Pass prints.","It handles scores below the first threshold.","It always runs because it is else if."];explanation=`An else-if is checked only when the first test is false; any value >= ${high} is also >= ${low}.`;}
  else if(family==="missing-case"||family==="domain-coverage"){const max=integer(40,500,rng), candidate=integer(0,max,rng);domain=`integer value in [0, ${max}]`;question=`Which input is not handled explicitly? Domain: every integer from 0 through ${max}.`;code=`if (value < 0) System.out.println("Low");\nelse if (value > ${max}) System.out.println("High");`;answer=`value = ${candidate}`;wrong=[`value = -1`,`value = ${max+1}`,"No value is missing"];explanation=`The domain includes ${candidate}; it is neither below 0 nor above ${max}, so no explicit branch handles it.`;}
  else if(family.startsWith("boundary")){const t=integer(10,95,rng), n=t+(family.endsWith("below")?-1:family.endsWith("above")?1:0);question=`Which branch runs when score is ${n}?`;code=`if (score >= ${t}) System.out.println("Pass");\nelse System.out.println("Retry");`;answer=n>=t?"Pass":"Retry";wrong=[answer==="Pass"?"Retry":"Pass","Both branches","Neither branch"];explanation=`The condition uses >= ${t}, so equality counts as passing; ${n} ${n>=t?"meets":"does not meet"} the threshold.`;}
  else if(family==="reach-branch"){const t=integer(15,85,rng), target=integer(t,100,rng);question=`Which input reaches the second branch?`;code=`if (score >= ${t}) System.out.println("Pass");\nelse if (score < ${t}) System.out.println("Retry");`;answer=`score = ${t-1}`;wrong=[`score = ${target}`,`score = ${t}`,`score = ${t+1}`];explanation=`The second branch requires score < ${t}; the value ${t-1} satisfies it.`;}
  else if(family==="fix-order"){const pass=integer(50,70,rng), excellent=pass+integer(15,25,rng);question="Which condition order correctly makes the Excellent branch reachable?";code=`if (score >= ${pass}) System.out.println("Pass");\nelse if (score >= ${excellent}) System.out.println("Excellent");`;answer=`if (score >= ${excellent}) Excellent; else if (score >= ${pass}) Pass; else Retry;`;wrong=[`if (score >= ${pass}) Pass; else if (score >= ${excellent}) Excellent;`,`if (score < ${excellent}) Excellent; else if (score >= ${pass}) Pass;`,`if (score >= ${excellent}) Excellent; else if (score < ${pass}) Retry;`];explanation=`Check the more selective threshold ${excellent} first; otherwise scores meeting both conditions are captured by >= ${pass}.`;}
  else if(family==="compound"){const ready=rng()<.5, paid=rng()<.5, canceled=rng()<.5;question="What output is produced by this combined Boolean condition?";code=`boolean ready = ${ready};\nboolean paid = ${paid};\nboolean canceled = ${canceled};\nif ((ready && paid) || !canceled) System.out.println("Go");\nelse System.out.println("Wait");`;answer=(ready&&paid)||!canceled?"Go":"Wait";wrong=[answer==="Go"?"Wait":"Go","Both outputs","Neither output"];explanation=`(ready && paid) is ${ready&&paid}; !canceled is ${!canceled}. The OR combines those results.`;}
  else if(family==="order-change"){const t=integer(10,30,rng), mid=t+integer(1,9,rng), n=integer(0,t-1,rng);question="Which input demonstrates that changing the order changes the selected branch?";code=`// Original: if (n < ${mid}) A; else if (n < ${t}) B;\n// Reordered: if (n < ${t}) B; else if (n < ${mid}) A;`;answer=`n = ${n}`;wrong=[`n = ${mid+1}`,`n = ${mid}`,`n = ${t+1}`];explanation=`At ${n}, the original first test matches A, while the reordered first test matches B.`;}
  else {const t=integer(8,25,rng), upper=t+integer(4,15,rng), sample=integer(0,t-1,rng);question="Which test input proves these structures are not equivalent?";code=`// A: if (n < ${t}) print("A"); else if (n < ${upper}) print("B");\n// B: if (n < ${upper}) print("B"); else if (n < ${t}) print("A");`;answer=`n = ${sample}`;wrong=[`n = ${upper+1}`,`n = ${t+1}`,`n = ${t}`];explanation=`At ${sample}, structure A prints A while structure B's first condition prints B.`;}
  return advancedResult("coverage",family,question,code,answer,wrong,explanation,rng,{javaCode:code,domain});
}
function generateAdvanced(mode,rng,difficulty){return mode==="truthTable"?truthTableFamily(rng,difficulty):mode==="switchIf"?switchFamily(rng,difficulty):coverageFamily(rng,difficulty);}

export function generate(mode = "mixed", rng = Math.random, difficulty = "Intermediate") {
  const actual = mode === "mixed" ? pick(Object.keys(booleanGame.modes), rng) : mode;
  const q = ["truthTable", "switchIf", "coverage"].includes(actual) ? generateAdvanced(actual, rng, difficulty) : actual === "evaluate" ? evaluateFamily(rng) : actual === "branch" ? branchFamily(rng) : actual === "conditions" ? conditionFamily(rng) : actual === "equivalent" ? equivalentFamily(rng) : actual === "short" ? shortFamily(rng) : actual === "identify" ? identifyFamily(rng) : constructFamily(rng);
  q.difficulty = difficulty; q.seed = Number.isInteger(rng.seed) ? rng.seed : null; q.family = q.family || q.variant; q.skill = q.skill || q.variant; q.questionStem = q.question; q.javaCode = q.javaCode || q.code; q.answerOptions = q.choices || q.tokens?.map(t=>t.text); q.correctAnswer = q.answerText || q.tokens?.[q.answer]?.text; return q;
}
export function assess(q, response) { return q.kind === "select" ? Number(response) === q.answer : Number(response) === q.answer; }
export function signature(q) { return `${q.mode}|${q.variant}|${q.code}|${q.question}`; }
