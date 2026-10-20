/* Tiny zero-dependency test harness shared by the suites. */
import assert from "node:assert/strict";
export let checks = 0;
export const ok = (v, msg) => { assert.ok(v, msg); checks++; };
export const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };
const sections = [];
export async function section(name, fn) {
  const before = checks;
  const t0 = Date.now();
  await fn();
  sections.push({ name, checks: checks - before, ms: Date.now() - t0 });
  console.log(`  ✓ ${name} (${checks - before} checks, ${Date.now() - t0} ms)`);
}
export const summary = () => ({ checks, sections });
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
