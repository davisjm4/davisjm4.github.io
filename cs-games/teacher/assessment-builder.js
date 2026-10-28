import { sourceById, generateAssessmentItem } from "./adapters.js?v=package-f-20261027";
import { resolveDifficulty } from "./difficulty.js?v=package-f-20261027";
import { workplaceEligibility } from "./workplace-adapter.js?v=package-b-20261026";
import { racecesEligibility } from "./raceces-adapter.js?v=package-b-20261026";
import { distributePairs } from "./quiz-distribution.js?v=20261022-workplace1";
import { validateAssessment } from "./qti.js?v=package-f-20261027";
const hash = text => { let h=2166136261; for (const ch of text) { h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return (h>>>0).toString(36); };
const filtersFor = (config, sourceId) => sourceId === "raceces" ? config.racecesFilters || {} : sourceId === "workplace-readiness" ? {workplace:config.workplaceFilters || {}} : {};
export function selectionEligibility(config, pair, index = 0) {
  const source=sourceById[pair.sourceId],mode=source?.modes.find(m=>m.id===pair.modeId);
  if(!mode) return {error:`Unavailable source or mode: ${pair.sourceId} / ${pair.modeId}. Choose a listed practice mode.`};
  const result=resolveDifficulty(mode,config.difficulty,index);
  if(result.error) return result;
  const filters=filtersFor(config,pair.sourceId);
  const eligible=pair.sourceId === "workplace-readiness" ? workplaceEligibility(pair.modeId,result.level,filters.workplace)
    : pair.sourceId === "raceces" ? racecesEligibility(pair.modeId,result.level,filters) : true;
  if(!eligible) return {error:`${source.name} — ${mode.name} / ${result.level} has no eligible content for the selected ${pair.sourceId === "raceces" ? "subject/topics" : "skills/career settings"}. Choose another mode or difficulty, or clear those filters. No questions were substituted.`};
  return {...result,filters};
}
export function attemptAssessmentItem(config,pair,index,used,excluded=new Set(),recentFamilies=[]) {
  const eligibility=selectionEligibility(config,pair,index);
  if(eligibility.error) return {item:null,error:eligibility.error};
  for(let attempt=0;attempt<140;attempt++) {
    const seed=(config.seed+index*1009+attempt*7919)>>>0;
    const item=generateAssessmentItem(pair.sourceId,pair.modeId,eligibility.level,seed,config.points,eligibility.filters);
    const key=`config:${item?.sourceId}:${item?.configurationSignature||item?.signature}`;
    const reasoning=item?.reasoningSignature?`reasoning:${item.sourceId}:${item.reasoningSignature}`:"";
    if(!item||used.has(key)||excluded.has(key)||(reasoning&&(used.has(reasoning)||excluded.has(reasoning)))) continue;
    if(item.assessmentEdition==='F'&&attempt<100&&recentFamilies.slice(-3).includes(item.sourceId+':'+item.family))continue;
    item.id=`${item.sourceId}-${hash(`${item.signature}|${seed}|${index}`)}`;
    item.requestedDifficulty=config.difficulty;item.eligibilityNotice=eligibility.notice;
    if(validateAssessment([item]).length) continue;
    used.add(key);if(reasoning)used.add(reasoning);
    return {item,notice:eligibility.notice,error:""};
  }
  return {item:null,error:`${sourceById[pair.sourceId].name} — ${pair.modeId} / ${eligibility.level}: no distinct, complete, validated question was available within 140 attempts. Reduce the question count, choose more modes, or broaden the filters.`};
}
export function buildQuiz(config,count=config.count,excluded=new Set()) {
  if(!config.pairs.length) return {items:[],error:"Select at least one exportable practice mode.",notices:[]};
  // Check every selected pair/level before generation, even in short quizzes.
  const notices=new Set();
  for(const pair of config.pairs) {
    const mode=sourceById[pair.sourceId]?.modes.find(m=>m.id===pair.modeId);
    const levels=String(config.difficulty).toLowerCase()==="mixed" ? mode?.difficulties||["Mixed"] : [config.difficulty];
    for(const difficulty of levels) {
      const eligibility=selectionEligibility({...config,difficulty},pair);
      if(eligibility.error) return {items:[],error:eligibility.error,notices:[]};
      if(eligibility.notice) notices.add(`${sourceById[pair.sourceId].name}: ${eligibility.notice}`);
    }
  }
  const used=new Set(excluded),items=[],recentFamilies=[],ordered=distributePairs(config.pairs,count,config.seed);
  for(let i=0;i<count;i++) {
    const result=attemptAssessmentItem(config,ordered[i],i,used,new Set(),recentFamilies);
    if(!result.item) return {items:[],error:`Could create ${items.length} of ${count} questions. ${result.error} No partial assessment is available for export.`,notices:[...notices]};
    items.push(result.item);recentFamilies.push(result.item.sourceId+':'+result.item.family);
  }
  return {items,error:"",notices:[...notices]};
}
