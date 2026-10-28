// Reuse the same six local provider bundles and expansion as the practice UI.
// These imports read static repository fixtures; they make no provider API calls.
import index from '../../java-games/documentation-lab/api-project-data-v1-runtime-index.json' with {type:'json'};
import authored from '../../java-games/documentation-lab/response-explorer-data-v1.json' with {type:'json'};
import * as E from '../../java-games/documentation-lab/response-explorer-engine.js';
import {generateResponseExplorerExpansion} from '../../java-games/documentation-lab/response-explorer-expansion.js';
import {item,source,rng} from './assessment-item.js?v=package-f-20261027';
const parts=await Promise.all(index.runtimeParts.map(async file=>(await import(new URL('../../java-games/documentation-lab/'+file.replace(/^\.\//,''),import.meta.url),{with:{type:'json'}})).default));
const library={providers:parts.flatMap(p=>p.providers),scenarios:parts.flatMap(p=>p.scenarios)},samples=E.sourceSamples(library),owners=E.sourceSampleOwners(library);
export const responseExplorerBank=[...authored.challenges,...generateResponseExplorerExpansion({sampleMap:samples,ownerBySample:owners})].filter(q=>q.format==='find-data'||q.format==='understand-structure'&&q.answer.mode==='single');
function paths(body,path='$',out=[]){out.push(path);if(body&&typeof body==='object')for(const [key,value]of Object.entries(body))paths(value,Array.isArray(body)?path+'['+key+']':path+'.'+key,out);return out}
export function adaptResponseExplorer(q,seed,points){
 const body=samples.get(q.sampleId);if(!body)return null;
 const grade=path=>(q.format==='find-data'?E.gradeFindData(q,path,authored.feedbackTemplates):E.gradeStructureSingle(q,path,authored.feedbackTemplates)).correct;
 const all=paths(body),correct=all.find(grade);if(!correct)return null;
 const options=[correct,...all.filter(path=>!grade(path)).slice(0,3)];
 const related=Object.fromEntries((q.relatedSamples||[]).map(id=>[id,samples.get(id)]));
 return item({id:'response-explorer',name:'API Response Explorer',mode:q.format,difficulty:q.difficulty,seed,points,prompt:q.instruction,context:[q.title,q.context?.applicationGoal,'Response JSON (all arrays use zero-based indices):',JSON.stringify(body,null,2),Object.keys(related).length?'Related responses:\n'+JSON.stringify(related,null,2):''].filter(Boolean).join('\n\n'),choices:options,answerIndex:0,explanation:E.renderExplanation(q.explanation.text,body,related),family:q.reasoningFamily,topic:q.providerId,raw:q,responses:options,grade,sourceQuestionId:q.id});
}
const labels={'find-data':'Find the Data','understand-structure':'Understand the Structure — Single Selection'};
export const responseExplorerSource=source('response-explorer','API Response Explorer — Single Selection',Object.entries(labels).map(([id,name])=>({id,name,difficulties:[...new Set(responseExplorerBank.filter(q=>q.format===id).map(q=>q.difficulty))],difficultyPolicy:'strict'})),(mode,level,seed,points)=>{
 const pool=responseExplorerBank.filter(q=>q.format===mode&&q.difficulty===level);return adaptResponseExplorer(pool[Math.floor(rng(seed)()*pool.length)],seed,points);
});
