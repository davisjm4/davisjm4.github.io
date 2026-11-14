// Evaluate normalized published destinations supplied by an authenticated class reader.
// A destination names the skill and activity together. A shared game must not unlock
// a different skill that happens to use the same game URL.
const destinationKey = ({ nodeId, activityId }) => JSON.stringify([nodeId, activityId]);

export function assignmentDestinations(pathway, target) {
  const nodes = pathway?.nodes ?? [];
  if (!target) return [];
  let selected;
  switch (target.kind) {
    case 'area':
      selected = nodes.filter(node => node.areaId === target.id);
      break;
    case 'skill':
      selected = nodes.filter(node => node.id === target.id);
      break;
    case 'skill-group': {
      if (!Array.isArray(target.nodeIds)) return [];
      const members = new Set(target.nodeIds);
      selected = nodes.filter(node => members.has(node.id));
      if (!members.size || selected.length !== members.size) return [];
      break;
    }
    case 'activity':
      selected = nodes;
      break;
    default:
      return [];
  }
  const destinations = selected.flatMap(node =>
    (node.checkpoint?.practice ?? node.practice ?? [])
      .filter(item => item.activityId && (target.kind !== 'activity' || item.activityId === target.id))
      .map(item => ({ nodeId: node.id, activityId: item.activityId })));
  return [...new Map(destinations.map(item => [destinationKey(item), item])).values()];
}

function applies(item, member, now) {
  return item.classId === member.classId && item.state === 'published' &&
    Number.isFinite(item.startAt) && item.startAt <= now &&
    (item.scope === 'class' || (['group', 'individual'].includes(item.scope) && item.recipientIds.includes(member.id)));
}

function compareAssignments(a, b) {
  return a.order - b.order || a.startAt - b.startAt || a.id.localeCompare(b.id);
}

export function classWork({ member, items, now, pathway }) {
  const result = { classwork: [], catchUp: [], grants: [] };
  if (!member?.active || member.classId !== pathway?.classId) return result;
  for (const item of items) {
    if (!applies(item, member, now)) continue;
    const allowed = new Set(item.destinations.map(destinationKey));
    const destinations = assignmentDestinations(pathway, item.target).filter(destination => allowed.has(destinationKey(destination)));
    const assignment = { id: item.id, scope: item.scope, startAt: item.startAt, order: item.order, target: item.target, destinations };
    (item.scope === 'class' ? result.classwork : result.catchUp).push(assignment);
    // Completion does not change access. A release affects only this grant for this profile.
    if (item.grant?.active && !item.grant.releasedProfileIds.includes(member.id)) result.grants.push(item.grant.id);
  }
  result.classwork.sort(compareAssignments);
  result.catchUp.sort(compareAssignments);
  return result;
}

export function classLaunchDecision({ member, pathway, items, now, fresh, destination }) {
  if (!member?.active || member.classId !== pathway?.classId) return 'unauthorized';
  if (!fresh) return 'pending';
  const key = destinationKey(destination);
  if (!assignmentDestinations(pathway, { kind: 'skill', id: destination.nodeId }).some(item => destinationKey(item) === key)) return 'unavailable';
  const { classwork, catchUp, grants } = classWork({ member, items, now, pathway });
  if (!grants.length || [...classwork, ...catchUp].some(item => item.destinations.some(target => destinationKey(target) === key))) return 'allowed';
  return 'restricted';
}

export function recommendedWork({ classwork, catchUp }) {
  const grouped = new Map();
  for (const assignment of [...classwork, ...catchUp]) {
    if (!assignment.destinations.length) continue;
    const { target } = assignment;
    const targetKey = target.kind === 'skill-group'
      ? [...new Set(target.nodeIds)].sort()
      : target.id;
    const key = JSON.stringify([target.kind, targetKey]);
    const item = grouped.get(key) ?? { target, assignments: [] };
    item.assignments.push(assignment);
    grouped.set(key, item);
  }
  return [...grouped.values()];
}
