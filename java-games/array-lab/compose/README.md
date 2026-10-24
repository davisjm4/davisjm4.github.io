# Array Lab composition and difficulty rules

Student practice and teacher export use this engine when a difficulty is supplied. The legacy generator remains available for explicit legacy/forced-family fixtures. Student practice always supplies the selected difficulty.

## Reasoning before size

`ir.js` renders and interprets a controlled Java syntax tree. It records value, reference, mutation and control dependencies. `static-slice.js` removes irrelevant statements from structural signatures; `quality.js` separately follows concrete dependencies to the requested observation. The classifier does not use line count, variable spelling, numeric magnitude or loop-iteration count as promotion evidence. Dependent stages count distinct source statements, rather than repeated iterations.

Beginner recipes in the `foundation*` modules assess one focused observation: direct or elementary computed access, one simple update/swap, an ordinary scan/accumulator, independent cell transformations, array defaults/bounds, or a foundational reference relationship. A simple comparison selecting one index remains a single observation. Beginner indexing permits at most two elementary arithmetic/indirection operations. A reference relationship combined with numeric mutation is excluded. In-place observations must actually depend on the transformation for the chosen sample.

Intermediate requires dependent calculations, updates, or nontrivial traversal. Evidence includes an index computed from data, an update read by the observation, a conditional scan, dependent inner-loop limits, or mutation through a reference. Foundational literal lookup cannot be promoted by adding irrelevant statements. Candidates demonstrating the Advanced dependencies below are excluded from Intermediate.

Advanced requires one of these semantic structures in the relevant dependency slice:

* mutation and reference reassignment with numeric state from at least two array objects;
* at least two interacting loop stages with relevant mutations;
* a closed dependency from array updates through evolving scalar state or conditional write positions into later array updates;
* interacting 2D mutations, conditional execution and dependent calculations.

These are structural requirements, not an additive score. Removing all array updates must change an Advanced sample's requested answer. In Advanced search/traversal, it must also change the underlying algorithm result independently of any arithmetic around the final output. A decisive first Boolean comparison cannot stand in for loop-carried reasoning. The minimum-path checks reject cancelling arithmetic, repeated modulus and neutral arithmetic. These conservative checks may reject a useful numerical sample; the scheduler retries data without lowering difficulty or relaxing history.

The rules are a testable engineering approximation, supplemented by assistant source/dataflow review. They are not a formal proof of every possible shortcut, an empirical difficulty study, or independent human certification.

## Meaningful variants and repetition

Every mode/difficulty has at least ten instructional model sets and sixty unique certified structures. Every registered model has at least six structures. Some edge-case models share structures: notably a first-match scan with a missing target. Shared structures are counted once in the union and have one cooldown key. The tests also require at least ten distinct model key sets; relabeling the identical set cannot meet that requirement.

Variants change required index operations, scan direction/stride, boundaries, conditions, reference relationships, observation dependencies, or algorithm stages. Numeric values, array length, names, difficulty labels, model names and branch outcomes do not create new keys. Signatures retain necessary index equality relationships, reference topology, operators and control flow. Generation uses a bounded, least-recent-mode/model scheduler. The last fifty keys persist in `javaArray.semanticHistory.v1`, including skipped challenges, across Mixed, individual modes, levels, reloads and daily session resets. No duplicate or easier fallback is allowed.

Pools certify each descriptor using bounded deterministic numeric seeds. Every live challenge is independently checked again. `certificationSeed` records a reproducible admitted example for the JVM harness; it is not a source of extra structural diversity.

## Examples of reference progression

Beginner: `int[] b = a; System.out.println(a == b);` requires recognizing one shared object.

Intermediate:

```java
int[] a = {4, 7, 2};
int[] b = a;
b[1] += a[2];
System.out.println(a[1]); // 9
```

Advanced:

```java
int[] a = {4, 7, 2};
int[] b = a;
b[1] += a[2];
a = new int[]{6, 3, 8};
b[0] += a[1];
System.out.println(b[0] + a[1]); // 10
```

The Advanced observation needs the old and new objects. The first update to `b[1]` is irrelevant to this particular print and cannot inflate the classification. Permanent tests use these exact examples and reject the independent-array mutation/direct-read shortcut from the classroom rubric.

## Validation and review

```sh
cd java-games
npm install --ignore-scripts --no-package-lock
npm run test:array-compose
npm run test:array-compose-stress
npm run test:array-compose-jvm
```

The smoke suite prepares 720 reproducible samples: twenty per mode/difficulty. The JVM suite checks every certified model/structure descriptor plus all 720 samples, including aliases, complete array states, exceptions and deliberate compile failures. It uses the JVM rather than the interpreter's answer field as the oracle. Java code uses braces and Java operators, with no dynamic evaluation of student text.

For faster stress execution, run `tests.mjs --stress --group=0`, `--group=1` and `--group=2`, then `combine-stress.mjs`. The combined run is 360,000 per-cell challenges, 20,000 Mixed and 10,000 switching/reload challenges: 390,000 total. Report source digests must agree.

`review-bundle.mjs` records the original code, options, answer, seed, independent dependency evidence and a content hash. Completion requires explicit hash-bound assistant decisions. The compressed completed review is labeled assistant source/dataflow review; it must never be described as an independent human audit. The original rejected twenty-sample review and historical development artifacts are retained as historical evidence.

The DOM suite covers all 36 cells, target-only proposals, submission locks, mode/Mixed statistics, teacher links, keyboard interaction, storage failures, same-day reload and local-midnight expiration with a controllable clock. Actual browser checks supplement these tests. Daily scoring uses the existing shared session utility, separate from repetition history.
