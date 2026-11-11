import { el } from '../../wpr-games/workplace-readiness/online/dom.mjs';

function practiceLink(item) {
  try {
    const url=new URL(item.url,location.origin);
    if (url.protocol!=='https:' && url.origin!==location.origin) return null;
    return el('a',{href:url.href,text:item.activityId.replaceAll('-',' '),rel:'noreferrer'});
  } catch { return null; }
}
export function renderPathway(view) {
  const names=new Map(view.areas.map(area=>[area.id,area.title]));
  const list=el('ol',{class:'pathway-checkpoints'});
  for (const node of view.nodes) {
    const c=node.checkpoint;
    const progress=c.completion==='complete' ? 'Completed' : c.needsAssessment ? 'Assessment needed' : 'In progress';
    const due=c.targetDate ? 'Due '+c.targetDate : 'No date assigned';
    const mastery=c.score===null ? 'No verified mastery score' : 'Verified mastery '+c.score+'/4';
    const links=(c.practice || []).map(practiceLink).filter(Boolean);
    list.append(el('li',{},el('strong',{text:node.title}),
      el('small',{text:[names.get(node.areaId),due,c.required?'Required':'Optional',progress,mastery].filter(Boolean).join(' · ')}),
      links));
  }
  const completed=view.nodes.filter(node=>node.checkpoint.targetMet).length;
  return el('div',{},el('h2',{text:view.title}),el('p',{text:'Revision '+view.revision+' · '+view.status+' · '+completed+' of '+view.nodes.length+' checkpoints met'}),list);
}
