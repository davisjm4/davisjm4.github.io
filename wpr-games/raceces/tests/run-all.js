/* Runs every Node test, writes tests/results/*.json used to generate TEST_RESULTS.md. */
const T = require('./lib.js');
const { runEngineTests } = require('./engine-tests.js');
const sweep = require('./sweep.js');
const repetitionQuality = require('./repetition-quality.js');

const extra = runEngineTests();
let stats;
T.suite('generation sweep (' + 'all modes, difficulties, targets)', () => { stats = sweep.run(); });
let qualityReport = [];
T.suite('procedural diversity quality gates (1,000 per mode/difficulty)', () => { qualityReport = repetitionQuality.run(); });
const sum = T.summary();
const ser = o => JSON.parse(JSON.stringify(o, (k, v) => (v instanceof Set ? { size: v.size } : v)));
T.write('unit-results.json', Object.assign(sum, { ranAt: new Date().toISOString() }));
T.write('sweep.json', ser(stats));
T.write('rotation.json', extra.rotation);
T.write('distractors.json', extra.distractorKinds);
T.write('contrast.json', extra.contrast);
T.write('quality-results.json', qualityReport);
console.log('Node checks:', sum.totalChecks, 'failed:', sum.failedChecks);
sum.suites.forEach(s => console.log(' -', s.name, s.checks, 'checks', s.failed ? 'FAILED ' + s.failed : 'ok', s.sampleFailures.join(' | ')));
console.log('Challenges generated and verified:', stats.total, '(build sweep ' + stats.buildTotal + ', gameplay path ' + stats.gameplayTotal + ')');
process.exit(sum.failedChecks ? 1 : 0);
