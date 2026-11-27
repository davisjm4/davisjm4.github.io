// Pure presentation routing over the already-authorized student contract.
// Alternate practice sources are not separate activities. A shared destination
// permits direct launch; genuinely different destinations retain a choice.
export function activityDestination(stop, preferredNodeId) {
  const nodes = stop.nodes;
  if (!nodes.length) return {kind:'demonstration'};
  const common = nodes[0].practice.map(p=>p.activityId).filter(id=>nodes.every(n=>n.practice.some(p=>p.activityId===id)));
  if (!common.length) return {kind:nodes.some(n=>n.practice.length)?'map':'demonstration'};
  const owner = stop.areaId.split(':').at(-1);
  const activityId = common.includes(owner)?owner:common[0];
  const eligible = nodes.filter(n=>n.practice.some(p=>p.activityId===activityId));
  const node = eligible.find(n=>n.id===preferredNodeId) ?? eligible.find(n=>n.required&&!n.complete) ?? eligible[0];
  return {kind:'practice',activityId,node,link:node.practice.find(p=>p.activityId===activityId)};
}

export function activityCounts(stops) {
  const required = stops.filter(s=>s.nodes.some(n=>n.required));
  return {activities:stops.length,requiredActivities:required.length,
    completedActivities:required.filter(s=>s.summary.complete).length,
    skills:stops.reduce((sum,s)=>sum+s.nodes.length,0),
    requiredSkills:stops.reduce((sum,s)=>sum+s.nodes.filter(n=>n.required).length,0),
    completedSkills:stops.reduce((sum,s)=>sum+s.nodes.filter(n=>n.required&&n.complete).length,0)};
}
