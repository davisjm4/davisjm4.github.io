/* Method & Constructor Lab: javac/JVM verification (needs a JDK, 11+).
   Run from the repository root:  node tests/method-constructor-lab-jvm.test.js
   Generates challenges in every mode and, for each one, compiles the Java
   behind it with the real compiler: the displayed code must compile; every
   choice marked valid must compile; every choice marked invalid must fail;
   and returned values / which-overload answers are confirmed by running the
   program on the JVM. Not used by students. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const ROOT = path.resolve(__dirname, "..");
const PER_MODE = Number(process.env.MCL_JVM_PER_MODE || 100);

(async () => {
  try {
    execFileSync("java", ["-version"], { stdio: "ignore" });
  } catch {
    console.log("SKIPPED: java not found on PATH (this optional test needs a JDK).");
    return;
  }
  const E = await import(pathToFileURL(path.join(ROOT, "java-games", "method-constructor-lab", "engine.js")).href);
  const checks = [];
  const perMode = {};
  for (const mode of Object.keys(E.MODES)) {
    const rng = E.makeRng(9100 + mode.length * 13);
    for (let i = 0; i < PER_MODE; i++) {
      const ch = E.generate(mode, rng);
      if (!ch.javaChecks.length) throw new Error(`${mode} ${ch.generator} has no Java checks`);
      // Every invalid choice of a "which compiles" question must have a check
      for (const c of ch.javaChecks) checks.push({ ...c, mode, generator: ch.generator, question: ch.question });
      perMode[mode] = (perMode[mode] || 0) + ch.javaChecks.length;
    }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcl-jvm-"));
  const manifest = checks
    .map((c, i) => [`@@CHECK c${i} ${c.main || "-"}`, ...c.files.flatMap((f) => [`@@FILE ${f.name}`, f.source]), "@@END"].join("\n"))
    .join("\n");
  fs.writeFileSync(path.join(dir, "manifest.txt"), manifest);
  const out = execFileSync("java", [path.join(__dirname, "MethodLabCompile.java"), path.join(dir, "manifest.txt")], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"] });
  const results = new Map(out.trim().split("\n").map((l) => {
    const [id, status, b64 = ""] = l.split(" ");
    return [id, { status, text: Buffer.from(b64, "base64").toString("utf8") }];
  }));
  let failures = 0;
  checks.forEach((c, i) => {
    const r = results.get(`c${i}`);
    const problem = !r
      ? "no result"
      : c.expect === "ok" && r.status !== "OK"
        ? `expected to compile but failed: ${r.text}`
        : c.expect === "error" && r.status !== "ERROR"
          ? "expected a compile error but it compiled"
          : c.output !== undefined && r.text.trim() !== c.output.trim()
            ? `expected output ${JSON.stringify(c.output)} but got ${JSON.stringify(r.text)}`
            : c.outputNot !== undefined && r.text.trim() === c.outputNot.trim()
              ? "wrong-logic distractor produced the correct output"
              : "";
    if (problem) {
      failures++;
      if (failures <= 10) console.error(`FAIL [${c.mode} ${c.generator}] ${c.choice ? `choice ${JSON.stringify(c.choice)}: ` : ""}${problem}\n${c.files.map((f) => `--- ${f.name}\n${f.source}`).join("\n")}\n`);
    }
  });
  fs.rmSync(dir, { recursive: true, force: true });
  if (failures) {
    console.error(`Method & Constructor Lab JVM: ${failures} of ${checks.length} checks failed.`);
    process.exit(1);
  }
  const compiled = checks.filter((c) => c.expect === "ok").length;
  const rejected = checks.length - compiled;
  const ran = checks.filter((c) => c.output !== undefined || c.outputNot !== undefined).length;
  console.log(`Method & Constructor Lab JVM: ${checks.length} Java checks from ${PER_MODE} challenges per mode passed (${compiled} programs compiled as expected, ${rejected} invalid choices rejected by javac, ${ran} programs run with verified output). By mode: ${JSON.stringify(perMode)}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
