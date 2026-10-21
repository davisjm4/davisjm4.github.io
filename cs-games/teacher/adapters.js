// Thin bridges from the games' existing procedural engines to Canvas MC items.
// Source logic stays in java-games; this module owns only normalization/validation.
import { booleanGame, generate as genBoolean, makeRng as booleanRng, assess as assessBoolean, signature as booleanSignature } from "../../java-games/boolean-conditional-lab/engine.js";
import { mathGame, structures as mathStructures, generate as genMath, validateQuestion as validateMath, assess as assessMath } from "../../java-games/math-lab/engine.js";
import { generateChallenge as genLoop, familyNames as loopModes, validateChallenge as validateLoop } from "../../java-games/loop-lab/loop-engine.js";
import { generateArray, formatNames as arrayModes, solutionArray, assessArray } from "../../java-games/array-lab/array-engine.js";
import { generateRecursion, modeNames as recursionModes, assessRecursion } from "../../java-games/recursion-lab/engine.js";
import { generate as genSearch, MODE_IDS as searchModeIds, MODES as searchModes, assess as assessSearch, exportQuestion as exportSearch } from "../../java-games/search-sort-lab/engine/generator.js";
import { generateTraceChallenge, verifyChallengeModel } from "../../java-games/variable-lab/trace-generator/src/index.js";
import { generateRacecesAssessmentItem } from "./raceces-adapter.js?v=20261021-raceces1";
import { generateWorkplaceAssessmentItem } from "./workplace-adapter.js?v=20261022-workplace1";
const stringLab = globalThis.StringLab;
function supportsStringChoices(family, difficulty) {
  for (let seed=1; seed<=8; seed++) {
    try { const q=stringLab.PracticeFamilies.build(family,seed*173,difficulty); if(q.choices.length===4&&q.correctIndex>=0&&q.choices[q.correctIndex].text===q.answer&&new Set(q.choices.map(c=>c.text)).size===4)return true; }
    catch { /* This generator family/level is not exportable. */ }
  }
  return false;
}
const stringFamilies=stringLab?.Generator&&stringLab?.PracticeFamilies
  ? stringLab.Generator.families().map(f=>({...f,exportLevels:f.levels.filter(level=>supportsStringChoices(f.id,level))})).filter(f=>f.exportLevels.length)
  : [];

const normalize = (q, {sourceId, sourceName, modeId, modeName, difficulty, points, answer, choices, prompt, code, explanation, signature, family, verify}) => {
  const list = choices.map(x => typeof x === "string" ? x : String(x.text));
  const correct = String(answer);
  const correctIndex = list.indexOf(correct);
  if (list.length !== 4 || new Set(list).size !== 4 || correctIndex < 0 || list.lastIndexOf(correct) !== correctIndex) return null;
  if (!prompt || !explanation || (verify && !verify())) return null;
  return { id: `${sourceId}-${modeId}-${hash(`${signature}|${correct}`)}`, sourceId, source: sourceName, modeId, mode: modeName,
    difficulty, family: family || modeId, stem: prompt, code: code || "", choices: list, correctIndex, correctAnswer: correct,
    explanation: typeof explanation === "string" ? explanation : Array.isArray(explanation) ? explanation.join(" ") : explanation.summary || "", signature: `${sourceId}|${modeId}|${signature}`, points };
};
function hash(s) { let h=2166136261; for (const c of String(s)) {h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return (h>>>0).toString(36); }
const src = (id,name,modes,generate) => ({id,name,modes,generate});

export const sources = [
  src("workplace-readiness","Workplace Readiness Games",[
    {id:"decision",name:"Workplace Decisions",difficulties:["Beginner","Intermediate","Advanced"]},
    {id:"nextstep",name:"Best Next Step",difficulties:["Beginner","Intermediate","Advanced"]},
    {id:"order",name:"Put the Steps in Order",difficulties:["Beginner","Intermediate","Advanced"]},
    {id:"find",name:"Find the Problem",difficulties:["Beginner","Intermediate","Advanced"]}
  ],(mode,difficulty,seed,points,filters={})=>generateWorkplaceAssessmentItem(mode,difficulty,seed,points,filters.workplace||{})),
  src("raceces","R-A-C-E-C-E-S Writing Games",[
    {id:"identify",name:"Identify the Parts",difficulties:["Beginner","Intermediate","Advanced"]},
    {id:"missing",name:"Choose the Missing Piece",difficulties:["Beginner","Intermediate","Advanced"]},
    {id:"rearrange",name:"Rearrange the Response",difficulties:["Beginner","Intermediate","Advanced"]}
  ],(mode,difficulty,seed,points,filters={})=>generateRacecesAssessmentItem(mode,difficulty,seed,points,filters)),
  src("boolean","Boolean & Conditional Lab",Object.entries(booleanGame.modes).filter(([id])=>["branch","conditions","equivalent","short","construct"].includes(id)).map(([id,name])=>({id,name,difficulties:["Beginner","Intermediate","Advanced"]})),(mode,difficulty,seed,points)=>{
    const q=genBoolean(mode,booleanRng(seed),difficulty);
    if(q.kind==="select") return null;
    return normalize(q,{sourceId:"boolean",sourceName:booleanGame.name,modeId:q.mode,modeName:q.modeTitle,difficulty,points,answer:q.answerText,choices:q.choices,prompt:q.question,code:q.code,explanation:q.explanation,signature:booleanSignature(q),family:q.mode,verify:()=>assessBoolean(q,q.answer)});
  }),
  src("variable","Variable Lab",[{id:"trace",name:"Trace Variables",difficulties:["beginner","intermediate","advanced"]}],(mode,difficulty,seed,points)=>{
    const q=generateTraceChallenge({difficulty:difficulty.toLowerCase(),seed});
    if(q.choices.length!==4) return null;
    return normalize(q,{sourceId:"variable",sourceName:"Variable Lab",modeId:mode,modeName:"Trace Variables",difficulty,points,answer:q.correct.text,choices:q.choices,prompt:q.question.text,code:q.code,explanation:q.explanation.summary,signature:q.signatures?.exact,family:q.reasoningFamilies?.[0],verify:()=>verifyChallengeModel(q).ok});
  }),
  src("math","Math Lab",Object.entries(mathStructures).flatMap(([mode,shapes])=>shapes.map(shape=>({id:`${mode}:${shape}`,name:`${mathGame.modes[mode]} · ${shape.replaceAll("-"," ")}`,difficultySupport:false}))), (mode,difficulty,seed,points)=>{
    const [m,shape]=mode.split(":"); let state=seed>>>0; const rng=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);
    const q=genMath(m,shape,rng);
    return normalize(q,{sourceId:"math",sourceName:mathGame.name,modeId:mode,modeName:mathGame.modes[m],difficulty:"Mixed",points,answer:q.answer,choices:q.choices,prompt:q.prompt,code:q.code,explanation:q.explanation,signature:`${q.expression||q.choices.join("|")}|${q.prompt}`,family:shape,verify:()=>validateMath(q)&&assessMath(q,q.answer)});
  }),
  ...(stringFamilies.length ? [src("string","String Lab",stringFamilies.map(f=>({id:f.id,name:f.label,difficulties:f.exportLevels.map(x=>x[0].toUpperCase()+x.slice(1))})),(family,difficulty,seed,points)=>{
    const q=stringLab.PracticeFamilies.build(family,seed,difficulty.toLowerCase());
    if(q.choices.length!==4||q.correctIndex<0||q.choices[q.correctIndex].text!==q.answer)return null;
    const explanation=q.explanation||stringLab.Feedback?.build(q,null).rule||"Trace each String operation in order and apply Java's String rules.";
    return normalize(q,{sourceId:"string",sourceName:"String Lab",modeId:family,modeName:q.mode+" · "+q.familyLabel,difficulty:q.difficulty,points,answer:q.answer,choices:q.choices,prompt:q.prompt,code:q.code,explanation,signature:`${q.signature.exact}|${q.code}`,family:q.family,verify:()=>q.choices.filter(c=>c.text===q.answer).length===1});
  })] : []),
  src("loop","Loop Lab",Object.entries(loopModes).map(([id,name])=>({id,name,difficulties:["beginner","intermediate","advanced"]})),(mode,difficulty,seed,points)=>{
    const q=genLoop({mode,difficulty:difficulty.toLowerCase(),seed});
    return normalize(q,{sourceId:"loop",sourceName:"Loop Lab",modeId:mode,modeName:q.modeName,difficulty:q.difficultyName,points,answer:q.answer,choices:q.choices,prompt:q.prompt,code:q.code,explanation:q.explanation,signature:`${q.signature.exact}`,family:q.reasoningFamily,verify:()=>validateLoop(q)&&q.choices.filter(c=>c===q.answer).length===1});
  }),
  src("array","Array Lab",Object.entries(arrayModes).filter(([id])=>["predict-update","search","traversal","update-2d","nested","reverse","create-references","in-place","trace-2d"].includes(id)).map(([id,name])=>({id,name,difficultySupport:false})),(mode,difficulty,seed,points)=>{
    // Legacy formats use ambient randomness and have no difficulty API. Restrict
    // this adapter to its supported MC formats, while preserving native validation.
    let state=seed>>>0; const old=Math.random; Math.random=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);
    try { const q=generateArray(mode); if(q.kind!=="choice") return null; const solution=solutionArray(q);
      return normalize(q,{sourceId:"array",sourceName:"Array Lab",modeId:mode,modeName:arrayModes[mode],difficulty:"Mixed",points,answer:solution.answer,choices:q.choices,prompt:q.prompt,code:q.code,explanation:q.explanation,signature:`${q.code}|${q.prompt}|${[...q.choices].sort().join("|")}`,family:q.variant,verify:()=>assessArray(q,{answer:solution.answer})});
    } finally { Math.random=old; }
  }),
  src("recursion","Recursion Lab",Object.entries(recursionModes).map(([id,name])=>({id,name,difficulties:["Beginner","Intermediate","Advanced"]})),(mode,difficulty,seed,points)=>{
    let state=seed>>>0; const rng=()=>((state=(1664525*state+1013904223)>>>0)/4294967296); const q=generateRecursion(mode,rng,difficulty);
    return normalize(q,{sourceId:"recursion",sourceName:"Recursion Lab",modeId:mode,modeName:q.topicTitle,difficulty:q.difficulty,points,answer:q.answer,choices:q.choices,prompt:q.prompt,code:q.code,explanation:q.explanation,signature:`${q.family}|${q.code}|${q.prompt}|${[...q.choices].sort().join("|")}`,family:q.family,verify:()=>assessRecursion(q,q.answer)});
  }),
  src("search-sort","Search & Sort Lab",searchModeIds.map(id=>({id,name:searchModes[id].title,difficulties:["beginner","intermediate","advanced"]})),(mode,difficulty,seed,points)=>{
    const q=genSearch(mode,difficulty.toLowerCase(),seed); if(!q) return null; const out=exportSearch(q);
    return normalize(q,{sourceId:"search-sort",sourceName:"Search & Sort Lab",modeId:mode,modeName:searchModes[mode].title,difficulty:q.difficulty,points,answer:q.choices[q.answerIndex].text,choices:q.choices,prompt:q.stem,code:q.code,explanation:q.explanation,signature:`${q.family}|${q.stem}|${q.code}|${q.choices.map(c=>c.text).sort().join("|")}`,family:q.family,verify:()=>assessSearch(q,q.answerIndex)&&out.correctIndex===q.answerIndex});
  }),
];
export const sourceById = Object.fromEntries(sources.map(s=>[s.id,s]));

export function generateAssessmentItem(sourceId, modeId, difficulty, seed, points, options = {}) {
  const source=sourceById[sourceId], mode=source?.modes.find(m=>m.id===modeId);
  if(!source||!mode) return null;
  // Sources with no explicit difficulty interface are intentionally marked mixed.
  const level=mode.difficulties?.includes(difficulty)?difficulty:(mode.difficulties?.includes(difficulty.toLowerCase())?difficulty.toLowerCase():"Mixed");
  try { return source.generate(modeId,level,seed,points,options); } catch { return null; }
}
