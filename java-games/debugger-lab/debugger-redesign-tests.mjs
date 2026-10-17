import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import * as D from "./debugger-engine.js";
import * as S from "../session.js";

let seed = 48123;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
let checks = 0, generated = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const samples = [];
const compileCases = [];

function parseArray(test) {
  const match = test.label.match(/values = \{([^}]*)}/);
  return match ? match[1].split(",").map(Number) : [];
}

function independentlyEvaluate(question, test) {
  const numbers = [...test.label.matchAll(/-?\d+/g)].map(match => Number(match[0]));
  if (question.variant === "boundary-inclusive") {
    const cutoff = Number(question.code.match(/> (\d+)/)[1]), value = numbers[0];
    return {expected: value >= cutoff, actual: value > cutoff};
  }
  if (question.variant === "and-instead-of-or") {
    const member = test.label.includes("member = true"), age = numbers[0];
    return {expected: member || age >= 65, actual: member && age >= 65};
  }
  if (question.variant === "negated-flag") {
    const active = test.label.includes("active = true"), level = numbers[0];
    return {expected: active || level >= 2, actual: !active || level >= 2};
  }
  if (question.variant === "integer-division-test") {
    const [earned, possible] = numbers;
    return {expected: earned / possible, actual: Math.trunc(earned / possible)};
  }
  if (question.variant === "wrong-initial-value") {
    const values = parseArray(test), expected = Math.max(...values);
    return {expected, actual: Math.max(0, ...values)};
  }
  if (question.variant === "assignment-instead-add") {
    const values = parseArray(test);
    return {expected: values.reduce((a,b)=>a+b,0), actual: values.at(-1)};
  }
  if (question.variant === "skip-final-element") {
    const values = parseArray(test);
    return {expected: values.reduce((a,b)=>a+b,0), actual: values.slice(0,-1).reduce((a,b)=>a+b,0)};
  }
  if (question.variant === "loop-start-one") {
    const values = parseArray(test);
    return {expected: values.filter(v=>v<0).length, actual: values.slice(1).filter(v=>v<0).length};
  }
  if (question.variant === "first-versus-last") {
    const values = parseArray(test), target = Number(test.label.match(/target = (-?\d+)/)[1]);
    return {expected: values.lastIndexOf(target), actual: values.indexOf(target)};
  }
  if (question.variant === "wrong-array-cell") {
    const values = parseArray(test), replacement = Number(test.label.match(/replacement = (-?\d+)/)[1]);
    const expected = [...values], actual = [...values];
    expected[expected.length-1] = replacement; actual[0] = replacement;
    return {expected:`{${expected.join(", ")}}`, actual:`{${actual.join(", ")}}`};
  }
  if (question.variant === "reversed-arguments") {
    const [smaller, larger] = numbers;
    return {expected: larger-smaller, actual: smaller-larger};
  }
  if (question.variant === "ignored-parameter") {
    const [score, bonus] = numbers;
    return {expected: score+bonus, actual: score+5};
  }
  throw Error(`Missing independent evaluator for ${question.variant}`);
}

for (const [format, variants] of Object.entries(D.challengeFamilies)) {
  ok(variants.length >= 12, `${format} needs at least 12 structural families`);
  for (const variant of variants) {
    for (let run = 0; run < 20; run++) {
      const question = D.generateDebugger(format, variant);
      generated++;
      eq(question.format, format);
      eq(question.variant, variant);
      ok(["compile", "runtime", "logic"].includes(question.errorCategory));
      ok(question.requirement.length > 15);
      ok(question.explanation.length > 25);
      ok(!question.code.includes("???") && !question.code.includes("▯"));
      if (question.kind === "choice") {
        eq(question.choices.length, 4);
        eq(new Set(question.choices).size, 4);
        eq(question.choices.filter(choice => choice === question.answer).length, 1);
        ok(D.assessDebugger(question, {answer: question.answer}));
      } else {
        ok(Number(question.correctLine) >= 1 && Number(question.correctLine) <= question.lines.length);
        ok(D.assessDebugger(question, {line: question.correctLine}));
      }
      if (format === "test") {
        const independent = question.tests.map(test => independentlyEvaluate(question, test));
        independent.forEach((result, index) => eq(result, {
          expected: question.tests[index].expected,
          actual: question.tests[index].actual,
        }));
        eq(independent.filter(result => String(result.expected) !== String(result.actual)).length, 1);
        const exposed = question.tests.find((test, index) => String(independent[index].expected) !== String(independent[index].actual));
        eq(exposed.label, question.answer);
      }
      if (run === 0) {
        samples.push({format, variant, category: question.errorCategoryName, requirement: question.requirement,
          code: question.code, choices: question.choices, answer: question.correctAnswer});
        if (question.brokenSource) compileCases.push({question, source:question.brokenSource, expected:question.errorCategory !== "compile", kind:"broken"});
        if (question.fixedSource && question.errorCategory === "compile") compileCases.push({question, source:question.fixedSource, expected:true, kind:"fixed"});
      }
    }
  }
}

const seenFormats = new Set(), seenVariants = new Set(), seenCategories = new Set(), seenConcepts = new Set();
const mixedCounts = Object.fromEntries(Object.keys(D.formatNames).map(format => [format, 0]));
const positions = new Set(), linePositions = new Set();
let uniqueLongestCorrect = 0, choiceCount = 0;
for (let index = 0; index < 1000; index++) {
  const question = D.generateDebugger();
  generated++;
  seenFormats.add(question.format); seenVariants.add(question.topic);
  seenCategories.add(question.errorCategory); seenConcepts.add(question.concept);
  mixedCounts[question.format]++;
  if (question.kind === "choice") {
    choiceCount++; positions.add(question.choices.indexOf(question.answer));
    const lengths = question.choices.map(choice=>choice.length), longest = Math.max(...lengths);
    uniqueLongestCorrect += Number(question.answer.length === longest && lengths.filter(length=>length===longest).length === 1);
  } else linePositions.add(Number(question.correctLine));
}
eq([...seenFormats].sort(), Object.keys(D.formatNames).sort());
eq(seenVariants.size, Object.values(D.challengeFamilies).flat().length);
eq([...seenCategories].sort(), ["compile","logic","runtime"]);
eq([...seenConcepts].sort(), ["Arrays","Conditions","Data types","Loops","Methods","Variables"]);
eq(positions.size, 4);
ok(linePositions.size >= 4, "faults appear on varied line numbers");
ok(Object.values(mixedCounts).every(count=>count>=200&&count<=300), "Mixed Practice stays balanced");
ok(uniqueLongestCorrect / choiceCount < 0.35, "answer length does not reveal the correction");

const compilerDirectory = `/tmp/java-debugger-redesign-${process.pid}`;
fs.mkdirSync(compilerDirectory, {recursive:true});
const manifest = [];
for (const [index, item] of compileCases.entries()) {
  const path = `${compilerDirectory}/${index}.java`;
  fs.writeFileSync(path, item.source);
  manifest.push(`${path}\t${item.expected}`);
  item.path = path;
}
const manifestPath = `${compilerDirectory}/manifest.tsv`;
fs.writeFileSync(manifestPath, manifest.join("\n"));
const java = process.env.JAVA_BIN || ["/usr/lib/jvm/java-17-openjdk-amd64/bin/java", "/usr/lib/jvm/java-21-openjdk-amd64/bin/java"].find(path=>fs.existsSync(path)) || "java";
execFileSync(java, [new URL("../compiler-harness.java", import.meta.url).pathname, manifestPath], {encoding:"utf8",timeout:120000});
for (const item of compileCases.filter(item=>item.question.errorCategory === "runtime" && item.kind === "broken")) {
  const run = spawnSync(java, ["-cp", `${item.path}-classes`, "Practice"], {encoding:"utf8",timeout:2000});
  ok(run.status !== 0 && /ArrayIndexOutOfBoundsException/.test(run.stderr), `${item.question.variant} fails during execution`);
}

const {parseHTML} = createRequire(import.meta.url)(process.env.JAVA_DOM_LIBRARY || process.env.CSP_DOM_LIBRARY || "linkedom");
const {document, window} = parseHTML(fs.readFileSync(new URL("./index.html", import.meta.url), "utf8"));
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable:true,
  get(){return this.querySelector("option[selected]")?.value || this.querySelector("option")?.value || "";},
  set(value){for(const option of this.querySelectorAll("option")){option.removeAttribute("selected");if(option.value===value)option.setAttribute("selected","");}},
});
const memory = new Map(), storage = {getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const tracker = S.createSessionTracker({storage});
let current, forcedVariant;
const context = {document,window,console,...D,
  generateDebugger:(format)=>(current=D.generateDebugger(format,forcedVariant)),
  sessionTracker:()=>tracker,addSessionNavigation:()=>{},roundSummary:()=>JSON.stringify(tracker.snapshot().totals)};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("./debugger-ui.js",import.meta.url),"utf8").replace(/import[^;]+;/g,"").replace("export function","function"),context);
const $=id=>document.getElementById(id);
eq($("mode").value,"mixed");
eq($("mode").querySelectorAll("option").length,5);

function load(format,variant){forcedVariant=variant;$("mode").value=format;$("mode").onchange();eq(current.variant,variant);}
function selectCorrect(){
  if(current.kind==="line") $("stage").querySelector(`[data-line="${current.correctLine}"]`).onclick();
  else $("stage").querySelectorAll("[data-answer]")[current.choices.indexOf(current.answer)].onclick();
}
for(const [format,variants] of Object.entries(D.challengeFamilies)){
  load(format,variants[0]);
  eq($("stage").querySelectorAll(".correct-answer,.incorrect-answer").length,0);
  if(current.kind==="choice") eq($("stage").querySelectorAll("[data-answer]").length,4);
  else {
    eq($("stage").querySelectorAll("[data-line]").length,current.lines.length);
    eq($("stage").querySelectorAll(".token-gap").length,0);
  }
  selectCorrect(); const before=tracker.snapshot().totals; $("submit").onclick();
  eq(tracker.snapshot().totals.firstTry,before.firstTry+1);
  eq(tracker.snapshot().totals.submissions,before.submissions+1);
  ok($("submit").disabled); ok(!$("next").disabled);
  ok($("feedback").textContent.includes("Correct answer:"));
  ok($("feedback").textContent.includes(current.errorCategoryName));
}
load("correction",D.challengeFamilies.correction[0]);
const wrong=[...$("stage").querySelectorAll("[data-answer]")].find(button=>button.dataset.answer!==current.answer);
wrong.onclick(); const beforeWrong=tracker.snapshot().totals; $("submit").onclick();
eq(tracker.snapshot().totals.incorrect,beforeWrong.incorrect+1);
eq(tracker.snapshot().totals.revealed,beforeWrong.revealed+1);
const afterWrong=tracker.snapshot().totals; $("submit").onclick(); eq(tracker.snapshot().totals,afterWrong);

const css=fs.readFileSync(new URL("./debugger.css",import.meta.url),"utf8");
ok(css.includes("@media (max-width: 600px)"));
ok(css.includes("overflow-x: auto"));
ok(css.includes("grid-template-columns: minmax(0, 1fr)"));
ok(css.includes("min-height: 3"));

fs.mkdirSync("/tmp/java-quality",{recursive:true});
fs.writeFileSync("/tmp/java-quality/debugger-redesign-samples.json",JSON.stringify(samples,null,2));
console.log(`Debugger Lab redesign: ${generated} generated challenges across ${seenFormats.size} formats and ${seenVariants.size} structural variants; ${checks} assertions passed. Mixed distribution: ${JSON.stringify(mixedCounts)}. Correct answer was uniquely longest in ${uniqueLongestCorrect}/${choiceCount} choice questions. Real javac checked ${compileCases.length} broken/fixed programs.`);
