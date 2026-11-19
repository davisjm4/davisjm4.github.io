// WPR presentation adapter: canonical objectives and teacher requirements stay intact.
export function workplaceAreaSummary(stop) {
  const required=stop.nodes.filter(n=>n.required);
  const valid=required.length?required:stop.nodes;
  const complete=valid.length>0&&valid.every(n=>n.complete || n.standardsScore>=3 || n.proficiency?.advancementMet);
  const completed=valid.filter(n=>n.complete || n.standardsScore>=3 || n.proficiency?.advancementMet).length;
  const level=complete?valid.every(n=>n.standardsScore>=4||n.proficiency?.level===4)?4:3:0;
  return {...stop.summary,complete,status:complete?'complete':stop.summary.practiced?'in-progress':'not-started',
    mode:'area-mastery',fraction:complete?1:valid.length?completed/valid.length:0,
    label:complete?`Level ${level} demonstrated`:'Practice available · mastery needs reviewed evidence',level};
}
export function workplaceAreaLink(stop,{guest=false,origin='https://cs-games.invalid',returnTo=null}={}) {
  const link=stop.nodes.flatMap(n=>n.practice).find(p=>p.activityId==='workplace-readiness');
  if(!link)return null;
  const url=new URL(link.url,origin);
  url.searchParams.set('practice','1');url.searchParams.set('skills',stop.areaId.split(':').at(-1));
  url.searchParams.set('area',stop.areaId);url.searchParams.set('count','8');
  if(guest)url.searchParams.set('learner','guest');else url.searchParams.delete('learner');
  if(returnTo)url.searchParams.set('returnTo',returnTo);
  return url.pathname+url.search;
}
