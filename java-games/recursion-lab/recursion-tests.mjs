import assert from "node:assert/strict";
import {modeNames,generateRecursion,createRecursionGenerator,seededRandom,assessRecursion} from "./engine.js";
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};const modes=Object.keys(modeNames);
for(const mode of modes){const variants=new Set,positions=new Set,seen=new Set;for(let i=0;i<100;i++){const q=generateRecursion(mode,seededRandom(500+i));variants.add(q.variant);positions.add(q.choices.indexOf(q.answer));seen.add(q.signature);ok(q.mode===mode&&q.code.length>40&&q.prompt.length>10);ok(q.choices.length===4&&new Set(q.choices).size===4&&q.choices.includes(q.answer));ok(assessRecursion(q,{answer:q.answer})&&!assessRecursion(q,{answer:"wrong"}));ok(!q.code.includes("eval("));}ok(variants.size===5,`${mode} has five structural templates`);ok(positions.size===4,`${mode} answer positions vary`);ok(seen.size>=70,`${mode} has varied instances`)}
const g=createRecursionGenerator(9),mixed=[];for(let i=0;i<120;i++)mixed.push(g.next());ok(new Set(mixed.map(q=>q.mode)).size===modes.length,"Mixed Practice covers all modes");for(let i=30;i<mixed.length;i++)ok(!mixed.slice(i-30,i).some(q=>q.signature===mixed[i].signature),"recent repeats suppressed");
for(const q of mixed)if(q.trace.length)ok(q.trace.join("\n").length>4,"optional trace is populated");
console.log(`Recursion Lab: ${checks} checks passed across ${modes.length} modes and ${modes.length*5} templates.`);

