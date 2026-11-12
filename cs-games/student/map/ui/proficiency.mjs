import {el} from './dom.mjs';

export function proficiencyLink(node,selection){
  const base=node.practice.find(link=>link.activityId===selection?.activityId);
  if(!base)return node.practice[0];
  const url=new URL(base.url,location.origin);
  if(url.origin!==location.origin)return base;
  if(selection.mode)url.searchParams.set('mode',selection.mode);
  if(selection.difficulty)url.searchParams.set('difficulty',selection.difficulty);
  return {...base,url:url.pathname+url.search+url.hash};
}

export function proficiencyDetails(node){
  const result=node.proficiency;
  if(!result)return null;
  return el('section',{class:'proficiency-details'},
    el('h4',{text:'Formative proficiency'}),
    el('p',{text:`Level ${result.level} · ${result.label}`}),
    !result.goal?el('p',{class:'muted',text:'This skill is open for practice. Its questions have not yet been reviewed for a formative level.'}):
      el('ul',{},Object.entries(result.tiers).map(([tier,detail])=>{
        const name=tier[0].toUpperCase()+tier.slice(1);
        if(detail.status==='unavailable')return el('li',{text:`${name} · Not yet assessable`});
        const missing=detail.missing?.subskills.map(item=>item.label)??[];
        return el('li',{},
          el('strong',{text:`${name} · ${detail.status==='demonstrated'?'Demonstrated':`${detail.answered}/${detail.minimumQuestions} answers`}`}),
          el('span',{text:` · ${detail.correct} correct · ${Math.round(detail.accuracy*100)}% target`}),
          missing.length?el('p',{class:'muted',text:`Practice needed in ${missing.join(' and ')}.`}):null);
      })));
}

export function proficiencySuggestion(model,{onShow,onPractice,stop}){
  const guidance=stop?model.proficiency.byArea[stop.areaId]:model.proficiency.recommendation;
  if(!guidance)return null;
  const {primary:next,extension,browseNext}=guidance;
  if(!next&&!extension&&!browseNext)return null;
  const area=stop&&model.proficiency.areas[stop.areaId];
  const ready=area?.readyToAdvance;
  const action=(recommendation,label,secondary=false)=>{
    const node=model.nodeIndex[recommendation.nodeId];
    const link=proficiencyLink(node,recommendation.practice);
    return link?el('a',{class:secondary?'btn':'btn btn-primary',href:link.url,text:label,
      onclick:e=>{if(onPractice({node,url:link.url,kind:link.kind})===true)e.preventDefault();}})
      :el('button',{type:'button',class:'btn',text:label,onclick:()=>onShow(node)});
  };
  const nextNode=next?model.nodeIndex[next.nodeId]:null;
  return el('div',{class:'suggested'},
    el('p',{class:'suggested-label',text:ready?'Ready to advance':'Suggested next'}),
    nextNode?el('p',{class:'suggested-title',text:`${nextNode.title}${next.tier?` · ${next.tier}`:''}`}):null,
    area&&!area.hasCore?el('p',{class:'muted',text:'You can practice this area now. Level 3 assessment is still under review.'}):
      area?.unavailable?.length?el('p',{class:'muted',text:ready?'You met the reviewed outcomes. Other skills in this area remain open for practice.':'Some skills in this area are still being reviewed for proficiency.'}):null,
    el('div',{class:'suggested-actions'},
      next?action(next,ready||next.kind==='continue-learning'?'Continue Learning':'Practice'):null,
      nextNode?el('button',{type:'button',class:'btn',text:'Show on map',onclick:()=>onShow(nextNode)}):null,
      browseNext?el('button',{type:'button',class:'btn',text:'Browse next area',onclick:()=>onShow(model.nodeIndex[browseNext.nodeId])}):null,
      extension?action(extension,'Challenge Yourself — Level 4',true):null));
}
