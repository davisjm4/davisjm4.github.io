import { el } from '../../wpr-games/workplace-readiness/online/dom.mjs';

import { courseNames,practiceLinks } from './practice-links.mjs';

function practiceActions(node){
  const {links,mixed}=practiceLinks(node);
  return [...links.map(link=>el('a',{href:link.url,text:link.label,rel:'noreferrer'})),
    ...(mixed?[el('a',{href:mixed.url,text:'Mixed Practice',rel:'noreferrer','aria-label':mixed.label})]:[])];
}

function masteryCard(node,onRestart){
  const challenge=node.masteryChallenge;
  if(!challenge)return null;
  const {progress,explanation,requirement}=challenge;
  const extra=challenge.practiceAvailability??(
    challenge.status==='not-started'?'':challenge.status==='in-progress'?explanation.lines.join(' '):explanation.text);
  const history=challenge.history.length>0&&el('details',{class:'practice-history'},
    el('summary',{text:'Past practice attempts · '+challenge.historyCount}),
    el('ul',{},challenge.history.map(attempt=>el('li',{text:
      'Attempt '+attempt.number+' · '+({restarted:'Restarted','requirements-met':'Practice milestone','superseded-by-new-policy':'Earlier requirements'}[attempt.status]??'Earlier attempt')+
      ' · '+attempt.correct+' correct out of '+attempt.answered}))));
  return el('div',{class:'practice-challenge'},
    el('strong',{text:challenge.status==='provisional'?'Practice requirements':challenge.statusLabel}),
    el('p',{text:requirement.headline}),
    progress?.answered>0&&el('p',{text:progress.answeredLabel+' · '+progress.accuracyLabel+' first-try accuracy'}),
    extra&&el('small',{text:extra}),
    !challenge.practiceAvailability&&el('small',{text:requirement.mixedNote}),
    challenge.activeAttemptId&&onRestart&&el('button',{type:'button',class:'btn',
      text:'Restart practice attempt','aria-label':'Restart practice attempt for '+node.title,
      onclick: event=>onRestart(node,event.currentTarget)}),
    history);
}

export function renderPathway(view,{onRestart,openAreas=[]}={}) {
  const areas=new Map(view.areas.map(area=>[area.id,area]));
  const names=new Map(view.nodes.map(node=>[node.id,node.title]));
  // Some AP CSP skills revisit the same activity across units. Keep each run of skills in its published order.
  const groups=[];
  for(const node of view.nodes){
    const prior=groups.at(-1);
    if(prior?.areaId===node.areaId)prior.skills.push(node);
    else groups.push({areaId:node.areaId,skills:[node]});
  }
  const sections=groups.map(({areaId,skills},index)=>{
    const list=el('ol',{class:'pathway-checkpoints'});
    for(const node of skills){
      const c=node.checkpoint;
      const {attempted=0,correct=0}=node.practiceProgress||{};
      const stats=attempted?`Practice progress · ${correct} correct out of ${attempted} first attempts`:'No synced practice for this skill yet';
      const prerequisites=(c.prerequisites||[]).map(id=>names.get(id)).filter(Boolean);
      const standard=(node.standardRefs||[]).map(ref=>ref.label||ref.id).filter(label=>label&&label!==node.title).join(' · ');
      const goal=node.practiceGoal;
      list.append(el('li',{},el('strong',{text:node.title}),
        node.objective&&node.objective!==node.title&&el('p',{text:node.objective}),
        standard&&el('small',{text:standard}),
        prerequisites.length>0&&el('small',{text:'Helpful first · '+prerequisites.join(', ')}),
        c.targetDate&&el('small',{text:'Suggested target · '+c.targetDate}),
        !c.required&&el('small',{text:'Optional skill'}),
        el('small',{text:stats}),
        goal&&!node.masteryChallenge&&el('small',{text:`Practice goal · ${goal.questions} first attempts at ${Math.round(goal.accuracy*100)}% accuracy${goal.met?' · met':''}`}),
        c.award&&el('small',{text:'Verified mastery awarded'}),
        node.earlierVerifiedAward&&el('small',{text:'Earlier teacher-verified mastery recorded'}),
        masteryCard(node,onRestart),
        c.score!==null&&c.score!==undefined&&el('small',{text:'Teacher assessment · '+c.score+'/4'}),
        el('div',{class:'pathway-actions'},practiceActions(node))));
    }
    const area=areas.get(areaId),requirements=area?.practiceRequirements;
    const count=requirements?.requiredTotal>0
      ?' · '+requirements.requiredCompleted+' of '+requirements.requiredTotal+' practice requirements met':'';
    return el('details',{class:'pathway-area','data-area-index':index,open:openAreas.length?openAreas.includes(String(index)):index===0},
      el('summary',{},el('strong',{text:area?.title||'Learning area'}),' · '+skills.length+' skills'+count),list);
  });
  return el('div',{class:'class-pathway'},el('h2',{text:view.title}),
    el('p',{text:[courseNames[view.courseId],view.status==='Self-paced'?'Self-paced':view.status].filter(Boolean).join(' · ')}),
    el('p',{text:'Follow the suggested order or explore any skill. Open an activity, then return here to see synced practice.'}),
    sections);
}
