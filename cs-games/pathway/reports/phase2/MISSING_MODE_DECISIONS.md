# Missing mode decisions (Phase 2)

Eleven Java modes had no mastery node when this package began. For each one the lab engine, the mode metadata and the scoring path were read before any decision was made. The result is nine new nodes and one widened selector, not eleven new nodes, and no mode was left practice-only. Every new node carries a provisional time estimate, no mastery policy, and a visible limit on what its evidence covers.

## Why these modes were unmapped

The Package F inventory that the graph generator reads lists only the modes Teacher Tools can export as a single-answer multiple-choice question. The eleven modes use other response formats (tapping arguments into order, wiring node references, assembling a program, clicking a faulty line, building Javadoc row by row), so the inventory recorded them as outside export scope and the graph builder never created nodes for them. That is a statement about the export format. It says nothing about whether the scoring behind each mode is sound, so scoring was checked mode by mode (below) rather than inferred from the inventory.

## Decisions

| Game | Mode | How it is scored | Assessed skill | Decision | Node |
| --- | --- | --- | --- | --- | --- |
| Method & Constructor | order-args | The ordered argument tokens must match the signature's parameters in order; a decoy token and every other permutation fail. | Match arguments to a method's parameters | Existing node | `match-call` (selector widened to `match-call` and `order-args`) |
| LinkedList | link | Exact comparison of the head and next references with the chain the prompt names. | Set head and next references to produce a required chain | New node, shared with mutate | `linkedlist-lab:references` |
| LinkedList | mutate | Exact chain comparison after one of six operations (insert at head, middle or tail; remove from head, middle or tail). | Same skill applied to insertion and removal | New node, shared with link | `linkedlist-lab:references` |
| Inheritance | hierarchy | Answer key checked against javac and java by the lab's JVM suite; every question kind rejects a perturbed answer. | Build and read extends hierarchies, is-a assignment, what an object inherits | New node | `inheritance-polymorphism-lab:hierarchy` |
| Inheritance | override | Same. | Decide override, overload, hide or error, and which declaration runs | New node | `inheritance-polymorphism-lab:override` |
| Inheritance | tracer | Same. | Separate reference type (what compiles) from object type (what runs) | New node | `inheritance-polymorphism-lab:tracer` |
| Inheritance | debug | Same, plus a check that choosing a wrong fix fails the question. | Identify the kind of inheritance failure, locate the line, choose the repair | New node, families are defect types | `inheritance-polymorphism-lab:debug` |
| Documentation | editor | Exactly one accepted repair per question and one correct comment line; every other line or repair fails. | Find the comment that contradicts correct code and repair it | New node | `documentation-lab:editor` |
| Documentation | builder | Every single-slot change to the correct Javadoc fails; Javadoc is checked with doclint. | Choose accurate description, @param, @return and @throws content, or omit a tag that does not apply | New node | `documentation-lab:builder` |
| Robot Algorithms | build | The program is run in the lab simulator against the stated requirement; the reference passes, the empty program and truncated programs do not. | Assemble a program that reaches the goal under a requirement | New node | `robot-algorithms:build` |
| Robot Algorithms | debug | Every repair option was run in the simulator: the keyed change fixes the program, each distractor still fails, and the original program really fails. | Choose the change that fixes a robot program; defect types are the families | New node, families are defect types | `robot-algorithms:debug` |

## Reasoning per game

**Method & Constructor, order-args.** Order Arguments and Match Calls ask the same question in two response formats: which argument belongs with which parameter. A separate node would split one skill by interface, so the existing `match-call` node now also accepts `order-args`. No other method or constructor node accepts it, and a test fails if one ever does. The node's earlier coverage note ("argument rearrangement excluded") described the export limit, and the selector now carries an `evidenceScope` note saying so.

**LinkedList, link and mutate.** Both modes ask the student to set `head` and `next` references so the chain comes out exact. Link starts from loose nodes and has one reasoning family; mutate starts from a chain and has six operations. They share a node because the underlying skill is the same, and the families (`link/connect`, `mutate/<operation>`) stay bound so a later policy can require each operation separately. The Trace and Collections modes were already mapped and are unchanged. During scoring validation one real defect surfaced: about 2.2% of `link` draws (448 of 20,000) started with the references already spelling the target, which the page pre-fills, so a student could earn a correct first try without changing anything. The engine now redraws up to 50 times, and a 4,000-draw test confirms none start solved.

**Inheritance, four modes.** The four modes assess different questions: what a hierarchy permits, which method is selected, how compile-time and run-time types differ, and what kind of failure a program has. Merging them into the existing `abstract` node would have blurred those, so each gets a node. Debug questions are attributed by defect type (`debug/...` families), not by the generic word "debug", so a future policy can require each defect type on its own. A test confirms every Inheritance and Robot defect family is bound to the debug node only.

**Documentation, editor and builder.** Inspector (choose the best comment) and Read the Docs were already mapped. Editor and Builder are production tasks (repair a comment, assemble Javadoc) with a different skill from choosing, so they each get a node. Both lean on small authored banks (editor about 20 items, builder 12; Inheritance 16 to 21 per mode), which the nodes state in their `coverageLimit`. A small bank does not break first-attempt credit, since one question counts once per node, but a student can meet the same item again in a later session, so these nodes should not be read as high-confidence evidence until the banks grow.

**Robot Algorithms, build and debug.** Both are scored by the lab's own simulator, which is a stronger oracle than an authored key. Build credits only its own node and never the loops, conditionals or methods nodes. The first Run is the scored attempt; later Runs are retries and never earn first-try credit.

## Not mapped, and why

Three other activities were found while auditing and are recorded in `evidence-gap-registry.json`. API Response Explorer has objective, tested scoring but no node covers reading API responses, and its three activities share one mode id, so mapping it needs a teacher decision on the assessed skill first (status: curriculum mapping needed, priority medium). API Project Builder scores a multi-step project plan that accepts several valid plans and carries a free-text reflection, so one pass or fail is not a first-attempt measure of one skill; it stays practice-only on purpose. Class Builder Rearrange keeps its own local session store and never calls the shared tracker, so it emits no evidence at all (status: unsupported); its host-adapter file in the repository is an unimplemented example.

## What was deliberately not decided here

Node prerequisites for the nine new nodes are empty, time estimates are marked provisional, and no mastery policy is attached. How many correct first tries earn mastery of any of these nodes is a calibration decision for the teacher and is not made in this package. No human educational review of the new node titles and objectives has been done; they were written from the lab content and should be read by the teacher.
