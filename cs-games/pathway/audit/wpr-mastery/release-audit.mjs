import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {loadCatalog,TIER_QUESTIONS} from './coverage.mjs';
import {reviewedPrimary} from '../../wpr-primary-concepts.mjs';
import {WPR_AUTOMATIC,WPR_CANDIDATE_TIERS} from '../../mastery/wpr-automatic.mjs';
import {items,authoredItems} from '../../../../wpr-games/workplace-readiness/service/issued-practice-bank.mjs';
import {itemIssues,bankIssues,cueFailures,cueReport} from './authored-bank.mjs';

const require=createRequire(import.meta.url);
const game='../../../../wpr-games/workplace-readiness/';
const selector=require(game+'js/compose/selector.js');
const order=require(game+'js/core/order.js');
const normalize = text => String(text??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const count = text => normalize(text).split(' ').filter(Boolean).length;
const biggest = array => Math.max(...array);
const overlap = (a,b) => {
  const A=new Set(normalize(a).split(' ')), B=new Set(normalize(b).split(' '));
  return [...A].filter(word=>B.has(word)).length/new Set([...A,...B]).size;
};
const replacements = {
  'c:saf-chemical-task/report-after':'Routine restocking does not assess emergency protocols.',
  'c:tea-team-project/support-teammate':'Offering help does not recognize another person’s contribution.',
  'c:raw-delay-email/verify-before-writing':'The preferred order and the attributed writing skill were not established.',
};
const competing = {
  'c:cus-counter-request/stay-within-authority':'Ordering could change without violating a stated dependency.',
  'c:big-closing-impacts/reduce-waste':'The decisive requirement concerns following a shutdown rule.',
  'c:ite-sharing-file/protect-confidential-data':'The decisive issue is privacy, and application access can precede the proposed first step.',
  'c:lis-group-update/match-audience':'The question does not prioritize the competing language and audibility constraints.',
  'c:car-paycheck/understand-pay':'Payroll and rest-break steps are independent in the given scenario.',
};

export function structuralIssues(q) {
  const issues=new Set();
  if (count(q.scenario)<5 || count(q.prompt)<3) issues.add('missing-context-or-prompt');
  if (q.options) {
    const texts=q.options.map(option=>normalize(option.text));
    const best=q.options.find(option=>option.id===q.key?.bestId);
    if (texts.length!==4 || texts.some(text=>!text) || new Set(texts).size!==texts.length) issues.add('duplicate-or-missing-option');
    if (!best || q.options.filter(o=>q.key?.options?.[o.id]?.role==='best').length!==1 ||
        q.key?.options?.[best?.id]?.role!=='best') issues.add('inconsistent-key');
    if (q.options.some(option=>count(q.key?.options?.[option.id]?.why)<3)) issues.add('missing-option-explanation');
    if (best && q.options.some(o=>o.id!==best.id && overlap(o.text,best.text)>=0.9)) issues.add('near-duplicate-best-option');
  } else if(q.mode==='order') {
    const ids=q.steps.map(step=>step.id);
    const dependencies=q.key.precedence??q.key.relations;
    if (Array.isArray(dependencies) && (!dependencies.every(({before,after})=>ids.includes(before) && ids.includes(after)) ||
        !order.solution(ids,dependencies) || !order.isValid(q.key.example,ids,dependencies))) issues.add('invalid-order-key');
  }
  return [...issues];
}

export function auditRelease({hybrid}, samples=18000) {
  const {challenges}=selector.generateMany(hybrid,samples,{seed:'wpr-release-adversarial-v2',filters:{}});
  const families=new Map();
  const byText=new Map();
  for (const q of challenges) {
    const primary=reviewedPrimary(q);
    if (!primary || !Object.hasOwn(WPR_CANDIDATE_TIERS,primary.conceptId)) continue;
    const {key,conceptId}=primary;
    const r=families.get(key)??{key,conceptId,examples:0,choice:0,position:[0,0,0,0],lengthCue:0,shortCue:0,wordingCue:0,contexts:new Set(),flags:new Set()};
    r.examples++;
    r.contexts.add(q.context);
    for(const issue of structuralIssues(q)) r.flags.add(issue);
    const signature=normalize([q.prompt,q.scenario,...(q.options??q.steps??[]).map(o=>o.text).sort()].join(' '));
    const match=byText.get(signature);
    if(match && match!==key && q.options) r.flags.add('same-situation-and-choices-as-another-family');
    else byText.set(signature,key);
    if (q.options) {
      const pos=q.options.findIndex(o=>o.id===q.key.bestId);
      const words=q.options.map(o=>count(o.text));
      const modal=q.options.map(o=>/\b(always|never|immediately|ignore|only)\b/i.test(o.text));
      if(pos>=0) {
        r.choice++;r.position[pos]++;
        if(words[pos]===biggest(words) && words.filter(n=>n===words[pos]).length===1)r.lengthCue++;
        if(words[pos]===Math.min(...words) && words.filter(n=>n===words[pos]).length===1)r.shortCue++;
        if(modal[pos] && modal.filter(Boolean).length===1)r.wordingCue++;
      }
    }
    families.set(key,r);
  }
  const rows=[...families.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(r=>{
    if (r.choice>=20 && biggest(r.position)/r.choice>0.55) r.flags.add('answer-position-pattern');
    if (r.choice>=20 && biggest([r.lengthCue,r.shortCue])/r.choice>0.60) r.flags.add('answer-length-shortcut');
    if (r.choice>=20 && r.wordingCue/r.choice>0.60) r.flags.add('answer-wording-shortcut');
    if (replacements[r.key] || competing[r.key]) r.flags.add(replacements[r.key]??competing[r.key]);
    return {...r,contexts:[...r.contexts].sort(),flags:[...r.flags].sort(),
      disposition:replacements[r.key]?'replaced-for-server-checked-practice':r.flags.size?'excluded-from-mastery':'retained-for-ordinary-practice'};
  });
  const skills=Object.entries(WPR_CANDIDATE_TIERS).map(([concept,tier])=>{
    const candidates=rows.filter(r=>r.conceptId===concept);
    const issued=items.filter(i=>i.concept===concept);
    const minimum=TIER_QUESTIONS[tier];
    // Each independently reasoned unit may contribute one question. A new skin or
    // numeric draw cannot expand this ceiling. Include practice-only units for an upper bound.
    // A server-checked unit is one authored family: a distinct decision with its own decisive stated fact.
    const authored=authoredItems.filter(i=>i.concept===concept);
    const itemFlags=authored.filter(i=>itemIssues(i).length).length;
    const cueFlags=authored.length?cueFailures(authored):[];
    const pooled=bankIssues(authored).length;
    const ready=authored.length+issued.filter(i=>!authored.includes(i)).length>=minimum && !itemFlags && !cueFlags.length && !pooled;
    return {concept,tier,minimum,originalUnits:candidates.length,retainedUnits:candidates.filter(r=>!r.flags.length).length,
      repairedUnits:issued.length,authoredUnits:authored.length,serverScoreableUnits:issued.length,
      optimisticUpperBound:candidates.length+issued.length,
      disposition:ready?'ready-pending-release-review':'insufficient-diversity',automatic:false};
  });
  const authoredCues=Object.fromEntries([...new Set(authoredItems.map(i=>i.concept))].sort().map(c=>[c,cueReport(authoredItems.filter(i=>i.concept===c))]));
  return {samples:challenges.length,families:rows,skills,serverCheckedFamilies:items.map(item=>item.family),authoredCues};
}

export function assertReleaseGate(report) {
  for (const item of items) {
    const opts=item.choices.map((text,i)=>({id:String(i),text}));
    const flags=structuralIssues({...item,options:opts,key:{bestId:String(item.best),options:Object.fromEntries(
      opts.map(({id},i)=>[id,{role:i===item.best?'best':'plausible',why:item.comparison[i]}]))}});
    if (flags.length || !item.why || !Object.hasOwn(WPR_CANDIDATE_TIERS,item.concept)) {
      throw new Error(`Invalid server practice family ${item.family}: ${flags.join(', ')}`);
    }
  }
  for (const [i,item] of items.entries()) {
    if(items.slice(i+1).some(peer=>overlap(item.scenario+' '+item.prompt,peer.scenario+' '+peer.prompt)>=0.85)) {
      throw new Error('Near-duplicate server practice scenario: '+item.family);
    }
  }
  for (const item of authoredItems) {
    const flags=itemIssues(item);
    if (flags.length) throw new Error(`Authored family ${item.family} fails quality gate: ${flags.join(', ')}`);
  }
  const pooled=bankIssues(authoredItems);
  if (pooled.length) throw new Error('Authored bank overlap: '+JSON.stringify(pooled.slice(0,3)));
  for (const concept of new Set(authoredItems.map(i=>i.concept))) {
    const failures=cueFailures(authoredItems.filter(i=>i.concept===concept));
    if (failures.length) throw new Error(`Answer cue in ${concept}: ${failures.join(', ')}`);
  }
  const families=items.map(i=>i.family);
  if(new Set(families).size!==families.length) throw new Error('Duplicate issued reasoning family');
  for(const s of report.skills) {
    if(Object.hasOwn(WPR_AUTOMATIC,s.concept) && (s.optimisticUpperBound<s.minimum || s.repairedUnits<s.minimum)) {
      throw new Error('Insufficient independently scoreable families for '+s.concept);
    }
  }
  if (Object.keys(WPR_AUTOMATIC).some(concept=>!report.skills.some(s=>s.concept===concept))) throw new Error('Unknown automatic WPR skill');
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const report=auditRelease(loadCatalog());
  assertReleaseGate(report);
  const output=new URL('../../reports/wpr-mastery/RELEASE_AUDIT.json',import.meta.url);
  const json=JSON.stringify(report,null,2)+'\n';
  if(process.argv.includes('--check')) {
    if(fs.readFileSync(output,'utf8')!==json) throw new Error('Stale WPR release audit');
  } else fs.writeFileSync(output,json);
  console.log(`${report.samples} seeded questions, ${report.families.length} candidate reasoning families, ${report.skills.length} skills`);
}
