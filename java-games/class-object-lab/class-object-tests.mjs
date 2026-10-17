import assert from "node:assert/strict";
import { modeNames, generateClassObject, createClassObjectGenerator, seededRandom, assessClassObject } from "./class-engine.js";
import { formatJavaCode } from "./java-format.js";
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};const modes=Object.keys(modeNames);
for(const mode of modes){const variants=new Set(),signatures=new Set(),positions=new Set();for(let i=0;i<1000;i++){const q=generateClassObject(mode,seededRandom(1000+i));variants.add(q.variant);signatures.add(q.signature);positions.add(q.choices.indexOf(q.answer));ok(q.mode===mode&&q.code.length>20&&q.prompt.length>10);ok(q.choices.length===4&&new Set(q.choices).size===4&&q.choices.includes(q.answer));ok(assessClassObject(q,{answer:q.answer})&&!assessClassObject(q,{answer:"__wrong__"}));ok(!q.code.includes("//")&&!q.code.includes("eval("))}assert.equal(variants.size,4,`${mode} needs four templates`);checks++;ok(signatures.size>=150,`${mode} should produce 150 instances`);ok(positions.size===4,`${mode} answers use all positions`)}
const deck=createClassObjectGenerator(42),seen=[],modesSeen=new Set();for(let i=0;i<1000;i++){const q=deck.next();seen.push(q.signature);modesSeen.add(q.mode)}ok(modesSeen.size===modes.length,"mixed practice covers all modes");for(let i=30;i<seen.length;i++)ok(!seen.slice(i-30,i).includes(seen[i]),"no recent repeat");
let blindHits=0;for(let i=0;i<500;i++){const q=generateClassObject("mixed",seededRandom(i+5)),guess=q.choices.slice().sort((a,b)=>a.length-b.length)[0];if(guess===q.answer)blindHits++}const blindRate=blindHits/500;ok(blindRate<=.35,`blind heuristic ${blindRate}`);console.log(`Class & Object Lab: ${checks} checks passed; ${modes.length} modes; 4 templates/mode; blind heuristic ${(blindRate*100).toFixed(1)}%.`);
const formatted=formatJavaCode('class Student { private String name; Student(String name){this.name=name;} String getName(){return name;} }\nStudent s=new Student("Maya");');
ok(formatted.includes('class Student {\n    private String name;'),"fields are indented");
ok(formatted.includes('Student(String name) {\n        this.name = name;'),"constructor body is separated and spaced");
ok(formatted.includes('String getName() {\n        return name;'),"method body is separated and spaced");
ok(formatted.endsWith('Student s = new Student("Maya");'),"usage remains semantically unchanged");
ok(!formatted.includes('this.name=name')&&!formatted.includes('getName(){'),"compressed forms are removed");
for(const mode of modes){const question=generateClassObject(mode,seededRandom(9000));const display=formatJavaCode(question.code);ok(display.length>=question.code.length,"formatted code is not truncated");ok(!display.includes("undefined"),`${mode} formatting is valid text`) }
console.log(`Formatting checks passed for all ${modes.length} modes.`);

