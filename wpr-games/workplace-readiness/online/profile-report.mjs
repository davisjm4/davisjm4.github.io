import {csv} from './model.mjs';
import {el, pct, table} from './dom.mjs';

const date = time => new Date(time).toISOString().slice(0,10);
const score = row => pct(row.n,row.c);
const label = row => {
  const W=globalThis.WRG;
  if (row.scope==='node') return row.id.split(':').at(-1).replaceAll('-',' ');
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
  const nodeNames=new Map((report.pathway?.nodes||[]).map(node=>[node.id,node.title]));
  const weakest=report.measures.filter(row=>row.kind==='practice'&&row.n>row.c&&['node','skill'].includes(row.scope))
    .sort((a,b)=>a.c/a.n-b.c/b.n || b.n-a.n).slice(0,5);
  const recommendations=weakest.flatMap(row=>{
    const node=report.pathway?.nodes.find(item=>item.id===row.id || item.standardRefs?.some(ref=>ref.id===row.id));
    const url=node?.practice?.find(item=>item.url.startsWith('/')&&!item.url.startsWith('//'))?.url;
    return url ? [el('li',{},el('a',{href:url,text:node.title}))] : [];
  });
  const breakdowns=report.assessments.filter(r=>r.dimensions?.length).map(r=>
    el('details',{},el('summary',{text:date(r.occurred)+' · '+r.assignmentId+' · '+score(r)}),
      table(['Area','Scope','Correct / attempted','Accuracy'],r.dimensions.map(d=>[label(d),d.scope,d.c+'/'+d.n,score(d)]),'Performance on this attempt')));
  return el('div',{},el('h3',{text:'Profile '+report.id}),
    el('p',{text:'Practice is provisional. Online diagnostic results are scored by the service. Standards-based scores and mastery awards come from teacher assessments.'}),
    table(['Activity','Evidence','Correct / attempted','Accuracy'],report.activity.map(r=>[r.activity,r.kind,r.c+'/'+r.n,score(r)]),'Activity progress'),
    table(['Area','Scope','Evidence','Correct / attempted','Accuracy'],report.measures.map(r=>[label(r),r.scope,r.kind,r.c+'/'+r.n,score(r)]),'Skill and topic performance'),
    weakest.length?table(['Skill','First-try correct','Evidence'],weakest.map(r=>[nodeNames.get(r.id)||label(r),r.c+'/'+r.n,'Provisional practice']),'Skills to revisit'):null,
    recommendations.length?el('div',{},el('h4',{text:'Recommended practice'}),el('ul',{},recommendations)):null,
    report.verifiedEvidence?.length?table(['Skill','Record','Score','Recorded'],report.verifiedEvidence.map(r=>[nodeNames.get(r.nodeIds[0])||r.nodeIds[0],r.kind==='mastery-award'?'Mastery awarded':'Teacher assessment',r.kind==='assessment'?r.score+'/4':'—',r.timestamp.slice(0,10)]),'Verified mastery evidence'):null,
    report.attempts?.length?el('details',{},el('summary',{text:'Recent practice attempts'}),table(['Activity','Mode','Difficulty','Question ID','Family','Attempt','Result','Date'],report.attempts.map(r=>[r.activity,r.assessedMode||r.mode||'—',r.difficulty||'—',r.questionId||r.id,r.familyId||'—',String(r.attempt||1),r.assisted?'Assisted':(r.correct??Boolean(r.c))?'Correct':'Incorrect',date(r.occurred)]),'Practice history')):null,
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
