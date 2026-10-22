/* Explanations derived from the simulated execution: a step list (one entry per main statement
 * that changes state or prints) and an object-state diagram of the final heap. */
import { expr } from "./emit.js";
import { jdouble } from "./emit.js";

const show = (v) => {
  if (!v) return "?";
  switch (v.k) { case "i": return String(v.v); case "d": return jdouble(v.v); case "b": return String(v.v); case "s": return JSON.stringify(v.v); case "c": return v.v === "\u0000" ? "'\\u0000'" : `'${v.v}'`; case "n": return "null"; case "r": return "Object #" + v.id; case "unassigned": return "(unassigned)"; }
  return "?";
};
function stmtText(s) {
  switch (s.k) {
    case "decl": return `${s.t} ${s.n}${s.e ? " = " + expr(s.e) : ""};`;
    case "asg": return `${expr(s.tg)} ${s.op} ${expr(s.e)};`;
    case "inc": return `${expr(s.tg)}${s.op};`;
    case "ex": return `${expr(s.e)};`;
    case "print": return `System.out.println(${expr(s.e)});`;
    default: return s.k;
  }
}

export function traceSteps(program, sim, { hiddenFrom = Infinity } = {}) {
  const steps = [];
  let prev = sim.trace.initial || { vars: {}, objs: {}, st: {} };
  const outLines = [...sim.out];
  let outIdx = 0;
  sim.trace.stmtStates.forEach((cur, i) => {
    if (i >= hiddenFrom) return;
    const s = program.main[i];
    const parts = [];
    for (const id of Object.keys(cur.objs)) if (!prev.objs[id]) {
      const o = cur.objs[id];
      parts.push(`creates Object #${id} (${o.cls}${fieldsText(o.f)})`);
    }
    for (const [v, val] of Object.entries(cur.vars)) {
      const before = prev.vars[v];
      if (!before || JSON.stringify(before) !== JSON.stringify(val)) {
        if (val.k === "r") {
          const sharers = Object.entries(cur.vars).filter(([k, x]) => k !== v && x.k === "r" && x.id === val.id).map(([k]) => k);
          parts.push(`${v} refers to Object #${val.id}${sharers.length ? ` (the same object as ${sharers.join(" and ")})` : ""}`);
        } else if (val.k === "n") parts.push(`${v} is now null`);
        else if (val.k !== "unassigned") parts.push(`${v} = ${show(val)}`);
        else parts.push(`${v} is declared but refers to no object`);
      }
    }
    for (const id of Object.keys(cur.objs)) if (prev.objs[id]) {
      for (const [f, val] of Object.entries(cur.objs[id].f)) {
        const b = prev.objs[id].f[f];
        if (JSON.stringify(b) !== JSON.stringify(val)) parts.push(`Object #${id}.${f}: ${show(b)} → ${show(val)}`);
      }
    }
    for (const c of Object.keys(cur.st)) for (const [f, val] of Object.entries(cur.st[c])) {
      const b = prev.st[c]?.[f];
      if (JSON.stringify(b) !== JSON.stringify(val)) parts.push(`static ${c}.${f}: ${show(b)} → ${show(val)}`);
    }
    if (s.k === "print") { parts.push(`prints ${JSON.stringify(outLines[outIdx++] ?? "")}`); }
    if (!parts.length && s.k === "ex") parts.push("no stored value changes");
    steps.push({ code: stmtText(s), effect: parts.join("; ") });
    prev = cur;
  });
  if (sim.exc) steps.push({ code: stmtText(program.main[sim.trace.stmtStates.length]), effect: `throws a ${sim.exc}` });
  return steps;
}
const fieldsText = (f) => { const e = Object.entries(f); return e.length ? ": " + e.map(([k, v]) => `${k} = ${show(v)}`).join(", ") : ""; };

/* Final object-state diagram (shown only after the scored submission). */
export function objectCards(program, sim) {
  const last = sim.trace.stmtStates[sim.trace.stmtStates.length - 1];
  if (!last) return { objects: [], statics: [], text: "" };
  const holders = {};
  for (const [v, val] of Object.entries(last.vars)) if (val.k === "r") (holders[val.id] ||= []).push(v);
  const objects = Object.entries(last.objs).map(([id, o]) => ({
    id: +id, cls: o.cls, fields: Object.fromEntries(Object.entries(o.f).map(([k, v]) => [k, show(v)])), refs: holders[id] || [],
  }));
  const statics = [];
  for (const [c, fs] of Object.entries(last.st)) for (const [f, v] of Object.entries(fs)) statics.push({ cls: c, field: f, value: show(v) });
  const nulls = Object.entries(last.vars).filter(([, v]) => v.k === "n").map(([k]) => k);
  const prims = Object.entries(last.vars).filter(([, v]) => !["r", "n", "unassigned"].includes(v.k)).map(([k, v]) => ({ name: k, value: show(v) }));
  const text = [
    ...objects.map((o) => `Object #${o.id} (${o.cls}) ${Object.entries(o.fields).map(([k, v]) => `${k} = ${v}`).join(", ")}; ${o.refs.length ? "referenced by " + o.refs.join(", ") : "no variable refers to it"}.`),
    ...statics.map((s) => `Static ${s.cls}.${s.field} = ${s.value} (one value shared by the class).`),
    ...(nulls.length ? [`${nulls.join(", ")} ${nulls.length > 1 ? "are" : "is"} null.`] : []),
    ...prims.map((p) => `${p.name} = ${p.value}.`),
  ].join(" ");
  return { objects, statics, nulls, prims, text };
}
