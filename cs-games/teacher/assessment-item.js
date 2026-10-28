// Teacher-only normalization. No source generator or student session is changed.
export function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
export function seeded(seed,fn){const old=Math.random;Math.random=rng(seed);try{return fn()}finally{Math.random=old}}
export function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
export const text=value=>typeof value==='string'?value:JSON.stringify(value);
export const blockText=blocks=>(blocks||[]).map(b=>`${b.label?`// ${b.label}\n`:''}${b.code??b.model?.code??''}`).join('\n\n');
export function item({id,name,mode,modeName,difficulty='Mixed',seed,points,prompt,context='',code='',choices,answerIndex,explanation,family,topic='',raw,responses,grade,sourceQuestionId=''}){
 if(!prompt||!explanation||!Array.isArray(choices)||choices.length<2||choices.length>4||new Set(choices).size!==choices.length||!Number.isInteger(answerIndex)||answerIndex<0||answerIndex>=choices.length)return null;
 if(grade&&(!responses||responses.length!==choices.length||responses.filter(r=>grade(r)).length!==1||!grade(responses[answerIndex])))return null;
 const order=choices.map((_,i)=>i),random=rng(seed^0x937a);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
 const list=order.map(i=>String(choices[i]).trim()?String(choices[i]):JSON.stringify(String(choices[i]))),correctIndex=order.indexOf(answerIndex),signature=`${id}|${mode}|${prompt}|${context}|${code}|${[...list].sort().join('|')}`;
 const out={id:`${id}-${hash(signature)}`,sourceId:id,source:name,modeId:mode,mode:modeName||mode,difficulty,stem:prompt,context,code,requiredCode:code,requiredInstruction:{stem:prompt,context,code},choices:list,correctIndex,correctAnswer:list[correctIndex],explanation:String(explanation),family:family||mode,topic:topic||mode,signature,points,assessmentEdition:'F',sourceQuestionId:sourceQuestionId||hash(signature)};
 Object.defineProperties(out,{_sourceQuestion:{value:raw},_responses:{value:responses&&order.map(i=>responses[i])},_grade:{value:grade}});return out;
}
export function source(id,name,modes,generate,extra={}){return{id,name,modes,generate,assessmentEdition:'F',...extra}}
export const nativeModes=labels=>Object.entries(labels).filter(([id])=>id!=='mixed').map(([id,name])=>({id,name}));
export function table(headers,rows){return [headers.join(' | '),...rows.map(r=>r.map(text).join(' | '))].join('\n')}
export function sourceSpans(root){const spans=new Map();let offset=0;function walk(n){if(typeof n==='string'){offset+=n.length;return}const start=offset;if(n.text!=null)offset+=String(n.text).length;else for(const child of n.children||[])walk(child);if(n.id!=null)spans.set(n.id,{start,end:offset})}walk(root);return spans}
