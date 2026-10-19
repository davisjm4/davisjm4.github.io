/* Minimal test harness: counts every assertion, collects failures, writes JSON results. */
const fs = require('fs');
const path = require('path');
const state = { suites: [], checks: 0, failures: [], cur: null };

function suite(name, fn) {
  const s = { name, checks: 0, failures: [], ms: 0 };
  state.cur = s; state.suites.push(s);
  const t0 = Date.now();
  try { fn(); } catch (e) { s.failures.push('EXCEPTION: ' + (e && e.stack || e)); }
  s.ms = Date.now() - t0;
  state.cur = null;
}
function ok(cond, msg) {
  state.checks++; if (state.cur) state.cur.checks++;
  if (!cond) {
    const m = (state.cur ? state.cur.name + ': ' : '') + msg;
    if (state.cur && state.cur.failures.length < 25) state.cur.failures.push(msg);
    if (state.failures.length < 100) state.failures.push(m);
    state.failCount = (state.failCount || 0) + 1;
    if (state.cur) state.cur.failCount = (state.cur.failCount || 0) + 1;
  }
  return cond;
}
function eq(a, b, msg) { return ok(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')'); }
function summary() {
  return {
    generatedBy: 'tests/run-all.js',
    totalChecks: state.checks,
    failedChecks: state.failCount || 0,
    suites: state.suites.map(s => ({ name: s.name, checks: s.checks, failed: s.failCount || 0, ms: s.ms, sampleFailures: s.failures.slice(0, 5) }))
  };
}
function write(name, obj) {
  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2));
}
module.exports = { suite, ok, eq, summary, write, state };
