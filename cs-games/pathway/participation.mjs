// Class participation is independent of practice policies and evidence.
export const PARTICIPATION = Object.freeze({
  required: 'Required', optional: 'Optional', excluded: 'Not included',
});

export function skillParticipation(pathway, checkpoint, policy) {
  if (pathway.excludedAreas?.includes(checkpoint.areaId)) return 'excluded';
  if (checkpoint.participation) return checkpoint.participation;
  if (checkpoint.required === false) return 'optional';
  const rule = policy ?? pathway.policies.find(
    rule => rule.id === checkpoint.policyId && rule.version === checkpoint.policyVersion
  );
  return rule?.challenge?.requiredForAreaCompletion === false ? 'optional' : 'required';
}

export function setAreaIncluded(pathway, areaId, included) {
  const excluded = new Set(pathway.excludedAreas);
  if (included) excluded.delete(areaId);
  else excluded.add(areaId);
  if (excluded.size) pathway.excludedAreas = [...excluded].sort();
  else delete pathway.excludedAreas;
}

export function setSkillParticipation(checkpoint, value) {
  if (value === 'default') {
    delete checkpoint.participation;
    checkpoint.required = true;
  } else {
    checkpoint.participation = value;
  }
}

export function assignedSessions(sessions, included) {
  return sessions.map(session => ({
    ...session,
    allocations: session.allocations.filter(allocation => included.has(allocation.nodeId)),
    reviewNodeIds: session.reviewNodeIds?.filter(id => included.has(id)),
    assessmentNodeIds: session.assessmentNodeIds?.filter(id => included.has(id)),
  }));
}
