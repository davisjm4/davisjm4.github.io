import * as E from '../loop-engine.js';
const N=+process.argv[2]||150; const rows={};
for (const mode of E.MODES) for (const d of E.DIFFICULTIES) for (let s=1;s<=N;s++){
  const q=E.generateChallenge({mode,difficulty:d,seed:s*7919});
  const k=mode+'/'+q.variant; const r=rows[k]??={n:0,fb:0,anyfb:0,tpl:new Set()}; r.n++; r.tpl.add(q.template);
  const f=q.distractors.filter(x=>x.misconception==='fallback').length; r.fb+=f; if(f) r.anyfb++;
}
let tot=0,fb=0; for (const [k,r] of Object.entries(rows)) { tot+=r.n*3; fb+=r.fb; if (r.fb/(r.n*3)>0.08) console.log(k, 'fallback share', (r.fb/(r.n*3)).toFixed(2), 'items w/ fallback', (r.anyfb/r.n).toFixed(2)); }
console.log('overall fallback distractor share', (fb/tot).toFixed(3));
