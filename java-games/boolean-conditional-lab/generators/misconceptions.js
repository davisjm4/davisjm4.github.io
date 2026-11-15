/* Student-facing explanation of the misunderstanding that a wrong option represents, keyed by the option's
 * misconception tag. Each message is true for every item that can carry its tag (verified by
 * tests/audit/family-java-verify.mjs for the behavioural claims). Scoped to the repaired families
 * (fix-boundary, equivalent-chain, missing-break-fix, short counter) and the two tags added to short mode. */
export const MISCONCEPTION_FEEDBACK = {
  // coverage / fix-boundary
  "overcorrects-the-threshold": "Lowering the threshold by more than needed pulls extra values into this branch. Only the boundary value itself was sent to the wrong branch.",
  "changes-the-wrong-boundary": "That edit changes a different branch's test and breaks its boundary. The branch that uses > instead of >= is left unfixed.",
  "equivalent-rewrite-of-the-bug": "For int values, > T and >= T+1 are the same test, so the code behaves exactly as before and the boundary value still falls through to the next branch.",
  "reorders-instead-of-fixing": "Swapping the first two conditions does not repair the boundary, and the lower test would now catch values that belong to the higher branch.",
  "overshoots-the-boundary-downward": "Testing >= T-1 also accepts the value just below the boundary, which belongs in the next branch.",
  "tests-only-the-boundary-value": "== T is true only for the boundary value itself, so larger values no longer reach this branch.",
  "reverses-the-comparison": "Reversing the comparison makes this branch run for small values instead of large ones.",
  "moves-the-threshold-up": "> T+1 moves the boundary the wrong way: both T and T+1 would fall through to the next branch.",
  "shifts-the-wrong-threshold": "That moves a different branch's threshold, so values change branches there, and the branch that actually has the bug is still wrong.",
  "uses-another-branchs-threshold": "That copies a different branch's threshold into this test, so values between the two thresholds go to the wrong branch.",
  "tests-only-the-wrong-boundary-value": "That makes a different branch test a single value and leaves the real bug in place.",
  "rewrites-the-wrong-arm-equivalently": "That rewrites a different branch's test without changing what it does, so the real bug stays.",
  "reverses-the-wrong-comparison": "That reverses a different branch's comparison, which breaks that branch and leaves the real bug in place.",
  // coverage / equivalent-chain
  "boundary-off-by-one": "When a chain is reversed, every test must become its exact complement (>= t becomes < t, and > t becomes <= t). One test here uses the wrong boundary, so that boundary value goes to a different branch.",
  "order-reversed-without-changing-tests": "Reversing the order of the branches without changing their tests lets the first test catch values meant for later branches.",
  "dropped-the-else": "Without a final else, values that fail every test print nothing, but the original code printed something for them.",
  "boundary-changed-in-every-test": "Every test has its boundary changed (>= became >, and so on), so each boundary value now goes to a different branch.",
  "swapped-two-results": "Two results are attached to the wrong tests, so those values print the wrong result.",
  "wrong-final-else": "The final else prints the wrong result, so values that fail every test print something different from the original.",
  "every-boundary-off-by-one": "Reversing a chain needs the exact complement of every test (>= t becomes < t). Here every boundary is off by one, so each boundary value goes to a different branch.",
  "off-by-one-and-dropped-else": "Two things are wrong: a boundary is off by one after reversing, and the final else is missing.",
  "reversed-order-and-off-by-one": "Reversing a chain correctly means complementing every test and giving the old else its own test. This rewrite reverses the order and changes the boundaries incorrectly, so some values print a different result.",
  // switchIf / missing-break-fix
  "fixes-only-one-fall-through": "That fixes one block, but the other block that lacks break still runs on into the block below it.",
  "removes-a-needed-break": "Removing a break makes execution continue into the next block, which adds another fall-through instead of stopping the existing one.",
  "removes-needed-breaks": "Removing breaks makes execution continue into the next blocks, which adds more fall-through instead of stopping the existing one.",
  "moves-default": "Where default is placed does not stop fall-through, and a default without break now runs on into the block below it.",
  "adds-useless-break": "A break after the last block changes nothing, because execution leaves the switch there anyway. The blocks that lack break still fall through.",
  "fixes-the-wrong-block": "That adds break to a block that does not need it, and the block that actually falls through is unchanged.",
  "thinks-braces-stop-fall-through": "Braces group statements but do not stop execution. Only break (or return) leaves the switch, so fall-through still happens.",
  "moves-the-block-instead-of-adding-break": "Reordering blocks does not stop fall-through: a block without break still runs into whichever block comes next.",
  "moves-the-blocks-instead-of-adding-break": "Reordering blocks does not stop fall-through: a block without break still runs into whichever block comes next.",
  // short mode: counter family
  "evaluates-both-operands": "&& and || stop as soon as the result is known. The right operand, with its ++ side effect, runs only when the left side does not already decide the result.",
  "thinks-right-side-never-runs": "Here the left side does not decide the result, so the right operand does run and its increment happens.",
  "misevaluated-condition": "Work out whether the whole condition is true. Whether \"In \" prints depends on the combined result of the && or ||, not on one side alone.",
  "miscounted-increment": "hits was increased more times than the code actually does it. Each ++ or hits++ that runs adds exactly one.",
  "counts-the-increment-twice": "The increment runs once, not twice: each ++ or hits++ that runs adds exactly one to hits.",
  "misevaluated-condition-and-miscounted": "Two slips: whether the whole condition is true was misjudged, and hits was counted wrongly. Check the left operand first, then count each increment that actually runs.",
  "no-increment-and-misevaluated": "Two slips: whether the whole condition is true was misjudged, and the increment on the right side was ignored even though it runs.",
  "forgets-the-increment": "The increment did run, so hits is one higher than its starting value.",
  // short mode: plausible-outcome tags
  "thinks-else-also-runs": "An if/else runs exactly one of its two branches: else runs only when the if condition is false.",
  "thinks-no-branch-matches": "An if/else always runs one of its two branches, so one of the two messages is always printed.",
};
