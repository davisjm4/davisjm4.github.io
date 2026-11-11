import { VERSION, performanceCsv, evidence, dimensions, isId } from './model.mjs';
import { queuePractice } from './profile-student.mjs';
import { el, button, pct, table, download } from './dom.mjs';
const W = globalThis.WRG;
const KEY = W.profileDevice?.key('wrg.readiness.v1') || 'wrg.readiness.v1';
const empty = () => ({version:VERSION,reports:[],practice:{},marks:{},settings:{min:3,focus:0.6,ready:0.8}});
const safeParse = key => {try {return JSON.parse(localStorage.getItem(key));} catch {return null;}};
let data = safeParse(KEY) || empty();
let persistent = true;
function save() {
  if (W.profileDevice?.identity && !W.profileDevice.isCurrent()) return;
  try {localStorage.setItem(KEY,JSON.stringify(data)); persistent=true;} catch {persistent=false;}
}
const link = d => W.targeted.practiceLink(d.scope === 'skill' ? {skills:[d.id]}
  : d.scope === 'topic' ? {topics:[d.id]} : {topics:[d.topicId],subtopics:[d.id]});
const idFor = d => d.scope+':'+d.id;

function reportCsv(report) {
  return performanceCsv(report, r=>new URL(link(r),location.href).href, data.settings);
}
function practiceLink(d) {
  return el('a',{href:link(d),text:'Practice '+d.name});
}
function statusCell(r) {
  const name = evidence(r.n,r.c,data.settings);
  return el('span',{class:'wpr-status '+({'Needs focused practice':'needs','Developing':'developing','Demonstrating readiness':'ready'}[name]||'unknown'),text:name});
}
function marks(d) {
  const key = idFor(d), saved = data.marks[key] || {};
  return el('fieldset',{class:'wpr-marks'},el('legend',{class:'sr-only',text:d.name+' practice plans'}),
    [['planned','Practice planned'],['completed','Practice completed'],['ready','Ready to reassess']].map(([id,text]) => {
      const control = el('input',{type:'checkbox',checked:saved[id],onchange:e=>{
        (data.marks[key] ||= {})[id]=e.target.checked; save();
      }});
      return el('label',{},control,' '+text);
    }));
}
function progressText(latest, previous) {
  if (!latest || !previous || latest.n < data.settings.min || previous.n < data.settings.min) return 'More evidence needed';
  const delta = latest.c/latest.n - previous.c/previous.n;
  if (Math.abs(delta) < 0.1) return 'Similar (within 10 points)';
  return delta>0 ? 'Improved' : 'Declined';
}
function dimensionsCatalog() {
  return [
    ...W.content.skills.map(s=>({scope:'skill',id:s.id,name:s.name})),
    ...W.content.topics.flatMap(t=>[{scope:'topic',id:t.id,name:t.name},
      ...t.subtopics.map(s=>({scope:'subtopic',id:s[0],name:s[1],topicId:t.id,topic:t.name}))])
  ];
}
function isRow(r) {
  return r && ['skill','topic','subtopic'].includes(r.scope) && isId(r.id) && typeof r.name==='string' &&
    (r.scope!=='subtopic' || isId(r.topicId)) && Number.isInteger(r.n) && r.n>0 && r.n<=50 &&
    Number.isInteger(r.c) && r.c>=0 && r.c<=r.n;
}
function validBackup(b) {
  return b?.version===VERSION && Array.isArray(b.reports) && b.reports.length<=120 &&
    b.reports.every(r=>r?.version===VERSION && isId(r.assignmentId) && typeof r.title==='string' &&
      ['diagnostic','practice'].includes(r.kind) && typeof r.date==='string' && Number.isFinite(Date.parse(r.date)) &&
      Number.isInteger(r.n) && r.n>=1 && r.n<=50 && Number.isInteger(r.c) && r.c>=0 && r.c<=r.n &&
      Array.isArray(r.rows) && r.rows.length<=150 && r.rows.every(isRow)) &&
    b.practice && Object.values(b.practice).every(a=>Array.isArray(a)&&a.length<=30&&a.every(v=>v===0||v===1)) &&
    b.marks && typeof b.marks==='object' && b.settings &&
    Number.isInteger(b.settings.min) && b.settings.min>=3 && b.settings.min<=25 &&
    b.settings.focus>=0.1 && b.settings.ready<=1 && b.settings.focus<b.settings.ready;
}
function orderedReports() {return data.reports.slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));}
function historyRows() {
  return orderedReports().map(r=>[r.title,r.kind,new Date(r.date).toLocaleString(),pct(r.n,r.c),String(r.n),
    button('View',()=>displayReport(document.getElementById('readiness-body'),r,true)),
    button('CSV',()=>download('wpr-performance.csv',reportCsv(r)))]);
}
function showDashboard() {
  const panel = document.getElementById('readiness-body');
  if (!panel) return;
  const notices = el('p',{role:'status'});
  const settings = el('form',{class:'wpr-controls'});
  const controls = [['min','Minimum questions',data.settings.min,3,25],['focus','Focused practice below (%)',Math.round(data.settings.focus*100),10,99],['ready','Readiness at (%)',Math.round(data.settings.ready*100),11,100]];
  for (const [id,label,value,min,max] of controls) settings.append(el('label',{},label,' ',el('input',{name:id,type:'number',value,min,max,required:true})));
  settings.append(el('button',{class:'btn',text:'Apply thresholds'}));
  settings.addEventListener('submit',e=>{
    e.preventDefault();
    const f = new FormData(settings);
    const next = {min:+f.get('min'),focus:+f.get('focus')/100,ready:+f.get('ready')/100};
    if (next.focus>=next.ready) {notices.textContent='Set readiness above the focused practice threshold.';return;}
    data.settings = next;save();showDashboard();
  });
  const file = el('input',{type:'file',accept:'.json,application/json','aria-label':'Restore performance backup',onchange:async e=>{
    try {
      const chosen = e.target.files[0];
      if (!chosen || chosen.size>8000000) throw new Error();
      const value = JSON.parse(await chosen.text());
      if (!validBackup(value)) throw new Error();
      if (!confirm('Replace this browser’s readiness records with the selected backup?')) return;
      data=value;save();showDashboard();
    } catch {notices.textContent='This file is not a valid Workplace Readiness backup.';}
  }});
  panel.replaceChildren(
    el('p',{text:'Readiness thresholds guide your practice. They do not represent official exam passing scores.'}),
    settings,notices,
    el('div',{class:'wpr-controls'},button('Save readiness backup',()=>download('wpr-readiness-backup.json',JSON.stringify(data),'application/json')),
      el('label',{},'Restore backup ',file),button('Print performance page',()=>window.print())),
    el('p',{},el('a',{href:'https://docs.google.com/spreadsheets/d/1LzUzmvtuJqRHy1EKDDBQA4tP91ieu52dt67ypbFnkVg/copy',target:'_blank',rel:'noopener noreferrer',text:'Make a copy of the Google Sheets readiness tracker'})));
  if (!persistent) panel.append(el('p',{class:'notice',text:'This browser could not save readiness data. Download a backup before closing.'}));
  panel.append(el('h2',{text:'Diagnostic results & assigned practice'}));
  const reportHistory=historyRows();
  panel.append(reportHistory.length?table(['Assignment','Type','Completed','Accuracy','Attempted','Report','Export'],reportHistory,'Assessment history')
    :el('p',{text:'Complete a teacher assignment to see its results here.'}));
  const diagnostics=orderedReports().filter(r=>r.kind==='diagnostic'), latestByDimension=new Map();
  for (const report of diagnostics) for (const row of report.rows) {
    const latest=latestByDimension.get(idFor(row))||[];
    if (latest.length<2 && !latest.some(x=>x.date===report.date)) latest.push({...row,date:report.date});
    latestByDimension.set(idFor(row),latest);
  }
  const groups=dimensionsCatalog();
  const practiceFor = d => {
    const seq=data.practice[idFor(d)]||[];
    return {n:seq.length,c:seq.reduce((a,b)=>a+b,0)};
  };
  const render = d => {
    const key=idFor(d), [latest,prev] = latestByDimension.get(key)||[], practice=practiceFor(d);
    return [d.name,latest?pct(latest.n,latest.c)+' · '+latest.c+'/'+latest.n:'—',
      pct(practice.n,practice.c)+' · '+practice.c+'/'+practice.n,statusCell(latest||practice),
      progressText(latest,prev),practiceLink(d),marks(d)];
  };
  const headers=['Area','Latest diagnostic','Recent practice','Evidence','Reassessment change','Next action','Self-reported plans'];
  panel.append(el('h2',{text:'Practice progress & readiness'}),el('p',{text:'Recent practice uses up to 30 first attempts per area. The evidence label uses your latest diagnostic for that area when available.'}),
    table(headers,groups.filter(x=>x.scope==='skill').map(render),'Official skills'));
  for (const t of W.content.topics) {
    panel.append(el('details',{},el('summary',{text:t.name}),table(headers,
      groups.filter(d=>d.id===t.id||d.topicId===t.id).map(render),t.name+' topics and subtopics')));
  }
}
function recordDimension(d, right) {
  const arr=data.practice[idFor(d)] ||= [];
  arr.push(right?1:0);
  if (arr.length>30) arr.shift();
}
export function recordPractice(q, right) {
  queuePractice(q,right);
  const skill = W.content.skills.find(s=>s.id===q.skill);
  for (const d of dimensions({skillId:q.skill,topic:skill?.name,tags:q.tags})) {
    recordDimension(d,right);
  }
  save();
}
export function addReport(report) {
  if (data.reports.some(r=>r.assignmentId===report.assignmentId&&r.date===report.date)) return;
  const {review,...summary}=report;
  if (report.kind==='practice') for (const q of review || []) {
    for (const dimension of q.dimensions) recordDimension(dimension,q.correct);
  }
  data.reports.unshift(summary);
  data.reports.splice(120);save();
}
export function displayReport(host, report, fromDashboard = false) {
  const results = new Map(report.rows.map(d=>[idFor(d),d]));
  const covered = dimensionsCatalog().map(d=>results.get(idFor(d))||{...d,n:0,c:0});
  const ranked=covered.filter(d=>d.n>0).sort((a,b)=>a.c/a.n-b.c/b.n);
  const groups=[['Focused practice',ranked.filter(d=>evidence(d.n,d.c,data.settings)==='Needs focused practice')],
    ['Developing',ranked.filter(d=>evidence(d.n,d.c,data.settings)==='Developing')],
    ['Demonstrating readiness',ranked.filter(d=>evidence(d.n,d.c,data.settings)==='Demonstrating readiness')],
    ['Insufficient evidence',ranked.filter(d=>evidence(d.n,d.c,data.settings)==='Insufficient evidence')]];
  const title=el('h1',{tabindex:-1,text:report.title+' results'});
  host.replaceChildren(title,el('p',{text:pct(report.n,report.c)+' · '+report.c+' correct of '+report.n+' attempted'}),
    el('div',{class:'actions'},button('Download performance CSV',()=>download('wpr-performance.csv',reportCsv(report))),
      button('Print or save PDF',()=>window.print()),fromDashboard ? button('Back to performance',showDashboard)
        :el('a',{href:'/wpr-games/workplace-readiness/#/summary',text:'Open performance dashboard'})));
  for (const [label,rows] of groups) {
    host.append(el('h2',{text:label}),rows.length?table(['Area','Correct / attempted','Accuracy','Recommended practice'],
      rows.map(r=>[r.name,r.c+'/'+r.n,pct(r.n,r.c),practiceLink(r)]),label):el('p',{text:'No measured areas in this group.'}));
  }
  const missing=covered.filter(r=>r.scope==='skill'&&!r.n).map(r=>r.name);
  if (missing.length) host.append(el('p',{text:'Skills not assessed in this assignment · '+missing.join(', ')}));
  if (report.review?.length) {
    host.append(el('details',{},el('summary',{text:'Review question feedback'}),report.review.map((q,i)=>el('article',{class:'ticket'},
      el('h3',{text:'Question '+(i+1)+' · '+(q.correct?'Correct':'Incorrect')}),
      el('p',{text:[q.context,q.prompt].filter(Boolean).join(' ')}),el('p',{text:'Your answer · '+q.choice}),el('p',{text:'Correct response · '+q.best}),
      ...feedbackNodes(q)))));
  }
  title.focus();
}
export function feedbackNodes(q) {
  return [...q.feedback.flatMap(l=>[el('p',{text:l.text}),l.items?el('ol',{},l.items.map(text=>el('li',{text}))):null]),
    el('p',{text:q.dimensions.map(d=>d.name).join(' · ')})].filter(Boolean);
}
W.readiness = {recordPractice};
const summary=document.getElementById('summary-body');
if (summary) {
  const init = () => {if (location.hash==='#/summary') showDashboard();};
  addEventListener('hashchange',init);init();
}
