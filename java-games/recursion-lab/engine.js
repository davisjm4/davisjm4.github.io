/*
 * Seeded, structured recursion challenge generator. Answers and traces are
 * computed by bounded simulators; displayed Java is emitted from the same
 * challenge parameters (we never execute arbitrary source in the browser).
 */
import { entriesFor, composeQuestion } from "./compose/index.js?v=compositional-v2";
export const modeNames = {
  base: "Base Cases & Calls",
  returns: "Return Values",
  output: "Output & Strings",
  arrays: "Arrays & Parameters",
  debug: "Recursive Debugging",
  searchsort: "Recursive Search & Sort",
};
const modes = Object.keys(modeNames);
export const difficulties = ["Beginner", "Intermediate", "Advanced"];
export const seededRandom = (seed = 1) => {
  let s = Number(seed) >>> 0;
  return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
};
const pick = (a, r) => a[Math.floor(r() * a.length)];
const int = (lo, hi, r) => lo + Math.floor(r() * (hi - lo + 1));
export function shuffle(values, r = Math.random) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const cfg = { Beginner: { n: 3, depth: 4, calls: 18 }, Intermediate: { n: 6, depth: 8, calls: 90 }, Advanced: { n: 9, depth: 12, calls: 450 } };
const fmt = v => typeof v === "string" && !/^-?\d+(\.\d+)?$/.test(v) && v !== "true" && v !== "false" ? `"${v}"` : String(v);
function choicesFor(answer, wrong, r) {
  const list = [];
  for (const x of [String(answer), ...wrong.map(String)]) if (!list.includes(x)) list.push(x);
  for (const x of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "-1", "true", "false", '""', '"0"', '"1"']) if (list.length < 4 && !list.includes(x) && x !== String(answer)) list.push(x);
  return shuffle(list.slice(0, 4), r);
}
function make({ mode, difficulty, family, code, prompt, answer, wrong, explanation, trace = [], task = "trace", r, data = {} }) {
  const choices = choicesFor(answer, wrong, r);
  if (choices.length !== 4 || choices.filter(x => x === String(answer)).length !== 1) throw Error(`Invalid choices for ${family}`);
  const q = { game: "recursion-lab", title: "Recursion Lab", mode, topic: mode, topicTitle: modeNames[mode], difficulty, skill: `${mode}.${family}`, family, seed: data.seed, data: { ...data }, task, code, prompt, answer: String(answer), correctAnswer: String(answer), choices, explanation, trace, callDepth: data.callDepth || 0, callCount: data.callCount || 0, signature: `${mode}|${difficulty}|${family}|${code}|${prompt}|${answer}|${choices.join("~")}` };
  return q;
}
const words = ["SUN", "MAP", "CAT", "CODE", "JAVA", "PLANT", "LEVEL", "ROBOT", "NOON", "ARRAY", "MATH", "STACK", "COMPUTER", "RECURSION", "CHALLENGE", "EDUCATION"];
const methodNames = ["walk", "visit", "trace", "process", "reduceValue", "stepThrough", "recurse", "solve", "inspect", "buildResult", "follow", "compute"];
function genBase(d, r) {
  const c = cfg[d], n = int(2, c.n + 2, r), kind = int(0, 7, r);
  let step = int(1, d === "Advanced" ? 3 : 2, r);
  const method = pick(methodNames, r);
  const threshold = kind % 3 === 0 ? 0 : 1;
  if (kind % 4 === 2) step = 1;
  const condition = kind % 4 === 0 ? `n <= ${threshold}` : kind % 4 === 1 ? `n < ${threshold + 1}` : kind % 4 === 2 ? `n == ${threshold}` : `n <= ${threshold}`;
  const delta = -step, start = kind % 2 ? n + threshold + 1 : n;
  const callArg = kind % 3 === 2 ? `n - ${step}` : `n - ${step}`;
  let count = 0, x = start, trace = [];
  while (count++ < c.depth + 2 && !(kind % 2 ? x <= threshold : x <= threshold)) { trace.push(`${method}(${x})`); x += delta; }
  trace.push(`${method}(${x}) → base case`);
  const ask = kind % 4;
  const answer = ask === 0 ? condition : ask === 1 ? trace.length : ask === 2 ? x : `n - ${step}`;
  const prompt = ["Which condition stops the recursive calls?", `How many method calls occur for ${method}(${start})?`, `At what value of n does the base case run?`, "Which argument expression matches the recursive call shown?"][ask];
  const wrong = ask === 0 ? [`n < ${threshold}`, `n == ${threshold + 1}`, `n > ${threshold + 1}`] : ask === 1 ? [trace.length - 1, trace.length + 1, trace.length + 2] : ask === 2 ? [x - delta, x + delta, threshold] : [`n + ${step}`, "n", `n - 1`];
  const code = `public static void ${method}(int n) {\n    if (${condition}) {\n        return;\n    }\n    ${method}(${callArg});\n}\n// call: ${method}(${start})`;
  return make({ mode: "base", difficulty: d, family: ["base-threshold", "step-size", "call-count", "terminal-argument", "nonzero-base", "method-variant", "call-chain", "condition-form"][kind], code, prompt, answer, wrong, explanation: ask === 1 ? `The calls visit ${trace.slice(0, -1).join(" → ")} and then the base case: ${count} calls total.` : ask === 2 ? `Each call reduces n by ${step}; the first value satisfying ${condition} is ${x}.` : ask === 0 ? `The condition is checked before the recursive call. At ${x}, it returns without another call.` : `Subtracting ${step} moves n toward the stopping range.`, trace, r, data: { seed: dataSeed(r), callDepth: count - 1, callCount: count } });
}
// A small deterministic draw is retained as metadata only; the generator's
// externally supplied seed is attached by createRecursionGenerator.
const dataSeed = () => undefined;

function genReturns(d, r) {
  const c = cfg[d], k = int(1, d === "Advanced" ? 7 : 4, r), n = int(2, c.n + 2, r), a = int(1, 4, r), b = int(-2, 5, r), type = int(0, 7, r);
  const name = pick(methodNames, r);
  if (type === 7 && d !== "Beginner") {
    const value = Math.min(n, d === "Intermediate" ? 7 : 8), calls = [], returns = [];
    const fib = x => {
      if (calls.length >= 500) throw Error("Branching recursion safety limit exceeded");
      calls.push(`fibLike(${x})`);
      if (x <= 1) { returns.push(`fibLike(${x}) → 1`); return 1; }
      const left = fib(x - 1), right = fib(x - 2), result = left + right;
      returns.push(`fibLike(${x}) returns ${left} + ${right} = ${result}`);
      return result;
    };
    const answer = fib(value), asks = ["value", "calls", "depth"], ask = pick(asks, r);
    const response = ask === "value" ? answer : ask === "calls" ? calls.length : value;
    const prompt = ask === "value" ? `What does fibLike(${value}) return?` : ask === "calls" ? `How many total calls, including base cases, are made by fibLike(${value})?` : `What is the maximum call depth for fibLike(${value}), counting the first call as depth 1?`;
    const code = `public static int fibLike(int n) {\n    if (n <= 1) return 1;\n    return fibLike(n - 1) + fibLike(n - 2);\n}\n// call: fibLike(${value})`;
    return make({ mode: "returns", difficulty: d, family: "two-branch-recursion", code, prompt, answer: response, wrong: ask === "value" ? [answer - 1, answer + 1, answer * 2] : ask === "calls" ? [calls.length - 2, calls.length - 1, calls.length + 1] : [value - 1, value + 1, value + 2], explanation: `The first branch fibLike(${value-1}) is evaluated before fibLike(${value-2}); the two returned values are added.`, trace: [...calls.slice(0, 12).map(x=>`call ${x}`), ...(calls.length>12?[`… ${calls.length-12} more calls …`]:[]), ...returns.slice(-Math.min(6,returns.length))], r, data: { callDepth: value, callCount: calls.length } });
  }
  let answer, code, explanation, trace = [], wrong;
  if (type % 4 === 0) { answer = b + a * n; code = `public static int ${name}(int n) {\n    if (n == 0) return ${b};\n    return ${a} + ${name}(n - 1);\n}\n// ${name}(${n})`; explanation = `There are ${n} returning levels, each adding ${a}; the base returns ${b}, so ${b} + ${a} × ${n} = ${answer}.`; trace = [`${name}(${n}) → ${name}(${n - 1})`, "…", `${name}(0) → ${b}`, `unwind: ${answer}`]; wrong = [answer - a, answer + a, a * n]; }
  else if (type % 4 === 1) { answer = Array.from({ length: n }, (_, i) => i + 1).reduce((p, x) => p * x, 1); code = `public static int ${name}(int n) {\n    if (n <= 1) return 1;\n    return n * ${name}(n - 1);\n}\n// ${name}(${n})`; explanation = `The base returns 1. On the way back, multiply by ${n}, ${n - 1}, …, 2 to get ${answer}.`; trace = [`${name}(${n}) → ${name}(${n - 1})`, "…", `${name}(1) → 1`, `returns ${answer}`]; wrong = [answer / n, answer + n, answer - 1]; }
  else if (type % 4 === 2) { answer = n * (n + 1) / 2 + b; code = `public static int ${name}(int n) {\n    if (n == 0) return ${b};\n    return n + ${name}(n - 1);\n}\n// ${name}(${n})`; explanation = `The recursive returns add ${n} + ${n - 1} + … + 1 to the base value ${b}, giving ${answer}.`; trace = [`${name}(${n}) → ${name}(${n - 1})`, "…", `${name}(0) → ${b}`, `returns ${answer}`]; wrong = [answer - b, answer + b, n + b]; }
  else { const factor = int(2, 3, r); answer = factor ** n; code = `public static int ${name}(int n) {\n    if (n == 0) return 1;\n    return ${factor} * ${name}(n - 1);\n}\n// ${name}(${n})`; explanation = `${factor} is multiplied once at each of ${n} levels: ${factor}^${n} = ${answer}.`; trace = [`${name}(${n}) → ${name}(${n - 1})`, "…", `${name}(0) → 1`, `returns ${answer}`]; wrong = [factor * n, answer / factor, answer + factor]; }
  if (d === "Advanced") { const extra = int(1, 3, r); // Add a real accumulated parameter pattern.
    if (type === 6 || type === 7) { answer = b + Array.from({ length: n }, (_, i) => (i + 1) * extra).reduce((p, x) => p + x, 0); code = `public static int ${name}(int n, int total) {\n    if (n == 0) return total;\n    return ${name}(n - 1, total + ${extra} * n);\n}\n// ${name}(${n}, ${b})`; explanation = `The parameter accumulates ${extra} × ${n} + … + ${extra} × 1, then returns ${b}: ${answer}.`; trace = [`${name}(${n}, ${b})`, "…", `${name}(0, ${answer}) → ${answer}`]; wrong = [answer - extra, answer + extra, b + n]; }
  }
  return make({ mode: "returns", difficulty: d, family: ["linear-return", "factorial", "sum-return", "power", "accumulated-parameter", "nested-arithmetic", "return-composition", "call-stack-unwind"][type], code, prompt: `What does the call return?`, answer, wrong, explanation, trace, r, data: { callDepth: n, callCount: n + 1 } });
}

function genOutput(d, r) {
  const c = cfg[d], word = pick(words.slice(0, d === "Beginner" ? 5 : words.length), r), type = int(0, 7, r), n = Math.min(word.length, int(2, Math.min(word.length, c.n + 2), r));
  const text = word.slice(0, n), method = pick(methodNames, r);
  let answer, code, explanation, trace;
  if (type < 2) { const before = type === 0; answer = before ? text : [...text].reverse().join(""); code = `public static void ${method}(String s) {\n    if (s.length() == 0) return;\n    ${before ? 'System.out.print(s.substring(0, 1));' : `${method}(s.substring(1));`}\n    ${before ? `${method}(s.substring(1));` : 'System.out.print(s.substring(0, 1));'}\n}\n// call: ${method}("${text}")`; if (before) {
      explanation = "Printing before the recursive call emits the first character immediately, then the suffix is processed."; trace = [`calls: ${[...text].map((_,i)=>`${method}("${text.slice(i)}")`).join(" → ")}`, `output: ${answer}`];
    } else { explanation = "The suffix call finishes first; the first character prints during unwind, so the output is reversed."; trace = [`calls descend through suffixes of ${text}`, `unwind prints ${[...text].reverse().join(" → ")}`, `output: ${answer}`]; } }
  else if (type === 3) { answer = [...text].reverse().join(""); code = `public static String ${method}(String s) {\n    if (s.length() <= 1) return s;\n    return ${method}(s.substring(1)) + s.substring(0, 1);\n}\n// ${method}("${text}")`; explanation = "Each call removes the first character; that character is appended after the recursive result during unwind."; trace = [`${method}("${text}") → ${method}("${text.slice(1)}")`, "…", `returns "${answer}"`]; }
  else if (type === 2) { answer = text; code = `public static void ${method}(String s) {\n    if (s.length() == 0) return;\n    ${method}(s.substring(0, s.length() - 1));\n    System.out.print(s.substring(s.length() - 1));\n}\n// ${method}("${text}")`; explanation = "The method recursively processes the prefix first, then prints its last character during unwind; that restores left-to-right order."; trace = [`calls descend through prefixes of ${text}`, `unwind prints ${[...text].join(" → ")}`, `output: ${answer}`]; }
  else { let out = ""; if (type === 4) out = [...text].filter((_,i)=>i%2===0).join(""); if (type === 5) out = text.length < 2 ? text : text[0] + text.at(-1); if (type === 6) out = text.slice(0, Math.ceil(text.length/2)); if (type === 7) out = text.slice(Math.floor(text.length/2)); answer = out; code = `public static String ${method}(String s) {\n    if (s.length() == 0) return "";\n    String rest = ${method}(s.substring(1));\n    if (s.substring(0, 1).equals("${text[0]}")) {\n        return s.substring(0, 1) + rest;\n    }\n    return rest;\n}\n// input: "${text}"`; if (type === 4) {
      answer = [...text].filter(ch=>ch===text[0]).join("");
    } else { code = `public static String ${method}(String s, int i) {\n    if (i >= s.length()) return "";\n    String here = ${type===5?'(i % 2 == 0 ? s.substring(i, i + 1) : "")':type===6?'(i < (s.length() + 1) / 2 ? s.substring(i, i + 1) : "")':'(i >= s.length() / 2 ? s.substring(i, i + 1) : "")'};\n    return here + ${method}(s, i + 1);\n}\n// ${method}("${text}", 0)`; answer = type===5?[...text].filter((_,i)=>i%2===0).join(""):type===6?text.slice(0,Math.ceil(text.length/2)):text.slice(Math.floor(text.length/2)); }
    explanation = `The recursive method visits positions from left to right and keeps only characters satisfying its condition, producing "${answer}".`; trace = [`input: ${text}`, `result: ${answer}`]; }
  const wrong = [answer.split("").reverse().join(""), text, text.slice(1), answer + (text[0]||"")];
  return make({ mode: "output", difficulty: d, family: ["print-before", "print-after", "prefix-before-print", "reverse-construction", "filter-matching-character", "filter-even-positions", "recursive-prefix", "recursive-suffix"][type], code, prompt: "What is printed or returned by the call?", answer, wrong, explanation, trace, r, data: { callDepth: text.length, callCount: text.length + 1, text, operation: type } });
}

function genArrays(d, r) {
  const c=cfg[d], len=int(3,c.n+3,r), arr=Array.from({length:len},()=>int(-3,8,r)), index=pick([0,len-1,Math.floor(len/2)],r), target=pick(arr,r), type=int(0,7,r), method=pick(methodNames,r);
  let answer,code,explanation,trace=[],wrong;
  if(type===0||type===3){answer=arr.reduce((a,b)=>a+b,0);code=`public static int ${method}(int[] a, int i) {\n    if (${type===0?'i >= a.length':'i < 0'}) return 0;\n    return a[i] + ${method}(a, i ${type===0?'+ 1':'- 1'});\n}\n// a = {${arr.join(", ")}}, start = ${type===0?0:len-1}`;explanation=`Every element is added exactly once; the boundary call contributes 0, so the total is ${answer}.`;trace=[`indexes: ${type===0?arr.map((_,i)=>i).join(" → "):arr.map((_,i)=>len-1-i).join(" → ")}`,`sum = ${answer}`];wrong=[answer-arr[0],answer+arr[0],arr.at(-1)];}
  else if(type===1){answer=arr.filter(x=>x===target).length;code=`public static int ${method}(int[] a, int i, int target) {\n    if (i == a.length) return 0;\n    int here = (a[i] == target) ? 1 : 0;\n    return here + ${method}(a, i + 1, target);\n}\n// a = {${arr.join(", ")}}, target = ${target}`;explanation=`The value ${target} occurs at indexes ${arr.map((x,i)=>x===target?i:null).filter(x=>x!==null).join(", ")||"nowhere"}; count each matching position once.`;wrong=[Math.max(0,answer-1),answer+1,arr.indexOf(target)];}
  else if(type===2){answer=arr.indexOf(target);code=`public static int ${method}(int[] a, int i, int target) {\n    if (i == a.length) return -1;\n    if (a[i] == target) return i;\n    return ${method}(a, i + 1, target);\n}\n// a = {${arr.join(", ")}}, target = ${target}`;explanation=answer<0?"The recursion reaches i == a.length without a match and returns -1.":`The first matching value is at index ${answer}; the method returns immediately there.`;wrong=[answer===-1?len:answer+1,0,answer-1];}
  else if(type===4){answer=String(arr.some(x=>x%2===0));code=`public static boolean ${method}(int[] a, int i) {\n    if (i == a.length) return false;\n    return a[i] % 2 == 0 || ${method}(a, i + 1);\n}\n// a = {${arr.join(", ")}}`;explanation=`The recursive OR checks each value until an even value is found; result is ${answer}.`;wrong=[String(answer!=="true"),String(arr.some(x=>x%2!==0)),String(arr[0]%2===0)];}
  else if(type===5){answer=Math.max(...arr.slice(index));code=`public static int ${method}(int[] a, int i) {\n    if (i == a.length - 1) return a[i];\n    return Math.max(a[i], ${method}(a, i + 1));\n}\n// a = {${arr.join(", ")}}, start = ${index}`;explanation=`The recursive calls find the maximum in the suffix starting at ${index}, which is ${answer}.`;wrong=[answer-1,arr[index],Math.max(...arr)];}
  else if(type===6){answer=arr.reduce((s,x,i)=>s+(i%2===0?x:-x),0);code=`public static int ${method}(int[] a, int i) {\n    if (i == a.length) return 0;\n    int sign = (i % 2 == 0) ? 1 : -1;\n    return sign * a[i] + ${method}(a, i + 1);\n}\n// a = {${arr.join(", ")}}`;explanation="Even indexes are added and odd indexes are subtracted as the recursive result returns.";wrong=[-answer,arr.reduce((s,x)=>s+x,0),answer+arr[0]];}
  else {answer=arr.slice().reverse().join(" ");code=`public static String ${method}(int[] a, int i) {\n    if (i < 0) return "";\n    String rest = ${method}(a, i - 1);\n    if (rest.length() == 0) return "" + a[i];\n    return a[i] + " " + rest;\n}\n// a = {${arr.join(", ")}}, start = ${len-1}`;explanation="The method reads from the last index toward zero and joins the returned values with single spaces.";wrong=[arr.join(", "),arr.slice(1).reverse().join(", "),arr.slice().sort((a,b)=>a-b).join(", ")];}
  wrong=[...new Set(wrong.map(String))]; while(wrong.length<3) wrong.push(String(answer)+"0");
  if (!trace.length) trace=[`array: {${arr.join(", ")}}`,`recursive calls visit up to ${len} positions`,`result: ${answer}`];
  const calls=type===2?(arr.indexOf(target)<0?len+1:arr.indexOf(target)+1):type===4?(arr.findIndex(x=>x%2===0)<0?len+1:arr.findIndex(x=>x%2===0)+1):type===5?len-index:len+1;
  return make({mode:"arrays",difficulty:d,family:["forward-sum","recursive-count","first-match-search","backward-sum","short-circuit-search","recursive-maximum","signed-accumulator","backward-reconstruction"][type],code,prompt:"What is the result of this recursive call?",answer,wrong,explanation,trace,r,data:{callDepth:calls,callCount:calls,array:arr,target,index,operation:type}});
}

function genDebug(d,r){
  const type=int(0,7,r), n=int(2,cfg[d].n+2,r), method=pick(methodNames,r);
  const sets=[
    ["public static int sum(int n) {\n    return n + sum(n - 1);\n}","Add if (n == 0) return 0; before the recursive return.","There is no base case.","The recursive call decreases n."],
    ["public static int count(int n) {\n    if (n == 0) return 0;\n    return 1 + count(n);\n}","Change count(n) to count(n - 1).","The argument never changes.","The return value is discarded."],
    ["public static String reverse(String s) {\n    if (s.length() <= 1) return s;\n    return reverse(s.substring(0, s.length()-1)) + s.substring(0,1);\n}","Use reverse(s.substring(1)) + s.substring(0, 1).","It recurses on a shorter prefix but appends the wrong side.","The base case is reachable."],
    ["public static int find(int[] a, int i, int x) {\n    if (i > a.length) return -1;\n    if (a[i] == x) return i;\n    return find(a, i + 1, x);\n}","Change i > a.length to i >= a.length.","Index a.length is already outside the array.","The search advances one index."],
    ["public static int power(int n) {\n    if (n == 0) return 1;\n    return 2 + power(n - 1);\n}","Change + to * so each call doubles the result.","The base case returns 1.","The recursive argument moves toward zero."],
    ["public static void print(int n) {\n    if (n == 0) return;\n    print(n - 1);\n    System.out.print(n);\n}","The method prints in ascending order.","The recursive call occurs before printing.","This always prints descending order."],
    ["public static int max(int[] a, int i) {\n    if (i == a.length) return 0;\n    return Math.max(a[i], max(a, i + 1));\n}","Use a.length - 1 as the base index and return a[i] there.","Returning 0 can be wrong when all values are negative.","Math.max compares both values."],
    ["public static boolean contains(int[] a, int i, int x) {\n    if (i == a.length) return false;\n    return a[i] == x && contains(a, i + 1, x);\n}","Replace && with ||.","A match at this position should make the result true.","The base case correctly reports no remaining match."]
  ];
  let [body,correct,why]=sets[type];
  const names=["sum","count","reverse","find","power","print","max","contains"], old=names[type];
  body=body.replace(new RegExp(`(?<![.\\w])${old}\\(`,"g"),`${method}(`);
  correct=correct.replaceAll(old,method);
  let wrong=type===0?["Change n - 1 to n + 1.","Return n before the recursive call.",`Call ${method}(0) outside the method.`]:type===1?["Change 1 + to 1 -.","Change n == 0 to n == 1.","Replace return with print."]:type===2?[`Use ${method}(s) + s.substring(0, 1).`,"Use s.substring(0) as the recursive argument.","Append the first character before the recursive result."]:type===3?["Change > to <.","Change i + 1 to i - 1.","Return i instead of -1 at the boundary."]:type===4?["Change + to -.","Return n at the base case.",`Call ${method}(n + 1).`]:type===6?["Change i == a.length to i > a.length.","Change i + 1 to i - 1.","Use Math.min instead of Math.max."]:type===7?["Replace || with &&.","Return true at the boundary.","Compare i to a.length - 1 only."]:["Move the print before the recursive call.","Remove the base case.","Change n - 1 to n + 1."];
  let answer=correct, prompt=`Which change fixes the identified behavior for the sample argument ${n}?`;
  if(type===5){answer="Ascending";wrong=["Descending","No output","Only the first value"];prompt=`What is the output order for ${method}(${n})?`;}
  const callNote=type===5?`\n// call: ${method}(${n})`:"";
  return make({mode:"debug",difficulty:d,family:["missing-base-case","nonprogressing-argument","wrong-recursive-subproblem","array-boundary","wrong-return-combination","execution-order","negative-array-edge","short-circuit-condition"][type],code:`${body}\n// sample argument n = ${n}${callNote}`,prompt,answer,wrong,explanation:type===5?`The recursive call completes before printing begins, so smaller values print first: ascending.`:`${why} ${correct}`,trace:["Inspect the base case, progress toward it, and how the recursive result is used."],r,data:{callDepth:n,callCount:n+1}});
}

function genSearchSort(d,r){
  const type=int(0,7,r), size=d==="Beginner"?int(3,5,r):d==="Intermediate"?int(5,7,r):int(7,10,r), name=["binarySearch","mergeSort","binarySearch","mergeSort","binarySearch","mergeSort","binarySearch","mergeSort"][type];
  let arr=Array.from({length:size},(_,i)=>2*i+int(0,1,r)).sort((a,b)=>a-b);
  if(type===2 && size>3){arr[2]=arr[1];arr.sort((a,b)=>a-b)}
  // Compositional expansion fix: merge-sort questions previously always used an already-sorted array.
  if(name==="mergeSort"){const sorted=arr;do arr=shuffle(sorted,r);while(arr.every((x,i)=>!i||arr[i-1]<=x));}
  const target=type===6?arr.at(-1)+int(2,5,r):pick(arr,r);
  let code,answer,wrong,explanation,trace=[],prompt,reportedCalls=0,reportedDepth=0;
  if(name==="binarySearch") { const simulation=simulateBinarySearch(arr,target), visited=simulation.trace.filter(x=>!x.base), first=visited[0], last=visited.at(-1), stage=type===0?"next":type===2?"mid":type===4?"count":"return";reportedCalls=simulation.calls;reportedDepth=simulation.maxDepth;if(stage==="next"){answer=first.value===target?`return ${first.mid}`:first.value<target?`low = ${first.mid+1}`:`high = ${first.mid-1}`;prompt=`For the first call with low = ${first.low}, high = ${first.high}, and target ${target}, what happens after comparing the midpoint?`;}
    else if(stage==="mid"){answer=first.mid;prompt=`What midpoint index is checked first for low = 0 and high = ${size-1}?`;}
    else if(stage==="count"){answer=simulation.calls;prompt=`How many recursive calls occur when searching for ${target}, including the not-found base call when needed?`;}
    else {answer=simulation.result;prompt=`What index does binarySearch return for target ${target}?`;}
    code=`public static int binarySearch(int[] a, int low, int high, int target) {\n    if (low > high) return -1;\n    int mid = (low + high) / 2;\n    if (a[mid] == target) return mid;\n    if (target < a[mid])\n        return binarySearch(a, low, mid - 1, target);\n    return binarySearch(a, mid + 1, high, target);\n}\n// a = {${arr.join(", ")}}, target = ${target}`;
    explanation=`Calls inspect indexes ${visited.map(x=>x.mid).join(" → ")}${simulation.trace.at(-1)?.base?" → empty range":""}. ${simulation.result<0?"The target is absent, so the base case returns -1.":`The target is found at index ${simulation.result}.`}`;trace=simulation.trace.map((x,i)=>x.base?`call ${i+1}: low=${x.low}, high=${x.high} → base case returns -1`:`call ${i+1}: low=${x.low}, mid=${x.mid} (a[mid]=${x.value}), high=${x.high}`).concat(`return ${simulation.result}`);wrong=stage==="next"?[`low = ${first.mid}`,`high = ${first.mid}`,`return ${first.mid}`]:[stage==="count"?simulation.calls-1:answer-1,stage==="count"?simulation.calls+1:answer+1,stage==="mid"?last.high:last.mid];
  } else {const lo=0,hi=size-1,mid=Math.floor((lo+hi)/2),cut=mid+1,left=arr.slice(0,cut),right=arr.slice(cut),leftSorted=[...left].sort((a,b)=>a-b),rightSorted=[...right].sort((a,b)=>a-b),simulation=simulateMergeSort(arr),merged=simulation.result,stage=type===1?"base":type===3?"split":type===5?"calls":"merge";reportedCalls=simulation.calls;reportedDepth=simulation.maxDepth;code=`public static int[] mergeSort(int[] a, int low, int high) {\n    if (low >= high) return a;\n    int mid = (low + high) / 2;\n    mergeSort(a, low, mid);\n    mergeSort(a, mid + 1, high);\n    merge(a, low, mid, high);\n    return a;\n}\nprivate static void merge(int[] a, int low, int mid, int high) {\n    int[] temp = new int[high - low + 1];\n    int i = low, j = mid + 1, k = 0;\n    while (i <= mid && j <= high) {\n        if (a[i] <= a[j]) temp[k++] = a[i++];\n        else temp[k++] = a[j++];\n    }\n    while (i <= mid) temp[k++] = a[i++];\n    while (j <= high) temp[k++] = a[j++];\n    for (int x = 0; x < temp.length; x++) a[low + x] = temp[x];\n}\n// a = {${arr.join(", ")}}, low = ${lo}, high = ${hi}`;
    if(stage==="base"){answer="low >= high";prompt="Which condition handles a range containing at most one element?";wrong=["low > high","low > high + 1","low == high - 1"];}
    else if(stage==="split"){answer=`${lo}..${mid} and ${mid+1}..${hi}`;prompt=`How does the first call split the range ${lo}..${hi}?`;wrong=[`${lo}..${mid-1} and ${mid}..${hi}`,`${lo}..${mid} and ${mid}..${hi}`,`${lo}..${hi-1} and ${hi}..${hi}`];}
    else if(stage==="calls"){answer=simulation.calls;prompt=`How many mergeSort calls (including base-case calls) are made for ${size} elements?`;wrong=[size,2*size,2*size+1];}
    else {answer=merged.join(", ");prompt="What sorted values are produced after these two halves are merged?";wrong=[arr.slice().reverse().join(", "),[...left,...right].join(", "),arr.slice(0,-1).join(", ")];}
    explanation=stage==="calls"?`The recursion tree has ${simulation.calls} calls across ${simulation.maxDepth} levels.`:stage==="merge"?`The sorted halves ${leftSorted.join(", ")} and ${rightSorted.join(", ")} are combined in ascending order.`:"Each recursive call handles a smaller range; a range of one element is the base case.";trace=[`split ${arr.join(", ")} → [${left.join(", ")}] and [${right.join(", ")}]`,`sort the halves recursively`,`merge → ${merged.join(", ")}`];
  }
  return make({mode:"searchsort",difficulty:d,family:name==="binarySearch"?({0:"binary-boundary",2:"duplicate-search",4:"recursive-step",6:"missing-target"}[type]):["merge-base","merge-split","merge-call-tree","merge-results","merge-order","merge-state","recursive-depth","merge-return-state"][type],code,prompt,answer,wrong,explanation,trace,r,data:{callDepth:reportedDepth,callCount:reportedCalls,array:arr,target,algorithm:name,operation:type}});
}

const generators={base:genBase,returns:genReturns,output:genOutput,arrays:genArrays,debug:genDebug,searchsort:genSearchSort};
/** Legacy generators only (kept for regression tests and as a fallback). */
export function generateLegacyRecursion(mode="mixed", r=Math.random, difficulty="Intermediate") { if(mode==="mixed") mode=pick(modes,r); if(!generators[mode]) throw Error(`Unknown recursion mode: ${mode}`); if(!cfg[difficulty]) difficulty="Intermediate"; const q=generators[mode](difficulty,r); q.generator="legacy"; if(mode==="debug") q.displayFamily="find the bug"; return q; }
/** Mixed legacy + compositional generation. `options.exclude(family)` lets callers skip a just-used family. */
export function generateRecursion(mode="mixed", r=Math.random, difficulty="Intermediate", options={}) {
  if(mode==="mixed") mode=pick(modes,r); if(!generators[mode]) throw Error(`Unknown recursion mode: ${mode}`); if(!cfg[difficulty]) difficulty="Intermediate";
  let entries=entriesFor(mode,difficulty); if(options.exclude){const kept=entries.filter(e=>!options.exclude(e.id));if(kept.length)entries=kept;}
  const total=entries.reduce((a,e)=>a+e.weight,0); let x=r()*total, entry=entries[entries.length-1];
  for(const e of entries){if((x-=e.weight)<0){entry=e;break;}}
  if(entry.family){const q=composeQuestion(entry.family,difficulty,r); if(q) return q;}
  return generateLegacyRecursion(mode,r,difficulty);
}
const normalizeShape=q=>{let c=q.code.split("\n").filter(l=>!/^\s*\/\//.test(l)).join(" ");for(const m of [...q.code.matchAll(/static\s+[\w\[\]]+\s+(\w+)\s*\(/g)].map(x=>x[1]))c=c.replace(new RegExp(`\\b${m}\\b`,"g"),"M");return c.replace(/"(?:[^"\\]|\\.)*"/g,"S").replace(/\b\d+\b/g,"#").replace(/\s+/g," ")+"|"+q.prompt.replace(/"(?:[^"\\]|\\.)*"/g,"S").replace(/-?\b\d+\b/g,"#").replace(/\b[a-z]\w*\(/g,"M(");};
export function assessRecursion(q,response){return String(response?.answer??response)===String(q.answer)}
export function createRecursionGenerator(seed=Date.now()) {
  const root=Number(seed)>>>0, r=seededRandom(root), recentExact=[], recentShape=[], recentFamily=[], queue=[...modes];
  let sequence=0;
  function nextChallenge(requested="mixed", difficulty="Intermediate") {
    let mode=requested;
    if(mode==="mixed"){mode=queue.shift();queue.push(mode)}
    let q;
    const lastFamily=recentFamily.filter(x=>x.startsWith(mode+"|")).at(-1);
    for(let attempt=0;attempt<80;attempt++){
      q=generateRecursion(mode,r,difficulty,{exclude:id=>attempt<40&&lastFamily===`${mode}|${id}`});q.seed=(root+sequence++)>>>0;q.data.seed=q.seed;
      // Exact repeat = same code, prompt and SET of choices (a reshuffled copy is still a repeat).
      q.signature=`${q.mode}|${q.difficulty}|${q.family}|${q.code}|${q.prompt}|${q.answer}|${[...q.choices].sort().join("~")}`;
      const shape=`${q.mode}|${q.difficulty}|${normalizeShape(q)}`;
      const window=attempt<60?12:3;
      if(!recentExact.includes(q.signature)&&!recentShape.slice(-window).includes(shape)){q.structuralSignature=shape;break}
      q.structuralSignature=shape;
    }
    recentExact.push(q.signature);recentShape.push(q.structuralSignature);recentFamily.push(`${mode}|${q.generator==="legacy"?"legacy":q.composer}`);
    if(recentExact.length>200)recentExact.shift();if(recentShape.length>100)recentShape.shift();if(recentFamily.length>50)recentFamily.shift();
    return q;
  }
  return { next:nextChallenge, nextChallenge, generate:nextChallenge, createHistory(){return{exact:[...recentExact],structural:[...recentShape]}}, exportQuestion(q){return structuredClone(q)}, get recent(){return[...recentExact]} };
}
export function createHistory(){return{exact:new Set(),structural:new Set()}}
export function recursionMetrics(q){return{depth:q.callDepth,calls:q.callCount,family:q.family,signature:q.structuralSignature||q.signature}}
export function simulateBinarySearch(values, target) {
  if (!Array.isArray(values) || values.some((v,i)=>i && values[i-1]>v)) throw new TypeError("Binary search requires a sorted array");
  const trace=[];
  function search(low,high,depth=1){
    if(trace.length>=500)throw new Error("Recursive execution limit exceeded");
    if(low>high){trace.push({low,high,depth,result:-1,base:true});return -1;}
    const mid=Math.floor((low+high)/2), value=values[mid];trace.push({low,high,mid,value,depth});
    if(value===target)return mid;
    return value>target?search(low,mid-1,depth+1):search(mid+1,high,depth+1);
  }
  const result=search(0,values.length-1);
  return {result,calls:trace.length,maxDepth:Math.max(0,...trace.map(x=>x.depth)),trace};
}
export function simulateMergeSort(values) {
  const a=[...values], trace=[];let calls=0,maxDepth=0;
  function sort(low,high,depth=1){
    if(++calls>1000)throw new Error("Recursive execution limit exceeded");maxDepth=Math.max(maxDepth,depth);
    trace.push({event:"call",low,high,depth,state:[...a]});
    if(low>=high){trace.push({event:"base",low,high,depth,state:[...a]});return;}
    const mid=Math.floor((low+high)/2);sort(low,mid,depth+1);sort(mid+1,high,depth+1);
    const merged=[];let i=low,j=mid+1;
    while(i<=mid&&j<=high)merged.push(a[i]<=a[j]?a[i++]:a[j++]);
    while(i<=mid)merged.push(a[i++]);while(j<=high)merged.push(a[j++]);
    for(let k=0;k<merged.length;k++)a[low+k]=merged[k];
    trace.push({event:"merge",low,mid,high,depth,values:[...merged],state:[...a]});
  }
  if(a.length)sort(0,a.length-1);
  return {result:a,calls,maxDepth,trace};
}
export const recursionGame={name:"Recursion Lab",icon:"↻",concepts:"Base Cases · Call Stack · Returns · Strings · Arrays · Search & Sort",description:"Trace recursive Java methods, return values, output, and call-stack behavior.",modes:modeNames};
