// Round-robin selected sources first, then rotate through each source's modes.
// This keeps short mixed assessments from being dominated by a source that has
// more selectable modes than another source.
export function distributePairs(pairs, count, seed = 0) {
  const groups = new Map();
  for (const pair of pairs) {
    if (!groups.has(pair.sourceId)) groups.set(pair.sourceId, []);
    groups.get(pair.sourceId).push(pair);
  }
  const sourceIds = [...groups.keys()];
  if (!sourceIds.length) return [];
  const offset = (seed >>> 0) % sourceIds.length;
  const orderedSources = sourceIds.slice(offset).concat(sourceIds.slice(0, offset));
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = index % orderedSources.length;
    const sourceId = orderedSources[sourceIndex];
    const sourceRound = Math.floor(index / orderedSources.length);
    const modes = groups.get(sourceId);
    const modeOffset = Math.floor((seed >>> 0) / 7) % modes.length;
    return modes[(modeOffset + sourceRound) % modes.length];
  });
}
