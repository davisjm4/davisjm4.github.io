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

export function classWork({ member, items, grants, now, pathway }) {
  const result = { classwork: [], catchUp: [], grants: [], allowed: [] };
  if (!member?.active || member.classId !== pathway?.classId) return result;
  const allowed = new Map();
  function currentDestinations(item) {
    const original = new Set(item.destinations.map(destinationKey));
    return assignmentDestinations(pathway, item.target).filter(destination => original.has(destinationKey(destination)));
  }
  for (const item of items) {
    if (!applies(item, member, now)) continue;
    const destinations = currentDestinations(item);
    const assignment = { id: item.id, revision:item.revision, scope: item.scope, startAt: item.startAt,
      order: item.order, target: item.target, reason:item.reason, destinations };
    (item.scope === 'class' ? result.classwork : result.catchUp).push(assignment);
    for (const destination of destinations) allowed.set(destinationKey(destination),destination);
  }
  // An older grant remains effective after an assignment edit. Completion leaves
  // its restrictions in place. Release applies only to the selected profile and grant.
  for (const item of grants ?? items) {
    if (!item.grant?.active || !applies(item,member,now) || item.grant.releasedProfileIds.includes(member.id)) continue;
    result.grants.push(item.grant.id);
    for (const destination of currentDestinations(item)) allowed.set(destinationKey(destination),destination);
  }
  result.classwork.sort(compareAssignments);
  result.catchUp.sort(compareAssignments);
  result.allowed=[...allowed.values()];
  return result;
}

export function classLaunchDecision({ member, pathway, items, grants, now, fresh, destination }) {
  if (!member?.active || member.classId !== pathway?.classId) return 'unauthorized';
  if (!fresh) return 'pending';
  const key = destinationKey(destination);
  if (!assignmentDestinations(pathway, { kind: 'skill', id: destination.nodeId }).some(item => destinationKey(item) === key)) return 'unavailable';
  const work = classWork({ member, items, grants, now, pathway });
  return !work.grants.length || work.allowed.some(target=>destinationKey(target)===key) ? 'allowed' : 'restricted';
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
