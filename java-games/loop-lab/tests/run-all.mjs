/* Runs every Loop Lab suite in order, records each result, then regenerates the reports.
 * Usage: node tests/run-all.mjs [--quick]
 * Environment: JAVA_HOME (JVM suite), CHROME_PATH / PUPPETEER_CORE_PATH / JAVA_GAMES_DIR (browser suite).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
const quick = process.argv.includes("--quick");
const only = process.argv.includes("--suite") ? Number(process.argv[process.argv.indexOf("--suite") + 1]) : null; // 0-based; merges into the existing summary
const suites = [
  ["Original Loop Lab test (updated)", ["loop-redesign-tests.mjs"]],
  ["Engine correctness", ["tests/engine.test.mjs", ...(quick ? ["150", "40"] : ["1200", "300"])]],
  ["Diversity", ["tests/diversity.test.mjs", ...(quick ? ["200", "60", "2"] : ["1000", "1000", "5"])]],
  ["JVM verification", ["tests/jvm.test.mjs", ...(quick ? ["6", "15"] : ["40", "60"])]],
  ["Browser (Chromium)", ["tests/browser.test.mjs"]],
];
const dir = new URL("..", import.meta.url).pathname, results = [];
let failed = 0;
for (const [idx, [name, args]] of suites.entries()) {
  if (only !== null && idx !== only) continue;
  const t = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26 });
  const out = (r.stdout || "").trim().split("\n").filter(Boolean);
  const status = r.status !== 0 ? "FAILED" : /SKIPPED/.test(out.at(-1) || "") ? "SKIPPED" : "PASSED";
  if (status === "FAILED") failed++;
  results.push({ name, command: `node ${args.join(" ")}`, status, seconds: (Date.now() - t) / 1000, summary: status === "FAILED" ? (r.stderr || "").split("\n").find((l) => /Error/.test(l)) || out.at(-1) : out.at(-1) });
  console.log(`${status.padEnd(8)} ${name} — ${results.at(-1).summary}`);
}
fs.mkdirSync(dir + "reports", { recursive: true });
let merged = results;
if (only !== null) { try { const prev = JSON.parse(fs.readFileSync(dir + "reports/run-summary.json", "utf8")); if (!!prev.quick === quick) { merged = suites.map(([n]) => results.find((r) => r.name === n) || prev.results.find((r) => r.name === n)).filter(Boolean); } } catch {} }
fs.writeFileSync(dir + "reports/run-summary.json", JSON.stringify({ ranAt: new Date().toISOString(), quick, node: process.version, results: merged }, null, 1));
spawnSync(process.execPath, ["tools/gen-reports.mjs"], { cwd: dir, stdio: "inherit" });
process.exit(failed ? 1 : 0);
