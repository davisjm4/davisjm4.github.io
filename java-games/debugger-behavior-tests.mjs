// Compile every offered repair and test all compiling alternatives against a concrete behavior requirement.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import * as J from './engine.js';
const java='/usr/lib/jvm/java-17-openjdk-amd64/bin/java',dir='/tmp/java-debug-repairs';fs.mkdirSync(dir,{recursive:true});const cases=[],manifest=[];
function observe(code,v) {
 const printVar={'undeclared-variable':'count','string-to-int':'value','double-to-int':'price','invalid-cast':'value','char-literal':'letter','boolean-literal':'ready'}[v];
 if(printVar) code=code.replace(/\n    }\n}$/,'\n        System.out.println('+printVar+');\n    }\n}');
 if(['missing-return','return-type'].includes(v))code=code.replace(/\n}$/, '\npublic static void main(String[] args) { System.out.println(getValue()); }\n}');
 if(v==='method-semicolon')code=code.replace(/\n}$/, '\npublic static void main(String[] args) { greet(); }\n}');
 if(['constructor-semicolon','constructor-name'].includes(v))code=code.replace(/\n}$/, `\npublic static void main(String[] args) { ${v==='constructor-name'?'System.out.println(new Practice().score);':'System.out.println(new Practice("Alex").name);'} }\n}`);
 // Same-length unequal strings disprove both reference-inequality and equal-length distractors.
 if(v==='string-comparison')code=code.replace('String second = new String("Hi")','String second = new String("Yo")');
 return code;
}
for(const [v,m] of J.debugTemplates) {
 const q=J.debugQuestion(m,v,2);
 for(const fix of q.fixes) {
  let code=q.code.slice(0,q.repair.start)+(fix==='Remove'?'':fix)+q.code.slice(q.repair.end);
  code=observe(code,v);const path=`${dir}/${cases.length}.java`;fs.writeFileSync(path,code);manifest.push(path+'\t'+(fix===q.fix?'true':'any'));cases.push({path,q,fix});
 }
}
fs.writeFileSync(dir+'/manifest.tsv',manifest.join('\n'));
console.log(execFileSync(java,[new URL("./compiler-harness.java",import.meta.url).pathname,dir+'/manifest.tsv'],{encoding:'utf8',timeout:120000}));
const outputs=new Map();let behavioral=0;
function run(path) {
 try {return {ok:true,output:execFileSync(java,['-cp',path+'-classes','Practice'],{encoding:'utf8',timeout:1200,stdio:['ignore','pipe','pipe'],maxBuffer:100000})};}
 catch(e) {return {ok:false,output:e.signal?'nontermination or runaway output':String(e.stderr||'exception')};}
}
for(const c of cases.filter(c=>c.fix===c.q.fix)) {const result=run(c.path);assert.equal(result.ok,true,c.q.variant);outputs.set(c.q.variant,result.output);}
for(const c of cases.filter(c=>c.fix!==c.q.fix)) {
 const compiled=fs.readFileSync(c.path+'.diagnostic','utf8')==='OK';
 if(!compiled)continue;
 const result=run(c.path);behavioral++;
 assert.ok(!result.ok || result.output!==outputs.get(c.q.variant),c.q.variant+': alternate repair is equally valid: '+c.fix);
}
console.log(`Debugger repairs: ${cases.length} candidate programs checked; ${behavioral} compiling distractors fail the intended behavior, and every model repair runs correctly.`);
