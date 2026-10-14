import assert from 'node:assert/strict';
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import * as J from './engine.js';
let seed=2823;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const java='/usr/lib/jvm/java-17-openjdk-amd64/bin/java',dir='/tmp/java-loop-jvm';fs.mkdirSync(dir,{recursive:true});
const questions=Array.from({length:100},(_,i)=>{const q=J.generate('loop-lab');const path=`${dir}/${i}.java`;fs.writeFileSync(path,q.compilerSource);return {q,path};});
fs.writeFileSync(dir+'/manifest.tsv',questions.map(({path})=>path+'\ttrue').join('\n'));
console.log(execFileSync(java,[new URL("./compiler-harness.java",import.meta.url).pathname,dir+'/manifest.tsv'],{encoding:'utf8',timeout:120000}));
for(const {q,path} of questions) {
 const out=execFileSync(java,['-cp',path+'-classes','Practice'],{encoding:'utf8',timeout:2000}).trim();
 assert.equal(out,q.trace.filter(f=>f.output.startsWith('Print ')).map(f=>f.output.slice(6)).join('\n'));
}
console.log('Loop JVM: 100 generated programs compile, terminate, and produce exactly the animated output.');
