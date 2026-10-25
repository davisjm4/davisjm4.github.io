// Aggregate disjoint shared-session buckets; never infer scores from the bounded record log.
import {MODES,TOPICS,BARRIERS}from './model.js?v=divide-v1';
export function groupMetrics(game={},dimension='barrier'){
 const config={barrier:[game.topics||{},k=>k.split(':')[3],id=>BARRIERS[id]?.[0]],topic:[game.topics||{},k=>k.split(':')[2],id=>TOPICS[id]],mode:[game.modes||{},k=>k.split('|')[0],id=>MODES[id]],topicFilter:[game.modes||{},k=>k.split('|')[1],id=>id==='mixed'?'Mixed · all topics':TOPICS[id]],modeFilter:[game.modes||{},k=>k.split('|')[2],id=>id==='mixed'?'Mixed · all modes':MODES[id]]}[dimension];
 if(!config)throw Error('Unknown accuracy dimension');const [source,key,label]=config,groups={};for(const[k,m]of Object.entries(source)){if(dimension==='barrier'||dimension==='topic'){if(!k.startsWith('bi5:divide:'))continue;}const id=key(k);if(!label(id))continue;const g=groups[id]??={id,title:label(id)};for(const field of ['attempted','firstTry','correct','incorrect','completed'])if(Number.isSafeInteger(m[field])&&m[field]>=0)g[field]=(g[field]||0)+m[field];}return Object.values(groups).sort((a,b)=>a.title.localeCompare(b.title));
}
