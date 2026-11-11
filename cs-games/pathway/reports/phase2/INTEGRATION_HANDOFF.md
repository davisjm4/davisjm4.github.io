# Integration handoff: Phase 2 evidence coverage

For ChatGPT Work, to be used after the Teacher Tools redesign has been integrated. Nothing here has been merged or deployed.

## Identifiers

| Item | Value |
| --- | --- |
| Repository | `davisjm4/davisjm4.github.io` |
| Branch | `claude/mastery-evidence-phase2` |
| Original base (current `main`) | `422398d` |
| Phase 1 head (included in this branch) | `fc70e68d96f9bac0645da6534786b594d59fe41b` |
| Phase 2 code commit | `d4d3b50b94975cc10cd49f50afe9dc3932c5b687` |
| Phase 2 final commit | the commit that adds this report (the package README gives its hash) |
| Teacher Tools redesign branch (separate work) | `claude/teacher-tools-ux-redesign`, commit `c909d13` |

`main` was fetched during this work and had not moved past `422398d`, so the branch applies to it without conflicts. This branch contains the Phase 1 commit, so importing it brings Phase 1 as well; Phase 1 does not need to be applied separately.

## What this branch changes

Mastery nodes now exist for every Java practice mode that has objective scoring, in focused and Mixed Practice. The curriculum graph gains nine nodes and 95 question families (version unchanged); Boolean, LinkedList, Inheritance, Documentation and Robot Algorithms pages send the question's own mode and family; Math Lab Mixed Practice now draws all seven modes; one LinkedList scoring defect is fixed. A machine-readable registry lists what is and is not covered, and new suites test every mode from engine to node. The other reports in this folder give the detail: `IMPLEMENTATION_REPORT.md`, `MISSING_MODE_DECISIONS.md`, `MIXED_PRACTICE_AUDIT.md`, `EVIDENCE_CREDIT_BEFORE_AFTER.md` and `GRAPH_COMPATIBILITY.md`.

## Importing the branch

From a clone of the repository, either bundle can be used (the package verifies both).

```sh
git fetch /path/to/cs-games-phase2-full.bundle claude/mastery-evidence-phase2:claude/mastery-evidence-phase2
# or, from a clone that already has fc70e68 (for example Phase 1 already imported):
git fetch /path/to/cs-games-phase2-incremental.bundle claude/mastery-evidence-phase2:claude/mastery-evidence-phase2
git log --oneline 422398d..claude/mastery-evidence-phase2
```

## Where it can collide with the Teacher Tools redesign

This branch changes nothing under `cs-games/teacher/`, `wpr-games/`, the Worker, D1 migrations or any sign-in, enrollment, class-ownership or sync code. The files both branches might touch are few.

| File | Risk | Resolution |
| --- | --- | --- |
| `cs-games/pathway/curriculum-graph.json` | Generated; a hand merge will be wrong | Resolve the conflict on `build-graph.mjs`, then run `node cs-games/pathway/build-graph.mjs` and keep its output |
| `cs-games/pathway/build-graph.mjs` | Only if the redesign edited the generator | Keep both sets of edits; the Phase 2 additions are three imports, the `labSel` and `labFamilies` helpers, nine node definitions, and the `order-args` selector |
| `.github/workflows/class-pathway-check.yml` | Both may extend path filters or steps | Keep the union of paths; keep the added `build-gap-registry.mjs --check` step |
| `cs-games/pathway/README.md` | Prose | Keep both edits; counts should read 290 nodes and 453 families |
| `cs-games/pathway/tests/mastery-evidence.test.mjs` | Phase 2 edits one assertion (additivity now expects `assemble` plus the nine Phase 2 nodes) | Keep the Phase 2 version |

One thing to check on the Teacher Tools side after both are merged. The redesigned pathway editor has a searchable skill picker built from the graph, so the nine new nodes will appear in it under their Advanced CS areas. Any test or screenshot that hard-codes node counts per area, or the total number of skills, needs to be updated to the new graph. Nothing in this branch changes the picker's code.

## Deployment order and safety

Two things carry the change: the static lab pages, and the curriculum graph JSON that the Worker imports when it normalizes student events. Either can go first without harming students. If the pages deploy first, the new annotations reach a Worker whose graph does not yet select the new modes, and those answers credit nothing, exactly as before. If the Worker deploys first, older cached pages credit the right node by mode without family narrowing. New credit for the eleven modes starts only when both are live, so schedule the Worker redeploy together with the pages. This package did not change the Worker or any migration and cannot deploy either.

## Verifying after integration

Run these from the repository root after merging both branches. Node 22 or newer and a JDK 17 or newer are needed; the Java Games chain also needs `npm install --prefix java-games` for the DOM test library, and a UTF-8 locale (`LC_ALL=C.UTF-8`) because one Array Lab check compares Java output containing the ↔ character.

```sh
node cs-games/pathway/build-graph.mjs && git diff --exit-code -- cs-games/pathway/curriculum-graph.json
node cs-games/pathway/tests/build-gap-registry.mjs --check
node --test cs-games/pathway/tests/*.test.mjs
(cd java-games && LC_ALL=C.UTF-8 npm test)
node cs-games/teacher/wpr-online-tests.mjs && node cs-games/teacher/wpr-profile-tests.mjs
node csp-games/exam-readiness/tests/model.test.mjs && node csp-games/exam-readiness/tests/integration.test.mjs
```

If the graph changes for any reason after this merge (a new node, a changed selector), regenerate the registry and matrix with `node cs-games/pathway/tests/build-gap-registry.mjs` and commit the two files; the registry test fails when they are stale. Phase 2's regression tests are meant to fail loudly if a later change reintroduces a Phase 1 behavior, which the nine negative controls in the package demonstrate.

## Decisions that belong to the teacher

None of these were made in this package. The titles and objectives of the nine new nodes have had no human educational review and should be read by the teacher. The prerequisites are empty and the time estimates are provisional. No mastery policy, question-count threshold or certification exists, and practice evidence is still not eligible for mastery, so nothing should be published as a non-provisional policy on it. The registry lists the open items: API Response Explorer needs a decision on which Documentation skill it assesses before it can earn a node; Class Builder Rearrange needs its host adapter written before it can emit any evidence; the Inheritance and Documentation item banks are small; ArrayList Mixed Practice leans toward Insert & Remove; Search & Sort has no Mixed mode; and several labs send family ids the graph does not yet bind, which leaves credit working at the mode level.

## Rules for whoever continues

Keep every node and family id, because saved class pathways and student evidence refer to them. Do not hand-edit `curriculum-graph.json`. Do not bump `version` without a snapshot migration. Do not attach a mastery policy to the new nodes without a calibration decision. Student evidence stored before this release is not rewritten by anything in this branch; any backfill is a separate, approved data operation.
