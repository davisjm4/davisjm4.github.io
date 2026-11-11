# Mastery challenge and teacher requirements integration

## Review baseline

| Item | Reviewed version |
| --- | --- |
| Production main | `88ee6703015c5fe1b3c6cdd824604d520f094f30` |
| Automatic-pathway base | PR #22 at `9e0e0395918119679363a2336aea2ce331d9bee9` |
| Evidence repair in production | `d5c92b2`, carrying the earlier Phase 1 and Phase 2 content |
| Imported engine bundle | `9843ff0759dfdade3c2a363e844b87d73b14547b` |
| Imported requirements full bundle | `34374e2461b24cccb4dfde424188f2bb8b6bc13a` |

Both archives' bundle and patch checksums matched. The requirements full bundle includes both evidence phases and the mastery engine. The review branch imports only the engine, requirements, corresponding tests, and reports from that bundle. The existing production curriculum and evidence repair remain the baseline. Regenerating the graph produces 290 skills, 69 areas, and 453 bound source families.

## Behavior verified

- Four course defaults remain immediately available at enrollment with no dates or challenge settings.
- Classroom tests cover 30 at 90%, a skill at 50 at 95%, a skill at 20 at 90% with advanced difficulty coverage, and two classes with independent settings.
- Drafts leave enrolled students on the published pathway. Publication stamps the new policy version using the server clock and retains the previous definitions.
- A real Loop Lab browser run posted focused and Mixed attempts through the existing practice sync route. Both appeared on the same skill and attempt. A second browser restored the profile and saw the earlier attempt after restart.
- A duplicate submission and a correct second try leave the first-attempt denominator intact. Further correct answers can recover accuracy in the original attempt. Practice milestones leave the standards score and official award fields untouched.
- Additive migration tests preserve existing class revisions and practice. Restart requests are idempotent, stale requests are refused, and closed snapshots are immutable.

## Remaining validation

The Chromium tests use synthetic pseudonymous profiles and local SQLite. The staged Worker and D1 release must still be checked with the approved teacher account and school hardware. The browser flow verifies the normal game's existing client events and server attribution, with provisional trust. Pacing calendar, assessment and certification rules continue to use their established contracts. Review examples and presets are teacher-selected options. No policy is attached to a production class by this change.
