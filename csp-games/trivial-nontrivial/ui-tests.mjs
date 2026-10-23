import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(new URL("../package.json",import.meta.url));
const {parseHTML}=require("linkedom");
const html=fs.readFileSync(path.join(here,"index.html"),"utf8");
const {document,window}=parseHTML(html);
// linkedom exposes select.value as read-only; mirror browser selection state for DOM tests.
for (const select of document.querySelectorAll("select")) {
  let selected=select.querySelector("option[selected]")?.value ?? select.querySelector("option")?.value ?? "";
  Object.defineProperty(select,"value",{configurable:true,get:()=>selected,set:value=>{selected=String(value);}});
}
const nativeQuerySelectorAll=document.querySelectorAll.bind(document);
const nativeQuerySelector=document.querySelector.bind(document);
Object.defineProperty(document,"querySelectorAll",{configurable:true,value:selector=>{
  if (!selector.endsWith(":checked")) return nativeQuerySelectorAll(selector);
  return nativeQuerySelectorAll(selector.slice(0,-8)).filter(element=>element.checked);
}});
Object.defineProperty(document,"querySelector",{configurable:true,value:selector=>{
  if (!selector.endsWith(":checked")) return nativeQuerySelector(selector);
  return nativeQuerySelectorAll(selector.slice(0,-8)).find(element=>element.checked) ?? null;
}});
const store=new Map();
const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key),
};
window.confirm=()=>true;
window.localStorage=localStorage;
Object.defineProperty(globalThis,"document",{value:document,configurable:true,writable:true});
Object.defineProperty(globalThis,"window",{value:window,configurable:true,writable:true});
Object.defineProperty(globalThis,"localStorage",{value:localStorage,configurable:true,writable:true});
Object.defineProperty(globalThis,"location",{value:{href:"https://davisjm4.github.io/csp-games/trivial-nontrivial/?category=selection&activity=classify&difficulty=beginner&seed=123&model=sel-threshold&variant=1&shown=classify",origin:"https://davisjm4.github.io",pathname:"/csp-games/trivial-nontrivial/"},configurable:true,writable:true});
Object.defineProperty(globalThis,"navigator",{value:{clipboard:{writeText:async value=>{globalThis.__copied=value;}}},configurable:true,writable:true});
globalThis.setInterval=()=>1;
globalThis.clearInterval=()=>{};
const app=await import("./app.js?test=ui");
const engine=await import("./engine.js?test=ui-audit");
for(const model of engine.MODELS) for(let variant=0;variant<3;variant++) {
  const choices=app.buildExplanationChoices(engine.buildChallenge(model.id,variant));
  assert.equal(choices.length,4,model.id+" explanation choice count");
  assert.equal(choices.filter(choice=>choice.key==="correct").length,1,model.id+" exactly one correct explanation");
  assert.equal(new Set(choices.map(choice=>choice.text)).size,4,model.id+" distinct explanation choices");
}
const trackerModule=await import("../session.js?v=per-mode-daily-v1");
const tracker=trackerModule.sessionTracker();

assert.equal(document.title,"Trivial or Non-Trivial? | CSP Games");
assert.equal(document.getElementById("challenge-meta").textContent,"Selection · Classify the Code · Beginner");
assert.match(document.getElementById("code-a").textContent,/score ← 5/);
assert.ok(document.getElementById("next-challenge"));
assert.equal(document.getElementById("single-code").hidden,false);
assert.equal(document.getElementById("classify-controls").hidden,false);
assert.equal(document.getElementById("compare-controls").hidden,true);
assert.ok(document.querySelector("header [data-session-link]"),"Session Summary navigation is added");

document.querySelector('input[name="classification"][value="meaningful"]').checked=true;
document.getElementById("submit-answer").click();
assert.match(document.getElementById("feedback").textContent,/Correct/);
let snapshot=tracker.snapshot();
assert.equal(snapshot.games["trivial-nontrivial"].attempted,1);
assert.equal(snapshot.games["trivial-nontrivial"].firstTry,1);
assert.equal(snapshot.games["trivial-nontrivial"].topics.selection.firstTry,1);
assert.equal(snapshot.games["trivial-nontrivial"].modes.classify.firstTry,1);
assert.equal(snapshot.totals.submissions,1);
assert.match(document.getElementById("trace-output").textContent,/DISPLAY result/);

document.getElementById("submit-answer").click();
assert.equal(tracker.snapshot().totals.submissions,1,"one scored attempt per challenge");

document.getElementById("activity").value="compare";
document.getElementById("activity").dispatchEvent(new window.Event("change"));
assert.equal(document.getElementById("compare-code").hidden,false);
assert.equal(document.getElementById("compare-controls").hidden,false);
assert.match(document.getElementById("task").textContent,/score is at least 5/);
assert.match(document.getElementById("construct-focus").textContent,/conditional/);
assert.match(document.getElementById("compare-a").textContent,/IF/);
assert.match(document.getElementById("compare-b").textContent,/ELSE/);
document.getElementById("compare-class-a").value="meaningful";
document.getElementById("compare-class-b").value="superficial";
document.querySelector('input[name="equivalence"][value="different"]').checked=true;
document.getElementById("submit-answer").click();
assert.match(document.getElementById("feedback").textContent,/Correct/);
snapshot=tracker.snapshot();
assert.equal(snapshot.games["trivial-nontrivial"].modes.compare.firstTry,1);
assert.equal(snapshot.games["trivial-nontrivial"].submissions,2);

document.getElementById("activity").value="explain";
document.getElementById("activity").dispatchEvent(new window.Event("change"));
assert.equal(document.getElementById("explain-controls").hidden,false);
const options=[...document.querySelectorAll("#explanation-choices button")];
assert.equal(options.length,4);
assert.equal(options.filter(x=>x.dataset.choice==="correct").length,1);
assert.equal(new Set(options.map(x=>x.textContent)).size,4);
document.querySelector('#explanation-choices [data-choice="correct"]').click();
document.getElementById("submit-answer").click();
assert.match(document.getElementById("feedback").textContent,/Correct/);
assert.equal(tracker.snapshot().games["trivial-nontrivial"].modes.explain.firstTry,1);

document.getElementById("share-link").click();
await new Promise(resolve=>setImmediate(resolve));
assert.match(globalThis.__copied,/model=sel-/);
assert.match(globalThis.__copied,/shown=explain/);
assert.match(globalThis.__copied,/category=selection/);

const wrongChallenge=engine.buildChallenge("sel-same-labels",0);
wrongChallenge.activity="classify";
app.renderChallenge(wrongChallenge);
document.querySelector('input[name="classification"][value="meaningful"]').checked=true;
document.getElementById("submit-answer").click();
assert.match(document.getElementById("feedback").textContent,/Not quite/);
assert.match(document.getElementById("feedback").textContent,/Reasoning to revisit/);
snapshot=tracker.snapshot();
assert.equal(snapshot.games["trivial-nontrivial"].attempted,4);
assert.equal(snapshot.games["trivial-nontrivial"].firstTry,3);
assert.equal(snapshot.games["trivial-nontrivial"].incorrect,1);
document.getElementById("submit-answer").click();
assert.equal(tracker.snapshot().totals.submissions,4,"incorrect challenge still scores only once");
window.confirm=()=>false;
document.getElementById("reset-session").click();
assert.equal(tracker.snapshot().totals.submissions,4,"cancel keeps existing session totals");
window.confirm=()=>true;
document.getElementById("reset-session").click();
snapshot=tracker.snapshot();
assert.equal(snapshot.totals.attempted,0,"reset clears old attempts");
assert.equal(snapshot.totals.firstTry,0);
assert.equal(snapshot.totals.generated,1,"current challenge begins a clean session record after reset");

document.getElementById("category").value="algorithms";
document.getElementById("category").dispatchEvent(new window.Event("change"));
assert.match(document.getElementById("construct-focus").textContent,/algorithm|traversal|selection|loop|condition/i);
document.getElementById("category").value="mixed";
document.getElementById("activity").value="all";
document.getElementById("difficulty").value="advanced";
const filters=[...document.querySelectorAll("#category-filters input")];
for(const filter of filters) filter.checked=filter.value==="selection";
document.querySelector('#category-filters input[value="selection"]').dispatchEvent(new window.Event("change"));
assert.equal(document.getElementById("category-filters").hidden,false);
assert.match(document.getElementById("challenge-meta").textContent,/Advanced/);
assert.match(document.getElementById("challenge-meta").textContent,/^Selection ·/);
document.getElementById("share-link").click();
await new Promise(resolve=>setImmediate(resolve));
assert.match(globalThis.__copied,/category=mixed/);
assert.match(globalThis.__copied,/activity=all/);
assert.match(globalThis.__copied,/difficulty=advanced/);
assert.match(globalThis.__copied,/categories=selection/);
const previousTitle=document.getElementById("challenge-title").textContent;
document.getElementById("next-challenge").click();
assert.notEqual(document.getElementById("challenge-title").textContent,previousTitle,"Next Challenge avoids immediate model repetition when alternatives exist");

console.log("PASS: DOM controls for classification, correct/incorrect feedback, comparison, explanation, local scoring, category/activity breakdown, one-attempt lock, next challenge, share links/filters, reset confirmation, and Mixed Practice.");
