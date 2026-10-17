/* Robot Algorithms engine: a deterministic interpreter for a small, legal
   subset of Java plus verified challenge generators. No DOM access and no
   dynamic code evaluation: programs are tokenized, parsed, and interpreted.
   Coordinates: (row 0, col 0) is the top-left cell; rows grow downward and
   columns grow to the right. Directions (as students see them on screen):
   0 Up, 1 Right, 2 Down, 3 Left. */

export const DIRS = ["Up", "Right", "Down", "Left"];
export const DR = [-1, 0, 1, 0];
export const DC = [0, 1, 0, -1];
export const LIMITS = { steps: 2000, callDepth: 25, maxNumber: 1000 };
export const MODES = {
  predict: "Predict the Robot",
  loops: "Loop Navigator",
  build: "Build the Route",
  conditionals: "Conditional Robot",
  debug: "Debug the Robot",
  methods: "Methods and Reuse",
};
/* Hub-card metadata, registered in ../app.js the same way as Math Lab. */
export const robotGame = {
  name: "Robot Algorithms",
  icon: "▲",
  description: "Predict, build, and debug Java programs that steer a robot across a grid.",
  concepts: "Sequencing · Loops · Conditionals · Methods",
  modes: MODES,
};
const ROBOT_ACTIONS = ["move", "turnLeft", "turnRight"];
export const ENTRY = "run";
const ROBOT_SENSORS = ["canMove", "atGoal"];
const KEYWORDS = new Set(["for", "while", "if", "else", "int", "void", "true", "false"]);

export class RobotError extends Error {
  constructor(kind, message, line) {
    super(message);
    this.kind = kind; // syntax | crash | limit | runtime
    this.line = line;
  }
}

/* ------------------------------------------------------------------ */
/* Lexer                                                               */
/* ------------------------------------------------------------------ */
export function lex(src) {
  const toks = [];
  let i = 0,
    line = 1;
  const two = ["++", "--", "+=", "-=", "==", "!=", "<=", ">=", "&&", "||"];
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n") {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (src.startsWith("//", i)) {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) throw new RobotError("syntax", "Comment is never closed with */", line);
      for (let k = i; k < end; k++) if (src[k] === "\n") line++;
      i = end + 2;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const w = src.slice(i, j);
      toks.push({ t: KEYWORDS.has(w) ? "kw" : "id", v: w, line });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      const n = Number(src.slice(i, j));
      if (n > LIMITS.maxNumber) throw new RobotError("syntax", `Number ${n} is larger than this robot supports`, line);
      toks.push({ t: "num", v: n, line });
      i = j;
      continue;
    }
    const pair = src.slice(i, i + 2);
    if (two.includes(pair)) {
      toks.push({ t: "op", v: pair, line });
      i += 2;
      continue;
    }
    if (ch === "&" || ch === "|")
      throw new RobotError("syntax", `Use ${ch}${ch} for a Java Boolean operator`, line);
    if ("{}();.,<>!=+-*/%".includes(ch)) {
      toks.push({ t: "op", v: ch, line });
      i++;
      continue;
    }
    throw new RobotError("syntax", `Unexpected character '${ch}'`, line);
  }
  toks.push({ t: "eof", v: "", line });
  return toks;
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */
export function parse(src) {
  const toks = lex(src);
  let p = 0;
  const peek = (o = 0) => toks[Math.min(p + o, toks.length - 1)];
  const next = () => toks[p++];
  const is = (v) => peek().t !== "num" && peek().t !== "eof" && peek().v === v;
  const err = (m, t = peek()) =>
    new RobotError("syntax", m + (t.t === "eof" ? " at the end of the program" : ` near '${t.v}'`), t.line);
  const expect = (v) => {
    if (!is(v)) throw err(`Expected '${v}'`);
    return next();
  };
  const methods = {};
  const order = [];
  const body = [];
  function ident() {
    const t = next();
    if (t.t !== "id") throw err("Expected a name", t);
    return t.v;
  }
  function method() {
    const line = next().line;
    const name = ident();
    if (name === "robot") throw err("'robot' is reserved");
    if (methods[name]) throw new RobotError("syntax", `Method ${name}() is declared twice`, line);
    expect("(");
    const params = [];
    if (!is(")")) {
      for (;;) {
        expect("int");
        params.push(ident());
        if (!is(",")) break;
        next();
      }
    }
    expect(")");
    const b = block();
    methods[name] = { name, params, body: b.body, line, endLine: b.endLine };
    order.push(name);
  }
  function block() {
    const line = expect("{").line;
    const b = [];
    while (!is("}")) {
      if (peek().t === "eof") throw err("Missing '}'");
      if (is("void")) throw err("Methods must be declared outside other code");
      b.push(statement());
    }
    const endLine = next().line;
    return { t: "block", body: b, line, endLine };
  }
  function update() {
    const tk = peek();
    const name = ident();
    const op = next();
    if (op.v === "++" || op.v === "--") return { t: "assign", name, op: op.v, line: tk.line };
    if (["=", "+=", "-="].includes(op.v)) return { t: "assign", name, op: op.v, expr: expr(), line: tk.line };
    throw err("Expected ++, --, =, += or -=", op);
  }
  function robotMember() {
    next();
    expect(".");
    const t = next();
    if (![...ROBOT_ACTIONS, ...ROBOT_SENSORS].includes(t.v)) throw err(`robot has no method ${t.v}()`, t);
    expect("(");
    expect(")");
    return t.v;
  }
  function statement() {
    const tk = peek();
    if (is("{")) return block();
    if (is("for")) {
      next();
      expect("(");
      expect("int");
      const v = ident();
      expect("=");
      const init = expr();
      expect(";");
      const cond = expr();
      expect(";");
      const upd = update();
      if (upd.name !== v) throw err("The for-loop update must change the loop variable");
      expect(")");
      return { t: "for", var: v, init, cond, update: upd, body: statement(), line: tk.line };
    }
    if (is("while")) {
      next();
      expect("(");
      const cond = expr();
      expect(")");
      return { t: "while", cond, body: statement(), line: tk.line };
    }
    if (is("if")) {
      next();
      expect("(");
      const cond = expr();
      expect(")");
      const then = statement();
      let other = null,
        elseLine = null;
      if (is("else")) {
        elseLine = next().line;
        other = statement();
      }
      return { t: "if", cond, then, else: other, line: tk.line, elseLine };
    }
    if (is("int")) {
      next();
      const name = ident();
      expect("=");
      const e = expr();
      expect(";");
      return { t: "decl", name, expr: e, line: tk.line };
    }
    if (tk.t === "id") {
      if (tk.v === "robot") {
        const name = robotMember();
        expect(";");
        return { t: "robot", name, line: tk.line };
      }
      if (peek(1).v === "(") {
        const name = ident();
        next();
        const args = [];
        if (!is(")")) {
          for (;;) {
            args.push(expr());
            if (!is(",")) break;
            next();
          }
        }
        expect(")");
        expect(";");
        return { t: "call", name, args, line: tk.line };
      }
      const s = update();
      expect(";");
      return s;
    }
    throw err("Unsupported statement");
  }
  const expr = () => or();
  function or() {
    let l = and();
    while (is("||")) {
      next();
      l = { t: "bin", op: "||", l, r: and() };
    }
    return l;
  }
  function and() {
    let l = eq();
    while (is("&&")) {
      next();
      l = { t: "bin", op: "&&", l, r: eq() };
    }
    return l;
  }
  function eq() {
    let l = rel();
    while (is("==") || is("!=")) l = { t: "bin", op: next().v, l, r: rel() };
    return l;
  }
  function rel() {
    let l = add();
    if (is("<") || is("<=") || is(">") || is(">=")) l = { t: "bin", op: next().v, l, r: add() };
    return l;
  }
  function add() {
    let l = mul();
    while (is("+") || is("-")) l = { t: "bin", op: next().v, l, r: mul() };
    return l;
  }
  function mul() {
    let l = unary();
    while (is("*") || is("/") || is("%")) l = { t: "bin", op: next().v, l, r: unary() };
    return l;
  }
  function unary() {
    if (is("!")) {
      next();
      return { t: "not", e: unary() };
    }
    if (is("-")) {
      next();
      return { t: "neg", e: unary() };
    }
    return primary();
  }
  function primary() {
    const tk = peek();
    if (tk.t === "num") return next(), { t: "num", v: tk.v };
    if (is("true") || is("false")) return next(), { t: "bool", v: tk.v === "true" };
    if (is("(")) {
      next();
      const e = expr();
      expect(")");
      return e;
    }
    if (tk.t === "id" && tk.v === "robot") {
      const name = robotMember();
      if (!ROBOT_SENSORS.includes(name)) throw new RobotError("syntax", `robot.${name}() does not return a value`, tk.line);
      return { t: "sensor", name, line: tk.line };
    }
    if (tk.t === "id") return next(), { t: "var", name: tk.v, line: tk.line };
    throw err("Expected a value or condition");
  }
  while (peek().t !== "eof") {
    if (is("void")) method();
    else body.push(statement());
  }
  return { methods, order, body };
}

/* ------------------------------------------------------------------ */
/* Interpreter                                                         */
/* ------------------------------------------------------------------ */
/* opts (normal runs use {}). The other options model specific student
   misconceptions so distractors are computed by simulation, not invented:
   swapTurns, absoluteTurns, ignoreWalls, unbounded, staleSensors, whileAsIf,
   flipIf (true | line), dropNot, andOrSwap, boundaryFlip, initZero,
   stepIgnore, bodyFirstOnly, methodOnce, defsExecute, skipBlocked,
   bothBranches, skipLines [lines], limit */
export function run(program, world, opts = {}) {
  const prog = typeof program === "string" ? parse(program) : program;
  const walls = new Set(world.walls || []);
  const st = { r: world.start.r, c: world.start.c, d: world.start.d };
  const init = { ...st };
  const snap = () => ({ r: st.r, c: st.c, d: st.d });
  const trace = [{ kind: "start", line: 0, state: snap() }];
  const stats = { moves: 0, turns: 0, steps: 0, branches: {}, loops: {}, calls: {} };
  const limit = opts.limit ?? LIMITS.steps;
  const skip = new Set(opts.skipLines || []);
  const called = new Set();
  let depth = 0,
    error = null;
  const tick = (line) => {
    if (++stats.steps > limit)
      throw new RobotError("limit", `Stopped after ${limit} steps: the program may contain an infinite loop.`, line);
  };
  const blockedFrom = (s) => {
    const r = s.r + DR[s.d],
      c = s.c + DC[s.d];
    if (!opts.unbounded && (r < 0 || c < 0 || r >= world.rows || c >= world.cols)) return "edge";
    if (!opts.ignoreWalls && walls.has(r + "," + c)) return "wall";
    return null;
  };
  const sense = (name) => {
    const s = opts.staleSensors ? init : st;
    if (name === "canMove") return !blockedFrom(s);
    return !!world.goal && s.r === world.goal.r && s.c === world.goal.c;
  };
  function robot(name, line) {
    tick(line);
    if (skip.has(line)) return;
    if (name === "move") {
      const b = blockedFrom(st);
      if (b && opts.skipBlocked) {
        trace.push({ kind: "bump", line, state: snap() });
        return;
      }
      if (b) {
        trace.push({ kind: "crash", line, state: snap(), reason: b });
        throw new RobotError(
          "crash",
          b === "edge" ? "move() would leave the grid." : "move() is blocked by an obstacle.",
          line,
        );
      }
      st.r += DR[st.d];
      st.c += DC[st.d];
      stats.moves++;
      trace.push({ kind: "move", line, state: snap() });
    } else if (name === "turnLeft" || name === "turnRight") {
      let n = name;
      if (opts.swapTurns) n = n === "turnLeft" ? "turnRight" : "turnLeft";
      if (opts.absoluteTurns) st.d = n === "turnLeft" ? 3 : 1;
      else st.d = (st.d + (n === "turnLeft" ? 3 : 1)) % 4;
      stats.turns++;
      trace.push({ kind: "turn", line, state: snap() });
    } else {
      const v = sense(name);
      trace.push({ kind: "check", line, state: snap(), value: v, text: `robot.${name}() is ${v}` });
    }
  }
  class Scope {
    constructor(parent) {
      this.parent = parent;
      this.vars = new Map();
    }
    find(name) {
      for (let s = this; s; s = s.parent) if (s.vars.has(name)) return s;
      return null;
    }
    declare(name, v, line) {
      if (this.find(name)) throw new RobotError("runtime", `Variable ${name} is already defined`, line);
      this.vars.set(name, v);
    }
    get(name, line) {
      const s = this.find(name);
      if (!s) throw new RobotError("runtime", `Variable ${name} is not defined`, line);
      return s.vars.get(name);
    }
    set(name, v, line) {
      const s = this.find(name);
      if (!s) throw new RobotError("runtime", `Variable ${name} is not defined`, line);
      s.vars.set(name, v);
    }
  }
  const FLIP = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };
  function ev(e, env, line, loopCond = false) {
    switch (e.t) {
      case "num":
        return e.v;
      case "bool":
        return e.v;
      case "var":
        return env.get(e.name, line);
      case "sensor": {
        tick(line);
        const v = sense(e.name);
        trace.push({ kind: "check", line, state: snap(), value: v, text: `robot.${e.name}() is ${v}` });
        return v;
      }
      case "not": {
        const v = ev(e.e, env, line, loopCond);
        if (typeof v !== "boolean") throw new RobotError("runtime", "! needs a boolean value", line);
        return opts.dropNot ? v : !v;
      }
      case "neg": {
        const v = ev(e.e, env, line, loopCond);
        if (typeof v !== "number") throw new RobotError("runtime", "- needs a number", line);
        return -v;
      }
      case "bin": {
        let op = e.op;
        if ((op === "&&" || op === "||") && opts.andOrSwap) op = op === "&&" ? "||" : "&&";
        if (op === "&&" || op === "||") {
          const l = ev(e.l, env, line, loopCond);
          if (typeof l !== "boolean") throw new RobotError("runtime", `${op} needs boolean values`, line);
          if (op === "&&" && !l) return false;
          if (op === "||" && l) return true;
          const r = ev(e.r, env, line, loopCond);
          if (typeof r !== "boolean") throw new RobotError("runtime", `${op} needs boolean values`, line);
          return r;
        }
        const l = ev(e.l, env, line, loopCond),
          r = ev(e.r, env, line, loopCond);
        if (op === "==" || op === "!=") {
          if (typeof l !== typeof r) throw new RobotError("runtime", "Cannot compare different types", line);
          return op === "==" ? l === r : l !== r;
        }
        if (typeof l !== "number" || typeof r !== "number")
          throw new RobotError("runtime", `${op} needs int values`, line);
        if (loopCond && opts.boundaryFlip && FLIP[op]) op = FLIP[op];
        switch (op) {
          case "+":
            return l + r;
          case "-":
            return l - r;
          case "*":
            return l * r;
          case "/":
          case "%":
            if (r === 0) throw new RobotError("runtime", "Division by zero", line);
            // Java int division truncates toward zero; % keeps the dividend's sign.
            return op === "/" ? Math.trunc(l / r) : l % r;
          case "<":
            return l < r;
          case "<=":
            return l <= r;
          case ">":
            return l > r;
          case ">=":
            return l >= r;
        }
      }
    }
    throw new RobotError("runtime", "Unsupported expression", line);
  }
  function cond(e, env, line, loopCond) {
    const v = ev(e, env, line, loopCond);
    if (typeof v !== "boolean") throw new RobotError("runtime", "A condition must be true or false", line);
    return v;
  }
  function assign(s, env) {
    const cur = env.get(s.name, s.line);
    if (typeof cur !== "number") throw new RobotError("runtime", `${s.name} is not an int`, s.line);
    let v;
    if (opts.stepIgnore && (s.op === "+=" || s.op === "-=")) v = s.op === "+=" ? cur + 1 : cur - 1;
    else if (s.op === "++") v = cur + 1;
    else if (s.op === "--") v = cur - 1;
    else {
      const x = ev(s.expr, env, s.line);
      if (typeof x !== "number") throw new RobotError("runtime", `${s.name} must hold an int`, s.line);
      v = s.op === "=" ? x : s.op === "+=" ? cur + x : cur - x;
    }
    env.set(s.name, v, s.line);
  }
  function execBody(list, env) {
    for (const s of list) exec(s, env);
  }
  function exec(s, env) {
    switch (s.t) {
      case "block":
        return execBody(s.body, new Scope(env));
      case "robot":
        return robot(s.name, s.line);
      case "decl": {
        tick(s.line);
        const v = ev(s.expr, env, s.line);
        if (typeof v !== "number") throw new RobotError("runtime", `${s.name} must hold an int`, s.line);
        env.declare(s.name, v, s.line);
        trace.push({ kind: "var", line: s.line, state: snap(), text: `${s.name} = ${v}` });
        return;
      }
      case "assign":
        tick(s.line);
        assign(s, env);
        trace.push({ kind: "var", line: s.line, state: snap(), text: `${s.name} = ${env.get(s.name)}` });
        return;
      case "call": {
        tick(s.line);
        const m = prog.methods[s.name];
        if (!m) throw new RobotError("runtime", `Method ${s.name}() is not defined`, s.line);
        if (m.params.length !== s.args.length)
          throw new RobotError("runtime", `${s.name}() needs ${m.params.length} argument(s)`, s.line);
        const args = s.args.map((a) => ev(a, env, s.line));
        if (args.some((a) => typeof a !== "number"))
          throw new RobotError("runtime", `${s.name}() needs int arguments`, s.line);
        stats.calls[s.name] = (stats.calls[s.name] || 0) + 1;
        trace.push({ kind: "call", line: s.line, state: snap(), text: `call ${s.name}(${args.join(", ")})` });
        if (opts.methodOnce && called.has(s.name) && s.name !== ENTRY) return;
        called.add(s.name);
        if (++depth > LIMITS.callDepth)
          throw new RobotError("limit", "Too many nested method calls (a method may be calling itself forever).", s.line);
        const scope = new Scope(null);
        m.params.forEach((p, i) => scope.declare(p, args[i], s.line));
        execBody(m.body, scope);
        depth--;
        trace.push({ kind: "return", line: m.endLine, state: snap(), text: `return from ${s.name}()` });
        return;
      }
      case "if": {
        tick(s.line);
        let c = cond(s.cond, env, s.line);
        if (opts.flipIf === true || opts.flipIf === s.line) c = !c;
        const b = (stats.branches[s.line] ||= { then: 0, else: 0 });
        b[c ? "then" : "else"]++;
        trace.push({ kind: "branch", line: c ? s.line : s.elseLine || s.line, state: snap(), value: c, text: c ? "condition is true: run the if-branch" : s.else ? "condition is false: run the else-branch" : "condition is false: skip the if-branch" });
        if (opts.bothBranches) {
          exec(s.then, env);
          if (s.else) exec(s.else, env);
        } else if (c) exec(s.then, env);
        else if (s.else) exec(s.else, env);
        return;
      }
      case "while": {
        let n = 0;
        for (;;) {
          tick(s.line);
          const c = cond(s.cond, env, s.line, true);
          trace.push({ kind: "loop", line: s.line, state: snap(), value: c, text: c ? "condition true: run the body" : "condition false: exit the loop" });
          if (!c) break;
          exec(s.body, env);
          n++;
          if (opts.whileAsIf) break;
        }
        stats.loops[s.line] = (stats.loops[s.line] || 0) + n;
        return;
      }
      case "for": {
        const scope = new Scope(env);
        tick(s.line);
        let start = ev(s.init, env, s.line);
        if (typeof start !== "number") throw new RobotError("runtime", "Loop variable must be an int", s.line);
        if (opts.initZero) start = 0;
        scope.declare(s.var, start, s.line);
        const parts =
          opts.bodyFirstOnly && s.body.t === "block" && s.body.body.length > 1
            ? [s.body.body.slice(0, 1), s.body.body.slice(1)]
            : null;
        let n = 0;
        for (;;) {
          tick(s.line);
          const c = cond(s.cond, scope, s.line, true);
          trace.push({ kind: "loop", line: s.line, state: snap(), value: c, text: `${s.var} = ${scope.get(s.var)}: condition ${c ? "true, run the body" : "false, exit the loop"}` });
          if (!c) break;
          if (parts) execBody(parts[0], new Scope(scope));
          else exec(s.body, scope);
          n++;
          tick(s.line);
          assign(s.update, scope);
        }
        if (parts && n > 0) execBody(parts[1], new Scope(scope));
        stats.loops[s.line] = (stats.loops[s.line] || 0) + n;
        return;
      }
    }
    throw new RobotError("runtime", "Unsupported statement", s.line);
  }
  try {
    const global = new Scope(null);
    if (opts.defsExecute)
      for (const name of prog.order)
        if (name !== ENTRY && !prog.methods[name].params.length) execBody(prog.methods[name].body, new Scope(null));
    execBody(prog.body, global);
    // A program made only of declarations starts by calling run(), the
    // entry method used for code shown inside the robot's class.
    if (!prog.body.length && prog.methods[ENTRY] && !prog.methods[ENTRY].params.length) {
      trace.push({ kind: "call", line: prog.methods[ENTRY].line, state: snap(), text: "run() starts the program" });
      execBody(prog.methods[ENTRY].body, new Scope(null));
    }
  } catch (e) {
    if (!(e instanceof RobotError)) throw e;
    error = { kind: e.kind, message: e.message, line: e.line };
    if (e.kind !== "crash") trace.push({ kind: "error", line: e.line, state: snap(), text: e.message });
  }
  const final = snap();
  trace.push({ kind: "end", line: 0, state: final });
  const atGoal = !!world.goal && final.r === world.goal.r && final.c === world.goal.c;
  return { final, error, trace, stats, atGoal };
}

/* Run a program from source safely: syntax errors become result errors. */
export function runSource(src, world, opts = {}) {
  try {
    return run(parse(src), world, opts);
  } catch (e) {
    if (!(e instanceof RobotError)) throw e;
    return {
      final: { ...world.start },
      error: { kind: e.kind, message: e.message, line: e.line },
      trace: [{ kind: "start", line: 0, state: { ...world.start } }, { kind: "error", line: e.line, state: { ...world.start }, text: e.message }],
      stats: { moves: 0, turns: 0, steps: 0, branches: {}, loops: {}, calls: {} },
      atGoal: false,
    };
  }
}

/* Requirement check shared by Debug and Build modes. */
export function meetsRequirement(res, world, req) {
  if (res.error) return false;
  if (!res.atGoal) return false;
  if (req.facing !== undefined && req.facing !== null && res.final.d !== req.facing) return false;
  return true;
}

/* Count statements (every statement, including loop headers and the
   statements inside loop bodies). Blocks themselves do not count. */
export function countStatements(prog) {
  const p = typeof prog === "string" ? parse(prog) : prog;
  const walk = (list) =>
    list.reduce((n, s) => {
      if (s.t === "block") return n + walk(s.body);
      if (s.t === "for" || s.t === "while") return n + 1 + walk(s.body.t === "block" ? s.body.body : [s.body]);
      if (s.t === "if") return n + 1 + walk([s.then]) + (s.else ? walk([s.else]) : 0);
      return n + 1;
    }, 0);
  return walk(p.body) + Object.values(p.methods).reduce((n, m) => n + walk(m.body), 0);
}

/* ------------------------------------------------------------------ */
/* Randomness and shared helpers                                       */
/* ------------------------------------------------------------------ */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function tools(rng) {
  const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const chance = (p) => rng() < p;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return { rng, int, pick, chance, shuffle };
}
const K = (r, c) => r + "," + c;
const inGrid = (w, r, c) => r >= 0 && c >= 0 && r < w.rows && c < w.cols;
export const LINE = { move: "robot.move();", turnLeft: "robot.turnLeft();", turnRight: "robot.turnRight();" };
const OPP = { turnLeft: "turnRight", turnRight: "turnLeft" };
const pad = (n) => "    ".repeat(n);
const ind = (lines, n = 1) => lines.map((l) => (l ? pad(n) + l : l));
const dirName = (d) => DIRS[d];
const cellText = (r, c) => `Row ${r}, Col ${c}`;
const stateText = (s) => `${cellText(s.r, s.c)}, facing ${dirName(s.d)}`;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* ------------------------------------------------------------------ */
/* Answer keys                                                         */
/* ------------------------------------------------------------------ */
export const ASK = {
  location: { question: "Where does the robot finish? Move the robot to that cell.", key: (res) => (res.error ? null : `L:${res.final.r},${res.final.c}`) },
  direction: { question: "Which way is the robot facing when the program ends? Turn the robot to match.", key: (res) => (res.error ? null : `D:${res.final.d}`) },
  state: { question: "Where does the robot finish, and which way does it face? Move and turn the robot to match.", key: (res) => (res.error ? null : `S:${res.final.r},${res.final.c},${res.final.d}`) },
  moves: { question: "How many times does robot.move() run?", key: (res) => (res.error ? null : `N:${res.stats.moves}`) },
  outcome: {
    question: "What happens when this program runs?",
    key: (res) => (res.error ? (res.error.kind === "crash" ? `E:${res.error.line}` : null) : `F:${res.final.r},${res.final.c}`),
  },
  elseCount: { question: "How many times does the else-branch run?", key: (res, a) => (res.error ? null : `N:${res.stats.branches[a.line]?.else || 0}`) },
};
export function keyFor(ask, res) {
  return ASK[ask.type].key(res, ask);
}
export function keyText(key) {
  const t = key[0],
    v = key.slice(2).split(",").map(Number);
  if (t === "L") return cellText(v[0], v[1]);
  if (t === "D") return dirName(v[0]);
  if (t === "S") return stateText({ r: v[0], c: v[1], d: v[2] });
  if (t === "N") return String(v[0]);
  if (t === "E") return `Movement error on line ${v[0]}`;
  if (t === "F") return `Finishes at ${cellText(v[0], v[1])}`;
  return key;
}
function plausible(key, world, allowWall) {
  const t = key[0],
    v = key.slice(2).split(",").map(Number);
  if (t === "L" || t === "S" || t === "F") {
    if (!inGrid(world, v[0], v[1])) return false;
    if (!allowWall && (world.walls || []).includes(K(v[0], v[1]))) return false;
  }
  if (t === "N" && (v[0] < 0 || v[0] > 60)) return false;
  if (t === "D" && (v[0] < 0 || v[0] > 3)) return false;
  return true;
}

/* Misconception library: each one is simulated, never hand-written. */
const WHY = {
  swapTurns: "This answer swaps left and right. turnLeft() is a quarter-turn counterclockwise and turnRight() is clockwise, relative to the robot's current direction.",
  absoluteTurns: "This answer treats turnLeft() as 'face left on the screen' and turnRight() as 'face right on the screen'. Turns are relative to the way the robot is facing: a robot facing Down that turns left ends up facing Right.",
  ignoreWalls: "This answer assumes the obstacle does not block the robot. canMove() is false when the next cell is an obstacle or outside the grid.",
  skipBlocked: "This answer assumes a blocked move() is skipped. A blocked move() stops the program with a movement error.",
  boundaryFlip: "This answer is off by one. Check whether the condition uses < or <= (or > or >=) and list the values the loop variable takes.",
  initZero: "This answer assumes the loop variable starts at 0. Check its starting value.",
  stepIgnore: "This answer ignores the step size. += 2 or -= 2 changes the variable by 2 each time.",
  bodyFirstOnly: "This answer repeats only the first statement. Every statement inside the loop's braces repeats.",
  whileAsIf: "This answer runs the loop body only once. A while loop re-checks its condition after every pass.",
  staleSensors: "This answer checks every sensor at the starting position. A sensor is checked when its line runs, after earlier moves and turns.",
  flipIf: "This answer follows the wrong branch. Evaluate the condition at the moment the if statement runs.",
  dropNot: "This answer ignores the ! operator. ! reverses true and false.",
  andOrSwap: "This answer mixes up && and ||. && needs both sides true; || needs at least one side true.",
  bothBranches: "This answer runs both branches. An if/else runs exactly one of its two branches.",
  methodOnce: "This answer runs each method only on its first call. Every call runs the whole method body again.",
  defsExecute: "This answer runs the method body where it is declared. A method only runs when it is called.",
  rowCol: "This answer swaps the row and the column. Rows count down from the top; columns count right from the left.",
  short: "This answer is one move short. Count each move() as it runs.",
  extra: "This answer has one move too many. Count each move() as it runs.",
  countLess: "This answer is one too low. Count every repetition, including the first and the last.",
  countMore: "This answer is one too high. Stop counting when the condition becomes false.",
};
const M = (key, extra = {}) => ({ opts: { [key]: true, ...extra }, why: WHY[key] });

function stepFallbacks(res, world) {
  const out = [];
  const f = res.final;
  out.push({ key: `L:${f.c},${f.r}`, why: WHY.rowCol });
  const last = [...res.trace].reverse().find((t) => t.kind === "move");
  if (last) {
    const d = last.state.d;
    out.push({ key: `L:${f.r - DR[d]},${f.c - DC[d]}`, why: WHY.short });
    out.push({ key: `L:${f.r + DR[d]},${f.c + DC[d]}`, why: WHY.extra });
  }
  return out;
}
function convert(fallbacks, type, res) {
  // Re-express location fallbacks as state/outcome keys
  return fallbacks.map((f) => {
    if (type === "L" || f.key[0] !== "L") return f;
    const [r, c] = f.key.slice(2).split(",");
    if (type === "S") return { ...f, key: `S:${r},${c},${res.final.d}` };
    if (type === "F") return { ...f, key: `F:${r},${c}` };
    return null;
  }).filter(Boolean);
}
function countFallbacks(n) {
  return [
    { key: `N:${n - 1}`, why: WHY.countLess },
    { key: `N:${n + 1}`, why: WHY.countMore },
  ];
}

let serial = 0;
function assemble(g, spec) {
  let prog;
  try {
    prog = parse(spec.code);
  } catch {
    return null;
  }
  const world = spec.world;
  const res = run(prog, world);
  const ask = spec.ask;
  const correct = keyFor(ask, res);
  if (!correct) return null;
  if (res.error && ask.type !== "outcome") return null;
  // A placement answer must never be "leave the robot where it started".
  if ((ask.type === "location" || ask.type === "state") && placementKey(ask, world.start) === correct) return null;
  const seen = new Set([correct]);
  const cands = [];
  const add = (k, why, allowWall) => {
    if (!k || seen.has(k) || !plausible(k, world, allowWall)) return;
    seen.add(k);
    cands.push({ key: k, why });
  };
  for (const m of spec.mutations || []) {
    const r = run(prog, world, { ...(spec.ghost ? { unbounded: true } : {}), ...m.opts });
    if (r.error && r.error.kind !== "crash") continue;
    add(keyFor(ask, r), m.why);
  }
  const t = correct[0];
  let fb = [];
  if (spec.fallbacks) fb = spec.fallbacks(res);
  else if (t === "N") fb = countFallbacks(res.stats.moves);
  else if (t !== "D" && t !== "E") fb = convert(stepFallbacks(res, world), t, res);
  for (const f of fb) add(f.key, f.why, f.allowWall);
  if (t === "D")
    for (let d = 0; d < 4; d++)
      add(`D:${d}`, "This direction comes from losing track of a turn. Write down the facing after every turn: turnLeft() is a quarter-turn counterclockwise and turnRight() is clockwise.");
  if (cands.length < 3) return null;
  // Candidates are ordered by instructional priority (simulated misconceptions
  // first, then counting/coordinate slips); choose 3 of the top 4.
  const chosen = g.shuffle(cands.slice(0, 4)).slice(0, 3);
  if (spec.require && !spec.require(correct, chosen)) return null;
  const choices = g
    .shuffle([{ key: correct, correct: true, why: "" }, ...chosen])
    .map((c) => ({ ...c, correct: !!c.correct, text: keyText(c.key) }));
  return {
    id: `ra-${Date.now().toString(36)}-${(serial++).toString(36)}`,
    kind: "choice",
    mode: spec.mode,
    modeTitle: MODES[spec.mode],
    generator: spec.generator,
    concept: spec.concept,
    prompt: spec.prompt || "",
    question: spec.question || ASK[ask.type].question,
    code: spec.code,
    world,
    ask,
    ghost: !!spec.ghost,
    choices,
    answer: choices.findIndex((c) => c.correct),
    // Location/direction questions are answered by placing and turning the
    // robot on the grid; every simulated misconception is kept so feedback can
    // name the likely mistake for any placement, not just the four choices.
    answerMode: PLACE_TYPES.includes(ask.type) ? "place" : "choice",
    misconceptions: cands.map((c) => ({ key: c.key, why: c.why })),
    explanation: spec.explain(res, prog),
    note: spec.note || "",
  };
}
export const PLACE_TYPES = ["location", "direction", "state"];
/* Key for a robot the student placed, graded the way the question asks. */
export function placementKey(ask, pos) {
  if (ask.type === "location") return `L:${pos.r},${pos.c}`;
  if (ask.type === "direction") return `D:${pos.d}`;
  return `S:${pos.r},${pos.c},${pos.d}`;
}

/* ------------------------------------------------------------------ */
/* World construction                                                  */
/* ------------------------------------------------------------------ */
function randomRoute(g, rows, cols, len, { minTurns = 1, minMoves = 2, walls = new Set() } = {}) {
  const w = { rows, cols };
  for (let attempt = 0; attempt < 60; attempt++) {
    const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
    if (walls.has(K(start.r, start.c))) continue;
    const s = { ...start },
      cmds = [],
      cells = [K(s.r, s.c)];
    let prevTurn = null,
      ok = true;
    for (let k = 0; k < len; k++) {
      const nr = s.r + DR[s.d],
        nc = s.c + DC[s.d];
      const canMove = inGrid(w, nr, nc) && !walls.has(K(nr, nc));
      if (canMove && (prevTurn || g.chance(0.6))) {
        cmds.push("move");
        s.r = nr;
        s.c = nc;
        cells.push(K(s.r, s.c));
        prevTurn = null;
      } else {
        if (prevTurn && canMove) {
          ok = false;
          break;
        }
        const t = prevTurn || g.pick(["turnLeft", "turnRight"]);
        cmds.push(t);
        s.d = (s.d + (t === "turnLeft" ? 3 : 1)) % 4;
        prevTurn = t;
      }
    }
    if (!ok) continue;
    const turns = cmds.filter((c) => c !== "move").length,
      moves = cmds.length - turns;
    if (turns < minTurns || moves < minMoves) continue;
    if (cmds[cmds.length - 1] !== "move" && minMoves > 0 && g.chance(0.5)) continue;
    return { start, cmds, end: { ...s }, cells };
  }
  return null;
}
function neighbors(w, key) {
  const [r, c] = key.split(",").map(Number);
  return [0, 1, 2, 3].map((d) => [r + DR[d], c + DC[d]]).filter(([a, b]) => inGrid(w, a, b)).map(([a, b]) => K(a, b));
}
function placeWalls(g, w, avoid, count, near = []) {
  const avoidSet = new Set(avoid);
  const walls = new Set(w.walls || []);
  const nearCells = g.shuffle([...new Set(near.flatMap((k) => neighbors(w, k)))].filter((k) => !avoidSet.has(k)));
  const all = [];
  for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) if (!avoidSet.has(K(r, c))) all.push(K(r, c));
  const pool = g.shuffle(all);
  let added = 0;
  for (const k of [...nearCells.slice(0, Math.ceil(count / 2)), ...pool]) {
    if (added >= count) break;
    if (walls.has(k)) continue;
    walls.add(k);
    added++;
  }
  return [...walls];
}
function findStart(g, world, code, tries = 80, accept = () => true) {
  let prog;
  try {
    prog = parse(code);
  } catch {
    return null;
  }
  for (let i = 0; i < tries; i++) {
    const start = { r: g.int(0, world.rows - 1), c: g.int(0, world.cols - 1), d: g.int(0, 3) };
    if ((world.walls || []).includes(K(start.r, start.c))) continue;
    const w = { ...world, start };
    const res = run(prog, w);
    if (!res.error && accept(res, w)) return { world: w, res };
  }
  return null;
}
function pathCells(res) {
  return [...new Set(res.trace.map((t) => K(t.state.r, t.state.c)))];
}
function decorate(g, w, res, count) {
  // Never add an obstacle on the path or in front of any position the robot
  // occupies, so every sensor result in the verified run stays the same.
  const cells = pathCells(res);
  const fronts = res.trace.map((t) => K(t.state.r + DR[t.state.d], t.state.c + DC[t.state.d]));
  const goal = w.goal ? [K(w.goal.r, w.goal.c)] : [];
  return { ...w, walls: placeWalls(g, w, [...cells, ...fronts, ...goal], count, cells) };
}
function loopValues(res, line, varName) {
  return res.trace
    .filter((t) => t.kind === "loop" && t.line === line && t.value)
    .map((t) => Number(t.text.split(" = ")[1]?.split(":")[0]))
    .filter((n) => Number.isFinite(n));
}
function endSentence(res) {
  return `The robot ends at ${stateText(res.final)}.`;
}

/* ------------------------------------------------------------------ */
/* Mode A: Predict the Robot                                           */
/* ------------------------------------------------------------------ */
function genPredictSequence(g) {
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  const route = randomRoute(g, rows, cols, g.int(4, 7), { minTurns: 2, minMoves: 2 });
  if (!route) return null;
  const lines = route.cmds.map((c) => LINE[c]);
  const code = lines.join("\n");
  let world = { rows, cols, walls: [], start: route.start, goal: null };
  world.walls = placeWalls(g, world, route.cells, g.int(1, 3), route.cells);
  const type = g.pick(["location", "location", "state", "direction"]);
  if (type !== "direction" && route.end.r === route.start.r && route.end.c === route.start.c) return null;
  const turnLines = route.cmds.map((c, i) => (c !== "move" ? i + 1 : 0)).filter(Boolean);
  const moveLines = route.cmds.map((c, i) => (c === "move" ? i + 1 : 0)).filter(Boolean);
  const mutations = [
    M("swapTurns"),
    M("absoluteTurns"),
    ...g.shuffle(turnLines).map((l) => ({ opts: { skipLines: [l] }, why: `This answer skips the turn on line ${l}. Every line runs, in order.` })),
    ...g.shuffle(moveLines).slice(0, 1).map((l) => ({ opts: { skipLines: [l] }, why: `This answer misses the move on line ${l}.` })),
  ];
  return assemble(g, {
    mode: "predict",
    generator: "sequence-" + type,
    concept: "Sequential execution",
    code,
    world,
    ask: { type },
    mutations,
    explain: (res) => {
      const turns = res.trace.filter((t) => t.kind === "turn").map((t) => `line ${t.line} → ${dirName(t.state.d)}`);
      return `Start facing ${dirName(world.start.d)}; each turn is relative to the current facing (${turns.join(", ")}). With ${plural(res.stats.moves, "move")} along the way, the robot ends at ${stateText(res.final)}.`;
    },
  });
}
function genPredictOutcome(g) {
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  const route = randomRoute(g, rows, cols, g.int(4, 6), { minTurns: 1, minMoves: 3 });
  if (!route) return null;
  let cmds = route.cmds.slice();
  const scenario = g.pick(["wall", "wall", "edge", "clear"]);
  let world = { rows, cols, walls: [], start: route.start, goal: { r: route.end.r, c: route.end.c } };
  if (scenario === "wall") {
    // Block one move's destination cell that the robot has not visited before.
    const s = { ...route.start },
      visited = [K(s.r, s.c)],
      options = [];
    cmds.forEach((c, i) => {
      if (c === "move") {
        s.r += DR[s.d];
        s.c += DC[s.d];
        const k = K(s.r, s.c);
        if (!visited.includes(k) && i > 0 && k !== K(route.end.r, route.end.c)) options.push({ i, k });
        visited.push(k);
      } else s.d = (s.d + (c === "turnLeft" ? 3 : 1)) % 4;
    });
    if (!options.length) return null;
    const o = g.pick(options);
    if (route.cells.indexOf(o.k) !== route.cells.lastIndexOf(o.k)) return null;
    world.walls = [o.k];
  } else if (scenario === "edge") {
    const e = route.end;
    let n = 0,
      r = e.r,
      c = e.c;
    while (inGrid(world, r + DR[e.d], c + DC[e.d])) {
      r += DR[e.d];
      c += DC[e.d];
      n++;
    }
    if (n > 2 || cmds.length + n + 1 > 8) return null;
    for (let i = 0; i <= n; i++) cmds.push("move");
    world.goal = { r, c };
  } else if (g.chance(0.4)) {
    const e = route.end;
    const r = e.r + DR[(e.d + 1) % 4],
      c = e.c + DC[(e.d + 1) % 4];
    if (inGrid(world, r, c) && !route.cells.includes(K(r, c))) world.goal = { r, c };
  }
  const code = cmds.map((c) => LINE[c]).join("\n");
  const first = run(code, world);
  const avoid = pathCells(first);
  world.walls = placeWalls(g, world, [...avoid, K(world.goal.r, world.goal.c)], g.int(2, 3), avoid);
  if (world.walls.length > 4) return null;
  const turnLines = cmds.map((c, i) => (c !== "move" ? i + 1 : 0)).filter(Boolean);
  const moveLines = cmds.map((c, i) => (c === "move" ? i + 1 : 0)).filter(Boolean);
  return assemble(g, {
    mode: "predict",
    generator: "outcome-" + scenario,
    concept: "Predicting program behavior",
    code,
    world,
    ask: { type: "outcome" },
    prompt: "A move() into an obstacle or off the grid stops the program with a movement error.",
    mutations: [
      M("ignoreWalls"),
      M("skipBlocked"),
      M("swapTurns"),
      M("absoluteTurns"),
      ...turnLines.map((l) => ({ opts: { skipLines: [l] }, why: `This answer skips the turn on line ${l}.` })),
    ],
    fallbacks: (res) => {
      const out = [];
      if (res.error) {
        for (const l of moveLines) if (l !== res.error.line && Math.abs(l - res.error.line) <= 2) out.push({ key: `E:${l}`, why: "This answer picks the wrong move. Trace the robot cell by cell to find the first blocked move." });
        out.push({ key: `F:${res.final.r},${res.final.c}`, why: WHY.skipBlocked });
      } else {
        for (const l of g.shuffle(moveLines).slice(0, 2)) out.push({ key: `E:${l}`, why: "This answer predicts a crash that does not happen. Check which cell each move() enters." });
        out.push(...convert(stepFallbacks(res, world), "F", res));
      }
      return out;
    },
    require: (correct, chosen) => chosen.some((c) => c.key[0] === correct[0]) && chosen.some((c) => c.key[0] !== correct[0]),
    explain: (res) =>
      res.error
        ? `Line ${res.error.line} tries to move the robot from ${cellText(res.final.r, res.final.c)} ${res.error.message.includes("grid") ? "off the grid" : "into an obstacle"}, so the program stops with a movement error. Later lines never run.`
        : `Every move() enters an open cell, so the program finishes normally. ${endSentence(res)}`,
  });
}

/* ------------------------------------------------------------------ */
/* Mode B: Loop Navigator                                              */
/* ------------------------------------------------------------------ */
function forHeader(g, iterations, opts = {}) {
  const styles = opts.styles || ["lt", "le", "gt", "ge", "lt2", "gt2"];
  const style = g.pick(styles);
  const v = opts.var || g.pick(["i", "i", "k", "n"]);
  const a = g.int(0, 3);
  switch (style) {
    case "lt":
      return { text: `for (int ${v} = ${a}; ${v} < ${a + iterations}; ${v}++) {`, style };
    case "le":
      return { text: `for (int ${v} = ${a + 1}; ${v} <= ${a + iterations}; ${v}++) {`, style };
    case "gt":
      return { text: `for (int ${v} = ${a + iterations}; ${v} > ${a}; ${v}--) {`, style };
    case "ge":
      return { text: `for (int ${v} = ${a + iterations - 1}; ${v} >= ${a}; ${v}--) {`, style };
    case "lt2":
      return { text: `for (int ${v} = ${a}; ${v} < ${a + 2 * iterations - g.int(0, 1)}; ${v} += 2) {`, style };
    case "gt2":
      return { text: `for (int ${v} = ${a + 2 * iterations - g.int(0, 1)}; ${v} > ${a}; ${v} -= 2) {`, style };
  }
}
function loopExplain(res, prog) {
  const loops = [];
  const walk = (list) =>
    list.forEach((s) => {
      if (s.t === "for") {
        loops.push(s);
        walk(s.body.t === "block" ? s.body.body : [s.body]);
      } else if (s.t === "while") {
        loops.push(s);
        walk(s.body.t === "block" ? s.body.body : [s.body]);
      } else if (s.t === "if") walk([s.then, ...(s.else ? [s.else] : [])]);
      else if (s.t === "block") walk(s.body);
    });
  walk(prog.body);
  Object.values(prog.methods).forEach((m) => walk(m.body));
  const parts = loops.slice(0, 2).map((s) => {
    const n = res.stats.loops[s.line] || 0;
    if (s.t === "for") {
      const vals = [...new Set(loopValues(res, s.line, s.var))];
      if (n === 0) return `the loop on line ${s.line} runs 0 times because its condition is false from the start`;
      return `the loop on line ${s.line} runs its body ${plural(n, "time")}${vals.length && vals.length <= 6 ? ` (${s.var} = ${vals.join(", ")})` : ""}`;
    }
    return `the while loop on line ${s.line} runs its body ${plural(n, "time")} before its condition becomes false`;
  });
  const lead = parts.length ? parts.join(" and ") : "the statements run in order";
  return `${lead[0].toUpperCase() + lead.slice(1)}. robot.move() runs ${plural(res.stats.moves, "time")} in total; ${endSentence(res).replace("The robot", "the robot")}`;
}
function genLoopCount(g) {
  const zero = g.chance(0.2);
  const iterations = zero ? 0 : g.int(2, 5);
  let header;
  if (zero) {
    const a = g.int(2, 5);
    header = g.pick([
      { text: `for (int i = ${a}; i < ${a}; i++) {`, style: "zero" },
      { text: `for (int i = ${a}; i > ${a + g.int(0, 2)}; i--) {`, style: "zero" },
      { text: `for (int i = ${a + 1}; i <= ${a}; i++) {`, style: "zero" },
    ]);
  } else header = forHeader(g, iterations);
  const bodyMoves = g.pick([1, 1, 2]);
  const total = iterations * bodyMoves;
  const before = g.chance(0.4) ? [LINE[g.pick(["turnLeft", "turnRight"])]] : [];
  const after = g.chance(0.3) ? [LINE.move] : [];
  if (total + after.length > 7) return null;
  const rows = g.int(4, 6),
    cols = Math.min(9, Math.max(6, total + after.length + 2));
  const code = [...before, header.text, ...ind(Array(bodyMoves).fill(LINE.move)), "}", ...after].join("\n");
  const type = g.pick(["moves", "moves", "location"]);
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 120, (res) => type !== "location" || res.stats.moves > 0);
  if (!found) return null;
  const world = decorate(g, found.world, found.res, g.int(1, 3));
  return assemble(g, {
    mode: "loops",
    generator: `for-count-${header.style}`,
    concept: "for loops",
    code,
    world,
    ask: { type },
    ghost: type === "moves",
    mutations: [M("boundaryFlip"), M("initZero"), M("stepIgnore"), ...(bodyMoves > 1 ? [M("bodyFirstOnly")] : [])],
    fallbacks:
      type === "moves"
        ? (res) => [
            ...countFallbacks(res.stats.moves),
            ...(bodyMoves > 1 ? [{ key: `N:${iterations}`, why: "This answer counts loop repetitions, not move() calls. The body has two move() statements." }] : []),
            ...(zero ? [{ key: `N:${bodyMoves}`, why: "This answer runs the body once. A for loop checks its condition before the first pass." }] : []),
          ]
        : undefined,
    explain: loopExplain,
  });
}
function genLoopTurns(g) {
  const bodies = [
    ["move", "turnRight"],
    ["move", "turnLeft"],
    ["move", "move", "turnLeft"],
    ["move", "move", "turnRight"],
    ["turnLeft", "move"],
    ["turnRight", "move", "move"],
    ["move", "turnLeft", "move", "turnRight"],
    ["move", "turnRight", "move", "turnLeft"],
  ];
  const body = g.pick(bodies);
  const iterations = g.int(2, body.length === 4 ? 3 : 4);
  const header = forHeader(g, iterations, { styles: ["lt", "le", "gt", "ge"] });
  const before = g.chance(0.3) ? [LINE[g.pick(["turnLeft", "turnRight", "move"])]] : [];
  const after = g.chance(0.4) ? [LINE[g.pick(["move", "turnLeft", "turnRight"])]] : [];
  const code = [...before, header.text, ...ind(body.map((c) => LINE[c])), "}", ...after].join("\n");
  const rows = g.int(5, 6),
    cols = g.int(5, 7);
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 120, (res, w) => res.final.r !== w.start.r || res.final.c !== w.start.c);
  if (!found) return null;
  const world = decorate(g, found.world, found.res, g.int(1, 3));
  const type = g.pick(["location", "state", "state", "direction"]);
  return assemble(g, {
    mode: "loops",
    generator: `for-turns-${body.join("")}`,
    concept: "Loop bodies with turns",
    code,
    world,
    ask: { type },
    mutations: [M("bodyFirstOnly"), M("boundaryFlip"), M("swapTurns"), M("absoluteTurns"), M("initZero")],
    explain: loopExplain,
  });
}
function genLoopWhile(g) {
  const variant = g.pick(["canMove", "canMove", "atGoal", "compound", "twoLeg"]);
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  let lines = [],
    world;
  const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
  // distance to edge in facing direction
  let room = 0;
  while (inGrid({ rows, cols }, start.r + DR[start.d] * (room + 1), start.c + DC[start.d] * (room + 1))) room++;
  if (room < 2) return null;
  const dist = g.int(2, room);
  const cellAt = (n) => K(start.r + DR[start.d] * n, start.c + DC[start.d] * n);
  const walls = [];
  if (dist < room) walls.push(cellAt(dist + 1));
  let goal = null;
  if (variant === "canMove") {
    lines = ["while (robot.canMove()) {", pad(1) + LINE.move, "}"];
    if (g.chance(0.4)) lines.push(LINE[g.pick(["turnLeft", "turnRight"])], LINE.move);
  } else if (variant === "twoLeg") {
    lines = ["while (robot.canMove()) {", pad(1) + LINE.move, "}", LINE[g.pick(["turnLeft", "turnRight"])], "while (robot.canMove()) {", pad(1) + LINE.move, "}"];
  } else if (variant === "atGoal") {
    goal = { r: start.r + DR[start.d] * dist, c: start.c + DC[start.d] * dist };
    if (walls.length && g.chance(0.5)) walls.pop();
    lines = ["while (!robot.atGoal()) {", pad(1) + LINE.move, "}"];
  } else {
    const g2 = g.int(1, room);
    goal = { r: start.r + DR[start.d] * g2, c: start.c + DC[start.d] * g2 };
    lines = [`while (${g.chance(0.5) ? "robot.canMove() && !robot.atGoal()" : "!robot.atGoal() && robot.canMove()"}) {`, pad(1) + LINE.move, "}"];
    if (g2 === dist) return null;
  }
  world = { rows, cols, walls, start, goal };
  const code = lines.join("\n");
  const res0 = run(code, world);
  if (res0.error || res0.stats.moves < 1) return null;
  world = decorate(g, world, res0, g.int(1, 3));
  if (goal) world.walls = world.walls.filter((k) => k !== K(goal.r, goal.c));
  const type = g.pick(["location", "location", "moves"]);
  const simple = variant !== "twoLeg" && lines.length === 3;
  return assemble(g, {
    mode: "loops",
    generator: `while-${variant}`,
    concept: "while loops with sensors",
    code,
    world,
    ask: { type },
    mutations: [M("whileAsIf"), M("ignoreWalls"), M("dropNot"), M("andOrSwap"), M("staleSensors")],
    fallbacks: (res) => {
      if (type === "moves") return countFallbacks(res.stats.moves);
      const out = [{ key: `L:${res.final.c},${res.final.r}`, why: WHY.rowCol }];
      if (simple) {
        const f = res.final;
        out.push({ key: `L:${f.r - DR[f.d]},${f.c - DC[f.d]}`, why: "This answer stops one cell early. The loop keeps going while the condition is still true." });
        const nr = f.r + DR[f.d],
          nc = f.c + DC[f.d];
        if (inGrid(world, nr, nc) && !world.walls.includes(K(nr, nc)))
          out.push({ key: `L:${nr},${nc}`, why: "This answer moves one cell past where the loop stops. The condition is checked before every move." });
      }
      return out;
    },
    explain: loopExplain,
  });
}
function genLoopCounter(g) {
  const n = g.int(2, 4);
  const v = g.pick(["steps", "count", "moves"]);
  const variant = g.pick(["up", "down", "down2", "ne"]);
  const body = g.pick([["move"], ["move"], ["move", "move"], ["move", "turnLeft"], ["turnRight", "move"]]);
  let init, cond, upd;
  if (variant === "up") [init, cond, upd] = [0, `${v} < ${n}`, `${v}++;`];
  else if (variant === "down") [init, cond, upd] = [n, `${v} > 0`, `${v}--;`];
  else if (variant === "down2") [init, cond, upd] = [2 * n, `${v} > 0`, `${v} -= 2;`];
  else [init, cond, upd] = [1, `${v} != ${n + 1}`, `${v}++;`];
  const code = [`int ${v} = ${init};`, `while (${cond}) {`, ...ind([...body.map((c) => LINE[c]), upd]), "}"].join("\n");
  const rows = g.int(5, 6),
    cols = g.int(5, 8);
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 120);
  if (!found) return null;
  const world = decorate(g, found.world, found.res, g.int(1, 3));
  const type = g.pick(["moves", "location", "location"]);
  return assemble(g, {
    mode: "loops",
    generator: `while-counter-${variant}`,
    concept: "while loops with counters",
    code,
    world,
    ask: { type },
    ghost: type === "moves",
    mutations: [M("boundaryFlip"), M("stepIgnore"), M("whileAsIf"), M("swapTurns")],
    explain: loopExplain,
  });
}
function genLoopNested(g) {
  const outer = g.int(2, 3),
    inner = g.int(1, 3);
  const oh = forHeader(g, outer, { styles: ["lt", "le", "gt"], var: "i" });
  const ih = forHeader(g, inner, { styles: ["lt", "le", "ge"], var: "j" });
  const turn = g.pick(["turnLeft", "turnRight"]);
  const code = [oh.text, ...ind([ih.text, pad(1) + LINE.move, "}", LINE[turn]]), "}"].join("\n");
  const rows = g.int(5, 6),
    cols = g.int(5, 7);
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 120);
  if (!found) return null;
  const world = decorate(g, found.world, found.res, g.int(1, 3));
  const type = g.pick(["moves", "moves", "state"]);
  return assemble(g, {
    mode: "loops",
    generator: "nested-for",
    concept: "Nested loops",
    code,
    world,
    ask: { type },
    ghost: type === "moves",
    mutations: [M("boundaryFlip"), M("bodyFirstOnly"), M("swapTurns")],
    fallbacks:
      type === "moves"
        ? (res) => [
            { key: `N:${outer + inner}`, why: "This answer adds the loop counts. The inner loop runs completely during every outer pass, so the counts multiply." },
            { key: `N:${inner}`, why: "This answer runs the inner loop only once. It restarts on every outer pass." },
            ...countFallbacks(res.stats.moves),
          ]
        : undefined,
    explain: (res, prog) =>
      `The outer loop runs ${plural(outer, "time")} and the inner loop runs ${plural(inner, "time")} on each outer pass, so robot.move() runs ${outer} × ${inner} = ${res.stats.moves} times. ${endSentence(res)}`,
  });
}

/* ------------------------------------------------------------------ */
/* Mode D: Conditional Robot                                           */
/* ------------------------------------------------------------------ */
const BODIES = [["move"], ["turnLeft"], ["turnRight"], ["turnLeft", "move"], ["turnRight", "move"], ["move", "move"]];
function ifBlock(cond, then, other) {
  const out = [`if (${cond}) {`, ...ind(then.map((c) => LINE[c]))];
  if (other) out.push("} else {", ...ind(other.map((c) => LINE[c])));
  out.push("}");
  return out;
}
function branchExplain(res, prog) {
  const ifs = [];
  const walk = (list) =>
    list.forEach((s) => {
      if (s.t === "if") {
        ifs.push(s);
        walk([s.then, ...(s.else ? [s.else] : [])]);
      } else if (s.t === "block") walk(s.body);
      else if (s.t === "for" || s.t === "while") walk([s.body]);
    });
  walk(prog.body);
  const parts = ifs.slice(0, 2).map((s) => {
    const b = res.stats.branches[s.line] || { then: 0, else: 0 };
    if (b.then + b.else === 1) return `the condition on line ${s.line} is ${b.then ? "true" : "false"}, so ${b.then ? "the if-branch" : s.else ? "the else-branch" : "nothing in that if"} runs`;
    return `the if on line ${s.line} takes the if-branch ${plural(b.then, "time")} and ${s.else ? "the else-branch" : "skips"} ${plural(b.else, "time")}`;
  });
  const lead = parts.join("; then ") || "the statements run in order";
  return `${lead[0].toUpperCase() + lead.slice(1)}. ${endSentence(res)}`;
}
function genCondSingle(g) {
  const cond = g.pick(["robot.canMove()", "!robot.canMove()", "robot.canMove()", "!robot.atGoal()", "robot.atGoal()"]);
  const then = g.pick(BODIES);
  let other = g.chance(0.75) ? g.pick(BODIES) : null;
  if (other && other.join() === then.join()) return null;
  const follow = g.chance(0.6) ? [LINE[g.pick(["move", "turnLeft", "turnRight"])]] : [];
  const code = [...ifBlock(cond, then, other), ...follow].join("\n");
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
  const ahead = K(start.r + DR[start.d], start.c + DC[start.d]);
  const walls = [];
  if (cond.includes("canMove") && g.chance(0.55) && inGrid({ rows, cols }, start.r + DR[start.d], start.c + DC[start.d])) walls.push(ahead);
  let goal = null;
  if (cond.includes("atGoal")) goal = g.chance(0.5) ? { r: start.r, c: start.c } : { r: start.r + DR[start.d], c: start.c + DC[start.d] };
  if (goal && !inGrid({ rows, cols }, goal.r, goal.c)) return null;
  let world = { rows, cols, walls, start, goal };
  const res0 = run(code, world);
  if (res0.error) return null;
  world = decorate(g, world, res0, g.int(1, 3));
  if (goal) world.walls = world.walls.filter((k) => k !== K(goal.r, goal.c));
  return assemble(g, {
    mode: "conditionals",
    generator: `if-${other ? "else" : "only"}`,
    concept: "if / if-else",
    code,
    world,
    ask: { type: g.pick(["state", "state", "location"]) },
    mutations: [M("flipIf"), M("bothBranches"), M("ignoreWalls"), M("dropNot"), M("swapTurns")],
    explain: branchExplain,
  });
}
function genCondSequence(g) {
  const c1 = g.pick(["robot.canMove()", "!robot.canMove()"]);
  const c2 = g.pick(["robot.canMove()", "!robot.canMove()"]);
  const b1 = c1.startsWith("!") ? [g.pick(["turnLeft", "turnRight"])] : ["move"];
  const e1 = g.chance(0.5) ? (c1.startsWith("!") ? ["move"] : [g.pick(["turnLeft", "turnRight"])]) : null;
  const mid = LINE[g.pick(["turnLeft", "turnRight", "move"])];
  const b2 = c2.startsWith("!") ? [g.pick(["turnLeft", "turnRight"])] : ["move"];
  const e2 = c2.startsWith("!") ? ["move"] : [g.pick(["turnLeft", "turnRight"])];
  const code = [...ifBlock(c1, b1, e1), mid, ...ifBlock(c2, b2, e2)].join("\n");
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  let world = { rows, cols, walls: [], goal: null };
  // Random obstacles first, then a start that keeps the program safe.
  world.walls = placeWalls(g, { rows, cols, walls: [] }, [], g.int(3, 6));
  const found = findStart(g, world, code, 100, (res) => {
    const stale = run(code, res && { ...world, start: res.trace[0].state }, { staleSensors: true });
    return stale.error || keyFor({ type: "state" }, stale) !== keyFor({ type: "state" }, res);
  });
  if (!found) return null;
  const prog = parse(code);
  const ifLines = prog.body.filter((s) => s.t === "if").map((s) => s.line);
  return assemble(g, {
    mode: "conditionals",
    generator: "if-sequence",
    concept: "Conditions checked at run time",
    code,
    world: found.world,
    ask: { type: "state" },
    mutations: [
      M("staleSensors"),
      { opts: { flipIf: ifLines[0] }, why: `This answer takes the wrong branch at line ${ifLines[0]}. Check the cell in front of the robot at that moment.` },
      { opts: { flipIf: ifLines[1] }, why: `This answer takes the wrong branch at line ${ifLines[1]}. The robot has moved or turned since the first check.` },
      M("swapTurns"),
      M("bothBranches"),
    ],
    explain: branchExplain,
  });
}
function genCondCompound(g) {
  const conds = [
    "robot.canMove() && !robot.atGoal()",
    "!robot.canMove() || robot.atGoal()",
    "robot.atGoal() || robot.canMove()",
    "!robot.atGoal() && !robot.canMove()",
    "!(robot.canMove() && robot.atGoal())",
  ];
  const cond = g.pick(conds);
  const then = g.pick(BODIES);
  const other = g.pick(BODIES.filter((b) => b.join() !== then.join()));
  const follow = g.chance(0.5) ? [LINE[g.pick(["move", "turnLeft", "turnRight"])]] : [];
  const code = [...ifBlock(cond, then, other), ...follow].join("\n");
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  for (let t = 0; t < 30; t++) {
    const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
    const goal = g.chance(0.5) ? { r: start.r, c: start.c } : { r: g.int(0, rows - 1), c: g.int(0, cols - 1) };
    const walls = [];
    const ar = start.r + DR[start.d],
      ac = start.c + DC[start.d];
    if (g.chance(0.5) && inGrid({ rows, cols }, ar, ac) && K(ar, ac) !== K(goal.r, goal.c)) walls.push(K(ar, ac));
    let world = { rows, cols, walls, start, goal };
    const res = run(code, world);
    if (res.error) continue;
    const swapped = run(code, world, { andOrSwap: true }),
      dropped = run(code, world, { dropNot: true });
    const k = keyFor({ type: "state" }, res);
    if (keyFor({ type: "state" }, swapped) === k && keyFor({ type: "state" }, dropped) === k) continue;
    world = decorate(g, world, res, g.int(1, 3));
    world.walls = world.walls.filter((x) => x !== K(goal.r, goal.c));
    return assemble(g, {
      mode: "conditionals",
      generator: "compound-boolean",
      concept: "Boolean operators && || !",
      code,
      world,
      ask: { type: "state" },
      mutations: [M("andOrSwap"), M("dropNot"), M("flipIf"), M("bothBranches"), M("swapTurns")],
      explain: (r, p) => {
        const can = !run("", world).error && !blockedAhead(world);
        const at = goal.r === start.r && goal.c === start.c;
        return `At the start, robot.canMove() is ${can} and robot.atGoal() is ${at}, so (${cond}) is ${r.stats.branches[1]?.then ? "true" : "false"}. ${branchExplain(r, p).split(". ").slice(1).join(". ")}`;
      },
    });
  }
  return null;
}
function blockedAhead(world) {
  const s = world.start,
    r = s.r + DR[s.d],
    c = s.c + DC[s.d];
  return !inGrid(world, r, c) || (world.walls || []).includes(K(r, c));
}
function genCondLoop(g, mode = "conditionals") {
  const n = g.int(3, 6);
  const neg = g.chance(0.35);
  const turn = g.pick(["turnLeft", "turnRight"]);
  const header = forHeader(g, n, { styles: ["lt", "le", "gt"] });
  const elseBody = g.chance(0.3) ? [turn, "move"] : [turn];
  const inner = neg ? ifBlock("!robot.canMove()", elseBody, ["move"]) : ifBlock("robot.canMove()", ["move"], elseBody);
  const code = [header.text, ...ind(inner), "}"].join("\n");
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  for (let t = 0; t < 40; t++) {
    let world = { rows, cols, walls: placeWalls(g, { rows, cols, walls: [] }, [], g.int(2, 5)), goal: null };
    const found = findStart(g, world, code, 30, (res) => {
      const b = res.stats.branches[2] || { then: 0, else: 0 };
      return b.then > 0 && b.else > 0 && res.stats.moves >= 2;
    });
    if (!found) continue;
    const type = g.pick(["state", "location", "elseCount"]);
    return assemble(g, {
      mode,
      generator: mode === "loops" ? "for-if-sensor" : "if-in-loop",
      concept: mode === "loops" ? "if statements inside for loops" : "Conditionals inside loops",
      code,
      world: found.world,
      ask: type === "elseCount" ? { type, line: 2 } : { type },
      mutations: [M("flipIf"), M("staleSensors"), M("boundaryFlip"), M("swapTurns"), M("ignoreWalls")],
      fallbacks: type === "elseCount" ? (res) => [{ key: `N:0`, why: "This answer assumes the robot is never blocked. Check canMove() again on every pass of the loop." }, ...countFallbacks(res.stats.branches[2]?.else || 0)] : undefined,
      explain: (res, prog) => {
        const b = res.stats.branches[2] || { then: 0, else: 0 };
        return `The loop runs ${plural(b.then + b.else, "time")}. The if-branch runs ${plural(b.then, "time")} and the else-branch runs ${plural(b.else, "time")}, depending on whether the next cell is open at that moment. ${endSentence(res)}`;
      },
    });
  }
  return null;
}

/* Loops with if statements inside (Loop Navigator) */
function ifTrace(res, ifLine) {
  // Pair each evaluation of the if on ifLine with the loop variable's value.
  let cur = null;
  const out = [];
  for (const t of res.trace) {
    if (t.kind === "loop" && t.text.includes(" = ")) cur = Number(t.text.split(" = ")[1].split(":")[0]);
    if (t.kind === "branch" && t.text && (t.line === ifLine || t.line > ifLine)) out.push({ i: cur, value: t.value });
  }
  return out;
}
function genLoopIfCounter(g) {
  const n = g.int(3, 5);
  const a = g.pick([0, 0, 1]);
  const header = g.chance(0.5) ? `for (int i = ${a}; i < ${a + n}; i++) {` : `for (int i = ${a}; i <= ${a + n - 1}; i++) {`;
  const values = Array.from({ length: n }, (_, k) => a + k);
  const k = g.pick(values.slice(1));
  const conds = [
    [`i == ${k}`, (i) => i === k],
    [`i % 2 == 0`, (i) => i % 2 === 0],
    [`i % 2 == 1`, (i) => i % 2 === 1],
    [`i > ${k}`, (i) => i > k],
    [`i != ${k}`, (i) => i !== k],
    [`i < ${k}`, (i) => i < k],
  ];
  const [cond, test] = g.pick(conds);
  const hits = values.filter(test).length;
  if (hits === 0 || hits === n) return null; // the if must matter
  const turn = g.pick(["turnLeft", "turnRight"]);
  const shape = g.pick(["moveThenIf", "ifThenMove", "ifElse"]);
  let body;
  if (shape === "moveThenIf") body = [LINE.move, ...ifBlock(cond, [turn])];
  else if (shape === "ifThenMove") body = [...ifBlock(cond, [turn]), LINE.move];
  else body = ifBlock(cond, [turn], ["move"]);
  const code = [header, ...ind(body), "}"].join("\n");
  const rows = g.int(5, 6),
    cols = g.int(5, 7);
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 120, (res, w) => res.final.r !== w.start.r || res.final.c !== w.start.c);
  if (!found) return null;
  const world = decorate(g, found.world, found.res, g.int(1, 3));
  const ifLine = code.split("\n").findIndex((l) => l.trim().startsWith("if (")) + 1;
  return assemble(g, {
    mode: "loops",
    generator: `for-if-counter-${shape}`,
    concept: "if statements inside for loops",
    code,
    world,
    ask: { type: g.pick(["state", "state", "location", "direction"]) },
    mutations: [
      { opts: { flipIf: ifLine }, why: `This answer reverses the if on line ${ifLine}. Check the condition for each value of i.` },
      M("bothBranches"),
      M("boundaryFlip"),
      M("swapTurns"),
      M("initZero"),
      M("absoluteTurns"),
    ],
    explain: (res) => {
      const pairs = ifTrace(res, ifLine);
      const yes = pairs.filter((p) => p.value).map((p) => p.i);
      const all = pairs.map((p) => p.i);
      return `The loop runs for i = ${all.join(", ")}. The condition (${cond}) is true only when i = ${yes.join(", ")}, so that branch runs ${plural(yes.length, "time")}. ${endSentence(res)}`;
    },
  });
}
function genLoopWhileIf(g) {
  const turn = g.pick(["turnLeft", "turnRight"]);
  const variant = g.pick(["ifElse", "ifElse", "turnIfBlocked"]);
  const body =
    variant === "ifElse"
      ? ifBlock("robot.canMove()", ["move"], [turn])
      : [...ifBlock("!robot.canMove()", [turn]), LINE.move];
  const code = ["while (!robot.atGoal()) {", ...ind(body), "}"].join("\n");
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  for (let t = 0; t < 30; t++) {
    const walls = placeWalls(g, { rows, cols, walls: [] }, [], g.int(2, 5));
    const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
    if (walls.includes(K(start.r, start.c))) continue;
    // Walk the rule without a goal, then put the goal on a cell first reached
    // after at least one turn, so the loop stops there.
    const probe = run(["for (int s = 0; s < 12; s++) {", ...ind(body), "}"].join("\n"), { rows, cols, walls, start, goal: null });
    const moves = probe.trace.filter((x) => x.kind === "move" || x.kind === "turn");
    const seen = new Set([K(start.r, start.c)]);
    let turns = 0,
      goal = null,
      mv = 0;
    for (const m of moves) {
      if (m.kind === "turn") turns++;
      else {
        mv++;
        const k = K(m.state.r, m.state.c);
        if (!seen.has(k) && turns >= 1 && mv >= 3 && g.chance(0.5)) {
          goal = { r: m.state.r, c: m.state.c };
          break;
        }
        seen.add(k);
      }
    }
    if (!goal) continue;
    const world = { rows, cols, walls, start, goal };
    const res = run(code, world);
    if (res.error || !res.atGoal) continue;
    return assemble(g, {
      mode: "loops",
      generator: `while-if-${variant}`,
      concept: "if statements inside while loops",
      code,
      world,
      ask: { type: g.pick(["state", "moves", "direction"]) },
      mutations: [M("staleSensors"), M("whileAsIf"), M("swapTurns"), M("bothBranches"), M("absoluteTurns")],
      explain: (r) => {
        const b = Object.values(r.stats.branches)[0] || { then: 0, else: 0 };
        return `The while loop repeats until the robot is on the goal. Each pass checks canMove() at that moment: the if-branch ran ${plural(b.then, "time")}${variant === "ifElse" ? ` and the else-branch ran ${plural(b.else, "time")}` : ""}. robot.move() ran ${plural(r.stats.moves, "time")}; ${endSentence(r).replace("The robot", "the robot")}`;
      },
    });
  }
  return null;
}
function genLoopIfSensor(g) {
  return genCondLoop(g, "loops");
}

/* ------------------------------------------------------------------ */
/* Mode F: Methods and Reuse                                           */
/* ------------------------------------------------------------------ */
const METHOD_TEMPLATES = [
  { name: "moveTwice", body: [LINE.move, LINE.move] },
  { name: "moveThree", body: [LINE.move, LINE.move, LINE.move] },
  { name: "turnAround", body: [LINE.turnLeft, LINE.turnLeft] },
  { name: "turnRightAndMove", body: [LINE.turnRight, LINE.move] },
  { name: "turnLeftAndMove", body: [LINE.turnLeft, LINE.move] },
  { name: "sidestepRight", body: [LINE.turnRight, LINE.move, LINE.turnLeft] },
  { name: "sidestepLeft", body: [LINE.turnLeft, LINE.move, LINE.turnRight] },
  { name: "moveAndTurnLeft", body: [LINE.move, LINE.turnLeft] },
];
const NUMBER_WORDS = ["Zero", "Once", "Twice", "Three", "Four", "Five"];
function methodDecl(name, body, params = "") {
  return [`void ${name}(${params}) {`, ...ind(body), "}"];
}
function methodsProgram(decls, main) {
  // Legal Java inside the robot's class: helper methods plus run(), which
  // the robot calls to start the program.
  return [...decls.flatMap((d) => [...d, ""]), "void run() {", ...ind(main), "}"].join("\n");
}
function methodsExplain(res, prog) {
  const calls = Object.entries(res.stats.calls)
    .filter(([n]) => n !== ENTRY)
    .map(([n, c]) => `${n}() runs ${plural(c, "time")}`)
    .join(" and ");
  return `The robot starts by calling run(). Declaring a method does not run it; each call runs its whole body${calls ? ` (${calls})` : ""}. ${endSentence(res)}`;
}
function mainWithCalls(g, name, callArgs = () => "") {
  const nCalls = g.int(2, 3);
  const extras = g.int(1, 2);
  const items = [...Array(nCalls).fill("call"), ...Array(extras).fill("cmd")];
  const order = g.shuffle(items);
  if (order[0] === "cmd" && order[1] === "cmd") return null;
  return order.map((x) => (x === "call" ? `${name}(${callArgs()});` : LINE[g.pick(["turnLeft", "turnRight", "turnRight", "move"])]));
}
function methodsAssemble(g, generator, concept, decls, main, extra = {}) {
  const code = methodsProgram(decls, main);
  const rows = g.int(5, 6),
    cols = g.int(5, 7);
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 120, (res, w) => res.final.r !== w.start.r || res.final.c !== w.start.c);
  if (!found) return null;
  const world = decorate(g, found.world, found.res, g.int(1, 3));
  const type = extra.type || g.pick(["location", "state", "state", "moves"]);
  return assemble(g, {
    mode: "methods",
    generator,
    concept,
    code,
    world,
    ask: { type },
    ghost: type === "moves",
    note: "These methods are inside the robot's class. The robot starts the program by calling run(). (This is part of a class, not a complete standalone Java application.)",
    mutations: [M("methodOnce"), M("defsExecute"), M("swapTurns"), M("boundaryFlip"), M("absoluteTurns")],
    explain: methodsExplain,
  });
}
function genMethodsBasic(g) {
  const t = g.pick(METHOD_TEMPLATES);
  const main = mainWithCalls(g, t.name);
  if (!main) return null;
  return methodsAssemble(g, `method-${t.name}`, "Method calls", [methodDecl(t.name, t.body)], main);
}
function genMethodsLoop(g) {
  const n = g.int(2, 4);
  const withTurn = g.chance(0.35);
  const header = forHeader(g, n, { styles: ["lt", "le", "gt"] });
  const name = withTurn ? `move${NUMBER_WORDS[n] === "Twice" ? "Two" : NUMBER_WORDS[n]}AndTurn` : `move${NUMBER_WORDS[n] === "Twice" ? "Two" : NUMBER_WORDS[n]}`;
  const body = [header.text, pad(1) + LINE.move, "}", ...(withTurn ? [LINE.turnLeft] : [])];
  const main = mainWithCalls(g, name);
  if (!main) return null;
  return methodsAssemble(g, "method-with-loop", "Methods containing loops", [methodDecl(name, body)], main);
}
function genMethodsNested(g) {
  const pairs = [
    () => [methodDecl("turnAround", [LINE.turnLeft, LINE.turnLeft]), methodDecl("backUp", ["turnAround();", LINE.move, "turnAround();"]), "backUp"],
    () => [methodDecl("moveTwice", [LINE.move, LINE.move]), methodDecl("moveFour", ["moveTwice();", "moveTwice();"]), "moveFour"],
    () => [methodDecl("turnAround", [LINE.turnLeft, LINE.turnLeft]), methodDecl("goAndReturn", [LINE.move, LINE.move, "turnAround();", LINE.move]), "goAndReturn"],
    () => [methodDecl("moveTwice", [LINE.move, LINE.move]), methodDecl("cornerRight", ["moveTwice();", LINE.turnRight, "moveTwice();"]), "cornerRight"],
    () => [methodDecl("stepRight", [LINE.turnRight, LINE.move]), methodDecl("uTurnRight", ["stepRight();", LINE.turnRight]), "uTurnRight"],
  ];
  const [helper, outer, name] = g.pick(pairs)();
  const main = g.chance(0.5) ? mainWithCalls(g, name) : g.shuffle([`${name}();`, LINE[g.pick(["turnLeft", "turnRight", "move"])], `${name}();`].slice(0, g.int(2, 3)));
  if (!main || !main.some((l) => l.startsWith(name))) return null;
  return methodsAssemble(g, `method-calls-method-${name}`, "Methods calling methods", [helper, outer], main);
}
function genMethodsParam(g) {
  const pname = g.pick(["steps", "n", "count"]);
  const variant = g.pick(["lt", "le", "zig"]);
  let decl, name;
  if (variant === "zig") {
    name = "zigzag";
    decl = methodDecl(name, [`for (int i = 0; i < ${pname}; i++) {`, ...ind([LINE.move, LINE.turnLeft, LINE.move, LINE.turnRight]), "}"], `int ${pname}`);
  } else {
    name = g.pick(["moveForward", "advance", "walk"]);
    decl = methodDecl(name, [variant === "lt" ? `for (int i = 0; i < ${pname}; i++) {` : `for (int i = 1; i <= ${pname}; i++) {`, pad(1) + LINE.move, "}"], `int ${pname}`);
  }
  const hi = variant === "zig" ? 2 : 4;
  const main = mainWithCalls(g, name, () => String(g.int(1, hi)));
  if (!main) return null;
  return methodsAssemble(g, `method-param-${variant}`, "Methods with int parameters", [decl], main);
}


/* Methods that contain if statements */
function genMethodsIf(g) {
  const turn = g.pick(["turnLeft", "turnRight"]);
  const variants = [
    () => {
      const name = turn === "turnRight" ? "stepOrTurnRight" : "stepOrTurnLeft";
      const decl = methodDecl(name, ifBlock("robot.canMove()", ["move"], [turn]));
      const n = g.int(3, 5);
      const main = g.chance(0.5) ? Array(n).fill(`${name}();`) : [`for (int i = 0; i < ${n}; i++) {`, pad(1) + `${name}();`, "}"];
      if (g.chance(0.4)) main.push(LINE.move);
      return { name, decls: [decl], main, gen: "step-or-turn" };
    },
    () => {
      const p = g.pick(["steps", "n"]);
      const name = "moveIfOpen";
      const decl = methodDecl(name, [`for (int i = 0; i < ${p}; i++) {`, ...ind(ifBlock("robot.canMove()", ["move"])), "}"], `int ${p}`);
      const main = [`${name}(${g.int(2, 4)});`, LINE[turn], `${name}(${g.int(2, 4)});`];
      return { name, decls: [decl], main, gen: "move-if-open" };
    },
    () => {
      const name = turn === "turnLeft" ? "turnLeftIfBlocked" : "turnRightIfBlocked";
      const decl = methodDecl(name, ifBlock("!robot.canMove()", [turn]));
      const n = g.int(3, 5);
      const main = [`for (int i = 0; i < ${n}; i++) {`, ...ind([`${name}();`, LINE.move]), "}"];
      return { name, decls: [decl], main, gen: "turn-if-blocked" };
    },
    () => {
      const name = "faceOpenCell";
      const decl = methodDecl(name, ifBlock("!robot.canMove()", [turn], null).concat(ifBlock("!robot.canMove()", [turn], null)));
      const main = [`${name}();`, LINE.move, LINE.move, `${name}();`, LINE.move];
      return { name, decls: [decl], main, gen: "face-open" };
    },
    () => {
      const helper = methodDecl("goToWall", ["while (robot.canMove()) {", pad(1) + LINE.move, "}"]);
      const name = "goAroundCorner";
      const decl = methodDecl(name, ["goToWall();", ...ifBlock("robot.atGoal()", [turn], [OPP[turn]]), "goToWall();"]);
      return { name, decls: [helper, decl], main: [`${name}();`], gen: "corner-if", goal: true };
    },
  ];
  const v = g.pick(variants)();
  const code = methodsProgram(v.decls, v.main);
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  for (let t = 0; t < 25; t++) {
    let world = { rows, cols, walls: placeWalls(g, { rows, cols, walls: [] }, [], g.int(2, 5)), goal: null };
    const found = findStart(g, world, code, 30, (res, w) => {
      const bs = Object.values(res.stats.branches);
      const taken = bs.reduce((s, b) => s + b.then, 0),
        skipped = bs.reduce((s, b) => s + b.else, 0);
      const moved = res.final.r !== w.start.r || res.final.c !== w.start.c;
      return v.goal ? moved && res.stats.moves >= 2 : taken > 0 && skipped > 0 && moved;
    });
    if (!found) continue;
    world = found.world;
    if (v.goal) {
      // Put the goal where the first goToWall() stops half the time.
      const stop = run("while (robot.canMove()) {\n    robot.move();\n}", world).final;
      if (stop.r === world.start.r && stop.c === world.start.c) continue;
      world = { ...world, goal: g.chance(0.5) ? { r: stop.r, c: stop.c } : null };
      if (!world.goal) {
        const free = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!world.walls.includes(K(r, c)) && K(r, c) !== K(stop.r, stop.c)) free.push({ r, c });
        world.goal = g.pick(free);
      }
      if (run(code, world).error) continue;
    }
    const ifLines = code.split("\n").map((l, i) => (l.trim().startsWith("if (") ? i + 1 : 0)).filter(Boolean);
    return assemble(g, {
      mode: "methods",
      generator: `method-if-${v.gen}`,
      concept: "Methods containing if statements",
      code,
      world,
      ask: { type: g.pick(["state", "state", "location", "moves"]) },
      ghost: false,
      note: "These methods are inside the robot's class. The robot starts the program by calling run(). (This is part of a class, not a complete standalone Java application.)",
      mutations: [
        M("methodOnce"),
        M("staleSensors"),
        { opts: { flipIf: true }, why: `This answer takes the wrong branch of the if statement${ifLines.length > 1 ? "s" : ""} inside the method. The condition is checked again each time the method is called.` },
        M("ignoreWalls"),
        M("bothBranches"),
        M("swapTurns"),
        M("defsExecute"),
      ],
      explain: (res, prog) => {
        const bs = Object.values(res.stats.branches);
        const taken = bs.reduce((s, b) => s + b.then, 0),
          skipped = bs.reduce((s, b) => s + b.else, 0);
        return `${methodsExplain(res, prog).replace(/ The robot ends.*$/, "")} Inside the method, the if condition was true ${plural(taken, "time")} and false ${plural(skipped, "time")}; it is checked each time that line runs, using the robot's position at that moment. ${endSentence(res)}`;
      },
    });
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Mode E: Debug the Robot                                             */
/* ------------------------------------------------------------------ */
export function applyEdit(lines, e) {
  const out = lines.slice();
  if (e.type === "replace") out[e.line - 1] = e.text;
  else if (e.type === "insert") out.splice(e.after, 0, e.text);
  else if (e.type === "swap") [out[e.a - 1], out[e.b - 1]] = [out[e.b - 1], out[e.a - 1]];
  else if (e.type === "delete") out.splice(e.line - 1, 1);
  return out;
}
export function editText(e) {
  const code = (t) => "`" + t.trim() + "`";
  if (e.type === "replace") return `Change line ${e.line} to ${code(e.text)}`;
  if (e.type === "insert") return e.after === 0 ? `Insert ${code(e.text)} before line 1` : `Insert ${code(e.text)} after line ${e.after}`;
  if (e.type === "swap") return `Swap lines ${e.a} and ${e.b}`;
  return `Delete line ${e.line}`;
}
const indentOf = (s) => s.match(/^\s*/)[0];
function passes(lines, world, req) {
  return meetsRequirement(runSource(lines.join("\n"), world), world, req);
}
function symptom(lines, world) {
  const r = runSource(lines.join("\n"), world);
  if (r.error?.kind === "crash") return `Right now, the program stops with a movement error on line ${r.error.line}.`;
  if (r.error) return `Right now, the program stops with an error on line ${r.error.line}.`;
  return `Right now, the robot ends at ${stateText(r.final)}${r.atGoal ? " (on the goal, but facing the wrong way)" : ", not on the goal"}.`;
}
function genericEdits(lines) {
  const edits = [];
  lines.forEach((l, i) => {
    const t = l.trim(),
      n = i + 1,
      sp = indentOf(l);
    if (t === LINE.turnLeft || t === LINE.turnRight) {
      edits.push({ type: "replace", line: n, text: sp + (t === LINE.turnLeft ? LINE.turnRight : LINE.turnLeft), family: "turn" });
      edits.push({ type: "replace", line: n, text: sp + LINE.move, family: "turn" });
    }
    if (t === LINE.move) {
      edits.push({ type: "replace", line: n, text: sp + LINE.turnLeft, family: "move" });
      edits.push({ type: "replace", line: n, text: sp + LINE.turnRight, family: "move" });
    }
    if (t.startsWith("robot.")) edits.push({ type: "insert", after: n, text: sp + LINE.move, family: "insert" });
    if (i + 1 < lines.length && lines[i + 1].trim() !== t && t.startsWith("robot.") && lines[i + 1].trim().startsWith("robot.") && indentOf(lines[i + 1]) === sp)
      edits.push({ type: "swap", a: n, b: n + 1, family: "swap" });
  });
  edits.push({ type: "insert", after: 0, text: (lines[0] ? indentOf(lines[0]) : "") + LINE.move, family: "insert" });
  return edits;
}
function debugAssemble(g, { generator, concept, world, req, bugLines, fix, pool, defect }) {
  if (passes(bugLines, world, req)) return null;
  const fixed = applyEdit(bugLines, fix);
  if (!passes(fixed, world, req)) return null;
  const seenCode = new Set([bugLines.join("\n"), fixed.join("\n")]);
  const outcome = (lines) => {
    const r = runSource(lines.join("\n"), world);
    return r.error ? `err:${r.error.kind}:${r.final.r},${r.final.c}` : `ok:${r.final.r},${r.final.c},${r.final.d}`;
  };
  const seenOutcome = new Set([outcome(bugLines)]);
  const seenText = new Set([editText(fix)]);
  const same = [],
    other = [];
  for (const e of pool) {
    const t = editText(e);
    if (seenText.has(t)) continue;
    const patched = applyEdit(bugLines, e);
    const src = patched.join("\n");
    if (seenCode.has(src)) continue;
    try {
      parse(src);
    } catch {
      continue;
    }
    if (passes(patched, world, req)) continue;
    const o = outcome(patched);
    if (seenOutcome.has(o)) continue; // distractors must represent different results
    seenOutcome.add(o);
    seenCode.add(src);
    seenText.add(t);
    (e.type === fix.type ? same : other).push({ e, patched });
  }
  const picked = [...g.shuffle(same).slice(0, 2)];
  for (const x of g.shuffle([...other, ...same.filter((s) => !picked.includes(s))])) if (picked.length < 3 && !picked.includes(x)) picked.push(x);
  if (picked.length < 3) return null;
  const choices = g.shuffle([
    { key: editText(fix), text: editText(fix), correct: true, lines: fixed, why: "" },
    ...picked.map((p) => {
      const r = runSource(p.patched.join("\n"), world);
      const onGoal = world.goal && r.final.r === world.goal.r && r.final.c === world.goal.c;
      const result = r.error
        ? r.error.kind === "crash"
          ? `the robot ${onGoal ? "reaches the goal but then " : ""}hits a movement error on line ${r.error.line} of the changed program`
          : "the program stops with an error"
        : `the robot ends at ${stateText(r.final)}`;
      return { key: editText(p.e), text: editText(p.e), correct: false, lines: p.patched, why: `With this change, ${result}, so the requirement is still not met.` };
    }),
  ]);
  const goodRun = runSource(fixed.join("\n"), world);
  return {
    id: `ra-${Date.now().toString(36)}-${(serial++).toString(36)}`,
    kind: "debug",
    mode: "debug",
    modeTitle: MODES.debug,
    generator,
    concept,
    prompt: `Requirement: the robot must finish on the goal${req.facing !== undefined ? ` facing ${dirName(req.facing)}` : ""} with no movement error. ${symptom(bugLines, world)}`,
    question: "Which change fixes the program?",
    code: bugLines.join("\n"),
    lines: bugLines,
    world,
    req,
    choices,
    answer: choices.findIndex((c) => c.correct),
    explanation: `${defect} After the fix, ${endSentence(goodRun).replace("The robot", "the robot")} The other three changes were each run in the simulator and do not meet the requirement.`,
    note: "",
  };
}
function debugRoute(g) {
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  const route = randomRoute(g, rows, cols, g.int(5, 7), { minTurns: 2, minMoves: 3 });
  if (!route) return null;
  const world = { rows, cols, walls: [], start: route.start, goal: { r: route.end.r, c: route.end.c } };
  world.walls = placeWalls(g, world, route.cells, g.int(2, 4), route.cells);
  const req = g.chance(0.3) ? { facing: route.end.d } : {};
  return { world, req, lines: route.cmds.map((c) => LINE[c]), cmds: route.cmds };
}
function genDebugTurn(g) {
  const base = debugRoute(g);
  if (!base) return null;
  const turnIdx = base.cmds.map((c, i) => (c !== "move" ? i : -1)).filter((i) => i >= 0);
  const k = g.pick(turnIdx);
  const bug = base.lines.slice();
  bug[k] = LINE[OPP[base.cmds[k]]];
  return debugAssemble(g, {
    generator: "debug-turn-direction",
    concept: "Incorrect turn direction",
    world: base.world,
    req: base.req,
    bugLines: bug,
    fix: { type: "replace", line: k + 1, text: base.lines[k] },
    pool: genericEdits(bug),
    defect: `Line ${k + 1} turned the wrong way: it should call ${base.cmds[k]}() instead of ${OPP[base.cmds[k]]}().`,
  });
}
function genDebugMissing(g) {
  const base = debugRoute(g);
  if (!base) return null;
  const moveIdx = base.cmds.map((c, i) => (c === "move" ? i : -1)).filter((i) => i >= 0);
  const k = g.pick(moveIdx);
  const bug = base.lines.slice();
  bug.splice(k, 1);
  const pool = [];
  for (let a = 0; a <= bug.length; a++) {
    pool.push({ type: "insert", after: a, text: LINE.move });
    pool.push({ type: "insert", after: a, text: LINE[g.pick(["turnLeft", "turnRight"])] });
  }
  return debugAssemble(g, {
    generator: "debug-missing-move",
    concept: "Missing statement",
    world: base.world,
    req: base.req,
    bugLines: bug,
    fix: { type: "insert", after: k, text: LINE.move },
    pool,
    defect: `The route needs one more robot.move() ${k === 0 ? "before line 1" : `after line ${k}`}.`,
  });
}
function genDebugOrder(g) {
  const base = debugRoute(g);
  if (!base) return null;
  const pairs = [];
  for (let i = 0; i + 1 < base.cmds.length; i++) if (base.cmds[i] !== base.cmds[i + 1]) pairs.push(i);
  if (!pairs.length) return null;
  const k = g.pick(pairs);
  const bug = base.lines.slice();
  [bug[k], bug[k + 1]] = [bug[k + 1], bug[k]];
  const pool = [];
  for (let i = 0; i + 1 < bug.length; i++) if (bug[i] !== bug[i + 1]) pool.push({ type: "swap", a: i + 1, b: i + 2 });
  pool.push(...genericEdits(bug).filter((e) => e.type !== "swap"));
  return debugAssemble(g, {
    generator: "debug-command-order",
    concept: "Incorrect command order",
    world: base.world,
    req: base.req,
    bugLines: bug,
    fix: { type: "swap", a: k + 1, b: k + 2 },
    pool,
    defect: `Lines ${k + 1} and ${k + 2} were in the wrong order: the robot must ${base.cmds[k] === "move" ? "move before it turns" : "turn before it moves"} at that point.`,
  });
}
function genDebugBound(g) {
  const rows = g.int(5, 6),
    cols = g.int(6, 8);
  const a = g.int(2, 4),
    b = g.int(2, 4);
  const turn = g.pick(["turnLeft", "turnRight"]);
  const h1 = forHeader(g, a, { styles: ["lt", "le", "gt"] }),
    h2 = forHeader(g, b, { styles: ["lt", "le", "ge"] });
  const lines = [h1.text, pad(1) + LINE.move, "}", LINE[turn], h2.text, pad(1) + LINE.move, "}"];
  const found = findStart(g, { rows, cols, walls: [], goal: null }, lines.join("\n"), 100);
  if (!found) return null;
  const res = found.res;
  let world = { ...found.world, goal: { r: res.final.r, c: res.final.c } };
  world = decorate(g, world, res, g.int(2, 4));
  world.walls = world.walls.filter((k) => k !== K(world.goal.r, world.goal.c));
  const which = g.pick([0, 4]);
  const n = which === 0 ? a : b;
  const style = which === 0 ? h1.style : h2.style;
  const delta = g.pick([-1, 1]);
  const hdr = (count, st) => forHeader(tools(() => 0), count, { styles: [st], var: lines[which].match(/int (\w+)/)[1] }).text;
  const original = lines[which];
  // Recreate the header with a different count but same start value.
  const reCount = (txt, count) => {
    const m = txt.match(/for \(int (\w+) = (\d+); \w+ (<=|<|>=|>) (\d+); (.*)\) \{/);
    const [, v, s0, op, end] = m;
    const s = Number(s0),
      e = Number(end);
    if (op === "<") return `for (int ${v} = ${s}; ${v} < ${s + count}; ${m[5]}) {`;
    if (op === "<=") return `for (int ${v} = ${s}; ${v} <= ${s + count - 1}; ${m[5]}) {`;
    if (op === ">") return `for (int ${v} = ${e + count}; ${v} > ${e}; ${m[5]}) {`;
    return `for (int ${v} = ${e + count - 1}; ${v} >= ${e}; ${m[5]}) {`;
  };
  void hdr;
  void style;
  if (n + delta < 1) return null;
  const bug = lines.slice();
  bug[which] = reCount(original, n + delta);
  const otherIdx = which === 0 ? 4 : 0;
  const otherN = which === 0 ? b : a;
  const pool = [
    { type: "replace", line: which + 1, text: reCount(original, n + 2 * delta) },
    { type: "replace", line: which + 1, text: reCount(original, n + delta + (delta > 0 ? 1 : -1) * 2) },
    { type: "replace", line: otherIdx + 1, text: reCount(lines[otherIdx], otherN - delta) },
    { type: "replace", line: otherIdx + 1, text: reCount(lines[otherIdx], otherN + delta) },
    { type: "replace", line: 4, text: LINE[OPP[turn]] },
    ...genericEdits(bug).filter((e) => e.type === "insert"),
  ].filter((e) => e.text === undefined || !/= -|< 0|<= -|> -|>= -/.test(e.text));
  return debugAssemble(g, {
    generator: "debug-loop-bound",
    concept: "Wrong loop bound",
    world,
    req: {},
    bugLines: bug,
    fix: { type: "replace", line: which + 1, text: original },
    pool,
    defect: `The loop on line ${which + 1} ran ${plural(n + delta, "time")} instead of ${n}.`,
  });
}
function genDebugCondition(g) {
  const variant = g.pick(["overshoot", "never", "branch"]);
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  if (variant === "branch") {
    const n = g.int(4, 6);
    const turn = g.pick(["turnLeft", "turnRight"]);
    const good = ["for (int i = 0; i < " + n + "; i++) {", ...ind(ifBlock("robot.canMove()", ["move"], [turn])), "}"];
    const world0 = { rows, cols, walls: placeWalls(g, { rows, cols, walls: [] }, [], g.int(2, 5)), goal: null };
    const found = findStart(g, world0, good.join("\n"), 60, (res) => (res.stats.branches[2]?.else || 0) >= 1 && res.stats.moves >= 2);
    if (!found) return null;
    const world = { ...found.world, goal: { r: found.res.final.r, c: found.res.final.c } };
    const bug = good.slice();
    bug[1] = pad(1) + "if (!robot.canMove()) {";
    const pool = [
      { type: "replace", line: 2, text: pad(1) + "if (robot.atGoal()) {" },
      { type: "replace", line: 2, text: pad(1) + "if (!robot.atGoal()) {" },
      { type: "replace", line: 2, text: pad(1) + "while (!robot.canMove()) {" },
      { type: "replace", line: 5, text: pad(2) + LINE[OPP[turn]] },
      { type: "replace", line: 3, text: pad(2) + LINE[turn] },
      { type: "replace", line: 1, text: `for (int i = 0; i < ${n + 1}; i++) {` },
      { type: "replace", line: 1, text: `for (int i = 0; i <= ${n + 1}; i++) {` },
    ];
    return debugAssemble(g, { generator: "debug-sensor-branch", concept: "Incorrect use of a robot sensor", world, req: {}, bugLines: bug, fix: { type: "replace", line: 2, text: good[1] }, pool, defect: "The robot should move when the next cell is open, so the condition must be robot.canMove(), not !robot.canMove()." });
  }
  const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
  let room = 0;
  while (inGrid({ rows, cols }, start.r + DR[start.d] * (room + 1), start.c + DC[start.d] * (room + 1))) room++;
  if (room < 3) return null;
  const pre = g.chance(0.4) ? [LINE[g.pick(["turnLeft", "turnRight"])]] : [];
  if (pre.length) return null; // keep corridor geometry simple and verifiable
  let goodCond, badCond, goal, walls = [];
  if (variant === "overshoot") {
    const dist = g.int(1, room - 1);
    goal = { r: start.r + DR[start.d] * dist, c: start.c + DC[start.d] * dist };
    goodCond = "!robot.atGoal()";
    badCond = "robot.canMove()";
  } else {
    const dist = g.int(2, room);
    goal = { r: start.r + DR[start.d] * dist, c: start.c + DC[start.d] * dist };
    if (dist < room) walls.push(K(goal.r + DR[start.d], goal.c + DC[start.d]));
    goodCond = "robot.canMove()";
    badCond = g.pick(["!robot.canMove()", "robot.atGoal()"]);
  }
  const tail = g.chance(0.5) ? [LINE[g.pick(["turnLeft", "turnRight"])]] : [];
  const req = tail.length ? { facing: (start.d + (tail[0] === LINE.turnLeft ? 3 : 1)) % 4 } : {};
  const good = [`while (${goodCond}) {`, pad(1) + LINE.move, "}", ...tail];
  let world = { rows, cols, walls, start, goal };
  const r0 = runSource(good.join("\n"), world);
  if (!meetsRequirement(r0, world, req)) return null;
  world = decorate(g, world, r0, g.int(1, 3));
  world.walls = world.walls.filter((k) => k !== K(goal.r, goal.c));
  const bug = good.slice();
  bug[0] = `while (${badCond}) {`;
  const alts = ["robot.canMove()", "!robot.canMove()", "robot.atGoal()", "!robot.atGoal()", "robot.canMove() || !robot.atGoal()", "robot.atGoal() && robot.canMove()"];
  const pool = [
    ...alts.map((c) => ({ type: "replace", line: 1, text: `while (${c}) {` })),
    { type: "replace", line: 1, text: `if (${goodCond}) {` },
    { type: "replace", line: 1, text: `if (${badCond}) {` },
    { type: "insert", after: 3, text: LINE.move },
  ];
  return debugAssemble(g, {
    generator: `debug-condition-${variant}`,
    concept: "Incorrect loop condition",
    world,
    req,
    bugLines: bug,
    fix: { type: "replace", line: 1, text: good[0] },
    pool,
    defect:
      variant === "overshoot"
        ? "The goal is in the middle of the open path, so the loop must stop when robot.atGoal() becomes true, not when the robot runs out of room."
        : `With while (${badCond}), the condition is already false at the start, so the robot never moves. while (robot.canMove()) keeps moving until the next cell is blocked.`,
  });
}

/* ------------------------------------------------------------------ */
/* Mode C: Build the Route                                             */
/* ------------------------------------------------------------------ */
export const PALETTE = {
  move: { label: "robot.move();", code: LINE.move },
  turnLeft: { label: "robot.turnLeft();", code: LINE.turnLeft },
  turnRight: { label: "robot.turnRight();", code: LINE.turnRight },
  for: { label: "for loop (repeat N times)", block: true },
  whileCanMove: { label: "while (robot.canMove())", block: true, header: "while (robot.canMove()) {" },
  whileNotGoal: { label: "while (!robot.atGoal())", block: true, header: "while (!robot.atGoal()) {" },
};
function bfs(world, facing) {
  const walls = new Set(world.walls);
  const s0 = world.start;
  const key = (s) => `${s.r},${s.c},${s.d}`;
  const prev = new Map([[key(s0), null]]);
  const q = [s0];
  while (q.length) {
    const s = q.shift();
    if (s.r === world.goal.r && s.c === world.goal.c && (facing === undefined || s.d === facing)) {
      const cmds = [];
      let k = key(s);
      while (prev.get(k)) {
        const [pk, cmd] = prev.get(k);
        cmds.unshift(cmd);
        k = pk;
      }
      return cmds;
    }
    const nexts = [
      ["turnLeft", { ...s, d: (s.d + 3) % 4 }],
      ["turnRight", { ...s, d: (s.d + 1) % 4 }],
    ];
    const nr = s.r + DR[s.d],
      nc = s.c + DC[s.d];
    if (inGrid(world, nr, nc) && !walls.has(K(nr, nc))) nexts.unshift(["move", { r: nr, c: nc, d: s.d }]);
    for (const [cmd, n] of nexts)
      if (!prev.has(key(n))) {
        prev.set(key(n), [key(s), cmd]);
        q.push(n);
      }
  }
  return null;
}
export function evaluateBuild(ch, code) {
  let prog;
  try {
    prog = parse(code);
  } catch (e) {
    return { pass: false, results: [], statements: 0, reason: e.message };
  }
  const statements = countStatements(prog);
  const results = ch.worlds.map((w) => run(prog, w));
  const reqs = results.map((r, i) => meetsRequirement(r, ch.worlds[i], ch.req));
  const limitOk = !ch.req.maxStatements || statements <= ch.req.maxStatements;
  let reason = "";
  const bad = results.findIndex((r, i) => !reqs[i]);
  if (bad >= 0) {
    const r = results[bad],
      label = ch.worlds.length > 1 ? ` on Grid ${"AB"[bad]}` : "";
    if (r.error?.kind === "crash") reason = `Movement error on line ${r.error.line}${label}: ${r.error.message}`;
    else if (r.error) reason = `${r.error.message}${label}`;
    else if (!r.atGoal) reason = `The robot ends at ${stateText(r.final)}${label}, not on the goal.`;
    else reason = `The robot reaches the goal${label} but faces ${dirName(r.final.d)} instead of ${dirName(ch.req.facing)}.`;
  } else if (!limitOk) reason = `The program uses ${statements} statements; this challenge allows at most ${ch.req.maxStatements}.`;
  return { pass: bad < 0 && limitOk, results, statements, reason };
}
function buildChallenge(g, spec) {
  const ch = {
    id: `ra-${Date.now().toString(36)}-${(serial++).toString(36)}`,
    kind: "build",
    mode: "build",
    modeTitle: MODES.build,
    generator: spec.generator,
    concept: spec.concept,
    prompt: spec.prompt,
    question: spec.question,
    worlds: spec.worlds,
    world: spec.worlds[0],
    req: spec.req,
    palette: spec.palette,
    reference: spec.reference,
    explanation: spec.explanation,
    note: "",
    code: "",
  };
  if (!evaluateBuild(ch, spec.reference).pass) return null;
  if (evaluateBuild(ch, "").pass) return null;
  return ch;
}
function genBuildPath(g) {
  const facingReq = g.chance(0.35);
  const rows = g.int(4, 6),
    cols = g.int(5, 7);
  const start = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d: g.int(0, 3) };
  const goal = { r: g.int(0, rows - 1), c: g.int(0, cols - 1) };
  if (Math.abs(goal.r - start.r) + Math.abs(goal.c - start.c) < 2) return null;
  const world = { rows, cols, start, goal, walls: [] };
  world.walls = placeWalls(g, world, [K(start.r, start.c), K(goal.r, goal.c)], g.int(3, 6));
  const facing = facingReq ? g.int(0, 3) : undefined;
  const sol = bfs(world, facing);
  if (!sol || sol.length < 4 || sol.length > 8 || !sol.some((c) => c !== "move")) return null;
  const req = facingReq ? { facing } : {};
  return buildChallenge(g, {
    generator: facingReq ? "build-path-facing" : "build-path",
    concept: "Algorithm construction",
    worlds: [world],
    req,
    palette: ["move", "turnLeft", "turnRight"],
    prompt: `Build a program that moves the robot to the goal${facingReq ? ` and leaves it facing ${dirName(facing)}` : ""}. Any working route counts; extra commands are not penalized.`,
    question: "Tap commands to build your program, then press Run Program.",
    reference: sol.map((c) => LINE[c]).join("\n"),
    explanation: `One shortest solution uses ${plural(sol.length, "command")}: ${sol.map((c) => c + "()").join(", ")}.`,
  });
}
function genBuildLoop(g) {
  const pattern = g.pick(["straight", "straight", "stairs"]);
  let code, limit, rows, cols, start, cmds;
  if (pattern === "straight") {
    const a = g.int(3, 5),
      b = g.int(3, 5);
    const turn = g.pick(["turnLeft", "turnRight"]);
    code = [`for (int i = 0; i < ${a}; i++) {`, pad(1) + LINE.move, "}", LINE[turn], `for (int i = 0; i < ${b}; i++) {`, pad(1) + LINE.move, "}"].join("\n");
    limit = 5;
    rows = 6;
    cols = 7;
  } else {
    const n = g.int(3, 4);
    const [t1, t2] = g.pick([["turnLeft", "turnRight"], ["turnRight", "turnLeft"]]);
    code = [`for (int i = 0; i < ${n}; i++) {`, ...ind([LINE.move, LINE[t1], LINE.move, LINE[t2]]), "}"].join("\n");
    limit = 6;
    rows = 6;
    cols = 7;
  }
  const found = findStart(g, { rows, cols, walls: [], goal: null }, code, 150);
  if (!found) return null;
  let world = { ...found.world, goal: { r: found.res.final.r, c: found.res.final.c } };
  world = decorate(g, world, found.res, g.int(3, 6));
  world.walls = world.walls.filter((k) => k !== K(world.goal.r, world.goal.c));
  const sol = bfs(world);
  if (!sol || sol.length <= limit) return null;
  void cmds;
  void start;
  return buildChallenge(g, {
    generator: `build-loop-${pattern}`,
    concept: "Building with for loops",
    worlds: [world],
    req: { maxStatements: limit },
    palette: ["move", "turnLeft", "turnRight", "for"],
    prompt: `Move the robot to the goal using at most ${limit} statements. A for loop counts as 1 statement, plus each statement inside it.`,
    question: "Build your program, then press Run Program.",
    reference: code,
    explanation: `A loop removes repetition. One solution with ${countStatements(code)} statements:\n${code}`,
  });
}
function genBuildGeneral(g) {
  const variant = g.pick(["wall", "twoLeg", "midGoal"]);
  const rows = 6,
    cols = 7;
  const d = g.int(0, 3);
  const turn = g.pick(["turnLeft", "turnRight"]);
  const d2 = (d + (turn === "turnLeft" ? 3 : 1)) % 4;
  const make = (len1, len2) => {
    // Start position chosen so both legs fit.
    for (let t = 0; t < 60; t++) {
      const s = { r: g.int(0, rows - 1), c: g.int(0, cols - 1), d };
      const walls = [];
      let r = s.r,
        c = s.c;
      const cells = [K(r, c)];
      let ok = true;
      for (let i = 0; i < len1; i++) {
        r += DR[d];
        c += DC[d];
        if (!inGrid({ rows, cols }, r, c)) ok = false;
        cells.push(K(r, c));
      }
      if (!ok) continue;
      let goal;
      if (variant === "midGoal") {
        goal = { r, c };
        // more open cells beyond the goal so canMove alone overshoots
        if (!inGrid({ rows, cols }, r + DR[d], c + DC[d])) continue;
      } else if (variant === "wall") {
        goal = { r, c };
        if (inGrid({ rows, cols }, r + DR[d], c + DC[d])) walls.push(K(r + DR[d], c + DC[d]));
      } else {
        if (inGrid({ rows, cols }, r + DR[d], c + DC[d])) walls.push(K(r + DR[d], c + DC[d]));
        for (let i = 0; i < len2; i++) {
          r += DR[d2];
          c += DC[d2];
          if (!inGrid({ rows, cols }, r, c) || walls.includes(K(r, c))) ok = false;
          cells.push(K(r, c));
        }
        if (!ok) continue;
        goal = { r, c };
        if (inGrid({ rows, cols }, r + DR[d2], c + DC[d2])) walls.push(K(r + DR[d2], c + DC[d2]));
      }
      const w = { rows, cols, start: s, goal, walls };
      w.walls = placeWalls(g, w, cells, g.int(1, 3), []);
      return w;
    }
    return null;
  };
  const l1a = g.int(1, 3),
    l1b = l1a + g.int(1, 2);
  const l2a = g.int(1, 3),
    l2b = g.int(1, 3);
  const A = make(l1a, l2a),
    B = make(l1b, l2b);
  if (!A || !B) return null;
  const off = (w) => `${w.goal.r - w.start.r},${w.goal.c - w.start.c}`;
  if (off(A) === off(B)) return null;
  let reference;
  if (variant === "wall") reference = ["while (robot.canMove()) {", pad(1) + LINE.move, "}"];
  else if (variant === "midGoal") reference = ["while (!robot.atGoal()) {", pad(1) + LINE.move, "}"];
  else reference = ["while (robot.canMove()) {", pad(1) + LINE.move, "}", LINE[turn], "while (robot.canMove()) {", pad(1) + LINE.move, "}"];
  return buildChallenge(g, {
    generator: `build-general-${variant}`,
    concept: "General algorithms with sensors",
    worlds: [A, B],
    req: {},
    palette: ["move", "turnLeft", "turnRight", "whileCanMove", "whileNotGoal", "for"],
    prompt: "Build ONE program that moves the robot to the goal on BOTH Grid A and Grid B. The distances are different, so use a sensor-controlled while loop.",
    question: "Build your program, then press Run Program. It runs on both grids.",
    reference: reference.join("\n"),
    explanation: `A fixed list of moves cannot work for two different distances. One general solution:\n${reference.join("\n")}`,
  });
}

/* ------------------------------------------------------------------ */
/* Registry, generation, validation                                    */
/* ------------------------------------------------------------------ */
export const GENERATORS = {
  predict: [
    ["sequence", genPredictSequence, 3],
    ["outcome", genPredictOutcome, 2],
  ],
  loops: [
    ["for-count", genLoopCount, 2],
    ["for-turns", genLoopTurns, 2],
    ["while-sensor", genLoopWhile, 2],
    ["while-counter", genLoopCounter, 1],
    ["nested", genLoopNested, 1],
    ["for-if-counter", genLoopIfCounter, 2],
    ["for-if-sensor", genLoopIfSensor, 2],
    ["while-if", genLoopWhileIf, 2],
  ],
  build: [
    ["path", genBuildPath, 3],
    ["loop", genBuildLoop, 2],
    ["general", genBuildGeneral, 2],
  ],
  conditionals: [
    ["if-else", genCondSingle, 2],
    ["sequence", genCondSequence, 2],
    ["compound", genCondCompound, 2],
    ["in-loop", genCondLoop, 2],
  ],
  debug: [
    ["turn", genDebugTurn, 2],
    ["bound", genDebugBound, 2],
    ["condition", genDebugCondition, 2],
    ["missing", genDebugMissing, 2],
    ["order", genDebugOrder, 2],
  ],
  methods: [
    ["basic", genMethodsBasic, 2],
    ["loop", genMethodsLoop, 2],
    ["nested", genMethodsNested, 2],
    ["param", genMethodsParam, 2],
    ["if", genMethodsIf, 3],
  ],
};
export function generate(mode = "mixed", rng = Math.random, { exclude = [], avoid = new Set(), lastFamily = null } = {}) {
  const g = tools(rng);
  let m = mode;
  if (m === "mixed") {
    const options = Object.keys(MODES).filter((x) => !exclude.includes(x));
    m = g.pick(options.length ? options : Object.keys(MODES));
  }
  const list = GENERATORS[m];
  if (!list) throw new Error(`Unknown mode ${mode}`);
  const total = list.reduce((s, x) => s + x[2], 0);
  const roll = () => {
    let r = g.rng() * total;
    for (const x of list) if ((r -= x[2]) < 0) return x;
    return list[list.length - 1];
  };
  for (let round = 0; round < 20; round++) {
    // Choose the generator family first so families that need more retries
    // still appear at their intended rate; avoid repeating the last family.
    let gen = roll();
    if (lastFamily && list.length > 1 && `${m}:${gen[0]}` === lastFamily) gen = roll();
    for (let attempt = 0; attempt < 80; attempt++) {
      const ch = gen[1](g);
      if (!ch) continue;
      if (avoid.has(signature(ch))) continue;
      if (!validateChallenge(ch).ok) continue;
      ch.family = `${m}:${gen[0]}`;
      return ch;
    }
  }
  throw new Error(`Could not generate a valid ${m} challenge`);
}
export function signature(ch) {
  return ch.kind === "build" ? `${ch.generator}|${JSON.stringify(ch.worlds)}` : `${ch.generator}|${ch.code}|${JSON.stringify(ch.world.start)}`;
}
export function validateChallenge(ch) {
  const errors = [];
  const fail = (m) => errors.push(m);
  try {
    if (ch.kind === "build") {
      if (!evaluateBuild(ch, ch.reference).pass) fail("reference solution fails");
      if (evaluateBuild(ch, "").pass) fail("empty program passes");
      for (const w of ch.worlds) {
        if (!w.goal) fail("missing goal");
        if (w.walls.includes(K(w.goal.r, w.goal.c))) fail("goal on obstacle");
        if (w.walls.includes(K(w.start.r, w.start.c))) fail("start on obstacle");
      }
      return { ok: !errors.length, errors };
    }
    if (!Array.isArray(ch.choices) || ch.choices.length !== 4) fail("needs exactly four choices");
    const keys = new Set(ch.choices.map((c) => c.key)),
      texts = new Set(ch.choices.map((c) => c.text));
    if (keys.size !== 4 || texts.size !== 4) fail("duplicate choices");
    if (ch.choices.filter((c) => c.correct).length !== 1) fail("must have exactly one correct choice");
    if (!ch.choices[ch.answer]?.correct) fail("answer index mismatch");
    if (ch.world.walls.includes(K(ch.world.start.r, ch.world.start.c))) fail("start on obstacle");
    if (ch.kind === "debug") {
      const passing = ch.choices.filter((c) => passes(c.lines, ch.world, ch.req));
      if (passing.length !== 1 || !passing[0].correct) fail("exactly one correction must satisfy the requirement");
      if (passes(ch.lines, ch.world, ch.req)) fail("original program already satisfies requirement");
      for (const c of ch.choices) {
        try {
          parse(c.lines.join("\n"));
        } catch {
          fail("a correction is not valid Java in the supported grammar");
        }
        if (applyEditFromText(ch.lines, c.text) !== c.lines.join("\n")) fail("choice text does not describe its program");
      }
      if (new Set(ch.choices.map((c) => c.lines.join("\n"))).size !== 4) fail("two corrections produce the same program");
    } else {
      const res = run(parse(ch.code), ch.world);
      const k = keyFor(ch.ask, res);
      if (k !== ch.choices[ch.answer]?.key) fail(`simulated answer ${k} differs from marked answer`);
      for (const c of ch.choices) if (!plausible(c.key, ch.world, true)) fail("implausible choice " + c.key);
      if (ch.choices.some((c) => !c.correct && !c.why)) fail("distractor without a misconception");
    }
  } catch (e) {
    fail("exception: " + e.message);
  }
  return { ok: !errors.length, errors };
}
/* Re-derive a debug choice's program from its displayed text, proving the
   text students read is exactly the edit that was simulated. */
export function applyEditFromText(lines, text) {
  const strip = (s) => s.replace(/^`|`$/g, "");
  let m;
  const withIndent = (lineNo, t) => indentOf(lines[lineNo - 1] || "") + t;
  if ((m = text.match(/^Change line (\d+) to (`.*`)$/))) return applyEdit(lines, { type: "replace", line: +m[1], text: withIndent(+m[1], strip(m[2])) }).join("\n");
  if ((m = text.match(/^Insert (`.*`) before line 1$/))) return applyEdit(lines, { type: "insert", after: 0, text: indentOf(lines[0] || "") + strip(m[1]) }).join("\n");
  if ((m = text.match(/^Insert (`.*`) after line (\d+)$/))) {
    const after = +m[2];
    const ref = lines[after - 1] || "";
    const sp = /\{\s*$/.test(ref) ? indentOf(ref) + "    " : indentOf(ref);
    return applyEdit(lines, { type: "insert", after, text: sp + strip(m[1]) }).join("\n");
  }
  if ((m = text.match(/^Swap lines (\d+) and (\d+)$/))) return applyEdit(lines, { type: "swap", a: +m[1], b: +m[2] }).join("\n");
  if ((m = text.match(/^Delete line (\d+)$/))) return applyEdit(lines, { type: "delete", line: +m[1] }).join("\n");
  return null;
}
