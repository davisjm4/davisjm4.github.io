// Policy id scheme for teacher-set mastery requirements. A requirement is stored as an ordinary versioned pathway policy
// (the structure model.mjs already stores and checkpoints already reference), and the id says which level set it:
//   policy:req:class              class defaults
//   policy:req:area:<areaId>      one learning area
//   policy:req:skill:<nodeId>     one skill
// Anything else is not a requirement made here: 'policy:provisional' (nothing set) or a legacy policy from the older editor.
export const REQ_SCHEMA = 'cs-games.mastery-requirement/1';
export const PROVISIONAL_ID = 'policy:provisional';
export const CLASS_POLICY_ID = 'policy:req:class';
export const LEVELS = Object.freeze(['class', 'area', 'skill']);

export const areaPolicyId = (areaId) => `policy:req:area:${areaId}`;
export const skillPolicyId = (nodeId) => `policy:req:skill:${nodeId}`;
export const policyIdFor = (level, scopeId) => (level === 'class' ? CLASS_POLICY_ID : level === 'area' ? areaPolicyId(scopeId) : skillPolicyId(scopeId));

/** Which level an existing policy id belongs to. Never throws. */
export function parsePolicyId(id) {
  if (id === CLASS_POLICY_ID) return { level: 'class', scopeId: null };
  if (typeof id === 'string' && id.startsWith('policy:req:area:') && id.length > 'policy:req:area:'.length) return { level: 'area', scopeId: id.slice('policy:req:area:'.length) };
  if (typeof id === 'string' && id.startsWith('policy:req:skill:') && id.length > 'policy:req:skill:'.length) return { level: 'skill', scopeId: id.slice('policy:req:skill:'.length) };
  if (id === PROVISIONAL_ID) return { level: 'provisional', scopeId: null };
  return { level: 'legacy', scopeId: null };
}
export const isRequirementPolicy = (p) => LEVELS.includes(parsePolicyId(p?.id).level) && p?.requirementSource?.schema === REQ_SCHEMA;
