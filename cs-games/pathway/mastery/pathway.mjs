// Reads a stored class pathway (the existing model.mjs shape) and returns mastery progress for every checkpoint and area.
// Nothing is written: `histories` in, `histories` out. The caller decides whether and where to persist them.
import { areaProgress } from './area.mjs';
import { emptyHistory } from './attempts.mjs';
import { contentProfileFromGraph } from './evaluate.mjs';
import { normalizeEvents } from './events.mjs';
import { policyForCheckpoint, validateMasteryPolicy } from './policy.mjs';
import { nodeProgress } from './progress.mjs';

export const PATHWAY_PROGRESS_SCHEMA = 'cs-games.mastery-pathway-progress/1';

export function pathwayProgress({ graph, pathway, profileId, rawEvents = [], histories = {}, now, trustResolver = null, assessmentEvidence = [], carryOver = false, firstWindow = 'beginning', reviewCountsAsComplete = true }) {
  if (!profileId) throw new Error('A student profile is required.');
  const scope = { profileId, classId: pathway.classId };
  for (const [nodeId, h] of Object.entries(histories)) if (h.scope.profileId !== profileId || h.scope.classId !== pathway.classId || h.nodeId !== nodeId) throw new Error(`History for ${nodeId} belongs to a different student or class.`);
  const norm = normalizeEvents(rawEvents, { graph, scope, trustResolver, now });
  const nodes = new Map([...(pathway.curriculumSnapshot?.nodes ?? graph.nodes), ...(pathway.customNodes ?? [])].map((n) => [n.id, n]));
  const areas = new Map([...(pathway.curriculumSnapshot?.areas ?? graph.areas), ...(pathway.customAreas ?? [])].map((a) => [a.id, a]));
  const known = pathway.policies.map((p) => policyForCheckpointless(p)).filter(Boolean);
  const nextHistories = { ...histories }, results = [], problems = [];
  for (const checkpoint of pathway.sequence.map((id) => pathway.checkpoints.find((c) => c.nodeId === id))) {
    const node = nodes.get(checkpoint.nodeId), r = policyForCheckpoint(pathway, checkpoint);
    if (!r.ok) { problems.push({ nodeId: checkpoint.nodeId, errors: r.errors }); continue; }
    const history = nextHistories[node.id] ?? emptyHistory(scope, node.id);
    const out = nodeProgress({ node, policy: r.policy, history, events: norm.events, now, policies: known, contentProfile: contentProfileFromGraph(graph, node.id), assessmentEvidence, carryOver, firstWindow, required: checkpoint.required !== false && r.policy.challenge.requiredForAreaCompletion });
    nextHistories[node.id] = out.history;
    results.push(out.progress);
  }
  const areaResults = [...areas.values()].filter((a) => results.some((n) => n.areaId === a.id)).map((a) => areaProgress({ area: a, nodes: results.filter((n) => n.areaId === a.id), reviewCountsAsComplete }));
  return { schema: PATHWAY_PROGRESS_SCHEMA, scope, pathwayId: pathway.id, revision: pathway.revision, calculatedAt: now, normalization: { counts: norm.counts, rejected: norm.rejected }, nodes: results, areas: areaResults, histories: nextHistories, problems };
}
function policyForCheckpointless(raw) { const v = validateMasteryPolicy(raw); return v.ok ? v.policy : null; }
