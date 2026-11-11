# Attempt lifecycle

One history holds every attempt for one node in one student scope (a profile and, optionally, a class). It lives in `cs-games/pathway/mastery/attempts.mjs`. The functions are pure: callers pass `now`, the normalized evidence and the policy in force, and each returns a new, deeply frozen history. Nothing is stored by the engine.

## States

An attempt that is still open takes its state from the evidence on every call: not started (no attempt exists and no counted question), in progress (counted questions exist but the minimum has not been reached), or requirements not yet met (the minimum has been reached, but accuracy or another requirement is still unmet, so the student keeps answering). An attempt that has closed carries one of three states written on its record: requirements met, restarted, or superseded by a new policy. The node status the student sees (not started, in progress, requirements met, review recommended, provisional) is derived from these plus the policy, and is defined in `PROGRESS_CONTRACT.md`.

| From | Event | To | What happens |
| --- | --- | --- | --- |
| (none) | First counted evidence for the node | In progress | An attempt opens. By default its window reaches back to the start of the evidence so earlier practice is not discarded. |
| In progress | Minimum reached, requirements unmet | Requirements not yet met | The same attempt continues. Recovery numbers tell the student how many more correct answers are needed. |
| In progress or not yet met | The cumulative record meets every requirement | Requirements met (closed) | The attempt closes at the record that satisfied it, frozen with a snapshot. |
| In progress or not yet met | Student restarts | Restarted (closed), then a new attempt In progress | A fresh window opens at the restart time with all counters at zero. |
| In progress or not yet met | A new policy version takes effect | Superseded by new policy (closed), then a new attempt | The student starts under the new requirement. |
| Requirements met | A new policy version takes effect | stays Requirements met; a new attempt opens | The earlier completion is never edited or revoked. The node shows review recommended until the new attempt resolves. |

Requirements met is the end of an attempt, and practice after it does not change it: later mistakes do not undo a qualification, and later correct answers do not extend it. They count toward lifetime practice only. A teacher who wants qualification to lapse can set `review.staleAfterDays`, which flags the node for review without removing anything.

## Windows and claiming events

Each attempt has a window that starts at `windowStart` (a time, or the start of the evidence for a first attempt). A closed attempt keeps a ledger of the event ids it claimed. An open attempt evaluates the events inside its window that no earlier attempt claimed. So after a restart, the old answers do not count toward the new attempt, even if the student's browser delivers them late, and a late event stamped inside a closed window counts for lifetime practice only. An event is claimed by at most one attempt for a node, and `verifyHistory()` checks it. The single exception is an explicit carry-over on a policy change, where the superseded attempt hands its events to its successor, says so (`carriedOverTo`), and the check counts them once, under the successor.

An event that credits two nodes (for example LinkedList link and mutate share a node) belongs to each node's own history independently. A question never credits a node its assessed mode and family do not map to.

## Restart

`restartAttempt()` closes the open attempt as `restarted` with a snapshot of exactly what it had, and opens a fresh attempt at `now`. The earlier attempt, every award, the teacher's standards scores and the cumulative practice history stay as they were. It is idempotent: the request carries a `requestId`, and a repeated request returns the same history object and the same ids, changing nothing. A caller can also pass `expectedAttemptId`, and a request made against an attempt that is no longer the open one is refused as stale, so a double click that used two request ids cannot create a third attempt. A restart is refused when there is no open attempt, when the policy has no challenge, when the attempt has no counted question yet (nothing to restart), and after requirements are met (the completed attempt is history; the student keeps practicing or waits for a new policy).

Whether a restart is needed at all is a separate matter. A student who misses the accuracy target at the minimum is never required to restart: the engine tells them how many more correct answers in a row would recover accuracy and lets them continue. Restart is for a student who wants a clean start.

## Policy changes

Every attempt records the policy id, version and a content digest. When the policy in force differs from an open attempt's, the open attempt is superseded and a new one opens under the new policy at the policy's `effectiveFrom` (or the check time if none). By default the new attempt starts from zero, because the old attempt keeps its events. `carryOver: true` lets in-progress work move to the new attempt instead. A completed attempt under an older version stays completed and visible, the node shows review recommended with a plain explanation, and area completion still counts it unless the integrator turns that off. An award issued under an earlier version stays in the history. Re-presenting an edited policy under an old id and version is refused. If the definition of an older version is not supplied, the snapshot of a superseded attempt is marked unavailable instead of being reconstructed.

Published pathway revisions are not modified: the pathway keeps the policy versions it already lists, and the new version is simply another entry. Student progress is derived, so no stored snapshot has to be rewritten.

## Record shapes

An attempt:

```json
{ "id": "attempt:<profile>:<class>:<node>:2", "seq": 2, "scope": {"profileId": "...", "classId": "..."}, "nodeId": "...",
  "policy": {"id": "...", "version": 1, "digest": "..."},
  "status": "restarted", "windowStart": "beginning", "openedAt": "...", "openedBy": "first-evidence",
  "closedAt": "...", "closeReason": "restart", "successorId": "...", "carriedOverTo": null,
  "snapshot": { "counts": {...}, "requirements": [...], "diagnostics": [...], "trust": {...}, "ledger": {"eventIds": [...]} } }
```

The history also holds `awards` (empty until the server-side boundary produces one) and `requests` (the idempotency record, keyed by request id).

## Invariants checked by `verifyHistory()`

One open attempt at most. Contiguous sequence numbers. Only the known statuses. A closed attempt always has a snapshot and a policy reference. Every attempt matches the history's scope and node. No event claimed by two attempts. The tests apply it after every scenario, and attempts are deep-frozen so an in-place edit throws.

## Persistence guidance for the integration

Persist `histories` per student, class and node as append-only rows keyed by attempt id, written by the server after it re-derives them from stored evidence; the engine's determinism means a stored history can be recomputed and compared. Do not let a browser write an attempt, a restart or an award directly: a student may ask for a restart, but the server records it with its own clock and request id. See `INTEGRATION_HANDOFF.md`.
