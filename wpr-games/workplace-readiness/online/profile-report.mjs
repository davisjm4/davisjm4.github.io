import {csv} from './model.mjs';
import {el, pct, table} from './dom.mjs';

const date = time => new Date(time).toISOString().slice(0,10);
const score = row => pct(row.n,row.c);
const label = row => {
  const W=globalThis.WRG;
  if (row.scope==='skill') return W?.content?.skills.find(s=>s.id===row.id)?.name || row.id;
  if (row.scope==='topic') return W?.content?.topics.find(t=>t.id===row.id)?.name || row.id;
  if (row.scope==='subtopic') return W?.content?.topics.flatMap(t=>t.subtopics).find(t=>t[0]===row.id)?.[1] || row.id;
  return row.id;
};
function improvements(assessments) {
  const pairs=new Map();
  for(const r of assessments) {
    const list=pairs.get(r.assignmentId)||[];
    if(list.length<2 && !list.some(s=>s.occurred===r.occurred)) list.push(r);
    pairs.set(r.assignmentId,list);
  }
  return [...pairs.values()].filter(v=>v.length===2 && v.every(x=>x.n>=3)).map(([latest,prev])=>{
    const delta=Math.round(100*(latest.c/latest.n-prev.c/prev.n));
    return [latest.assignmentId,score(prev),score(latest),(delta>0?'+':'')+delta+' pp'];
  });
}
export function renderProfileProgress(report) {
  const changes=improvements(report.assessments);
  const breakdowns=report.assessments.filter(r=>r.dimensions?.length).map(r=>
    el('details',{},el('summary',{text:date(r.occurred)+' · '+r.assignmentId+' · '+score(r)}),
      table(['Area','Scope','Correct / attempted','Accuracy'],r.dimensions.map(d=>[label(d),d.scope,d.c+'/'+d.n,score(d)]),'Performance on this attempt')));
  return el('div',{},el('h3',{text:'Profile '+report.id}),
    el('p',{text:'Practice scores come from the activity. Assessment scores are verified by the reporting service.'}),
    table(['Activity','Evidence','Correct / attempted','Accuracy'],report.activity.map(r=>[r.activity,r.kind,r.c+'/'+r.n,score(r)]),'Activity progress'),
    table(['Area','Scope','Evidence','Correct / attempted','Accuracy'],report.measures.map(r=>[label(r),r.scope,r.kind,r.c+'/'+r.n,score(r)]),'Skill and topic performance'),
    table(['Assessment ID','Type','Completed','Correct / attempted','Accuracy'],report.assessments.map(r=>[r.assignmentId,r.assignmentKind,date(r.occurred),r.c+'/'+r.n,score(r)]),'Recent assessment history'),
    breakdowns.length?el('div',{},el('h4',{text:'Assessment breakdowns'}),breakdowns):null,
    changes.length?table(['Assessment ID','Previous','Latest','Change'],changes,'Change on the same assessment'):el('p',{text:'Comparable change appears after two attempts of at least three questions on the same assessment.'}));
}
export const PROFILE_CSV_HEADER=['schema_version','profile_id','pathway','activity','evidence','scope','area_or_assessment_id','assignment_id','completed_at_utc','attempted','correct','accuracy'];
export function profileCsvRows(report) {
  const row=(r,scope,id,time='',assignment='')=>[report.version,report.id,r.pathway||'workplace-readiness',r.activity||'workplace-readiness-games',
    r.kind||'assessment',scope,id,assignment,time,r.n,r.c,r.n?r.c/r.n:''];
  return [...report.activity.map(r=>row(r,'activity',r.activity,'')),
    ...report.measures.map(r=>row(r,r.scope,r.id,'')),
    ...report.assessments.flatMap(r=>{
      const completed=new Date(r.occurred).toISOString();
      return [row(r,'assessment',r.assignmentId,completed,r.assignmentId),
        ...(r.dimensions || []).map(d=>row(d,d.scope,d.id,completed,r.assignmentId))];
    })];
}
export const profileCsv=report=>csv([PROFILE_CSV_HEADER,...profileCsvRows(report)]);
