// Turns each challenge's `verify` records into standalone Java programs for the
// real-JVM oracle (JavaOracle.java), and judges the JVM's results.
//
// Independence: expectations come from the challenge; the JVM computes the
// actual behaviour itself. Random ranges are checked by evaluating the
// expression in Java at every breakpoint j/d (d ≤ 200) plus 0.0 and the largest
// double below 1.0, with Math.random() replaced by a supplied value.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as P from "../java-program.js";

const wrapClass = (id, body, extra = "") => `public class C_${id} {\n${extra}  public static void main(String[] args) {\n${body}\n  }\n}\n`;

const SAMPLER = `  static double R;
  static double rnd() { return R; }
  static double[] samples() {
    java.util.ArrayList<Double> list = new java.util.ArrayList<>();
    list.add(0.0); list.add(Math.nextDown(1.0));
    for (int d = 1; d <= 200; d++) for (int j = 0; j <= d; j++) {
      double v = j / (double) d;
      for (double w : new double[] { v, Math.nextDown(v), Math.nextUp(v) }) if (w >= 0.0 && w < 1.0) list.add(w);
    }
    java.util.Random random = new java.util.Random(12345);
    for (int i = 0; i < 2000; i++) list.add(random.nextDouble());
    double[] out = new double[list.size()];
    for (int i = 0; i < out.length; i++) out[i] = list.get(i);
    return out;
  }
`;

/** Java text for an int expression in which every + - * and unary - throws on overflow. */
function exactExpr(e) {
  switch (e.k) {
    case "lit": return P.renderExpr(e);
    case "const": case "var": return e.name;
    case "group": return exactExpr(e.e);
    case "neg": return `Math.negateExact(${exactExpr(e.e)})`;
    case "bin": {
      const fn = { "+": "addExact", "-": "subtractExact", "*": "multiplyExact" }[e.op];
      if (fn) return `Math.${fn}(${exactExpr(e.l)}, ${exactExpr(e.r)})`;
      return `(${exactExpr(e.l)} ${e.op} ${exactExpr(e.r)})`;
    }
  }
  throw new Error("exactExpr " + e.k);
}
function exactStmt(s) {
  if (s.k === "decl") return `${s.t} ${s.name} = ${exactExpr(s.e)};`;
  if (s.k === "assign") {
    if (s.op === "=") return `${s.name} = ${exactExpr(s.e)};`;
    const fn = { "+=": "addExact", "-=": "subtractExact", "*=": "multiplyExact" }[s.op];
    if (fn) return `${s.name} = Math.${fn}(${s.name}, ${exactExpr(s.e)});`;
    return `${s.name} ${s.op} ${exactExpr(s.e)};`;
  }
  return P.renderCode([s]);
}

export function buildJavaChecks(challenges, dir) {
  const checks = [], written = new Map();
  const add = (q, type, source, judge) => {
    const hash = crypto.createHash("sha1").update(source).digest("hex").slice(0, 16);
    if (!written.has(hash)) {
      fs.writeFileSync(path.join(dir, `${hash}.java`), source.replace(/__ID__/g, hash));
      written.set(hash, true);
    }
    checks.push({ id: hash, type, challenge: q.id, family: q.family, mode: q.mode, difficulty: q.difficulty, judge });
  };
  for (const q of challenges) {
    for (const v of q.verify) {
      if (v.type === "program") {
        const body = P.renderCode(v.program, { depth: 2 });
        const expectedOut = v.expect.compileError ? null : v.expect.out.map(l => l + "\n").join("");
        add(q, v.expect.compileError ? "compile-error" : v.expect.exception ? "exception" : "output", wrapClass("__ID__", body), r => {
          if (v.expect.compileError) return r.status === "COMPILE_ERROR" ? null : `expected compile error, got ${r.status}`;
          if (r.status === "COMPILE_ERROR") return `unexpected compile error: ${r.error}`;
          if (r.stdout !== expectedOut) return `stdout ${JSON.stringify(r.stdout)} != ${JSON.stringify(expectedOut)}`;
          if ((v.expect.exception || null) !== r.exception) return `exception ${r.exception} != ${v.expect.exception}`;
          // For "What is printed?" questions, the JVM's outcome must equal the key and no distractor.
          if (q.questionType === "output" && v.program === q.program) {
            const lines = r.stdout ? r.stdout.replace(/\n$/, "").split("\n") : [];
            if (r.exception) lines.push(lines.length ? `then throws ${r.exception}` : `Throws ${r.exception}`);
            const actual = lines.join("\n");
            const matches = q.choices.filter(c => c === actual);
            if (matches.length !== 1 || matches[0] !== q.answer) return `JVM outcome ${JSON.stringify(actual)} matches ${matches.length} choices`;
          }
          return null;
        });
      } else if (v.type === "randomInts" || v.type === "randomDouble") {
        const env = Object.entries(v.env || {}).map(([name, e]) => `    int ${name} = ${P.renderExpr(e)};`).join("\n");
        const expr = P.renderExpr(v.expr, { randomName: "rnd" });
        const body = v.type === "randomInts"
          ? `${env}\n    java.util.TreeSet<Integer> set = new java.util.TreeSet<>();\n    for (double s : samples()) { R = s; int value = ${expr}; set.add(value); }\n    StringBuilder sb = new StringBuilder();\n    for (int x : set) { if (sb.length() > 0) sb.append(','); sb.append(x); }\n    System.out.println(sb);`
          : `${env}\n    double min = Double.MAX_VALUE, max = -Double.MAX_VALUE;\n    for (double s : samples()) { R = s; double value = ${expr}; min = Math.min(min, value); max = Math.max(max, value); }\n    System.out.println(min + " " + max);`;
        add(q, v.type, wrapClass("__ID__", body, SAMPLER), r => {
          if (r.status !== "OK") return `status ${r.status} ${r.error || r.exception || ""}`;
          if (v.type === "randomInts") {
            const got = r.stdout.trim();
            return got === v.expect.join(",") ? null : `set ${got} != ${v.expect.join(",")}`;
          }
          const [min, max] = r.stdout.trim().split(" ").map(Number);
          if (min !== v.expect.lo) return `min ${min} != ${v.expect.lo}`;
          if (!(max < v.expect.hi && max > v.expect.hi - 1e-6 * Math.max(1, Math.abs(v.expect.hi)))) return `max ${max} vs exclusive ${v.expect.hi}`;
          return null;
        });
      } else if (v.type === "overflows") {
        const body = `    try { int value = ${exactExpr(v.expr)}; System.out.println("fits " + value); }\n    catch (ArithmeticException e) { System.out.println("overflow"); }\n    int plain = ${P.renderExpr(v.expr)};\n    System.out.println(plain);`;
        add(q, "overflow-detect", wrapClass("__ID__", body), r => {
          if (r.status !== "OK") return `status ${r.status}`;
          const first = r.stdout.split("\n")[0];
          return (first === "overflow") === v.expect ? null : `JVM says ${first}, expected overflow=${v.expect}`;
        });
      } else if (v.type === "firstProblem") {
        const overflow = v.exceptionKind === "overflow";
        const body = v.program.map((s, i) => `    System.out.println("@${i}");\n    ${overflow ? exactStmt(s) : P.renderCode([s])}`).join("\n");
        add(q, "first-problem", wrapClass("__ID__", body), r => {
          if (r.status !== "EXCEPTION" || r.exception !== "ArithmeticException") return `expected ArithmeticException, got ${r.status} ${r.exception}`;
          const markers = r.stdout.split("\n").filter(l => l.startsWith("@"));
          const last = Number(markers.at(-1).slice(1));
          return last === v.expectStatement ? null : `JVM failed at statement ${last}, expected ${v.expectStatement}`;
        });
      } else throw new Error("unknown verify type " + v.type);
    }
  }
  return checks;
}
