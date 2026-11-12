import {DEMONSTRATION_TYPES,demonstrationGuide} from '../../../pathway/proficiency/demonstrations.mjs';
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

const tierLevels={beginner:2,intermediate:3,advanced:4};

export function proficiencyDetails(node){
  const result=node.proficiency;
  if(!result)return null;
  const available=Object.entries(result.tiers).filter(([,detail])=>detail.status!=='unavailable');
  return el('section',{class:'proficiency-details'},
    el('h4',{text:'Formative proficiency'}),
    available.length?el('p',{'data-formative-level':result.level,text:`Level ${result.level} · ${result.label}`}):null,
    available.length?el('ul',{},available.map(([tier,detail])=>{
      const missing=detail.missing?.subskills.map(item=>item.label)??[];
      return el('li',{},
        el('strong',{text:`Level ${tierLevels[tier]} · ${detail.status==='demonstrated'?'Demonstrated':`${detail.answered}/${detail.minimumQuestions} answers`}`}),
        el('span',{text:` · ${detail.correct} correct · ${Math.round(detail.accuracy*100)}% target`}),
        missing.length?el('p',{class:'muted',text:`Practice needed in ${missing.join(' and ')}.`}):null);
    })):el('p',{class:'muted',text:node.practice.length?'Use a demonstration for this skill. The game is available for practice.':'Use a demonstration to show your understanding of this skill.'}));
}

export function demonstrationDetails(node,{courseId,enrolled}){
  const guide=demonstrationGuide(courseId);
  const type=Object.hasOwn(DEMONSTRATION_TYPES,node.demonstrationType)?DEMONSTRATION_TYPES[node.demonstrationType]:null;
  const score=node.standardsScore;
  return el('section',{class:'demonstration-details'},
    score!=null?el('p',{class:'note',text:`Teacher assessment score: ${score} of 4${type?` · ${type}`:''}. This is separate from your practice results.`}):null,
    el('details',{open:node.proficiency?.demonstrationAvailable&&!node.proficiency.extensionAvailable},
      el('summary',{text:'Plan a demonstration'}),
      el('p',{text:guide.example}),
      el('dl',{},
        el('dt',{},el('strong',{text:'Level 2 · Approaching'})),el('dd',{text:guide.approaching}),
        el('dt',{},el('strong',{text:'Level 3 · Meeting'})),el('dd',{text:guide.meeting}),
        el('dt',{},el('strong',{text:'Level 4 · Exceeding (optional)'})),el('dd',{text:guide.exceeding})),
      el('p',{class:'muted',text:enrolled
        ?'Bring your work and explanation to your teacher. Your teacher can record a standards score using the skill’s rubric.'
        :'Save your work and explanation in a portfolio. Compare them with the skill’s rubric and share them with an instructor or mentor for feedback.'})));
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
    if(['plan-demonstration','level-4-demonstration'].includes(recommendation.kind))
      return el('button',{type:'button',class:'btn',text:label,onclick:()=>onShow(node)});
    const link=proficiencyLink(node,recommendation.practice);
    return link?el('a',{class:secondary?'btn':'btn btn-primary',href:link.url,text:label,
      onclick:e=>{if(onPractice({node,url:link.url,kind:link.kind})===true)e.preventDefault();}})
      :el('button',{type:'button',class:'btn',text:label,onclick:()=>onShow(node)});
  };
  const nextNode=next?model.nodeIndex[next.nodeId]:null;
  return el('div',{class:'suggested'},
    el('p',{class:'suggested-label',text:ready?'Ready to advance':'Suggested next'}),
    next?.reason?el('p',{class:'muted',text:next.reason}):null,
    nextNode?el('p',{class:'suggested-title',text:`${nextNode.title}${next.tier?` · Level ${tierLevels[next.tier]}`:''}`}):null,
    area&&!area.hasCore&&!ready?el('p',{class:'muted',text:'Show Level 3 with a task, project, or assessment that demonstrates the skill.'}):
      area?.unavailable?.length?el('p',{class:'muted',text:ready?'You met the reviewed outcomes. Other skills in this area remain open for practice.':'Some skills in this area are still being reviewed for proficiency.'}):null,
    el('div',{class:'suggested-actions'},
      next?action(next,ready||next.kind==='continue-learning'?'Continue Learning':next.kind==='plan-demonstration'?'Plan a demonstration':'Practice'):null,
      nextNode?el('button',{type:'button',class:'btn',text:'Show on map',onclick:()=>onShow(nextNode)}):null,
      browseNext?el('button',{type:'button',class:'btn',text:'Browse next area',onclick:()=>onShow(model.nodeIndex[browseNext.nodeId])}):null,
      extension?action(extension,extension.kind==='level-4-demonstration'?'Plan a Level 4 demonstration':'Challenge Yourself — Level 4',true):null));
}
