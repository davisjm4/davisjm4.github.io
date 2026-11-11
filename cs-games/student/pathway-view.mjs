import { el } from '../../wpr-games/workplace-readiness/online/dom.mjs';

const courseNames={advanced:'Advanced CS',csp:'AP CSP',robotics:'Robotics 1',workplace:'Workplace Readiness'};

function practiceLinks(node) {
  return (node.checkpoint.practice||[]).flatMap(item=>{
    let url;
    try { url=new URL(item.url,location.origin); } catch { return []; }
    if(url.protocol!=='https:'&&url.origin!==location.origin)return [];
    const name=item.activityId.split('-').map(word=>word[0]?.toUpperCase()+word.slice(1)).join(' ');
    const selector=node.familySelectors?.find(s=>s.activityId===item.activityId);
    const mode=selector?.modeId??selector?.modeIds?.[0];
    const isLocal=url.origin===location.origin;
    const java=isLocal&&url.pathname.startsWith('/java-games/');
    const focusedJava=java&&mode;
    const roboticsCategory=isLocal&&item.activityId==='parts-sprint'&&selector?.category;
    const workplaceSkill=isLocal&&item.activityId==='workplace-readiness'&&node.standardRefs?.find(s=>s.registry==='ctecs-wrs');
    if(focusedJava)url.searchParams.set('mode',mode.split('/')[0]);
    if(roboticsCategory)url.searchParams.set('category',roboticsCategory);
    if(workplaceSkill){url.searchParams.set('practice','1');url.searchParams.set('skills',workplaceSkill.id);}
    const links=[el('a',{href:url.href,text:focusedJava||roboticsCategory?'Focused practice in '+name:workplaceSkill?'Practice '+workplaceSkill.label:'Open '+name,rel:'noreferrer'})];
    if(java||roboticsCategory){
      url.searchParams.delete('category');
      url.searchParams.set('mode','mixed');
      links.push(el('a',{href:url.href,text:'Mixed Practice',rel:'noreferrer','aria-label':'Mixed Practice in '+name}));
    }
    return links;
  });
}

export function renderPathway(view) {
  const areas=new Map(view.areas.map(area=>[area.id,area.title]));
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
        goal&&el('small',{text:`Practice goal · ${goal.questions} first attempts at ${Math.round(goal.accuracy*100)}% accuracy${goal.met?' · met':''}`}),
        c.award&&el('small',{text:'Verified mastery awarded'}),
        c.score!==null&&c.score!==undefined&&el('small',{text:'Teacher assessment · '+c.score+'/4'}),
        el('div',{class:'pathway-actions'},practiceLinks(node))));
    }
    return el('details',{class:'pathway-area',open:index===0},
      el('summary',{},el('strong',{text:areas.get(areaId)||'Learning area'}),' · '+skills.length+' skills'),list);
  });
  return el('div',{class:'class-pathway'},el('h2',{text:view.title}),
    el('p',{text:[courseNames[view.courseId],view.status==='Self-paced'?'Self-paced':view.status].filter(Boolean).join(' · ')}),
    el('p',{text:'Follow the suggested order or explore any skill. Open an activity, then return here to see synced practice.'}),
    sections);
}
