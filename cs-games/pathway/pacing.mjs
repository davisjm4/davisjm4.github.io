import {meetings} from './calendar.mjs';
import {clone,validatePathway} from './model.mjs';
export function generatePacing(input,graph,{from=input.calendar.start}={}) {
  validatePathway(input,graph,{validateSessions:false,validateTargets:false});const p=clone(input),warnings=[],byNode=new Map(p.checkpoints.map(c=>[c.nodeId,c]));
  const nodes=new Map([...(p.curriculumSnapshot?.nodes||graph.nodes),...(p.customNodes||[])].map(n=>[n.id,n]));
  for(const c of p.checkpoints)for(const dep of c.prerequisites)if(!byNode.has(dep))warnings.push('Prerequisite '+dep+' is outside this plan. Assess prior knowledge or add the missing skill.');
  const sequence=[],seen=new Set();function add(id){if(seen.has(id))return;seen.add(id);for(const d of byNode.get(id)?.prerequisites||[])if(byNode.has(d))add(d);sequence.push(id);}p.sequence.forEach(add);
  if(JSON.stringify(sequence)!==JSON.stringify(p.sequence))warnings.push('Prerequisites require a different teaching order; preview the adjusted sequence.');p.sequence=sequence;
  const remaining=new Map(p.checkpoints.map(c=>[c.nodeId,c.minutes]));const introduced=new Set();const sessions=(p.sessions||[]).filter(s=>s.date<from&&s.date<=p.examDate).map(clone);
  for(const s of sessions)for(const a of s.allocations||[]){introduced.add(a.nodeId);remaining.set(a.nodeId,Math.max(0,(remaining.get(a.nodeId)||0)-a.minutes));}
  for(const c of p.checkpoints)if(!c.targetLocked&&(!c.targetDate||c.targetDate>=from))c.targetDate=null;
  const all=meetings(p.calendar).filter(m=>m.meets&&m.date<=p.examDate);let instructionMinutes=0,protectedMinutes=0;
  for(const m of all){if(m.date<from)continue;
    const dayType=m.date===p.examDate?'Semester / Final Exam':m.dayType;
    const isProtected=['Study / Review','Mixed Practice','Quiz / Testing','Semester / Final Exam'].includes(dayType);
    const s={...m,dayType,protected:isProtected,allocations:[],reviewNodeIds:[],assessmentNodeIds:[],diagnostic:null};
    if(isProtected){protectedMinutes+=m.minutes;s.reviewNodeIds=[...introduced];
      const requested=p.calendar.overrides?.find(o=>o.date===m.date)?.assessmentNodeIds||[];
      s.assessmentNodeIds=requested.filter(id=>introduced.has(id));
      if(s.assessmentNodeIds.length!==requested.length)warnings.push(m.date+': assessment contains skills not yet introduced; adjust the window or content.');
      if(dayType==='Quiz / Testing'||dayType==='Semester / Final Exam')s.diagnostic='Teacher-assigned assessment / reassessment';
    }else{
      instructionMinutes+=m.minutes;let available=m.minutes;
      for(const id of sequence){const left=remaining.get(id);if(left<=0)continue;
        const c=byNode.get(id);if(c.prerequisites.some(d=>remaining.has(d)&&remaining.get(d)>0))continue;
        if(dayType==='Guided Practice'&&!introduced.has(id))continue;
        const used=Math.min(available,left);if(!used)break;
        const isNew=!introduced.has(id);introduced.add(id);remaining.set(id,left-used);
        s.allocations.push({nodeId:id,areaId:c.areaId,standardRefs:c.standardRefs,primaryObjectives:c.primaryObjectives,objective:nodes.get(id).objective,
          practice:c.practice,minutes:used,introduces:isNew,checkpointId:c.id,expectedMastery:c.expectedMastery,policyId:c.policyId,policyVersion:c.policyVersion});
        if(remaining.get(id)===0&&!c.targetLocked)c.targetDate=m.date;
        available-=used;if(!available)break;
      }
      s.reviewNodeIds=[...introduced].filter(id=>!s.allocations.some(a=>a.nodeId===id));s.reviewMinutes=available;
    }
    sessions.push(s);
  }
  const unscheduled=p.checkpoints.filter(c=>remaining.get(c.nodeId)>0).map(c=>({nodeId:c.nodeId,required:c.required,remainingMinutes:remaining.get(c.nodeId)}));
  const deficit=unscheduled.filter(c=>c.required).reduce((n,c)=>n+c.remainingMinutes,0);
  if(deficit)warnings.push('Required content needs '+deficit+' additional minutes. Extend the exam date, increase meeting minutes, revise time estimates, or explicitly make selected nodes optional. No requirements have been removed.');
  if(!all.some(m=>m.date===p.examDate))warnings.push('The target exam date is not a class meeting. Choose a meeting date to reserve an exam session.');
  for(const c of p.checkpoints)if(c.targetLocked&&c.targetDate){if(c.targetDate>p.examDate)warnings.push('Checkpoint '+c.nodeId+' is scheduled after the target exam. Move its target or extend the exam date.');const last=sessions.filter(s=>s.allocations?.some(a=>a.nodeId===c.nodeId)).at(-1);if(last&&last.date>c.targetDate)warnings.push('Checkpoint '+c.nodeId+' is due before its planned instruction finishes.');}
  p.sessions=sessions;p.warnings=warnings;p.capacity={meetings:all.length,totalMinutes:all.reduce((n,m)=>n+m.minutes,0),instructionMinutes,protectedMinutes,deficit,unscheduled};return p;
}
const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';
export function exportCSV(p){const rows=[['Date','Day type','Minutes','Area','Standards','Node','Objective','Checkpoint','Target date','Mastery target','Practice','Review','Assessment']];
  for(const s of p.sessions){const allocations=s.allocations.length?s.allocations:[{}];for(const a of allocations){const c=p.checkpoints.find(c=>c.id===a.checkpointId);rows.push([s.date,s.dayType,a.minutes??s.minutes,a.areaId,(a.standardRefs||[]).join(';'),a.nodeId,a.objective,a.checkpointId,c?.targetDate,c?.expectedMastery,(a.practice||[]).map(x=>x.url).join(';'),s.reviewNodeIds.join(';'),s.diagnostic]);}}
  return '\uFEFF'+rows.map(r=>r.map(x=>quote(/^[=+@-]/.test(String(x??''))?"'"+x:x)).join(',')).join('\r\n');}
const icsEscape=s=>String(s).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(';','\\;').replaceAll(',','\\,');
function fold(line){let out='',count=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(count+size>73){out+='\r\n ';count=1;}out+=c;count+=size;}return out;}
export function exportICS(p){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DevCat Studios//Class Pathway//EN','CALSCALE:GREGORIAN'];
  for(const s of p.sessions){if(!s.meets)continue;const next=new Date(s.date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);const text=s.allocations.map(a=>a.objective+' ('+a.minutes+' min)').join('; ')||s.dayType;
    lines.push('BEGIN:VEVENT','UID:'+icsEscape(p.id+'-'+s.date)+'@cs-games','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),'DTSTART;VALUE=DATE:'+s.date.replaceAll('-',''),'DTEND;VALUE=DATE:'+next.toISOString().slice(0,10).replaceAll('-',''),'SUMMARY:'+icsEscape(p.title+': '+s.dayType),'DESCRIPTION:'+icsEscape(text+' | '+s.minutes+' class minutes | revision '+p.revision),'END:VEVENT');}
  lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';}
export function groupedView(p,view){if(view==='daily')return [{label:'Daily class meetings',sessions:p.sessions,minutes:p.sessions.reduce((n,s)=>n+s.minutes,0)}];const groups=new Map();for(const s of p.sessions){let key=s.date;if(view==='weekly'){const d=new Date(s.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));key='Week of '+d.toISOString().slice(0,10);}if(view==='unit')key=s.allocations.map(a=>a.areaId).filter((x,i,a)=>a.indexOf(x)===i).join(' / ')||s.dayType;const list=groups.get(key)||[];list.push(s);groups.set(key,list);}return [...groups].map(([label,sessions])=>({label,sessions,minutes:sessions.reduce((n,s)=>n+s.minutes,0)}));}
