/* LinkedList Lab engine: visual node references plus Java LinkedList reasoning. */
export const MODES = {
  mixed: "Mixed Practice",
  link: "Link the Nodes",
  mutate: "Insert & Remove",
  trace: "Traversal Tracker",
  collections: "Java Collections & Decisions",
};
export const linkedListGame = {
  name: "LinkedList Lab",
  icon: "🔗",
  concepts: "Nodes · references · LinkedList API",
  description: "Connect, trace, and modify linked structures, then reason about Java LinkedList operations and data-structure choices.",
};
export const GAME = linkedListGame;
export function makeRng(seed = Date.now()) {
  let s = (Number(seed) >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = (a, rng) => a[Math.floor(rng() * a.length)];
function shuffle(a, rng) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
const uniq = (a) => [...new Set(a.map(String))];
const V = [3, 7, 12, 18, 24, 31, 42, 55, 68, 81];
function values(rng, min = 3, max = 5) {
  const n = min + Math.floor(rng() * (max - min + 1));
  return shuffle(V, rng).slice(0, n);
}
function chain(nodes, head, next) {
  const out = [];
  const seen = new Set();
  let id = head;
  while (id && !seen.has(id)) {
    seen.add(id);
    const node = nodes.find((n) => n.id === id);
    if (!node) return { values: out, valid: false, reason: "A reference points to a missing node." };
    out.push(node.value);
    id = next[id] ?? null;
  }
  return { values: out, valid: !id, reason: id ? "The references form a cycle." : "" };
}
function choices(correct, distractors, rng) {
  const out = uniq([correct, ...distractors]);
  const n = Number(correct);
  if (out.length < 4 && Number.isFinite(n)) {
    for (let d = 1; out.length < 4; d++) {
      for (const candidate of [String(n + d), String(n - d)]) {
        if (!out.includes(candidate)) out.push(candidate);
        if (out.length === 4) break;
      }
    }
  }
  if (out.length < 4) for (const candidate of ["true", "false", "null", "unknown"]) {
    if (!out.includes(candidate)) out.push(candidate);
    if (out.length === 4) break;
  }
  return shuffle(out.slice(0, 4), rng);
}
function linkChallenge(rng) {
  const target = values(rng, 3, 5);
  const nodes = shuffle(target.map((value, i) => ({ id: "n" + i, value })), rng);
  const correct = {};
  for (let i = 0; i < target.length; i++) correct["n" + i] = i + 1 < target.length ? "n" + (i + 1) : null;
  const wrong = {};
  nodes.forEach((n, i) => { wrong[n.id] = i + 1 < nodes.length ? nodes[i + 1].id : null; });
  const head = pick(nodes, rng).id;
  return {
    kind: "links", mode: "link", family: "connect",
    nodes, head, next: wrong, answer: { head: "n0", next: correct },
    prompt: "Connect the references so the chain reads " + target.join(" → ") + " → null.",
    explanation: "The head must point to " + target[0] + ". Each node's next reference points to the following value, and the final node points to null.",
  };
}
const mutateTemplates = [
  {op:"insert-head", make:(a,x)=>[x,...a], text:(x)=>"Insert " + x + " at the beginning."},
  {op:"insert-middle", make:(a,x)=>{const i=Math.max(1,Math.floor(a.length/2)); return [...a.slice(0,i),x,...a.slice(i)];}, text:(x)=>"Insert " + x + " between two existing nodes."},
  {op:"append", make:(a,x)=>[...a,x], text:(x)=>"Append " + x + " after the current tail."},
  {op:"remove-head", make:(a)=>a.slice(1), text:()=> "Remove the head node."},
  {op:"remove-middle", make:(a)=>{const i=Math.floor(a.length/2); return [...a.slice(0,i),...a.slice(i+1)];}, text:(x)=>"Remove the node containing " + x + "."},
  {op:"remove-tail", make:(a)=>a.slice(0,-1), text:()=> "Remove the final node."},
];
function mutateChallenge(rng) {
  const t = pick(mutateTemplates, rng);
  let start = values(rng, 3, 4);
  if (t.op.startsWith("remove") && start.length < 3) start = [4, 9, 15];
  const removed = t.op === "remove-middle" ? start[Math.floor(start.length / 2)] : null;
  const added = t.op.startsWith("insert") || t.op === "append" ? pick(V.filter(x => !start.includes(x)), rng) : null;
  const goal = t.make(start, added);
  const allValues = [...new Set([...start, ...(added === null ? [] : [added])])];
  const nodes = allValues.map((value, i) => ({ id: "n" + i, value }));
  const idOf = (value) => nodes.find(n => n.value === value).id;
  const initialNext = {};
  start.forEach((value, i) => { initialNext[idOf(value)] = i + 1 < start.length ? idOf(start[i + 1]) : null; });
  nodes.forEach(n => { if (!(n.id in initialNext)) initialNext[n.id] = null; });
  const answerNext = {};
  goal.forEach((value, i) => { answerNext[idOf(value)] = i + 1 < goal.length ? idOf(goal[i + 1]) : null; });
  nodes.forEach(n => { if (!(n.id in answerNext)) answerNext[n.id] = null; });
  return {
    kind: "mutate-links", mode: "mutate", family: t.op, nodes, initial: start,
    head: idOf(start[0]), next: initialNext,
    answer: { head: idOf(goal[0]), next: answerNext },
    operation: t.text(added ?? removed),
    prompt: "Update the references to perform the operation. The resulting chain must be exact.",
    explanation: "Only next references change. The resulting chain is " + goal.join(" → ") + " → null."
  };
}
function traceChallenge(rng) {
  const a = values(rng, 4, 6);
  const variant = pick(["search","count","sum","contains","links"], rng);
  let code, answer, explanation, label;
  if (variant === "search") {
    const target = pick(a, rng), idx = a.indexOf(target);
    code = "Node current = head;\nwhile (current != null) {\n    if (current.value == " + target + ") break;\n    current = current.next;\n}";
    answer = String(idx); label = "Which index is found?";
    explanation = "Starting at the head, the loop follows next references until the first node with value " + target + " (index " + idx + ").";
  } else if (variant === "count") {
    const target = pick([a[0], a.at(-1), 7, 12], rng);
    const b = a.slice(); if (rng()<0.5) b.splice(Math.floor(rng()*b.length),0,target);
    const c = b.filter(x=>x===target).length;
    code = "int count = 0;\nNode current = head;\nwhile (current != null) {\n    if (current.value == " + target + ") count++;\n    current = current.next;\n}";
    answer = String(c); label = "What is the final value of count?";
    explanation = "The traversal visits every node and increments only when value equals " + target + ". It finds " + c + " matching node(s).";
    return traceWith(b, code, answer, label, explanation, rng);
  } else if (variant === "sum") {
    const total = a.reduce((s,x)=>s+x,0);
    code = "int total = 0;\nfor (Node current = head; current != null; current = current.next) {\n    total += current.value;\n}";
    answer = String(total); label = "What is the final value of total?";
    explanation = "Every node is visited once, so the values are added: " + a.join(" + ") + " = " + total + ".";
  } else if (variant === "contains") {
    const target = rng()<0.7 ? pick(a,rng) : pick(V.filter(x=>!a.includes(x)),rng);
    const yes = a.includes(target);
    code = "boolean found = false;\nNode current = head;\nwhile (current != null) {\n    if (current.value == " + target + ") found = true;\n    current = current.next;\n}";
    answer = String(yes); label = "What is the final value of found?";
    explanation = "The search checks each node's value against " + target + "; a match " + (yes ? "exists." : "does not exist.");
  } else {
    const links = a.length - 1;
    code = "int links = 0;\nNode current = head;\nwhile (current.next != null) {\n    links++;\n    current = current.next;\n}";
    answer = String(links); label = "How many links are followed before reaching the tail?";
    explanation = "A chain of " + a.length + " nodes has " + links + " next references between the head and tail.";
  }
  const opts = choices(answer, [String(Number(answer)+1),String(Math.max(0,Number(answer)-1)),String(a.length)], rng);
  return {kind:"trace",mode:"trace",family:variant,values:a,code,label,choices:opts,answer:opts.indexOf(answer),prompt:"Trace the references from head until current becomes null.",explanation};
}
function traceWith(a, code, answer, label, explanation, rng) {
  const opts=choices(answer,[String(Number(answer)+1),String(Math.max(0,Number(answer)-1)),String(a.length)],rng);
  return {kind:"trace",mode:"trace",family:"count",values:a,code,label,choices:opts,answer:opts.indexOf(answer),prompt:"Trace the references from head until current becomes null.",explanation};
}
const collectionTemplates = [
  {q:"Which call adds 6 to the front of list?", code:"LinkedList<Integer> list = new LinkedList<>(List.of(9, 15));", choices:["list.addFirst(6);","list.add(6);","list.set(0, 6);","list.addLast(6);"], answer:0, why:"addFirst changes the head; add appends, set replaces, and addLast changes the tail."},
  {q:"After the code runs, what is list?", code:"LinkedList<Integer> list = new LinkedList<>(List.of(4, 9));\nlist.add(1, 7);", choices:["[4, 7, 9]","[7, 4, 9]","[4, 9, 7]","[4, 7]"], answer:0, why:"add(index, value) inserts and shifts later elements right."},
  {q:"Which method replaces the value at index 1 without changing the size?", code:"LinkedList<String> list = new LinkedList<>(List.of(\"A\", \"B\", \"C\"));", choices:["list.set(1, \"X\");","list.add(1, \"X\");","list.remove(1);","list.get(1);"], answer:0, why:"set replaces an existing element; add grows the list, remove shrinks it, and get only reads."},
  {q:"After the code runs, what is list?", code:"LinkedList<Integer> list = new LinkedList<>(List.of(5, 8, 12));\nlist.removeFirst();\nlist.addLast(20);", choices:["[8, 12, 20]","[5, 8, 12, 20]","[8, 12]","[20, 8, 12]"], answer:0, why:"removeFirst removes 5, then addLast appends 20."},
  {q:"Which structure is the best fit when you repeatedly add and remove at the front and do not need indexed access?", code:"Operations: addFirst, removeFirst, inspect the head.", choices:["LinkedList","ArrayList","array","All are identical for this task"], answer:0, why:"LinkedList exposes front operations directly; indexed access is not needed."},
  {q:"Which statement about indexed access is accurate?", code:"LinkedList<Integer> list = ...;\nint x = list.get(40);", choices:["The list must follow links to reach index 40.","get(40) is always constant time.","LinkedList cannot store integers.","get always removes the node."], answer:0, why:"A linked list reaches a numeric index by traversing from an end; it is not constant-time like an array."},
  {q:"Which collection is the clearest fit for a fixed number of values and frequent direct index access?", code:"Need: fixed size, values[0], values[1], ... with no insertions.", choices:["array","LinkedList","ArrayList","Any choice is equally direct"], answer:0, why:"An array directly represents fixed-size indexed storage."},
  {q:"What does list.isEmpty() return for a new LinkedList?", code:"LinkedList<String> list = new LinkedList<>();", choices:["true","false","null","It throws before returning"], answer:0, why:"A newly constructed LinkedList contains no nodes, so isEmpty() returns true."},
];
function collectionChallenge(rng) {
  const t=pick(collectionTemplates,rng), order=shuffle(t.choices.map((text,i)=>({text,correct:i===t.answer})),rng);
  return {kind:"choice",mode:"collections",family:t.q,code:t.code,question:t.q,choices:order.map(x=>x.text),answer:order.findIndex(x=>x.correct),prompt:"Use Java's actual LinkedList API and data-structure behavior.",explanation:t.why};
}
export function generate(mode="mixed", rng=Math.random) {
  const m=mode==="mixed" ? pick(["link","mutate","trace","collections"],rng) : mode;
  if(m==="link") return linkChallenge(rng);
  if(m==="mutate") return mutateChallenge(rng);
  if(m==="trace") return traceChallenge(rng);
  if(m==="collections") return collectionChallenge(rng);
  throw new Error("Unknown mode "+mode);
}
export function assess(ch, response) {
  if(ch.kind==="links" || ch.kind==="mutate-links") {
    const actual=chain(ch.nodes,response.head,response.next);
    const goal=chain(ch.nodes,ch.answer.head,ch.answer.next);
    return actual.valid && JSON.stringify(actual.values)===JSON.stringify(goal.values);
  }
  if(ch.kind==="structure") return Number(response)===ch.answer;
  return Number(response)===ch.answer;
}
export function solution(ch) {
  if(ch.kind==="links" || ch.kind==="mutate-links") return ch.answer;
  return ch.answer;
}
