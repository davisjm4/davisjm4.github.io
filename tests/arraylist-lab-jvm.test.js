/* ArrayList Lab: javac/JVM verification (needs a JDK 11+; not used by students).
   Run from the repository root:  node tests/arraylist-lab-jvm.test.js
   (or from java-games/:           npm run test:arraylist-jvm)
   Generates challenges from EVERY template and compiles/runs the Java behind
   each one with the real compiler and JVM:
   - the shown code + starting list must print exactly the engine's answer;
   - statement/loop choices are each run and must print the engine's
     simulated result (so exactly one choice reaches the goal);
   - declaration/autoboxing/array-syntax choices must compile or fail
     exactly as the engine claims. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const ROOT = path.resolve(__dirname, "..");
const PER_TEMPLATE = Number(process.env.ARRAYLIST_JVM_PER_TEMPLATE || 40);

(async () => {
  try {
    execFileSync("java", ["-version"], { stdio: "ignore" });
  } catch {
    console.log("SKIPPED: java not found on PATH (this optional test needs a JDK).");
    return;
  }
  const E = await import(pathToFileURL(path.join(ROOT, "java-games", "arraylist-lab", "engine.js")).href);
  const checks = [];
  const perFamily = {};
  const rng = E.makeRng(20261016);
  for (const tpl of E.TEMPLATES) {
    for (let i = 0; i < PER_TEMPLATE; i++) {
      const ch = E.generateFromTemplate(tpl, rng);
      if (!ch.javaChecks.length) throw new Error(`${tpl.id} has no Java checks`);
      for (const c of ch.javaChecks) checks.push({ ...c, template: tpl.id, question: ch.question });
      perFamily[ch.family] = (perFamily[ch.family] || 0) + ch.javaChecks.length;
    }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arraylist-jvm-"));
  const manifest = checks.map((c, i) => [`@@CHECK c${i} ${c.expect === "ok" ? "Main" : "-"}`, "@@FILE Main.java", c.source, "@@END"].join("\n")).join("\n");
  fs.writeFileSync(path.join(dir, "manifest.txt"), manifest);
  const javaVersion = execFileSync("java", ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) || "";
  const out = execFileSync("java", [path.join(__dirname, "ArrayListLabCompile.java"), path.join(dir, "manifest.txt")], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"] });
  const results = new Map(
    out
      .trim()
      .split("\n")
      .map((l) => {
        const [id, status, b64 = ""] = l.split(" ");
        return [id, { status, text: Buffer.from(b64, "base64").toString("utf8") }];
      }),
  );
  let failures = 0;
  checks.forEach((c, i) => {
    const r = results.get(`c${i}`);
    const problem = !r
      ? "no result"
      : c.expect === "ok" && r.status !== "OK"
        ? `expected to compile but failed: ${r.text}`
        : c.expect === "error" && r.status !== "ERROR"
          ? "expected a compile error but it compiled"
          : c.output !== undefined && r.text.trim() !== String(c.output).trim()
            ? `expected output ${JSON.stringify(c.output)} but got ${JSON.stringify(r.text)}`
            : "";
    if (problem) {
      failures++;
      if (failures <= 12) console.error(`FAIL [${c.template} · ${c.label}] ${problem}\n${c.source}\n`);
    }
  });
  fs.rmSync(dir, { recursive: true, force: true });
  if (failures) {
    console.error(`ArrayList Lab JVM: ${failures} of ${checks.length} checks failed.`);
    process.exit(1);
  }
  const compiled = checks.filter((c) => c.expect === "ok").length;
  const ran = checks.filter((c) => c.output !== undefined).length;
  console.log(`ArrayList Lab JVM: all ${checks.length} Java checks passed (${PER_TEMPLATE} challenges × ${E.TEMPLATES.length} templates). ${compiled} programs compiled, ${ran} of them run with output equal to the engine's answer, ${checks.length - compiled} invalid choices rejected by javac. Checks by family: ${JSON.stringify(perFamily)}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
