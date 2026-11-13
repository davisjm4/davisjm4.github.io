// Adapters between the requirements editor and where a pathway is saved and published.
//
//  createMemoryAdapter     in-memory draft and published revisions, for the demo page and tests. It enforces the same rule the shared service
//                          enforces: a policy version that was published can never be changed, a new version must be created instead.
//  createServiceAdapter    the same calls the existing pathway editor makes to the shared class pathway service (draft, preview, publish).
//                          The host passes its own `request` function and the entry object it already keeps (draftVersion).
//
// An adapter is {saveDraft(pathway), publish({pathway, acknowledged}), history?()}. publish resolves {pathway, published, history?, message?}.
const clone = (x) => JSON.parse(JSON.stringify(x));

/** The shared service refuses to change a published policy version. This repeats that check for local use. */
export function assertPublishedVersionsUnchanged(published, candidate) {
  for (const old of published?.policies ?? []) {
    const next = candidate.policies.find((x) => x.id === old.id && x.version === old.version);
    if (next && JSON.stringify(next) !== JSON.stringify(old)) throw new Error('Create a new mastery policy version instead of changing an existing policy.');
  }
}

export function createMemoryAdapter({ pathway, published = null, now = () => new Date().toISOString() }) {
  const state = { draft: clone(pathway), published: published ? clone(published) : null, revisions: [], saves: 0 };
  return {
    state,
    storage: 'memory',
    async saveDraft(p) {
      assertPublishedVersionsUnchanged(state.published, p);
      state.draft = clone(p); state.saves++;
      return { draftVersion: state.saves };
    },
    async publish({ pathway: p }) {
      assertPublishedVersionsUnchanged(state.published, p);
      const revision = (state.published?.revision ?? 0) + 1;
      const snapshot = { ...clone(p), revision, baseRevision: state.published?.revision ?? 0, publishedAt: now() };
      state.published = snapshot; state.draft = clone(snapshot);
      state.revisions.push({ revision, publishedAt: snapshot.publishedAt, summary: `${snapshot.policies.filter((x) => x.requirementSource && !x.requirementSource.retired).length} requirement settings in force` });
      return { pathway: clone(snapshot), published: clone(snapshot), history: state.revisions.slice(), message: `Published version ${revision}. In this demonstration it stays in the page; nothing is sent to students.` };
    },
    history: async () => state.revisions.slice(),
  };
}

export function createServiceAdapter({ request, token, entry }) {
  const draft = async (pathway) => {
    const out = await request(`/pathways/teacher/${pathway.id}/draft`, { token, body: { pathway, draftVersion: entry.draftVersion } });
    entry.draftVersion = out.draftVersion;
    return out.draftVersion;
  };
  return {
    saveDraft: draft,
    async publish({ pathway, acknowledged, onDraftSaved }) {
      const draftVersion = await draft(pathway);
      onDraftSaved?.();
      const preview = await request(`/pathways/teacher/${pathway.id}/preview`, { token, body: {} });
      if (preview.draftVersion !== draftVersion) throw new Error('Another session changed the draft. Reload before publishing.');
      const result = await request(`/pathways/teacher/${pathway.id}/publish`, { token, body: { previewToken: preview.previewToken, draftVersion: preview.draftVersion, expectedRevision: preview.expectedRevision, ...(acknowledged===true?{acknowledged:true}:{}) } });
      entry.draftVersion = preview.draftVersion + 1;
      return { pathway: result.published, published: result.published, message: `Published version ${result.revision} of the class pathway, with these requirements.` };
    },
    async history() {
      return [];
    },
  };
}
