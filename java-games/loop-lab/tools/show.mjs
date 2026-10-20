import * as E from '../loop-engine.js';
const [mode='algorithms', d='beginner', from='1', count='3', fam] = process.argv.slice(2);
for (let s=+from; s<+from+(+count); s++){
  const q=E.generateChallenge({mode,difficulty:d,seed:s,family:fam||null});
  console.log(`=== ${q.id} ${q.variant}/${q.template} [${q.concept}] meta=${q.metadata.score}`);
  console.log(q.code); if(q.studentTrace) console.log('TRACE', JSON.stringify(q.studentTrace.rows));
  console.log('Q:', q.prompt);
  q.choices.forEach(c=>{const dd=q.distractors.find(x=>x.choice===c); console.log(c===q.answer?' *':'  ', JSON.stringify(c), dd?`<${dd.misconception}>`:'');});
  console.log('E:', q.explanation);
}
