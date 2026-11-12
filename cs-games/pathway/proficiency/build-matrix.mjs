import fs from 'node:fs';
import graph from '../curriculum-graph.json' with {type:'json'};
import java from '../evidence-gap-registry.json' with {type:'json'};
import {pilotRubric,rubricFor} from './catalog.mjs';

const paths=graph.nodes.filter(node=>['advanced','csp'].includes(node.courseId));
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const tiers=['beginner','intermediate','advanced'];
const rows=paths.map(node=>{
  const rubric=rubricFor(node);
  const pilot=pilotRubric(node);
  const related=java.entries.filter(entry=>entry.nodeId===node.id);
  return [node.courseId,node.areaId,node.id,node.title,node.practice.map(item=>item.activityId).join(' | '),rubric.role,
    ...tiers.map(tier=>rubric.tiers[tier]?'Supported':'Unavailable'),
    ...tiers.map(tier=>pilot.tiers[tier]?'Supported':'Unavailable'),
    ...tiers.map(tier=>rubric.tiers[tier]?.practice?.mode??''),
    related.map(entry=>`${entry.mode}: ${entry.status}`).join(' | '),
    [...new Set(related.map(entry=>entry.metadataSupport.difficulty))].join(' | '),
    related.map(entry=>`${entry.mode}: ${entry.measured.distinctFamiliesSent??'see existing mode tests'}`).join(' | ')];
});
const header=['Course','Area','Stable skill','Title','Practice activities','Formative role','Level 2','Level 3','Level 4',
  'Pilot Level 2','Pilot Level 3','Pilot Level 4','Level 2 practice mode','Level 3 practice mode','Level 4 practice mode',
  'Java mode attribution from coverage registry','Java difficulty metadata','Java measured reasoning families'];
const csv=[header,...rows].map(row=>row.map(quote).join(',')).join('\n')+'\n';
const file=new URL('../reports/proficiency-skill-matrix.csv',import.meta.url);
if(process.argv.includes('--check')){
  if(fs.readFileSync(file,'utf8')!==csv)throw Error('Proficiency matrix is stale.');
}else fs.writeFileSync(file,csv);
console.log(`${paths.length} skills, including ${paths.filter(n=>n.courseId==='csp').length} CSP skills`);
