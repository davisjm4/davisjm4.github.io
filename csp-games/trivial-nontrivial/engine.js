/* Bounded, seeded AP CSP pseudocode challenge generator. */
export const CATEGORIES = {
  selection: { title: "Selection", short: "Selection", label: "Meaningful or Superficial?" },
  iteration: { title: "Iteration", short: "Iteration", label: "Meaningful or Superficial?" },
  procedures: { title: "Procedures and Abstraction", short: "Procedures", label: "Procedure Reasoning" },
  algorithms: { title: "Complete Algorithms and Comparisons", short: "Algorithms", label: "Algorithm Reasoning" },
};
export const ACTIVITIES = {
  classify: "Classify the Code",
  compare: "Compare Two Implementations",
  explain: "Explain the Difference",
};
const rows = {
  selection: [
    ["sel-same-labels","Two branches, one label","Equivalent branches","same","Beginner","Display the status after a sensor check.","The sensor value is an integer from 0 through 10.","The presence of IF does not prove the selected behavior changes."],
    ["sel-same-actions","Two paths, identical update","Equivalent branches","same","Beginner","Set the shipping message for any package.","Both branches are intended to set the same message.","Different paths do not matter when they do the same task-relevant work."],
    ["sel-always-true","A guaranteed condition","Input-domain reasoning","constantTrue","Beginner","Display that the supplied value is valid.","The value is guaranteed to be at least 0.","A condition is not meaningful for this input domain if it can never be false."],
    ["sel-always-false","A condition excluded by the rules","Input-domain reasoning","constantFalse","Beginner","Display whether the measured value is negative.","The value is guaranteed to be at least 0.","The condition never selects its first branch under the stated assumptions."],
    ["sel-threshold","A threshold changes the result","Task-relevant choice","threshold","Beginner","Display whether the score meets the stated threshold.","Scores may fall below, equal, or exceed the threshold.","The selected branch changes the required result."],
    ["sel-flag","A Boolean input chooses an action","Task-relevant choice","flag","Beginner","Display the supplied status when enabled; otherwise display Disabled.","The flag may be true or false and the supplied status may vary.","A Boolean condition can be meaningful when it changes the requested result."],
    ["sel-debug","A change hidden from the task","Irrelevant state","irrelevant","Beginner","Display only whether the device is ready.","The displayed readiness value is fixed before the conditional.","Changing an unobserved temporary value does not change the requested result."],
    ["sel-guard","A check made redundant by an earlier guard","Redundant logic","guard","Intermediate","Display a positive value only when it is greater than zero.","The inner IF runs only after an outer test established value > 0.","An earlier condition can make a later condition redundant."],
    ["sel-overwrite","A result replaced before it is shown","Overwritten state","overwrite","Intermediate","Display the final review status.","The assignment after the conditional always runs.","A conditional can run and still have no effect on the final result."],
    ["sel-boundary","The exact boundary matters","Boundary reasoning","boundary","Intermediate","Label a score as meeting the target when it is at least 5.","The target includes a score equal to 5.","A strict comparison can change behavior at the boundary."],
    ["sel-list-empty","A list guard protects an empty list","Safe access","listGuard","Intermediate","Display the first item, or display that the list is empty.","The list may contain zero or more items; indices start at 1.","The condition changes behavior and prevents an invalid list access."],
    ["sel-inner","A nested test already guaranteed true","Redundant logic","inner","Intermediate","Set the outcome for any nonnegative value.","The inner test is reached only when value is at least 0.","The outer selection matters; the highlighted inner selection does not."],
    ["sel-excluded","A test outside the permitted input range","Input-domain reasoning","excluded","Intermediate","Display whether a whole-number count is zero.","The count is never negative.","The condition checks a case the task says cannot occur."],
    ["sel-repeated-term","A repeated test inside a useful condition","Boolean redundancy","repeatedTerm","Intermediate","Set the access result according to the two stated checks.","Both check values can vary independently.","A redundant term can coexist with a selection that still affects behavior."],
    ["sel-loop-control","Selection controls repeated work","Control-flow interaction","loopControl","Intermediate","Add 2 once for each enabled processing step.","The setting may enable 0, 1, or 3 steps.","The decision changes the number of updates that contribute to the result."],
    ["sel-irrelevant-list","A conditional changes only a scratch list","Irrelevant state","scratchList","Intermediate","Display the original item count.","The scratch copy is never displayed or used later.","An internal change can be real yet irrelevant to the stated task."],
    ["sel-nested-useful","Nested decisions select a category","Nested decision","nestedUseful","Advanced","Display the correct label for a value below, at, or above two cutoffs.","The value may be any integer from 0 through 12.","Each reachable branch contributes to the requested classification."],
    ["sel-redundant-or","An OR condition includes a redundant test","Boolean redundancy","redundantOr","Advanced","Display whether the item is nonnegative.","The item may be negative, zero, or positive.","A complex Boolean expression may reduce to a simpler condition."],
    ["sel-after-update","A condition is checked after the value is changed","State tracing","afterUpdate","Advanced","Display whether the original value was positive.","The code replaces the value with 0 before testing it.","Trace the current state; the condition no longer sees the original input."],
    ["sel-equivalent","Different conditions, same integer cases","Behavioral equivalence","equivalent","Advanced","Display whether the integer is at least 4.","The input is an integer.","Equivalent Boolean tests can produce the same behavior for the stated domain."],
  ],
  iteration: [
    ["iter-sum","A traversal contributes to a total","List processing","sum","Beginner","Display the sum of every value in the list.","The list may be empty; the total starts at 0.","Each visited item contributes to the requested total."],
    ["iter-empty","A traversal over an empty list","Input-size reasoning","empty","Beginner","Display how many items are processed.","The list may be empty, contain one item, or contain several items.","FOR EACH executes zero times when there are no items."],
    ["iter-once","One iteration does meaningful work","Iteration count","once","Beginner","Add the supplied value to a starting total.","Exactly one value is supplied.","One iteration is not automatically superficial when its body does needed work."],
    ["iter-repeat-meaningful","A counted loop applies a required update","Repeated update","repeat","Beginner","Increase the starting amount by 2 for each requested step.","The number of steps may be 0, 1, or 3.","The loop count determines the required final amount."],
    ["iter-constant","Repeatedly assigning the same value","Redundant repetition","constant","Beginner","Display the fixed ready label.","The loop repeats the same assignment and nothing reads an intermediate value.","Repeated execution can be functionally redundant for this task."],
    ["iter-temp","A loop changes only an unused counter","Irrelevant state","temp","Beginner","Display the supplied label unchanged.","The counter is never displayed or used by another statement.","A changing variable is not automatically a task-relevant result."],
    ["iter-filter-sum","Iteration and selection filter a total","List filtering","filterSum","Intermediate","Add only values greater than 3.","The list can contain values on either side of 3.","The loop and conditional jointly determine which values contribute."],
    ["iter-filter-count","Count items meeting a condition","List filtering","filterCount","Intermediate","Count values equal to the target.","Values may match none, one, or several times.","The condition decides which list elements affect the count."],
    ["iter-until","Repeat until a running amount reaches a goal","Termination reasoning","until","Intermediate","Execute at least one update, adding 2 until the total reaches or passes the goal.","The goal is a nonnegative even number no greater than 8.","The loop terminates because each pass moves the total toward the goal."],
    ["iter-until-one","A repeat-until loop stops after one pass","Termination reasoning","untilOne","Intermediate","Increase the value once, then stop at the stated limit.","The initial value is one below the limit.","REPEAT UNTIL checks its condition after the body executes."],
    ["iter-pairs","Nested iteration counts ordered pairs","Nested iteration","pairs","Intermediate","Count ordered pairs of positions whose values differ.","The list has 0, 1, or 3 positions.","The inner repetition depends on each outer position."],
    ["iter-overwrite","The accumulator is reset inside the loop","State tracing","overwrite","Intermediate","Display the sum of the list values.","The list may contain different values.","The loop runs, but resetting the total prevents accumulation."],
    ["iter-last","A traversal leaves the last value","Traversal result","last","Intermediate","Display the last value in a nonempty list.","The list contains at least one value.","A traversal can be meaningful even when it intentionally selects one position."],
    ["iter-output","A loop displays each item","Observable output","displayEach","Intermediate","Display every item in order.","The list may contain 0, 1, or 3 values.","Each iteration adds a visible output line."],
    ["iter-copy","A loop builds a transformed list","List construction","copy","Intermediate","Create a list containing double each input value.","Input values are small nonnegative integers.","Each iteration contributes one transformed item."],
    ["iter-guarded","A loop runs only when a count is positive","Loop boundary","guarded","Advanced","Add a fixed amount once per requested step.","The count is 0, 1, or 4.","The boundary input changes whether the body runs at all."],
    ["iter-no-op-if","A loop contains a condition with no effect","Nested constructs","noOpIf","Advanced","Display the total after processing the list.","The IF body reassigns a variable to its existing value.","Iteration is meaningful here, but the inner conditional is not."],
    ["iter-twice","A second pass repeats completed work","Redundant pass","twice","Advanced","Display the sum of the values.","The second traversal assigns a scratch counter that is never used.","Extra work does not make the result more correct."],
    ["iter-limit","A loop handles the list-length boundary","Boundary reasoning","limit","Advanced","Count every element, including the final one.","The list may have 0 through 4 elements.","The number of repetitions must account for every element, including the final one."],
    ["iter-equivalent","A loop and a direct expression agree on shown inputs","Behavioral comparison","equivalent","Advanced","Display twice the supplied value.","The input is a nonnegative integer.","An iteration can be meaningful while an equivalent direct expression uses fewer steps."],
  ],
  procedures: [
    ["proc-parameter","A parameter changes a returned result","Parameter use","parameter","Beginner","Return the supplied number multiplied by 2.","The argument may be 2, 5, or 9.","The parameter affects the returned value."],
    ["proc-ignored","A procedure accepts but ignores its parameter","Parameter use","ignored","Beginner","Return the supplied value plus 1.","The task expects different outputs for different inputs.","A parameter that is never used cannot influence the result."],
    ["proc-constant-bad","A constant return for an input-dependent task","Return behavior","constantBad","Beginner","Return the larger of the argument and 5.","The argument may be below, equal to, or above 5.","A constant result fails to respond when the task requires input-sensitive behavior."],
    ["proc-constant-good","A useful constant for a fixed task","Context matters","constantGood","Beginner","Return the fixed conversion factor used by this program.","The program uses the same documented factor each time.","A constant return is not automatically superficial; its role matters."],
    ["proc-return-used","The caller uses the returned value","Return flow","returnUsed","Beginner","Compute and display a doubled value.","The result is displayed immediately after the call.","The procedure's returned value reaches the required output."],
    ["proc-return-ignored","The caller discards a useful return value","Return flow","returnIgnored","Intermediate","Display the computed total.","The call has no assignment target and does not display internally.","A procedure may do work whose result never reaches the task output."],
    ["proc-side-effect","A procedure updates a shared list","Side effects","sideEffect","Intermediate","Append the supplied item to the list.","The list is then displayed by the caller.","The procedure's side effect changes later observable state."],
    ["proc-reuse","One procedure is reused for several inputs","Abstraction and reuse","reuse","Intermediate","Display a transformed result for each supplied amount.","The caller invokes the procedure with three different arguments.","Repeated calls reuse the same defined computation."],
    ["proc-one-call","A tiny wrapper used once","Abstraction and context","wrapper","Intermediate","Display the supplied label once through a procedure.","The code's only DISPLAY is inside this procedure; judging its effect is separate from whether a single-use wrapper is the best abstraction.","Short length alone does not determine whether a procedure changes task behavior."],
    ["proc-branch","A parameter controls a branch","Parameter use","branch","Intermediate","Return a status based on the supplied score.","Scores may be below, equal to, or above 5.","The parameter affects which return value reaches the caller."],
    ["proc-list","A procedure processes a list","Procedural abstraction","list","Intermediate","Return the sum of all values in the list.","The list may be empty or contain several values.","The procedure hides a reusable multi-step traversal."],
    ["proc-overwrite","The caller replaces the result","State tracing","overwrite","Intermediate","Display the result of a calculation.","The caller assigns a fixed value before DISPLAY.","A meaningful return can be made irrelevant by later code."],
    ["proc-local","A local temporary supports a returned result","Local state","local","Intermediate","Return three times the supplied amount.","The temporary is used to compute the returned value.","Local state can support meaningful abstraction."],
    ["proc-ignored-branch","A parameter is read but both branches agree","Control flow","sameReturn","Intermediate","Return the requested fixed status.","Both branches return the same status.","Mentioning a parameter in a condition does not prove it changes behavior."],
    ["proc-propagate","A returned Boolean controls a caller decision","Procedure interaction","propagate","Advanced","Display whether the item meets the rule.","The procedure returns true exactly when the value is at least 5.","The procedure's result controls a later selection."],
    ["proc-shared-list","A parameter is used to choose an appended value","Side effects","appendChoice","Advanced","Append a value based on the supplied choice.","The choice may select either of two values.","The parameter changes the list that the caller later observes."],
    ["proc-called-same","The same argument is repeated","Parameter use","sameArg","Advanced","Display the doubled value for each call.","Every call uses the argument 4.","The parameter is used, but variation across calls is not needed to establish that."],
    ["proc-return-hidden","A returned total is computed but hidden","Return flow","hidden","Advanced","Display the number of matching values.","The caller stores the return, then replaces it with 0.","Trace the caller as well as the procedure body."],
    ["proc-inline","An abstraction matches repeated task work","Abstraction and reuse","inline","Advanced","Apply the same multi-step conversion to each value.","The conversion is called for multiple values.","A useful procedure can be meaningful even when an equivalent inlined version exists."],
    ["proc-context","The procedure's value depends on its larger role","Context matters","context","Advanced","Return the configured default level for this fixed program.","The caller is explicitly asking for the default, not for an input-dependent result.","Judge the procedure against its stated role, not its length or constant alone."],
  ],
  algorithms: [
    ["alg-filter-count","Filter and count in one traversal","Combined algorithm","filterCount","Beginner","Count positive values in the list.","The list may contain positive, zero, and negative values.","Iteration and selection jointly contribute to the count."],
    ["alg-sum","A short traversal solves the task","Combined algorithm","sum","Beginner","Display the sum of the list.","The list may be empty.","A concise algorithm can perform meaningful work."],
    ["alg-decorative-if","All constructs appear, but the selection is fixed","Superficial construct","decorativeIf","Beginner","Display the number of items processed.","The selection condition is always true for the displayed constant.","Presence of all constructs does not make each one meaningful."],
    ["alg-zero-loop","A loop updates a value the task never uses","Superficial construct","zeroLoop","Beginner","Display the supplied label.","The task does not ask for counter, and counter is never used later.","A loop that changes only an unused counter has no effect on the displayed task."],
    ["alg-efficiency","Equivalent outputs with different work","Efficiency versus behavior","efficiency","Intermediate","Display twice the sum of all values.","The list can be any finite list of integers.","Both algorithms can be correct even when one performs more updates."],
    ["alg-sample-only","An example passes while a boundary case fails","Generalization","sampleOnly","Intermediate","Count values at least 5.","The list can include values below, at, or above 5.","A successful example does not establish correctness for every allowed input."],
    ["alg-boundary","The boundary changes the classification","Boundary reasoning","boundary","Intermediate","Count values that are at least 5.","Values equal to 5 are included and the displayed list contains a value equal to 5.","A strict versus inclusive test changes the result at the boundary."],
    ["alg-empty","An algorithm fails for the empty list","Input boundary","emptyBug","Intermediate","Display the sum of every value.","The list may be empty.","An algorithm must be evaluated against all stated inputs, including an empty list."],
    ["alg-nested","A nested loop counts combinations","Nested iteration","nested","Intermediate","Count ordered pairs of positions whose values differ.","The list may have 0, 1, or 3 positions, and all values in a nonempty list are distinct.","Both repetitions contribute to the pair count."],
    ["alg-search","Search until the first matching value is found","Search algorithm","search","Intermediate","Display whether the target occurs in the list.","The target may be absent or may occur at any position.","Selection inside iteration can stop the search from changing the result further."],
    ["alg-maximum","Track the maximum across the list","State tracking","maximum","Intermediate","Display the largest value.","The list is nonempty and can contain negative values.","A meaningful algorithm can still be incorrect if its initial value excludes valid inputs."],
    ["alg-order","Order of updates affects the final value","Sequence and state","order","Intermediate","Add 1 only while the current value is below 5.","The starting value may be 3, 5, or 7.","Trace each update before evaluating the next condition."],
    ["alg-unused-loop","A required sum plus an unused loop","Irrelevant work","unusedLoop","Advanced","Display the sum of the values.","The second loop changes only an unused counter.","A correct result does not make unrelated work meaningful."],
    ["alg-redundant-nested","A complicated test repeats a guaranteed condition","Redundant logic","redundant","Advanced","Count values greater than 0.","The list is already filtered to positive values before the nested test.","A complex-looking condition may add no decision."],
    ["alg-separated-requirement","Meaningful computation, separate task requirement unmet","Requirement distinction","requirement","Advanced","Compute and display the total, and also append it to results.","The separate written requirement includes storing the total in results.","Behavioral significance and satisfying a separate requirement are different judgments."],
    ["alg-inefficient-correct","A longer algorithm still produces the correct output","Efficiency versus behavior","inefficient","Advanced","Display twice the sum of the list.","The input list may contain any finite integer values.","Extra repeated work can be inefficient without making the result incorrect."],
    ["alg-equivalent-one","A strict test misses the boundary","Boundary and generalization","oneInput","Advanced","Count values at least 5.","The list may contain values equal to 5; a strict comparison excludes them.","Two versions can agree on one shown list and differ on another allowed list."],
    ["alg-short","A direct algorithm with one useful loop","Meaningful simplicity","short","Advanced","Return the number of items in the list by counting them.","The list may be empty or nonempty.","A short, correct algorithm can be meaningful."],
    ["alg-wrong-but-meaningful","A flawed accumulator still responds to input","Correctness versus effect","wrongMeaningful","Advanced","Display the sum of all values.","The list may include both positive and negative values.","A construct can affect behavior meaningfully while the algorithm is still incorrect."],
    ["alg-all-three","Selection and iteration jointly solve the task","Combined algorithm","allThree","Advanced","Count values that are even and at least 4.","Values are nonnegative integers and may be even or odd and below 4 or at least 4.","The code must be traced; construct names alone do not determine the result."],
  ],
};
const parseRows = Object.fromEntries(Object.entries(rows).map(([category, list]) => [
  category,
  list.map((row, index) => {
    const p = row;
    return { id:p[0], title:p[1], family:p[2], pattern:p[3], difficulty:p[4].toLowerCase(), task:p[5], assumptions:p[6], misconception:p[7], category, ordinal:index };
  }),
]));
export const MODELS = Object.values(parseRows).flat();
export const MODEL_COUNTS = Object.fromEntries(Object.keys(CATEGORIES).map(k => [k, parseRows[k].length]));

const ALGORITHM_REVIEW_FOCUS = {
  filterCount:"the loop and selection working together",
  sum:"the list traversal",
  decorativeIf:"the always-true IF selection",
  zeroLoop:"the loop that changes only an unused counter",
  efficiency:"the complete algorithm's result (efficiency is separate)",
  sampleOnly:"the selection in the counting algorithm",
  boundary:"the selection at the inclusive boundary",
  emptyBug:"the first-item initialization and traversal",
  nested:"the nested traversals and their selection",
  search:"the match selection inside iteration",
  maximum:"the loop and selection that update the maximum",
  order:"the condition and REPEAT UNTIL sequence",
  unusedLoop:"the second loop that changes an unused counter",
  redundant:"the complete counting algorithm",
  requirement:"the computation, separate from the storage requirement",
  inefficient:"the complete algorithm's result (efficiency is separate)",
  oneInput:"the two algorithms across shown and other allowed inputs",
  short:"the single traversal",
  wrongMeaningful:"the selection and accumulator in the sum attempt",
  allThree:"sequence, selection, and iteration working together",
};
const reviewFocusFor = model => model.category === "algorithms"
  ? (ALGORITHM_REVIEW_FOCUS[model.pattern] || "the complete algorithm")
  : model.category === "selection" ? "the conditional statement"
    : model.category === "iteration" ? "the loop"
      : "the procedure in its calling context";

const v = name => ({ var:name });
const lit = value => ({ lit:value });
const op = (operator, ...args) => ({ op:operator, args });
const set = (name, expr) => ({ type:"set", name, expr });
const display = expr => ({ type:"display", expr });
const iff = (condition, yes, no=[]) => ({ type:"if", condition, yes, no });
const repeat = (count, body) => ({ type:"repeat", count, body });
const each = (item, list, body) => ({ type:"each", item, list, body });
const until = (condition, body) => ({ type:"until", condition, body });
const call = (name, args=[], into=null) => ({ type:"call", name, args, into });
const ret = expr => ({ type:"return", expr });
const proc = (params, body) => ({ params, body });
const program = (initial, body, observe=[], procedures={}) => ({ initial, body, observe, procedures });

function valuesFor(model, variant) {
  const n = [2,5,8][variant];
  const values = [[],[2],[1,4,7]][variant];
  return { n, values };
}
function scenarioFor(model, variant) {
  const q = valuesFor(model, variant), x=q.n, t=5, data=q.values;
  let p, b, correct, correctB, explanation, customAssumptions=model.assumptions;
  if (model.category==="selection") {
    switch(model.pattern) {
      case "same":
        p=program({sensor:x, status:""},[iff(op("≥",v("sensor"),lit(t)),[set("status",lit("Ready"))],[set("status",lit("Ready"))]),display(v("status"))],["status"]);
        correct=false; explanation="Both branches assign the same task-relevant status, so the condition does not change what is displayed.";
        break;
      case "constantTrue":
        p=program({value:x, label:""},[iff(op("≥",v("value"),lit(0)),[set("label",lit("Valid"))],[set("label",lit("Invalid"))]),display(v("label"))],["label"]);
        correct=false; explanation="The stated domain guarantees value ≥ 0, so only the first branch can run. The test adds no choice for this task.";
        break;
      case "constantFalse":
        p=program({value:x, answer:""},[iff(op("<",v("value"),lit(0)),[set("answer",lit("Negative"))],[set("answer",lit("Not negative"))]),display(v("answer"))],["answer"]);
        correct=false; explanation="The input is never negative under the assumptions. The conditional always takes the same branch.";
        break;
      case "threshold":
        p=program({score:x, result:""},[iff(op("≥",v("score"),lit(t)),[set("result",lit("Meets target"))],[set("result",lit("Below target"))]),display(v("result"))],["result"]);
        correct=true; explanation="Scores on opposite sides of the target produce different required labels. The displayed output depends on the decision.";
        break;
      case "flag":
        p=program({enabled:[true,false,true][variant], status:["Ready","Busy","Offline"][variant], message:""},[iff(v("enabled"),[set("message",v("status"))],[set("message",lit("Disabled"))]),display(v("message"))],["message"]);
        correct=true; explanation="The Boolean input can be true or false, and each branch displays the corresponding requested message.";
        break;
      case "irrelevant":
        p=program({ready:true, sensor:x, scratch:0},[iff(op("≥",v("sensor"),lit(t)),[set("scratch",v("sensor"))],[set("scratch",lit(-1))]),display(v("ready"))],["ready"]);
        correct=false; explanation="The condition changes scratch, but the task asks only for ready, which stays true for every shown input.";
        break;
      case "guard":
        p=program({value:x, answer:""},[iff(op(">",v("value"),lit(0)),[iff(op("≥",v("value"),lit(0)),[set("answer",lit("Positive"))],[set("answer",lit("Other"))])],[set("answer",lit("Other"))]),display(v("answer"))],["answer"]);
        correct=false; explanation="Whenever the inner test runs, the outer test has already established value > 0. The inner IF cannot change the result.";
        break;
      case "overwrite":
        p=program({value:x, result:""},[iff(op("≥",v("value"),lit(t)),[set("result",lit("High"))],[set("result",lit("Low"))]),set("result",lit("Reviewed")),display(v("result"))],["result"]);
        correct=false; explanation="The conditional assigns a value, but the later unconditional assignment replaces it before the result is displayed.";
        break;
      case "boundary":
        p=program({score:x, result:""},[iff(op(">",v("score"),lit(t)),[set("result",lit("Meets target"))],[set("result",lit("Below target"))]),display(v("result"))],["result"]);
        correct=true; explanation="The branches change the output. At score 5 this version labels the score below target, so it is behaviorally significant but fails the stated inclusive-boundary task.";
        break;
      case "listGuard":
        p=program({items:data, first:""},[iff(op(">",op("LENGTH",v("items")),lit(0)),[set("first",op("INDEX",v("items"),lit(1)))],[set("first",lit("Empty"))]),display(v("first"))],["first"]);
        correct=true; explanation="The selection handles both an empty list and a nonempty list. It avoids an invalid index and chooses the required output.";
        break;
      case "inner":
        p=program({value:x, answer:""},[iff(op("≥",v("value"),lit(0)),[iff(op("≥",v("value"),lit(0)),[set("answer",lit("Nonnegative"))],[set("answer",lit("Negative"))])],[set("answer",lit("Negative"))]),display(v("answer"))],["answer"]);
        correct=false; explanation="The outer test already guarantees the inner test is true. The inner conditional is superficial even though the outer conditional matters.";
        break;
      case "excluded":
        p=program({count:x, label:""},[iff(op("<",v("count"),lit(0)),[set("label",lit("Zero"))],[set("label",lit("Not zero"))]),display(v("label"))],["label"]);
        correct=false; explanation="Counts are nonnegative, so the first branch is unreachable. Also, this code does not distinguish zero from positive counts.";
        break;
      case "repeatedTerm":
        p=program({a:variant===0, b:variant===1, allowed:false},[iff(op("AND",v("a"),op("OR",v("a"),v("b"))),[set("allowed",lit(true))],[set("allowed",lit(false))]),display(v("allowed"))],["allowed"]);
        correct=true; explanation="The repeated term can be simplified, but the selection still changes allowed for some stated input combinations.";
        break;
      case "loopControl":
        p=program({enabled:variant!==0, count:0},[iff(v("enabled"),[repeat(x===5?1:x===2?0:3,[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="When enabled, the repeated updates change the displayed count; when disabled, the count remains zero.";
        break;
      case "scratchList":
        p=program({items:data, scratch:data.slice(), count:data.length},[iff(op(">",v("count"),lit(0)),[set("scratch",lit([]))],[set("scratch",lit(["unused"]))]),display(v("count"))],["count"]);
        correct=false; explanation="The selection changes a scratch list, but the requested item count was already stored and is the only value displayed.";
        break;
      case "nestedUseful":
        p=program({value:x, label:""},[iff(op("<",v("value"),lit(4)),[set("label",lit("Low"))],[iff(op("<",v("value"),lit(8)),[set("label",lit("Middle"))],[set("label",lit("High"))])]),display(v("label"))],["label"]);
        correct=true; explanation="The reachable branches distinguish the three ranges required by the task.";
        break;
      case "redundantOr":
        p=program({item:[-2,0,3][variant], label:""},[iff(op("OR",op("≥",v("item"),lit(0)),op(">",v("item"),lit(2))),[set("label",lit("Nonnegative"))],[set("label",lit("Negative"))]),display(v("label"))],["label"]);
        correct=true; explanation="The second comparison is redundant because item > 2 already implies item ≥ 0. The overall selection still distinguishes negative from nonnegative values.";
        break;
      case "afterUpdate":
        p=program({value:x, originalPositive:false},[set("value",lit(0)),iff(op(">",v("value"),lit(0)),[set("originalPositive",lit(true))],[set("originalPositive",lit(false))]),display(v("originalPositive"))],["originalPositive"]);
        correct=false; explanation="The test reads the updated value 0, not the original input. The displayed result is always false.";
        break;
      case "equivalent":
        p=program({value:x, label:""},[iff(op("≥",v("value"),lit(4)),[set("label",lit("Target"))],[set("label",lit("Other"))]),display(v("label"))],["label"]);
        b=program({value:x, label:""},[iff(op(">",v("value"),lit(3)),[set("label",lit("Target"))],[set("label",lit("Other"))]),display(v("label"))],["label"]);
        correct=true; correctB=true; explanation="For integer inputs, value ≥ 4 and value > 3 have the same truth value. Both conditionals make a meaningful choice and produce the same shown result.";
        break;
    }
  } else if (model.category==="iteration") {
    switch(model.pattern) {
      case "sum":
        p=program({items:data,total:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),display(v("total"))],["total"]);
        correct=true; explanation="Each list item contributes to total, so changing the list changes the displayed sum.";
        break;
      case "empty":
        p=program({items:data,count:0},[each("item","items",[set("count",op("+",v("count"),lit(1)))]),display(v("count"))],["count"]);
        correct=true; explanation=data.length===0 ? "On the displayed empty list the body executes zero times, which is correct for this input. Across the stated domain, the same loop counts each item when one or more are supplied." : "The body runs once for each supplied item and updates the requested processed-item count.";
        break;
      case "once":
        p=program({value:x,total:1},[repeat(1,[set("total",op("+",v("total"),v("value"))) ]),display(v("total"))],["total"]);
        correct=true; explanation="The loop executes once, but that one execution adds the supplied value needed by the task.";
        break;
      case "repeat":
        p=program({amount:10,steps:variant, total:10},[repeat(variant,[set("total",op("+",v("total"),lit(2))) ]),display(v("total"))],["total"]);
        correct=true; explanation="Each repetition performs one requested increase. Zero, one, and several steps produce different totals.";
        break;
      case "constant":
        p=program({label:"Ready",steps:[0,1,3][variant]},[repeat([0,1,3][variant],[set("label",lit("Ready"))]),display(v("label"))],["label"]);
        correct=false; explanation="The repeated assignment keeps setting the same value. The task's displayed label is unchanged whether the body runs zero, one, or several times.";
        break;
      case "temp":
        p=program({label:"Ready",counter:0,steps:[0,1,3][variant]},[repeat([0,1,3][variant],[set("counter",op("+",v("counter"),lit(1)))]),display(v("label"))],["label"]);
        correct=false; explanation="The loop changes counter, but the requested label is displayed unchanged and counter is never used.";
        break;
      case "filterSum":
        p=program({items:data,total:0},[each("item","items",[iff(op(">",v("item"),lit(3)),[set("total",op("+",v("total"),v("item")))])]),display(v("total"))],["total"]);
        correct=true; explanation="Only values greater than 3 contribute to the total; the loop and selection jointly implement the filter.";
        break;
      case "filterCount":
        p=program({items:data,target:4,count:0},[each("item","items",[iff(op("=",v("item"),v("target")),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="The IF determines which items increase count. Both constructs contribute to the requested match count.";
        break;
      case "until":
        p=program({total:0,goal:[0,4,8][variant]},[until(op("≥",v("total"),v("goal")),[set("total",op("+",v("total"),lit(2)))]) ,display(v("total"))],["total"]);
        correct=true; explanation="REPEAT UNTIL executes the body at least once, then stops after total reaches the goal. The changing total is the requested result.";
        break;
      case "untilOne":
        p=program({value:[1,3,4][variant],limit:5},[until(op("≥",v("value"),v("limit")),[set("value",op("+",v("value"),lit(1))) ]),display(v("value"))],["value"]);
        correct=true; explanation="This loop runs once, changes value to the limit, and then terminates. One iteration performs the needed work.";
        break;
      case "pairs":
        p=program({items:data,pairs:0},[each("first","items",[each("second","items",[iff(op("≠",v("first"),v("second")),[set("pairs",op("+",v("pairs"),lit(1)))])])]),display(v("pairs"))],["pairs"]);
        correct=true; explanation="The nested traversals count each ordered pair whose values differ. Repetition depends on both positions.";
        break;
      case "overwrite":
        p=program({items:data,total:0},[each("item","items",[set("total",lit(0)),set("total",v("item"))]),display(v("total"))],["total"]);
        correct=true; explanation="The loop changes the displayed value based on the list, so iteration has an effect, but resetting total each pass means this is not a sum.";
        break;
      case "last":
        p=program({items:[[2],[2,5],[1,4,7]][variant], last:""},[each("item","items",[set("last",v("item"))]),display(v("last"))],["last"]);
        correct=true; explanation="The final assignment leaves the last list value in last. The loop is meaningful for the stated last-item task.";
        break;
      case "displayEach":
        p=program({items:data},[each("item","items",[display(v("item"))])],[]);
        correct=true; explanation="Each list item adds one visible output line, so the number and order of outputs depend on the traversal.";
        break;
      case "copy":
        p=program({items:data, doubled:[]},[each("item","items",[call("appendDouble",[v("doubled"),v("item")])]) ,display(v("doubled"))],["doubled"],{appendDouble:proc(["target","value"],[{type:"append",list:"target",expr:op("*",v("value"),lit(2))}])});
        correct=true; explanation="The procedure call inside the traversal appends one doubled value for each input item.";
        break;
      case "guarded":
        p=program({steps:[0,1,4][variant],total:0},[repeat([0,1,4][variant],[set("total",op("+",v("total"),lit(3))) ]),display(v("total"))],["total"]);
        correct=true; explanation="The body contributes 3 per requested step. The zero-step boundary and larger counts produce different totals.";
        break;
      case "noOpIf":
        p=program({items:data,total:0},[each("item","items",[iff(op("≥",v("item"),lit(0)),[set("total",v("total"))],[set("total",v("total"))])]),display(v("total"))],["total"]);
        correct=false; explanation="The IF assigns total to itself in both branches, so the conditional has no effect. The enclosing traversal also leaves the task result at 0.";
        break;
      case "twice":
        p=program({items:data,total:0,scratch:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),each("item","items",[set("scratch",op("+",v("scratch"),lit(1)))]),display(v("total"))],["total"]);
        correct=true; explanation="The first traversal computes the requested total. The second traversal performs extra work but does not affect that result.";
        break;
      case "limit":
        p=program({items:data,count:0,index:1},[repeat(op("LENGTH",v("items")),[set("count",op("+",v("count"),lit(1))),set("index",op("+",v("index"),lit(1))) ]),display(v("count"))],["count"]);
        correct=true; explanation="The number of repetitions equals the list length, including the final item. The count matches the number of elements.";
        break;
      case "equivalent":
        p=program({value:x,total:0},[repeat(2,[set("total",op("+",v("total"),v("value"))) ]),display(v("total"))],["total"]);
        b=program({value:x,total:0},[set("total",op("*",v("value"),lit(2))),display(v("total"))],["total"]);
        correct=true; correctB=true; explanation="For the shown nonnegative integer inputs, two additions and one multiplication produce the same required value. The loop is meaningful but not necessary.";
        break;
    }
  } else if (model.category==="procedures") {
    const arg=[2,5,9][variant];
    switch(model.pattern) {
      case "parameter":
        p=program({argument:arg,result:0},[call("double",[v("argument")],"result"),display(v("result"))],["result"],{double:proc(["n"],[ret(op("*",v("n"),lit(2)))])});
        correct=true; explanation="The returned value is twice the argument, so different arguments produce different results.";
        break;
      case "ignored":
        p=program({argument:arg,result:0},[call("fixed",[v("argument")],"result"),display(v("result"))],["result"],{fixed:proc(["n"],[ret(lit(6))])});
        correct=false; explanation="The procedure accepts n but never reads it. The same result is returned for each argument even though the task requires an input-dependent result.";
        break;
      case "constantBad":
        p=program({argument:arg,result:0},[call("larger",[v("argument")],"result"),display(v("result"))],["result"],{larger:proc(["n"],[ret(lit(5))])});
        correct=false; explanation="Returning 5 ignores arguments above 5 and does not return an argument below 5. A constant is wrong for the stated max task.";
        break;
      case "constantGood":
        p=program({factor:0},[call("fixedFactor",[],"factor"),display(v("factor"))],["factor"],{fixedFactor:proc([],[ret(lit(4))])});
        correct=true; explanation="The procedure returns 4, the documented factor this program asks for, and the caller uses that result. A constant return fits this fixed role.";
        break;
      case "returnUsed":
        p=program({argument:arg,result:0},[call("double",[v("argument")],"result"),display(v("result"))],["result"],{double:proc(["n"],[ret(op("*",v("n"),lit(2)))])});
        correct=true; explanation="The caller stores and displays the procedure's return value.";
        break;
      case "returnIgnored":
        p=program({items:data,total:0},[call("sum",[v("items")]),display(v("total"))],["total"],{sum:proc(["values"],[set("local",lit(0)),each("item","values",[set("local",op("+",v("local"),v("item")))]),ret(v("local"))])});
        correct=false; explanation="The procedure computes and returns the sum, but the call discards it. The displayed total remains 0.";
        break;
      case "sideEffect":
        p=program({items:data, item:x},[call("add",[v("items"),v("item")]),display(v("items"))],["items"],{add:proc(["target","value"],[{type:"append",list:"target",expr:v("value")}])});
        correct=true; explanation="The procedure appends to the list passed by the caller; displaying that list reveals the side effect.";
        break;
      case "reuse":
        p=program({amounts:data,results:[]},[each("amount","amounts",[call("appendDouble",[v("results"),v("amount")])]),display(v("results"))],["results"],{appendDouble:proc(["target","n"],[{type:"append",list:"target",expr:op("*",v("n"),lit(2))}])});
        correct=true; explanation=data.length===0 ? "No call is needed for an empty input. For nonempty inputs, the same parameterized procedure is reused and appends each transformed value." : "The same parameterized operation is reused for each supplied value and appends each result.";
        break;
      case "wrapper":
        p=program({label:["Ready","Queued","Done"][variant]},[call("showLabel",[v("label")])],[],{showLabel:proc(["text"],[display(v("text"))])});
        correct=true; explanation="This procedure call is the only statement that produces the requested visible output, so it contributes task-relevant behavior. Whether a single-use wrapper is the best abstraction is a separate design judgment.";
        break;
      case "branch":
        p=program({score:arg,result:""},[call("status",[v("score")],"result"),display(v("result"))],["result"],{status:proc(["score"],[iff(op("≥",v("score"),lit(5)),[ret(lit("Meets"))],[ret(lit("Below"))])])});
        correct=true; explanation="The parameter determines which branch returns, and the caller displays that returned status.";
        break;
      case "list":
        p=program({items:data,total:0},[call("sum",[v("items")],"total"),display(v("total"))],["total"],{sum:proc(["values"],[set("local",lit(0)),each("item","values",[set("local",op("+",v("local"),v("item")))]),ret(v("local"))])});
        correct=true; explanation="The procedure hides a reusable traversal that computes the list sum; the caller displays the returned total.";
        break;
      case "overwrite":
        p=program({argument:arg,result:0},[call("double",[v("argument")],"result"),set("result",lit(0)),display(v("result"))],["result"],{double:proc(["n"],[ret(op("*",v("n"),lit(2)))])});
        correct=false; explanation="The procedure computes a value, but the caller replaces it with 0 before displaying the result.";
        break;
      case "local":
        p=program({argument:arg,result:0},[call("triple",[v("argument")],"result"),display(v("result"))],["result"],{triple:proc(["n"],[set("temporary",op("*",v("n"),lit(3))),ret(v("temporary"))])});
        correct=true; explanation="The local temporary supports the returned calculation; the caller receives and displays it.";
        break;
      case "sameReturn":
        p=program({flags:[[true],[false],[false,true,false]][variant],results:[]},[each("flag","flags",[call("fixedStatus",[v("flag")],"result"),{type:"append",list:"results",expr:v("result")}]),display(v("results"))],["results"],{fixedStatus:proc(["flag"],[iff(v("flag"),[ret(lit("Ready"))],[ret(lit("Ready"))])])});
        correct=true; explanation="The procedure meaningfully supplies the fixed Ready status requested for each item. The parameter and inner IF do not affect which status is returned, so that selection is redundant; the procedure's role and the parameter's effect are separate judgments.";
        break;
      case "propagate":
        p=program({value:arg,accepted:false,label:""},[call("meets",[v("value")],"accepted"),iff(v("accepted"),[set("label",lit("Accepted"))],[set("label",lit("Try again"))]),display(v("label"))],["label"],{meets:proc(["n"],[ret(op("≥",v("n"),lit(5)))])});
        correct=true; explanation="The returned Boolean controls a caller-side decision, so the procedure result affects the displayed label.";
        break;
      case "appendChoice":
        p=program({items:data,choice:variant!==1},[call("appendChoice",[v("items"),v("choice")]),display(v("items"))],["items"],{appendChoice:proc(["target","chooseA"],[iff(v("chooseA"),[{type:"append",list:"target",expr:lit(10)}],[{type:"append",list:"target",expr:lit(20)}])])});
        correct=true; explanation="The choice parameter determines which value is appended to the caller's list.";
        break;
      case "sameArg":
        p=program({results:[],argument:[2,4,6][variant]},[call("appendDouble",[v("results"),v("argument")]),call("appendDouble",[v("results"),v("argument")]),display(v("results"))],["results"],{appendDouble:proc(["target","n"],[{type:"append",list:"target",expr:op("*",v("n"),lit(2))}])});
        correct=true; explanation="The parameter is used to compute each appended value. Repeating the same argument does not make the parameter unused.";
        break;
      case "hidden":
        p=program({items:data,result:0},[call("countPositive",[v("items")],"result"),set("result",lit(0)),display(v("result"))],["result"],{countPositive:proc(["values"],[set("count",lit(0)),each("item","values",[iff(op(">",v("item"),lit(0)),[set("count",op("+",v("count"),lit(1)))])]),ret(v("count"))])});
        correct=false; explanation="The procedure performs a meaningful count, but the caller overwrites the returned value before displaying it.";
        break;
      case "inline":
        p=program({amounts:data,results:[]},[each("amount","amounts",[call("convert",[v("results"),v("amount")])]),display(v("results"))],["results"],{convert:proc(["target","n"],[{type:"append",list:"target",expr:op("+",op("*",v("n"),lit(2)),lit(1))}])});
        correct=true; explanation=data.length===0 ? "No conversion call is needed for an empty input. For nonempty inputs, one shared multi-step conversion is applied to each value." : "A shared multi-step conversion is applied to each supplied value. Replacing it with inline code could preserve behavior, but the procedure still supplies reusable abstraction.";
        break;
      case "context":
        p=program({level:0},[call("defaultLevel",[],"level"),display(v("level"))],["level"],{defaultLevel:proc([],[ret(lit(3))])});
        correct=true; explanation="The task asks for this program's configured default, so returning and using 3 is the intended behavior. Constant output alone does not make a procedure superficial.";
        break;
    }
  } else {
    switch(model.pattern) {
      case "filterCount":
        p=program({items:[[-1,0,2],[0],[3,0,-2]][variant],count:0},[each("item","items",[iff(op(">",v("item"),lit(0)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="The loop visits each value and the selection increments count only for positives.";
        break;
      case "sum":
        p=program({items:data,total:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),display(v("total"))],["total"]);
        correct=true; explanation="The one traversal adds every input value. The short algorithm performs the requested task.";
        break;
      case "decorativeIf":
        p=program({items:data,count:0,always:true},[each("item","items",[iff(v("always"),[set("count",op("+",v("count"),lit(1)))],[set("count",v("count"))])]),display(v("count"))],["count"]);
        correct=true; explanation="Iteration changes the count, but under the stated fixed value the selection always chooses the same branch. The IF is not a meaningful choice here.";
        correct=false;
        break;
      case "zeroLoop":
        p=program({label:"Ready",counter:0,steps:[0,1,3][variant]},[repeat(v("steps"),[set("counter",op("+",v("counter"),lit(1)))]),display(v("label"))],["label"]);
        correct=false; explanation="The loop runs 0, 1, or 3 times across the variants, but it changes only an unused counter. The displayed label is unchanged even when the body runs.";
        break;
      case "efficiency":
        p=program({items:data,total:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),set("total",op("*",v("total"),lit(2))),display(v("total"))],["total"]);
        b=program({items:data,total:0},[each("item","items",[repeat(2,[set("total",op("+",v("total"),v("item")))])]),display(v("total"))],["total"]);
        correct=true; correctB=true; explanation="Both algorithms display twice the sum for every shown list. The second repeats an addition twice per item, so it does more work without changing the result.";
        break;
      case "sampleOnly":
        p=program({items:data,count:0},[each("item","items",[iff(op(">",v("item"),lit(5)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="The code changes count based on list values, so it is meaningful, but it uses > 5 and misses values equal to 5. Meaningful behavior does not guarantee correctness.";
        break;
      case "boundary":
        p=program({items:[[4,5],[5],[4,5,9]][variant],count:0},[each("item","items",[iff(op(">",v("item"),lit(5)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="The selection changes the count, but the code excludes the displayed value 5 even though the task includes it.";
        break;
      case "emptyBug":
        p=program({items:data,total:0,index:2},[set("total",op("INDEX",v("items"),lit(1))),repeat(op("-",op("LENGTH",v("items")),lit(1)),[set("total",op("+",v("total"),op("INDEX",v("items"),v("index")))),set("index",op("+",v("index"),lit(1)))]),display(v("total"))],["total"]);
        correct=true; explanation="For a nonempty list, the first value initializes the total and the remaining positions are added. On the allowed empty list, the first-item access is out of range. The algorithm is meaningful but not correct for every allowed input.";
        break;
      case "nested":
        p=program({items:data,pairs:0},[each("first","items",[each("second","items",[iff(op("≠",v("first"),v("second")),[set("pairs",op("+",v("pairs"),lit(1)))])])]),display(v("pairs"))],["pairs"]);
        correct=true; explanation="The outer and inner traversals combine positions; the conditional excludes pairs whose values match.";
        break;
      case "search":
        p=program({items:data,target:4,found:false},[each("item","items",[iff(op("=",v("item"),v("target")),[set("found",lit(true))])]),display(v("found"))],["found"]);
        correct=true; explanation="The conditional inside the traversal changes found when a match occurs. The algorithm reports whether the target appears.";
        break;
      case "maximum":
        p=program({items:[[-4],[-4,2],[1,4,7]][variant],maximum:0},[each("item","items",[iff(op(">",v("item"),v("maximum")),[set("maximum",v("item"))])]),display(v("maximum"))],["maximum"]);
        correct=true; explanation="The loop and selection update the candidate maximum, but initializing at 0 makes the result wrong when every allowed value is negative.";
        break;
      case "order":
        p=program({value:[3,5,7][variant],steps:0},[iff(op("<",v("value"),lit(5)),[until(op("≥",v("value"),lit(5)),[set("value",op("+",v("value"),lit(1))),set("steps",op("+",v("steps"),lit(1))) ])]),display(v("steps"))],["steps"]);
        correct=true; explanation="Each iteration changes value before the next condition check. Starting at or above 5 runs zero iterations; starting below 5 runs until the boundary.";
        break;
      case "unusedLoop":
        p=program({items:data,total:0,unused:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),repeat(3,[set("unused",op("+",v("unused"),lit(1)))]),display(v("total"))],["total"]);
        correct=false; explanation="The sum loop is useful, but the fixed loop changes only an unused counter. The second loop has no effect on the requested output.";
        break;
      case "redundant":
        p=program({items:data,count:0},[each("item","items",[iff(op("AND",op(">",v("item"),lit(0)),op("≥",v("item"),lit(0))),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="The overall filter is meaningful, although item ≥ 0 is redundant whenever item > 0 is true.";
        break;
      case "requirement":
        p=program({items:data,total:0,results:[]},[each("item","items",[set("total",op("+",v("total"),v("item")))]),display(v("total"))],["total","results"]);
        correct=true; explanation="The algorithm computes and displays the sum, so it has meaningful behavior. It does not append that sum to results as the separate written task requires. That is a task-requirement failure, not a universal trivial/non-trivial classification.";
        break;
      case "inefficient":
        p=program({items:data,total:0},[each("item","items",[repeat(2,[set("total",op("+",v("total"),v("item")))])]),display(v("total"))],["total"]);
        correct=true; explanation="Each value is added twice as requested. The nested repetition is longer and performs more steps than adding item + item once, but the output is correct.";
        break;
      case "oneInput":
        p=program({items:[[7,8],[5,8],[4,6,9]][variant],count:0},[each("item","items",[iff(op(">",v("item"),lit(5)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        b=program({items:[[7,8],[5,8],[4,6,9]][variant],count:0},[each("item","items",[iff(op("≥",v("item"),lit(5)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        customAssumptions="The input is a list of integers. Other valid lists may contain 5. The displayed list is "+JSON.stringify([[7,8],[5,8],[4,6,9]][variant])+".";
        correct=true; correctB=true; explanation="The IF changes the count for values above 5, so it is meaningful. It still misses 5 even though the task asks for values at least 5; meaning and correctness are separate.";
        break;
      case "short":
        p=program({items:data,count:0},[each("item","items",[set("count",op("+",v("count"),lit(1)))]),display(v("count"))],["count"]);
        correct=true; explanation="The simple traversal counts all items, including an empty list correctly. Its short length does not reduce its significance.";
        break;
      case "wrongMeaningful":
        p=program({items:[[-2,3],[-5,-1],[1,-4,2]][variant],total:0},[each("item","items",[iff(op(">",v("item"),lit(0)),[set("total",op("+",v("total"),v("item")))],[set("total",v("total"))])]),display(v("total"))],["total"]);
        correct=true; explanation="The selection affects the computed value, so it is meaningful. It is still incorrect for a task that asks for the sum of negative values too.";
        break;
      case "allThree":
        p=program({items:data,count:0},[each("item","items",[iff(op("AND",op("=",op("MOD",v("item"),lit(2)),lit(0)),op("≥",v("item"),lit(4))),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
        correct=true; explanation="The traversal visits values, the conditional tests both required properties, and the sequence updates the count. Each construct contributes to the task.";
        break;
    }
  }
  if (!p) throw new Error("Unimplemented pattern: " + model.pattern);
  if (!b) {
    b = makeComparisonProgram(model.category, q, variant);
    correctB = b.meaningful;
  }
  p.meaningful = correct;
  b.meaningful = Boolean(correctB);
  p.category=model.category;
  b.category=model.category;
  return { model, variant, values:q, task:model.task, assumptions:customAssumptions, programA:p, programB:b, answerA:correct, answerB:Boolean(correctB), explanation };
}

function makeComparisonProgram(category, q, variant) {
  const x=q.n, data=q.values;
  if (category==="selection") return program({score:x, result:""},[set("result",lit("Below target")),iff(op("≥",v("score"),lit(5)),[set("result",lit("Meets target"))]),display(v("result"))],["result"]);
  if (category==="iteration") return program({items:data,total:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),display(v("total"))],["total"]);
  if (category==="procedures") return program({argument:x,result:0},[call("scale",[v("argument")],"result"),display(v("result"))],["result"],{scale:proc(["n"],[ret(op("*",v("n"),lit(2)))])});
  return program({items:data,count:0},[each("item","items",[iff(op(">",v("item"),lit(0)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
}

function comparisonFor(category, pairType, variant, modelId="") {
  const n=[2,5,8][variant], items=[[],[2],[1,4,7]][variant];
  let task, assumptions, a, b, meaningfulA, meaningfulB, focus;
  if (category==="selection") {
    task="Display \"Meets target\" when score is at least 5; otherwise display \"Below target\".";
    assumptions="score is an integer. The displayed score is "+n+".";
    const first=program({score:n,result:""},[iff(op("≥",v("score"),lit(5)),[set("result",lit("Meets target"))],[set("result",lit("Below target"))]),display(v("result"))],["result"]);
    if (pairType===0) {
      a=first;
      b=program({score:n,result:""},[iff(op("≥",v("score"),lit(5)),[set("result",lit("Meets target"))],[set("result",lit("Meets target"))]),display(v("result"))],["result"]);
      meaningfulA=true; meaningfulB=false; focus="One conditional changes the required label; the other assigns the same label in both branches.";
    } else if (pairType===1) {
      a=first;
      b=program({score:n,result:""},[iff(op(">",v("score"),lit(4)),[set("result",lit("Meets target"))],[set("result",lit("Below target"))]),display(v("result"))],["result"]);
      meaningfulA=true; meaningfulB=true; focus="Both conditions affect the task result. For integer scores, ≥ 5 and > 4 are equivalent.";
    } else {
      a=program({score:n,result:""},[iff(op("≥",v("score"),lit(5)),[set("result",lit("Meets target"))],[set("result",lit("Meets target"))]),display(v("result"))],["result"]);
      b=program({score:n,result:""},[iff(op(">",v("score"),lit(4)),[set("result",lit("Meets target"))],[set("result",lit("Meets target"))]),display(v("result"))],["result"]);
      meaningfulA=false; meaningfulB=false; focus="Neither conditional changes the displayed label because both branches assign the same value.";
    }
  } else if (category==="iteration") {
    assumptions="The list is "+JSON.stringify(items)+". List indices start at 1.";
    if (pairType===0) {
      task="Display the sum of every value in items.";
      a=program({items,total:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),display(v("total"))],["total"]);
      b=program({items,total:0,scratch:0},[each("item","items",[set("scratch",op("+",v("scratch"),lit(1)))]),display(v("total"))],["total"]);
      meaningfulA=true; meaningfulB=false; focus="The first traversal accumulates the requested sum. The second changes only scratch and displays an unchanged total.";
    } else if (pairType===1) {
      task="Display the sum of every value in items.";
      a=program({items,total:0},[each("item","items",[set("total",op("+",v("total"),v("item")))]),display(v("total"))],["total"]);
      b=program({items,total:0,index:1},[repeat(op("LENGTH",v("items")),[set("total",op("+",v("total"),op("INDEX",v("items"),v("index")))),set("index",op("+",v("index"),lit(1)))]),display(v("total"))],["total"]);
      meaningfulA=true; meaningfulB=true; focus="Both traversals add each list value exactly once. The second uses a one-based index and repeats LENGTH(items) times.";
    } else {
      task="Display the supplied label unchanged.";
      a=program({label:"Ready",steps:[0,1,3][variant],scratch:0},[repeat(v("steps"),[set("scratch",op("+",v("scratch"),lit(1)))]),display(v("label"))],["label"]);
      b=program({label:"Ready",scratch:0},[repeat(0,[set("scratch",op("+",v("scratch"),lit(1)))]),display(v("label"))],["label"]);
      meaningfulA=false; meaningfulB=false; focus="Neither loop contributes to the displayed label; each changes only scratch, which is never used.";
    }
  } else if (category==="procedures") {
    assumptions="The argument is "+n+". Each procedure is called once, and its returned value is displayed.";
    if (pairType===0) {
      task="Return twice the supplied argument.";
      a=program({argument:n,result:0},[call("double",[v("argument")],"result"),display(v("result"))],["result"],{double:proc(["n"],[ret(op("*",v("n"),lit(2)))])});
      b=program({argument:n,result:0},[call("fixed",[v("argument")],"result"),display(v("result"))],["result"],{fixed:proc(["n"],[ret(lit(5))])});
      meaningfulA=true; meaningfulB=false; focus="The first procedure uses its parameter to compute the required result. The second ignores it and returns 5 for every argument.";
    } else if (pairType===1) {
      task="Return twice the supplied argument.";
      a=program({argument:n,result:0},[call("double",[v("argument")],"result"),display(v("result"))],["result"],{double:proc(["n"],[ret(op("*",v("n"),lit(2)))])});
      b=program({argument:n,result:0},[call("doubleByAdding",[v("argument")],"result"),display(v("result"))],["result"],{doubleByAdding:proc(["n"],[ret(op("+",v("n"),v("n")))])});
      meaningfulA=true; meaningfulB=true; focus="Both procedures use the argument and return the same mathematical result: n × 2 = n + n.";
    } else {
      task="Return the larger of the supplied argument and 5.";
      a=program({argument:n,result:0},[call("constantA",[v("argument")],"result"),display(v("result"))],["result"],{constantA:proc(["n"],[ret(lit(5))])});
      b=program({argument:n,result:0},[call("constantB",[v("argument")],"result"),display(v("result"))],["result"],{constantB:proc(["n"],[ret(lit(5))])});
      meaningfulA=false; meaningfulB=false; focus="Neither procedure responds to the argument, so neither implements the input-dependent maximum task.";
    }
  } else {
    assumptions="The list is "+JSON.stringify(items)+". It may be empty or contain several values.";
    if (modelId==="alg-equivalent-one") {
      task="Count values at least 5.";
      assumptions="The input is a list of integers. Other valid lists may contain 5. The displayed list is "+JSON.stringify([[7,8],[5,8],[4,6,9]][variant])+".";
      a=program({items:[[7,8],[5,8],[4,6,9]][variant],count:0},[each("item","items",[iff(op(">",v("item"),lit(5)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
      b=program({items:[[7,8],[5,8],[4,6,9]][variant],count:0},[each("item","items",[iff(op("≥",v("item"),lit(5)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
      meaningfulA=true; meaningfulB=true; focus="Both algorithms count values, but > 5 and ≥ 5 differ for an allowed list containing 5.";
    } else if (pairType===0) {
      task="Display the number of positive values in items.";
      a=program({items,count:0},[each("item","items",[iff(op(">",v("item"),lit(0)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
      b=program({items,count:0},[each("item","items",[iff(op(">",v("item"),lit(0)),[set("count",v("count"))],[set("count",v("count"))])]),display(v("count"))],["count"]);
      meaningfulA=true; meaningfulB=false; focus="The first algorithm increments the count for positives. The second visits items but leaves count unchanged in either branch.";
    } else if (pairType===1) {
      task="Display the number of positive values in items.";
      a=program({items,count:0},[each("item","items",[iff(op(">",v("item"),lit(0)),[set("count",op("+",v("count"),lit(1)))])]),display(v("count"))],["count"]);
      b=program({items,count:0,index:1},[repeat(op("LENGTH",v("items")),[iff(op(">",op("INDEX",v("items"),v("index")),lit(0)),[set("count",op("+",v("count"),lit(1)))]),set("index",op("+",v("index"),lit(1)))]),display(v("count"))],["count"]);
      meaningfulA=true; meaningfulB=true; focus="Both algorithms examine every item and increment the count exactly when that value is positive.";
    } else {
      task="Display the sum of every value in items.";
      a=program({items,total:0,scratch:0},[repeat(0,[set("scratch",lit(1))]),display(v("total"))],["total"]);
      b=program({items,total:0},[iff(op("<",op("LENGTH",v("items")),lit(0)),[each("item","items",[set("total",op("+",v("total"),v("item")))])]),display(v("total"))],["total"]);
      meaningfulA=false; meaningfulB=false; focus="Neither algorithm processes any values: one loop repeats zero times and the other's condition can never be true because list length is nonnegative.";
    }
  }
  a.meaningful=meaningfulA; b.meaningful=meaningfulB;
  const runA=evaluate(a), runB=evaluate(b);
  const reviewFocus={selection:"conditional statements",iteration:"loops",procedures:"procedures",algorithms:"the complete algorithms"}[category];
  return {id:category+"-pair-"+pairType+"-"+variant,key:category+"-pair-"+pairType+"-"+variant,task,assumptions,reviewFocus,codeA:renderProgram(a),codeB:renderProgram(b),runA,runB,meaningfulA,meaningfulB,equivalentShown:runA.signature===runB.signature,focus,programA:a,programB:b};
}

/* Deterministic evaluator for the exact bounded AST emitted by this generator. */
export function evaluate(programValue) {
  const copy=value=>Array.isArray(value)?value.map(copy):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)])):value;
  const env=Object.fromEntries(Object.entries(programValue.initial).map(([key,value])=>[key,copy(value)])), outputs=[], trace=[], limit=80;
  function lookup(scope,name) { return name in scope ? scope[name] : env[name]; }
  function evalExpr(expr,scope) {
    if (expr===null || typeof expr!=="object") return expr;
    if (Object.prototype.hasOwnProperty.call(expr,"lit")) return expr.lit;
    if (expr.var) return lookup(scope,expr.var);
    const args=expr.args || [], values=args.map(x=>evalExpr(x,scope));
    switch(expr.op) {
      case "+": return values[0]+values[1];
      case "-": return values[0]-values[1];
      case "*": return values[0]*values[1];
      case "/": return values[0]/values[1];
      case "MOD": return values[0]%values[1];
      case "=": return values[0]===values[1];
      case "≠": return values[0]!==values[1];
      case ">": return values[0]>values[1];
      case "<": return values[0]<values[1];
      case "≥": return values[0]>=values[1];
      case "≤": return values[0]<=values[1];
      case "AND": return Boolean(values[0]&&values[1]);
      case "OR": return Boolean(values[0]||values[1]);
      case "NOT": return !values[0];
      case "LENGTH": return values[0].length;
      case "INDEX":
        if (values[1]<1 || values[1]>values[0].length) throw new RangeError("AP CSP list index out of range");
        return values[0][values[1]-1];
      default: throw new Error("Unsupported expression " + expr.op);
    }
  }
  function execBlock(statements,scope,depth=0) {
    if (depth>limit) throw new Error("Nesting limit exceeded");
    for (const s of statements) {
      if (s.type==="set") scope[s.name]=evalExpr(s.expr,scope);
      else if (s.type==="display") outputs.push(evalExpr(s.expr,scope));
      else if (s.type==="if") {
        const result=Boolean(evalExpr(s.condition,scope));
        trace.push("IF " + renderExpr(s.condition) + " → " + (result?"TRUE":"FALSE"));
        execBlock(result?s.yes:(s.no||[]),scope,depth+1);
      } else if (s.type==="repeat") {
        const count=Number(evalExpr(s.count,scope));
        if (!Number.isInteger(count) || count<0 || count>limit) throw new RangeError("Invalid repeat count");
        trace.push("REPEAT " + count + " TIMES");
        for (let i=0;i<count;i++) execBlock(s.body,scope,depth+1);
      } else if (s.type==="each") {
        const list=lookup(scope,s.list);
        if (!Array.isArray(list)) throw new TypeError("FOR EACH requires a list");
        trace.push("FOR EACH " + s.item + ": " + list.length + " item(s)");
        for (const itemValue of list) {
          const child=Object.create(scope);
          child[s.item]=itemValue;
          execBlock(s.body,child,depth+1);
          for (const key of Object.keys(child)) if (key!==s.item) scope[key]=child[key];
        }
      } else if (s.type==="until") {
        let count=0;
        do {
          if (++count>limit) throw new Error("REPEAT UNTIL exceeded safety bound");
          execBlock(s.body,scope,depth+1);
        } while (!Boolean(evalExpr(s.condition,scope)));
        trace.push("REPEAT UNTIL stopped after " + count + " pass(es)");
      } else if (s.type==="append") {
        const target=lookup(scope,s.list);
        if (!Array.isArray(target)) throw new TypeError("APPEND requires a list");
        target.push(evalExpr(s.expr,scope));
      } else if (s.type==="call") {
        const def=programValue.procedures[s.name];
        if (!def) throw new Error("Unknown procedure " + s.name);
        const args=s.args.map(x=>evalExpr(x,scope));
        const frame=Object.create(scope);
        def.params.forEach((name,index)=>{frame[name]=args[index];});
        let returned;
        const runProc=(list) => {
          for (const statement of list) {
            if (statement.type==="return") return {returned:true,value:evalExpr(statement.expr,frame)};
            if (statement.type==="if") {
              const yes=Boolean(evalExpr(statement.condition,frame));
              trace.push("PROCEDURE " + s.name + " IF → " + (yes?"TRUE":"FALSE"));
              const out=runProc(yes?statement.yes:(statement.no||[]));
              if (out.returned) return out;
            } else if (statement.type==="set") frame[statement.name]=evalExpr(statement.expr,frame);
            else if (statement.type==="append") {
              const target=lookup(frame,statement.list);
              target.push(evalExpr(statement.expr,frame));
            } else if (statement.type==="each") {
              const listValue=lookup(frame,statement.list);
              for (const itemValue of listValue) {
                frame[statement.item]=itemValue;
                const out=runProc(statement.body);
                if (out.returned) return out;
              }
            } else if (statement.type==="display") outputs.push(evalExpr(statement.expr,frame));
          }
          return {returned:false,value:undefined};
        };
        returned=runProc(def.body);
        if (s.into) scope[s.into]=returned.value;
        trace.push("CALL " + s.name + " → " + String(returned.value));
      } else if (s.type==="return") return evalExpr(s.expr,scope);
      else throw new Error("Unsupported statement " + s.type);
    }
  }
  let error=null;
  try { execBlock(programValue.body,env); } catch (caught) { error=caught.message; }
  const observed={};
  for (const key of programValue.observe||[]) observed[key]=env[key];
  return {outputs,observed,environment:env,trace,error,signature:JSON.stringify({outputs,observed,error})};
}

function renderExpr(expr) {
  if (expr===null || typeof expr!=="object") return String(expr);
  if (Object.prototype.hasOwnProperty.call(expr,"lit")) return typeof expr.lit==="string" ? '"' + expr.lit.replaceAll('"','\"') + '"' : String(expr.lit);
  if (expr.var) return expr.var;
  if (expr.op==="LENGTH") return "LENGTH(" + renderExpr(expr.args[0]) + ")";
  if (expr.op==="INDEX") return renderExpr(expr.args[0]) + "[" + renderExpr(expr.args[1]) + "]";
  if (expr.op==="NOT") return "NOT " + renderExpr(expr.args[0]);
  if (expr.op==="MOD") return renderExpr(expr.args[0]) + " MOD " + renderExpr(expr.args[1]);
  return renderExpr(expr.args[0]) + " " + expr.op + " " + renderExpr(expr.args[1]);
}
function renderBlock(statements,indent) {
  let out="";
  const pad="  ".repeat(indent);
  for (const s of statements) {
    if (s.type==="set") out+=pad+s.name+" ← "+renderExpr(s.expr)+"\n";
    else if (s.type==="display") out+=pad+"DISPLAY("+renderExpr(s.expr)+")\n";
    else if (s.type==="if") {
      out+=pad+"IF ("+renderExpr(s.condition)+")\n"+pad+"{\n"+renderBlock(s.yes,indent+1)+pad+"}";
      if (s.no && s.no.length) out+="\n"+pad+"ELSE\n"+pad+"{\n"+renderBlock(s.no,indent+1)+pad+"}";
      out+="\n";
    } else if (s.type==="repeat") out+=pad+"REPEAT "+renderExpr(s.count)+" TIMES\n"+pad+"{\n"+renderBlock(s.body,indent+1)+pad+"}\n";
    else if (s.type==="each") out+=pad+"FOR EACH "+s.item+" IN "+s.list+"\n"+pad+"{\n"+renderBlock(s.body,indent+1)+pad+"}\n";
    else if (s.type==="until") out+=pad+"REPEAT UNTIL ("+renderExpr(s.condition)+")\n"+pad+"{\n"+renderBlock(s.body,indent+1)+pad+"}\n";
    else if (s.type==="call") out+=pad+(s.into?s.into+" ← ":"")+s.name+"("+s.args.map(renderExpr).join(", ")+")\n";
    else if (s.type==="append") out+=pad+"APPEND("+s.list+", "+renderExpr(s.expr)+")\n";
    else if (s.type==="return") out+=pad+"RETURN("+renderExpr(s.expr)+")\n";
  }
  return out;
}
export function renderProgram(p) {
  let out="";
  for (const [key,value] of Object.entries(p.initial)) out+=key+" ← "+JSON.stringify(value)+"\n";
  for (const [name,definition] of Object.entries(p.procedures||{})) {
    out+="PROCEDURE "+name+"("+definition.params.join(", ")+")\n{\n"+renderBlock(definition.body,1)+"}\n";
  }
  return out+renderBlock(p.body,0).trimEnd();
}
export function buildChallenge(modelId, variant=0) {
  const model=MODELS.find(item=>item.id===modelId);
  if (!model) throw new Error("Unknown model: "+modelId);
  if (!Number.isInteger(variant) || variant<0 || variant>2) throw new RangeError("Variant must be 0, 1, or 2");
  const built=scenarioFor(model,variant);
  const runA=evaluate(built.programA), runB=evaluate(built.programB);
  const same=runA.signature===runB.signature;
  const pairType=model.ordinal%3;
  const comparison=comparisonFor(model.category,pairType,variant,model.id);
  return {
    id:model.id+"-v"+variant, modelId:model.id, variant,
    category:model.category, categoryTitle:CATEGORIES[model.category].title,
    activity:null, difficulty:model.difficulty, title:model.title, family:model.family,
    reviewFocus:reviewFocusFor(model),
    task:built.task, assumptions:built.assumptions,
    inputs:built.programA.initial,
    codeA:renderProgram(built.programA), codeB:renderProgram(built.programB),
    runA, runB, meaningfulA:built.answerA, meaningfulB:built.answerB,
    equivalentShown:same, comparison, comparisonKey:comparison.key, explanation:built.explanation,
    misconception:model.misconception, programA:built.programA, programB:built.programB,
  };
}
export function configurationBank(filters={}) {
  const categorySet=filters.categories ? new Set(filters.categories) : null;
  const raw=MODELS.filter(m=>(!filters.category||filters.category==="mixed"||m.category===filters.category) &&
    (!categorySet||categorySet.has(m.category)) && (!filters.difficulty||m.difficulty===filters.difficulty))
    .flatMap(m=>[0,1,2].map(variant=>buildChallenge(m.id,variant)));
  const seen=new Set();
  return raw.filter(c=>{
    const key=c.modelId+"|"+c.runA.signature+"|"+c.runA.trace.join(";");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function xorshift(seed) {
  let state=(Number(seed)>>>0) || 0x6d2b79f5;
  return () => {
    state^=state<<13; state^=state>>>17; state^=state<<5;
    return (state>>>0)/4294967296;
  };
}
export function chooseChallenge({category="mixed",categories=null,difficulty="",activity="all",seed=1,recent=[]}={}) {
  let bank=configurationBank({category,categories,difficulty});
  if (!bank.length) throw new Error("No challenges match the selected filters.");
  const rng=xorshift(seed);
  const selectedActivity=activity==="all" ? Object.keys(ACTIVITIES)[Math.floor(rng()*3)] : activity;
  const recentSet=new Set(recent);
  let candidates=bank.filter(c=>!recentSet.has(c.id)&&!recentSet.has(c.modelId)&&!(selectedActivity==="compare"&&recentSet.has(c.comparisonKey)));
  if (!candidates.length) candidates=bank.filter(c=>!recentSet.has(c.id));
  if (!candidates.length) candidates=bank;
  const challenge=candidates[Math.floor(rng()*candidates.length)];
  return {...challenge,activity:selectedActivity,activityTitle:ACTIVITIES[selectedActivity]};
}
export function seededAudit() {
  const all=configurationBank(), exact=new Set(), families={};
  let repeated=0, traceVariants=0;
  for (const c of all) {
    const sig=JSON.stringify({task:c.task,assumptions:c.assumptions,code:c.codeA,inputs:c.inputs,trace:c.runA.trace,output:c.runA.signature});
    if (exact.has(sig)) repeated++; else exact.add(sig);
    (families[c.category] ||= new Set()).add(c.family);
  }
  for (const model of MODELS) {
    const signatures=[0,1,2].map(v=>buildChallenge(model.id,v).runA.signature+"|"+buildChallenge(model.id,v).runA.trace.join(";"));
    if (new Set(signatures).size===3) traceVariants++;
  }
  return {
    models:MODELS.length, modelsByCategory:MODEL_COUNTS,
    candidateVariants:MODELS.length*3, configurations:all.length,
    configurationsByCategory:Object.fromEntries(Object.keys(CATEGORIES).map(k=>[k,all.filter(c=>c.category===k).length])),
    reasoningFamilies:Object.fromEntries(Object.entries(families).map(([k,setValue])=>[k,setValue.size])),
    difficulty:Object.fromEntries(["beginner","intermediate","advanced"].map(d=>[d,all.filter(c=>c.difficulty===d).length])),
    exactDuplicateConfigurations:repeated, excludedNearDuplicateVariants:MODELS.length*3-all.length,
    modelsWithThreeDistinctBehaviorTraces:traceVariants,
    activityFormats:Object.keys(ACTIVITIES).length,
  };
}
