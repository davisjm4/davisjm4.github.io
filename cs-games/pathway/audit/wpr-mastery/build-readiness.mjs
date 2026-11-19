// Builds the 30-skill readiness matrix from the release audit. Run with --check in CI.
import fs from 'node:fs';
import {auditRelease,assertReleaseGate} from './release-audit.mjs';
import {loadCatalog} from './coverage.mjs';
import {authoredItems} from '../../../../wpr-games/workplace-readiness/service/issued-practice-bank.mjs';

const report=auditRelease(loadCatalog());
assertReleaseGate(report);
const rows=[['skill','tier','required_questions','composed_families_retained','server_scoreable_families','content_quality_status','automatic_mastery_eligible','remaining_gap']];
for (const s of report.skills) {
  const ready=s.disposition==='ready-pending-release-review';
  const gap=ready?'none for content; needs release review, rebase and activation decision':
    `${s.minimum-s.serverScoreableUnits} more independently server-scoreable families (authored 0; ${s.retainedUnits} composed families are practice-only)`;
  rows.push([s.concept,s.tier,s.minimum,s.retainedUnits,s.serverScoreableUnits,ready?'gate-passed; single-reader adversarial review':'not authored',
    ready?'not yet (WPR_AUTOMATIC intentionally empty)':'no',gap]);
}
const csv=rows.map(r=>r.map(c=>/[",]/.test(String(c))?'"'+c+'"':c).join(',')).join('\n')+'\n';
const out=new URL('../../reports/wpr-mastery/READINESS_MATRIX.csv',import.meta.url);
if (process.argv.includes('--check')) { if (fs.readFileSync(out,'utf8')!==csv) throw new Error('Stale readiness matrix'); }
else fs.writeFileSync(out,csv);
console.log(rows.length-1,'skills;',authoredItems.length,'authored families');
