import { pick, shuffle } from "./engine.js?v=platform-expansion-v2";

export const responseModes = {
  behavior: "Explain Program Behavior",
  evidence: "Select Supporting Evidence",
  test: "Explain a Test Result",
  abstraction: "Explain Abstraction",
  reasoning: "Complete the Reasoning",
};

export const supportNames = {
  full: "Guided Support",
  minimal: "Independent",
};

const q = (structure, code, prompt, answer, wrong, feedback, misconception, reminder) => ({
  structure, code, prompt, answer, wrong, feedback, misconception, reminder,
});

const behavior = [
  q("conditional-count",
    `count ← 0
FOR EACH score IN scores
{
    IF (score ≥ 70)
    {
        count ← count + 1
    }
}
RETURN(count)`,
    "Which statement best explains what the procedure returns?",
    "The number of scores that are at least 70.",
    ["The sum of the scores that are at least 70.", "The first score that is at least 70.", "The number of scores that are below 70."],
    "The counter increases once for each score satisfying score ≥ 70, so it returns the number of qualifying scores.",
    "The selected statement confuses counting with summing, searching, or reversing the condition.",
    "Track what changes inside the loop and when it changes."),
  q("accumulator",
    `total ← 0
FOR EACH value IN values
{
    IF (value < 0)
    {
        total ← total + value
    }
}
RETURN(total)`,
    "Which statement best explains what the procedure returns?",
    "The sum of all negative values in the list.",
    ["The number of negative values in the list.", "The sum of all nonnegative values in the list.", "The first negative value found in the list."],
    "Each negative value, not the number 1, is added to total. The returned value is their sum.",
    "The selected statement misreads either the condition or the value added to total.",
    "Distinguish a counter (+ 1) from an accumulator (+ value)."),
  q("early-search",
    `position ← 1
FOR EACH item IN items
{
    IF (item = 5)
    {
        RETURN(position)
    }
    position ← position + 1
}
RETURN(-1)`,
    "Which statement best explains what the procedure returns?",
    "The first position containing 5, or -1 if 5 is absent.",
    ["The last position containing 5, or -1 if 5 is absent.", "The number of times 5 occurs, or -1 if 5 is absent.", "The value 5 when found, or the list length if absent."],
    "RETURN(position) ends the procedure at the first match. If no item equals 5, execution reaches RETURN(-1).",
    "The selected statement overlooks the immediate return or confuses a position with a count or value.",
    "An early RETURN stops both the loop and the procedure."),
  q("list-filter",
    `selected ← []
FOR EACH value IN values
{
    IF (value > 6)
    {
        APPEND(selected, value)
    }
}
RETURN(selected)`,
    "Which statement best explains what the procedure returns?",
    "A new list of values greater than 6, in their original order.",
    ["A count of values greater than 6, in their original order.", "A new list of values at least 6, sorted in order.", "The input list after values below 6 have been removed."],
    "Only values satisfying value > 6 are appended. APPEND preserves visit order and does not modify the input list.",
    "The selected statement adds counting, sorting, equality, or input mutation that the code never performs.",
    "Check the comparison and the exact operation performed on a match."),
  q("running-maximum",
    `best ← values[1]
FOR EACH value IN values
{
    IF (value > best)
    {
        best ← value
    }
}
RETURN(best)`,
    "Which statement best explains what the procedure returns?",
    "The greatest value in a nonempty list.",
    ["The smallest value in a nonempty list.", "The final value in a nonempty list.", "The position of the greatest list value."],
    "best is replaced only by a larger value, so it holds the greatest value seen when the traversal ends.",
    "The selected statement confuses a running maximum with a minimum, final item, or index search.",
    "Ask what must be true about best after each iteration."),
  q("all-test",
    `FOR EACH value IN values
{
    IF (value ≤ 0)
    {
        RETURN(FALSE)
    }
}
RETURN(TRUE)`,
    "Which statement best explains what the procedure returns?",
    "TRUE exactly when every value in the list is positive.",
    ["TRUE when at least one list value is positive.", "FALSE exactly when every list value is positive.", "TRUE exactly when every list value is nonnegative."],
    "Any value less than or equal to zero immediately returns FALSE. TRUE is reached only if none exists.",
    "The selected statement changes every to at least one, reverses the result, or treats zero as positive.",
    "Look for a condition that can cause an early return."),
  q("inclusive-branch",
    `IF ((value ≥ 3) AND (value ≤ 8))
{
    RETURN("inside")
}
RETURN("outside")`,
    "Which statement best explains what the procedure returns?",
    '"inside" for values from 3 through 8, including both endpoints.',
    ['"inside" for values below 3 or above 8, including both outside regions.', '"inside" for values strictly between 3 and 8, excluding both endpoints.', '"inside" whenever either boundary comparison is true by itself.'],
    'AND requires both inclusive comparisons, so 3 and 8 are both classified as "inside".',
    "The selected statement misreads AND or the inclusive comparison operators.",
    "Translate each comparison, then combine them using AND."),
  q("fixed-repeat",
    `value ← 1
REPEAT 4 TIMES
{
    value ← value × 2
}
RETURN(value)`,
    "Which statement best explains what the procedure returns?",
    "The value obtained by doubling 1 exactly four times.",
    ["The value obtained by adding 2 to 1 exactly four times.", "The number of loop repetitions, which is four.", "The value obtained by doubling 4 exactly one time."],
    "The loop performs value ← value × 2 on each of four repetitions, beginning with 1.",
    "The selected statement changes the repeated operation, returned variable, or starting value.",
    "Separate the repeat count from the value changed by the loop."),
];

const evidence = [
  q("guarded-counter",
    `count ← 0
FOR EACH score IN scores
{
    IF (score < 60)
    {
        count ← count + 1
    }
}
RETURN(count)`,
    "Claim: The procedure counts scores below 60. Which statement best supports the claim?",
    "count ← count + 1 runs only when score < 60.",
    ["count ← 0 makes every score less than 60.", "FOR EACH score returns each score below 60.", "RETURN(count) compares every score with 60."],
    "The guarded increment connects score < 60 to one added count for each match.",
    "The selected line mentions relevant code but does not show why only matching scores are counted.",
    "Strong evidence identifies both the condition and its resulting operation."),
  q("sum-elements",
    `total ← 0
FOR EACH price IN prices
{
    total ← total + price
}
RETURN(total)`,
    "Claim: Every price contributes to the returned total. Which statement best supports the claim?",
    "Inside the traversal, total is updated by adding the current price.",
    ["Before the traversal, total is initialized to zero so no prices are included yet.", "After the traversal, the procedure returns total without showing how prices entered it.", "The loop names the current element price but does not by itself add that value."],
    "The repeated assignment total ← total + price directly shows each visited price being accumulated.",
    "The selected statement is related to the procedure but does not establish that every price contributes.",
    "Choose evidence that directly causes the claimed behavior."),
  q("first-match",
    `FOR EACH word IN words
{
    IF (LENGTH(word) > 8)
    {
        RETURN(word)
    }
}
RETURN("none")`,
    "Claim: A matching word is returned without checking later words. Which statement best supports the claim?",
    "RETURN(word) occurs inside the loop as soon as the condition is true.",
    ["FOR EACH visits every word that appears in the supplied list in sequence.", "LENGTH(word) counts the characters in the current word before comparison.", 'RETURN("none") occurs after the loop has finished without finding a match.'],
    "A return inside the matching branch ends the procedure immediately, so no later word is examined.",
    "The selected statement describes nearby code but not why checking stops early.",
    "Evidence should justify the exact part of the claim being made."),
  q("append-filter",
    `short ← []
FOR EACH name IN names
{
    IF (LENGTH(name) ≤ 4)
    {
        APPEND(short, name)
    }
}
RETURN(short)`,
    "Claim: The procedure builds a separate list of short names. Which statement best supports the claim?",
    "A qualifying name is appended to short, which began as an empty list.",
    ["name refers to one element while the loop runs but does not create another list.", "The comparison identifies names with four or fewer characters but stores nothing.", "The procedure returns short after all names are considered without showing how it was built."],
    "Initializing short as a list and appending qualifying names constructs the separate result list.",
    "The selected statement supports the test or traversal, not the claim that another list is built.",
    "Look for the operation that creates or changes the claimed result."),
  q("minimum-update",
    `smallest ← values[1]
FOR EACH value IN values
{
    IF (value < smallest)
    {
        smallest ← value
    }
}
RETURN(smallest)`,
    "Claim: smallest stores the least value encountered so far. Which statement best supports the claim?",
    "smallest is replaced only when the current value is less than it.",
    ["smallest begins with the first list value, which establishes only its initial state.", "value refers to the current list element but does not control when smallest changes.", "smallest is returned after the traversal, which does not prove what it stores."],
    "The conditional replacement preserves smallest unless a lesser value is encountered.",
    "The selected statement initializes, traverses, or returns the result but does not prove the running claim.",
    "For a claim about change over time, find the statement controlling that change."),
  q("procedure-call",
    `PROCEDURE discount(price, rate)
{
    RETURN(price - (price × rate))
}
final ← discount(80, 0.25)`,
    "Claim: final stores the price after a 25% reduction. Which statement best supports the claim?",
    "The call supplies 80 and 0.25 to a formula subtracting price × rate.",
    ["The parameter names describe values expected by the procedure.", "The result is stored in a variable named final.", "The procedure returns instead of displaying its result."],
    "The arguments and subtraction formula together establish the specific 25% reduction.",
    "The selected statement is true but does not connect the actual arguments to the calculation.",
    "Relevant evidence must support the whole claim, not just share its words."),
];

const test = [
  q("boundary-comparison",
    `count ← 0
FOR EACH value IN [2, 5, 7, 4]
{
    IF (value > 5)
    {
        count ← count + 1
    }
}
RETURN(count)`,
    "The test returns 1. Which explanation correctly accounts for that result?",
    "Only 7 is greater than 5; the value 5 does not pass a strict > comparison.",
    ["Both 5 and 7 pass because the > comparison includes a value equal to 5.", "Only 2 passes because the > comparison selects values lower than the boundary.", "The loop stops immediately after finding 7, so the final value 4 is never examined."],
    "The condition is value > 5, not value ≥ 5. Exactly one element satisfies it.",
    "The selected explanation misreads the boundary, reverses the operator, or invents an early exit.",
    "Test equality at the boundary separately from values above and below it."),
  q("branch-execution",
    `temperature ← 92
IF (temperature ≥ 90)
{
    label ← "hot"
}
ELSE IF (temperature ≥ 70)
{
    label ← "warm"
}
ELSE
{
    label ← "cool"
}
RETURN(label)`,
    'The test returns "hot". Which explanation correctly accounts for that result?',
    "The first condition is true, so its branch runs and the remaining branches are skipped.",
    ["Both true conditions run, and the first branch later overwrites the warm result.", "The final ELSE always runs after the conditions and changes the label back to cool.", "The conditions are checked from bottom to top, so the last true branch runs first."],
    "An IF / ELSE IF / ELSE chain executes only the first branch whose condition is true.",
    "The selected explanation treats exclusive branches as independent or reverses their order.",
    "In a branch chain, identify the first true condition."),
  q("loop-count",
    `total ← 0
REPEAT 4 TIMES
{
    total ← total + 3
}
RETURN(total)`,
    "The test returns 12. Which explanation correctly accounts for that result?",
    "The loop adds 3 on each of four repetitions, starting from 0.",
    ["The loop adds 4 on each of three repetitions.", "The loop adds 3 once, then returns the repeat count.", "The loop runs five times because total starts at 0."],
    "Four executions produce 0 + 3 + 3 + 3 + 3 = 12.",
    "The selected explanation swaps the count and increment, stops early, or adds a repetition.",
    "Trace the changed variable once per repetition."),
  q("list-insert",
    `items ← ["A", "B", "C"]
INSERT(items, 2, "X")
RETURN(items)`,
    'The test returns ["A", "X", "B", "C"]. Which explanation correctly accounts for that result?',
    "AP CSP positions begin at 1, and inserting at position 2 shifts later items right.",
    ["AP CSP positions begin at 0, so position 2 identifies the third item in the list.", "Inserting at position 2 replaces B with X without shifting any existing items.", "INSERT ignores the supplied position and always places a new value at the list end."],
    "Position 2 is the second slot. INSERT adds a slot rather than replacing B.",
    "The selected explanation uses zero-based indexing or confuses insertion with replacement or append.",
    "Use AP CSP one-based positions and the exact list operation."),
  q("return-value",
    `PROCEDURE change(value)
{
    value ← value + 2
    RETURN(value × 3)
}
result ← change(4)`,
    "The test stores 18 in result. Which explanation correctly accounts for that result?",
    "The argument 4 becomes 6, and the procedure returns 6 × 3.",
    ["The procedure multiplies 4 by 3 before adding 2.", "The procedure returns 4 because parameter changes are ignored.", "A procedure call always returns its original input."],
    "Statements execute in order: value becomes 6 before RETURN(value × 3) is evaluated.",
    "The selected explanation changes statement order or ignores the returned expression.",
    "Trace parameter values in execution order."),
  q("remove-operation",
    `values ← [3, 6, 9, 12]
REMOVE(values, 2)
RETURN(LENGTH(values))`,
    "The test returns 3. Which explanation correctly accounts for that result?",
    "REMOVE deletes the item at position 2, leaving three items.",
    ["REMOVE deletes every list value equal to 2, so this particular list stays unchanged.", "REMOVE replaces the item in position 2 with zero, preserving all four list positions.", "LENGTH reports the position that was removed rather than the number of remaining items."],
    "The second argument is a position. Deleting one of four items leaves length three.",
    "The selected explanation treats the position as a value, replacement, or LENGTH result.",
    "Distinguish a list position from its stored value."),
];

const abstraction = [
  q("list-many-items",
    `PROCEDURE average(readings)
{
    total ← 0
    FOR EACH value IN readings
    {
        total ← total + value
    }
    RETURN(total / LENGTH(readings))
}`,
    "How does the list abstraction manage complexity in this program?",
    "One loop can process any number of readings without separate variables for each reading.",
    ["The list guarantees that every reading is accurate before it contributes to the average.", "The list automatically sorts all readings before the loop calculates their average.", "The list computes its own mean, making the traversal and procedure unnecessary."],
    "The list groups a varying collection under one name so one traversal can process it.",
    "The selected benefit claims validation, sorting, or automatic computation not provided by a list.",
    "A valid abstraction benefit must be visible in this program."),
  q("procedure-reuse",
    `PROCEDURE shipping(weight, rate)
{
    RETURN(weight × rate)
}
a ← shipping(4, 2.5)
b ← shipping(9, 2.5)`,
    "How does the procedure abstraction manage complexity in this program?",
    "It names the calculation once and reuses it with different weights.",
    ["It forces both calls to use the same weight because they share one procedure definition.", "It hides both returned shipping costs so no other part of the program can store them.", "It proves that every supplied weight and rate is a valid real-world measurement."],
    "Parameters let both calls reuse one calculation while supplying different values.",
    "The selected claim misunderstands parameters or promises privacy or correctness not shown.",
    "Focus on what repeated code the abstraction replaces."),
  q("list-update",
    `PROCEDURE markComplete(tasks, position)
{
    tasks[position] ← "done"
}
markComplete(todayTasks, 3)`,
    "How does the list abstraction manage complexity in this program?",
    "A position identifies one task without separate variables and statements for every task.",
    ["The list guarantees that position 3 always refers to the most important task in the collection.", "The list prevents any task from being changed anywhere outside this procedure call.", "Updating the item at one supplied position automatically converts every task to done."],
    "Indexed access lets one statement update whichever task position is supplied.",
    "The selected claim invents ordering, access control, or whole-list behavior.",
    "Explain how the collection reduces repeated variables or statements."),
  q("procedure-details",
    `PROCEDURE eligible(age, hasPermit)
{
    RETURN((age ≥ 16) AND hasPermit)
}
IF (eligible(studentAge, permitOnFile))
{
    DISPLAY("approved")
}`,
    "How does the procedure abstraction manage complexity in this program?",
    "The name eligible lets the caller use the decision without repeating its condition details.",
    ["The procedure guarantees approval for every student whose information is supplied.", "The procedure removes the need to supply either age or permit information to the program.", "The name eligible causes both comparisons in the procedure to evaluate as true."],
    "The procedure packages the combined condition behind a meaningful name.",
    "The selected statement confuses hiding implementation details with guaranteeing inputs or outcomes.",
    "Procedure abstraction reduces repeated detail; it does not guarantee correctness."),
  q("list-growth",
    `scores ← [88, 74, 93, 81]
FOR EACH score IN scores
{
    DISPLAY(score)
}`,
    "How does the list abstraction manage complexity in this program?",
    "More scores can use the same loop instead of new variables and display statements.",
    ["Additional scores automatically become passing scores when they are appended to the list.", "The list prevents any score from being displayed more than once during traversal.", "DISPLAY processes every item in the list by itself, making the loop unnecessary."],
    "The loop works on a collection, so its structure does not change when the list grows.",
    "The selected statement assigns validation, uniqueness, or traversal to the list without code.",
    "Connect the abstraction to a concrete reduction in repeated code."),
  q("procedure-change-once",
    `PROCEDURE formatName(first, last)
{
    RETURN(last + ", " + first)
}
a ← formatName("Ari", "Lee")
b ← formatName("Mia", "Chen")`,
    "How does the procedure abstraction manage complexity in this program?",
    "The formatting rule can change once instead of changing every label creation.",
    ["The procedure permanently stores every first and last name supplied by all of its calls.", "The procedure guarantees that two people can never produce the same formatted label.", "The named formatting rule lets callers omit both required name arguments."],
    "Both labels depend on one body, so revising it updates the shared formatting logic.",
    "The selected statement claims storage, uniqueness, or optional arguments not provided.",
    "Look for duplicated logic centralized by the abstraction."),
];

const reasoning = [
  q("counter-connection",
    `count ← 0
FOR EACH item IN items
{
    IF (item = "blue")
    {
        count ← count + 1
    }
}
RETURN(count)`,
    "Complete the reasoning: The condition identifies blue items. Therefore, ...",
    "incrementing count only in that branch makes it equal the number of blue items.",
    ["incrementing count in that branch makes it equal the final blue item encountered.", "initializing count to zero causes every item to pass the later color comparison.", "returning count changes each nonblue item into a blue item after traversal."],
    "A successful color comparison causes exactly one increment, supporting the stated count.",
    "The selected connection changes what count represents or invents effects for initialization or RETURN.",
    "Connect the cited code to the conclusion without adding a new claim."),
  q("sum-connection",
    `total ← 0
FOR EACH value IN values
{
    total ← total + value
}
RETURN(total)`,
    "Complete the reasoning: Each iteration adds the current value to total. Therefore, ...",
    "after every element is visited, total contains the sum of the list values.",
    ["after every element is visited, total contains the number of values in the list.", "the loop returns immediately after adding the first value and ignores later values.", "the assignment automatically removes repeated values before adding the list."],
    "Adding each visited value builds the cumulative sum returned after the traversal.",
    "The selected connection substitutes counting, early return, or duplicate removal.",
    "Follow the accumulator across all iterations."),
  q("early-return-connection",
    `FOR EACH value IN values
{
    IF (value < 0)
    {
        RETURN(TRUE)
    }
}
RETURN(FALSE)`,
    "Complete the reasoning: A negative value causes an immediate TRUE return. Therefore, ...",
    "FALSE is returned only if the whole list is checked without finding a negative.",
    ["FALSE is returned as soon as the first positive value is examined in the list.", "every list value is still checked after the procedure has already returned TRUE.", "TRUE is returned only when every value in the entire list is negative."],
    "Execution reaches RETURN(FALSE) only if no iteration returned TRUE.",
    "The selected connection stops too early, continues after RETURN, or changes any into all.",
    "Reason about what must happen to reach the final return."),
  q("append-connection",
    `result ← []
FOR EACH word IN words
{
    IF (LENGTH(word) > 5)
    {
        APPEND(result, word)
    }
}
RETURN(result)`,
    "Complete the reasoning: Words are appended only when their length exceeds 5. Therefore, ...",
    "result contains exactly the qualifying words, in visit order.",
    ["result contains every word sorted by length.", "result contains only the number of qualifying words.", "long words are replaced by lengths in the input list."],
    "Guarded APPEND copies qualifying words to the result end, preserving order.",
    "The selected connection adds sorting, counting, or replacement not shown.",
    "Connect the condition to the exact operation inside its branch."),
  q("maximum-connection",
    `best ← values[1]
FOR EACH value IN values
{
    IF (value > best)
    {
        best ← value
    }
}
RETURN(best)`,
    "Complete the reasoning: best changes only when a larger value is found. Therefore, ...",
    "best holds the greatest value seen so far after each iteration.",
    ["best holds the smallest value seen so far after each completed loop iteration.", "best changes to the current value on every iteration regardless of the comparison.", "best stores the position of the greatest value rather than the value itself."],
    "The conditional update maintains a running maximum.",
    "The selected connection reverses the comparison, ignores the condition, or changes value to position.",
    "State the invariant maintained by the update."),
  q("parameter-connection",
    `PROCEDURE convert(minutes)
{
    RETURN(minutes × 60)
}
a ← convert(2)
b ← convert(5)`,
    "Complete the reasoning: Each call supplies a different argument to minutes. Therefore, ...",
    "one procedure body returns different second totals without being rewritten.",
    ["the first call permanently changes the parameter value used by every later call.", "both calls must return the same result because they share one procedure body.", "the procedure definition must be copied and edited before the second call can run."],
    "On each call, minutes receives that call's argument, so one abstraction handles both.",
    "The selected connection treats a parameter as permanent or requires duplicated definitions.",
    "Connect parameter substitution to procedure reuse."),
];

const pools = { behavior, evidence, test, abstraction, reasoning };
export const responsePools = pools;

// The shared practice catalog still references the former mode keys. Mapping
// them here keeps that catalog functional while the dedicated game uses the
// focused modes above.
const legacyModes = {
  guided: "behavior",
  explanation: "evidence",
  reduced: "reasoning",
  testing: "test",
  abstraction: "abstraction",
};

export function generateResponse(mode = "mixed", support = "full", forcedStructure) {
  const requestedMode = mode === "mixed" ? pick(Object.keys(responseModes)) : mode;
  const selectedMode = legacyModes[requestedMode] || requestedMode;
  if (!pools[selectedMode]) throw Error("Unknown response practice mode");
  if (!supportNames[support] && support !== "partial") throw Error("Unknown response support level");
  const pool = pools[selectedMode];
  const source = forcedStructure ? pool.find((item) => item.structure === forcedStructure) : pick(pool);
  if (!source) throw Error("Unknown response structure");
  const choices = shuffle([
    { text: source.answer, correct: true },
    ...source.wrong.map((text) => ({ text, correct: false })),
  ]).map((choice, index) => ({ ...choice, id: `choice-${index}` }));
  const correct = choices.find((choice) => choice.correct);
  return {
    game: "response-builder",
    title: "Response Builder",
    topic: `${requestedMode}.${support}`,
    topicTitle: `${responseModes[selectedMode]} · ${
      legacyModes[requestedMode] && support === "minimal"
        ? "Minimal Support"
        : supportNames[support] || "Independent"
    }`,
    mode: requestedMode,
    modeName: responseModes[selectedMode],
    support,
    supportName: supportNames[support] || "Independent",
    structure: source.structure,
    code: source.code,
    prompt: source.prompt,
    reminder: support === "full" ? source.reminder : "",
    choices,
    correctId: correct.id,
    answer: source.answer,
    feedback: source.feedback,
    misconception: source.misconception,
    items: choices.map((choice) => ({ ...choice, role: "claim" })),
    correct: { claim: correct.id, evidence: correct.id, reason: correct.id },
    solution: { selectedId: correct.id },
  };
}

export function evaluateResponse(question, selectedId) {
  if (selectedId && typeof selectedId === "object") {
    selectedId = selectedId.claim || selectedId.selectedId || selectedId.order?.[0];
  }
  const selected = question.choices.find((choice) => choice.id === selectedId);
  if (!selected) return { complete: false, correct: false, details: "Choose an answer before submitting." };
  const details = selected.correct
    ? `Correct answer: ${question.answer}\n${question.feedback}`
    : `Correct answer: ${question.answer}\n${question.feedback}\nWhy your choice is inaccurate: ${question.misconception}`;
  return { complete: true, correct: selected.correct, details };
}
