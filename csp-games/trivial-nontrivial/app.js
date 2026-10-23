import {
  CATEGORIES,
  ACTIVITIES,
  MODELS,
  buildChallenge,
  chooseChallenge,
  configurationBank,
} from "./engine.js?v=trivial-nontrivial-v1";
import {
  sessionTracker,
  addSessionNavigation,
  startActivePractice,
} from "../session.js?v=per-mode-daily-v1";

const $ = id => document.getElementById(id);
const tracker = sessionTracker();
addSessionNavigation("../");
startActivePractice();

let current = null;
let recordId = null;
const params = new URL(location.href).searchParams;
const seedParam=params.get("seed");
let seedValue = seedParam===null ? Math.floor(Date.now()%2147483647) : Number(seedParam);
if (!Number.isFinite(seedValue)) seedValue = Math.floor(Date.now() % 2147483647);
let sequence = 0;
let recent = [];
let exactModel = params.get("model");
const exactVariant = Number(params.get("variant"));
const exactShown = params.get("shown");

function readFilters() {
  const category = $("category").value;
  const activity = $("activity").value;
  const difficulty = $("difficulty").value;
  const categories = category === "mixed"
    ? [...document.querySelectorAll("#category-filters input:checked")].map(x => x.value)
    : null;
  return { category, activity, difficulty, categories };
}
function labelDifficulty(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "Mixed difficulty";
}
function categoryLabel(key) { return CATEGORIES[key]?.title || key; }
function activityLabel(key) { return ACTIVITIES[key] || key; }
function pretty(value) { return JSON.stringify(value); }
function chosenValue(name) {
  return document.querySelector('input[name="' + name + '"]:checked')?.value || "";
}
function setRadio(name, value) {
  const radio = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
  if (radio) radio.checked = true;
}
function clearAnswers() {
  document.querySelectorAll('#challenge input[type="radio"]').forEach(el => { el.checked = false; el.disabled = false; });
  $("compare-class-a").value = "";
  $("compare-class-b").value = "";
  $("compare-class-a").disabled = false;
  $("compare-class-b").disabled = false;
  $("submit-answer").disabled = false;
  $("feedback").hidden = true;
  $("feedback").textContent = "";
  $("trace-details").hidden = true;
  $("trace-output").textContent = "";
  $("action-status").textContent = "";
}

const misconceptionFor = model => {
  const exact = {
    same:"The code is meaningful because the branches are written separately, even though both assign the same status.",
    constantTrue:"Testing a value is always meaningful, even when the stated domain guarantees the condition is true.",
    constantFalse:"The first branch matters because it exists, even when the allowed input can never reach it.",
    threshold:"The decision is superficial because only one branch can run during a single execution.",
    flag:"A Boolean test is only meaningful if both values occur in the same run.",
    irrelevant:"Any variable change counts as task progress, even when the requested output never uses it.",
    guard:"The inner IF must matter because it is nested inside an outer IF.",
    overwrite:"The first result remains visible even after a later assignment replaces it.",
    boundary:"Because the inclusive boundary is handled incorrectly, the conditional has no behavioral effect.",
    listGuard:"The list must contain a first item, so checking its length cannot affect behavior.",
    inner:"Nested decisions are always meaningful because they add another level of control flow.",
    excluded:"A branch matters even when its condition checks an input excluded by the assumptions.",
    repeatedTerm:"A redundant part of a condition makes the entire selection meaningless.",
    loopControl:"A decision cannot matter when it changes how many times a loop repeats.",
    scratchList:"Changing any list proves that the requested result changed.",
    nestedUseful:"Only the final branch affects which label is displayed.",
    redundantOr:"A longer Boolean expression is more meaningful than a simpler equivalent one.",
    afterUpdate:"The conditional reads the original value even after the variable has been reassigned.",
    equivalent:"Different written conditions must produce different results for integer inputs.",
    sum:"The loop body executes once no matter how many items are in the list.",
    empty:"A traversal over an empty list still executes the body one time.",
    once:"A loop that executes one time is automatically trivial.",
    repeat:"The repeat count cannot affect the final state.",
    constant:"Repeated assignments are meaningful even when they all assign the same value.",
    temp:"Changing an unused counter is enough to complete the task.",
    filterSum:"Every list item contributes to the total even when the conditional is false.",
    filterCount:"A value counts as a match even when the condition is false.",
    until:"REPEAT UNTIL skips the body when its stopping condition is already true.",
    untilOne:"A loop that runs once cannot do meaningful work.",
    pairs:"The inner loop executes only one time for the entire list.",
    overwrite:"The total accumulates every item even though it is reset in the loop.",
    last:"A traversal cannot be used to leave the last item as the final value.",
    displayEach:"Repeated DISPLAY calls do not change observable output.",
    copy:"APPEND changes only a temporary copy, not the list passed by the caller.",
    guarded:"REPEAT 0 TIMES still executes the body once.",
    noOpIf:"Both branches matter even though each assigns total to itself.",
    twice:"The extra pass must change the sum because it adds more instructions.",
    limit:"A one-based traversal always skips the last item.",
    parameter:"A procedure argument cannot affect the returned value.",
    ignored:"The parameter is meaningful as soon as it appears in the procedure header.",
    constantBad:"Returning a constant can correctly compute a maximum for every input.",
    constantGood:"A procedure returning a fixed configuration value is always superficial.",
    returnUsed:"The returned value is ignored even though the caller stores and displays it.",
    returnIgnored:"Calling a procedure automatically displays its return value.",
    sideEffect:"Only a RETURN statement can change data observed by the caller.",
    reuse:"A procedure called inside a traversal runs only once.",
    wrapper:"A short, single-use procedure can never provide useful abstraction.",
    branch:"A parameter cannot determine which return statement runs.",
    list:"A procedure cannot perform a traversal.",
    local:"A local temporary cannot contribute to a returned value.",
    sameReturn:"Reading a parameter in a condition proves that it changes the result.",
    propagate:"A Boolean returned by a procedure cannot affect a caller-side IF.",
    appendChoice:"APPEND always makes a new list instead of changing the list argument.",
    sameArg:"Repeating the same argument proves that the parameter is unused.",
    hidden:"A returned value stays visible even when the caller overwrites it.",
    inline:"If an operation could be inlined, the procedure cannot be useful abstraction.",
    context:"A constant return is always meaningless, even when the task asks for a default.",
    filterCount:"Using a loop and IF guarantees that the result is correct for every input.",
    sum:"A short algorithm cannot be meaningful because it uses only one loop.",
    decorativeIf:"A conditional is meaningful whenever its body changes a variable, even if the condition never selects another path.",
    zeroLoop:"A zero-count loop still updates the counter.",
    efficiency:"More execution steps make an algorithm incorrect.",
    sampleOnly:"One successful example proves the algorithm works for every permitted input.",
    boundary:"Strict and inclusive comparisons have the same result at the boundary.",
    emptyBug:"Every list has a valid first element, including the empty list.",
    nested:"Nested loops are automatically superficial because they repeat work.",
    search:"An algorithm is a search algorithm whenever its title says search.",
    maximum:"Starting a maximum at 0 works even if all permitted values are negative.",
    order:"A loop condition keeps testing the original value after each update.",
    unusedLoop:"Extra work contributes to the requested total even when its value is never read.",
    redundant:"A redundant operand makes the entire selection ineffective.",
    requirement:"Meaningful code automatically satisfies every separate task or Create requirement.",
    inefficient:"The longer algorithm must be more correct because it performs more work.",
    oneInput:"Equal results on one list establish equivalence for all permitted lists.",
    short:"A concise algorithm cannot perform meaningful work.",
    wrongMeaningful:"If a construct is meaningful, the algorithm must be correct.",
    allThree:"Seeing sequence, selection, and iteration proves that each construct contributes to the task.",
  };
  const contextual = {
    "selection:overwrite":"The branch result remains visible even though the later assignment replaces it.",
    "iteration:overwrite":"The loop computes a sum even though total is reset on each pass.",
    "procedures:overwrite":"A returned value remains the final result even after the caller assigns 0.",
    "iteration:sum":"FOR EACH runs once regardless of how many items are in the list.",
    "algorithms:sum":"A concise one-pass algorithm cannot be meaningful.",
    "iteration:filterCount":"The IF is irrelevant because every list value is counted.",
    "algorithms:filterCount":"Using a loop and IF guarantees correctness for every possible input.",
    "selection:boundary":"The conditional has no behavior because it misclassifies the exact boundary.",
    "algorithms:boundary":"Strict and inclusive comparisons produce the same answer when a value equals 5.",
  };
  const patternKey = model.pattern;
  const text = contextual[model.category+":"+patternKey] || exact[patternKey] || "The construct must matter because it appears in the code.";
  return text;
};

const distractorPools = {
  selection: [
    "A longer Boolean condition must provide a more useful decision.",
    "Writing ELSE guarantees that the two branches produce different behavior.",
    "Changing any variable proves that the task result changed.",
    "If one displayed input reaches a branch, that branch matters for every allowed input.",
    "A condition is meaningful whenever it evaluates to true or false.",
    "Nested conditions always add a meaningful decision.",
    "A branch that runs is necessary for the task because it ran.",
  ],
  iteration: [
    "A loop is meaningful only when it runs more than once.",
    "A FOR EACH loop over an empty list executes its body one time.",
    "A changing counter is task-relevant even when no later statement reads it.",
    "A second pass improves the result just by doing more work.",
    "A loop is unnecessary whenever a shorter expression can produce the same output.",
    "A loop that runs once cannot perform meaningful work.",
    "If the loop visits every item, its accumulator must be correct.",
  ],
  procedures: [
    "A parameter affects behavior as soon as it appears in the procedure header.",
    "A returned value is visible in the task output even when the caller ignores it.",
    "A one-operation procedure is always a trivial abstraction.",
    "A constant return can never be useful, even for a fixed default task.",
    "Calling a procedure once proves that the procedure has no useful role.",
    "An operation that could be inlined cannot provide useful abstraction.",
    "A procedure call that changes a list must return that list for the change to count.",
  ],
  algorithms: [
    "One successful example proves that the algorithm works for every allowed input.",
    "A longer algorithm is more meaningful because it has more steps.",
    "An efficient algorithm is automatically more correct.",
    "Using sequence, selection, and iteration proves that each construct contributes.",
    "Missing one separate requirement means none of the computation is meaningful.",
    "Nested loops are always unnecessary, regardless of the task.",
    "A concise algorithm cannot perform meaningful work.",
  ],
};

function distinctDistractors(model, challenge) {
  const specific=misconceptionFor(model);
  const pool=distractorPools[model.category];
  const used=new Set([challenge.explanation,specific]);
  const pick=start=>{
    for(let offset=0;offset<pool.length;offset++) {
      const candidate=pool[(start+offset)%pool.length];
      if(!used.has(candidate)) { used.add(candidate); return candidate; }
    }
    throw new Error("Unable to create distinct explanation distractors for "+model.id);
  };
  return [specific,pick(model.ordinal),pick(model.ordinal+Math.ceil(pool.length/2))];
}

function buildExplanationChoices(challenge) {
  const model = MODELS.find(item => item.id === challenge.modelId);
  const [specific,generalization,complexity]=distinctDistractors(model,challenge);
  const choices = [
    { key:"correct", text:challenge.explanation },
    { key:"misconception", text:specific },
    { key:"generalization", text:generalization },
    { key:"complexity", text:complexity },
  ];
  const random = (Number(seedValue) + sequence + model.ordinal * 31) >>> 0;
  let state = random || 1;
  for (let i=choices.length-1;i>0;i--) {
    state=(state*1664525+1013904223)>>>0;
    const j=state%(i+1);
    [choices[i],choices[j]]=[choices[j],choices[i]];
  }
  return choices;
}

function formatRun(name, run) {
  const lines=[name+" trace:"];
  if (run.trace.length) lines.push(...run.trace.map(item=>"• "+item));
  else lines.push("• No branch or iteration trace was needed.");
  lines.push("DISPLAY result: "+pretty(run.outputs));
  if (Object.keys(run.observed).length) lines.push("Task-relevant state: "+pretty(run.observed));
  if (run.error) lines.push("Program terminates with: "+run.error);
  return lines.join("\n");
}

function beginRecord(challenge) {
  if (recordId) tracker.skip(recordId);
  recordId=tracker.begin(
    "trivial-nontrivial",
    "Trivial or Non-Trivial?",
    challenge.category,
    categoryLabel(challenge.category),
    challenge.activity,
    activityLabel(challenge.activity),
  );
  tracker.annotate(recordId,{modelId:challenge.modelId,difficulty:challenge.difficulty,variant:challenge.variant,activity:challenge.activity});
}

function applyExactOrChoose() {
  const filters=readFilters();
  let challenge;
  if (exactModel && Number.isInteger(exactVariant) && exactVariant>=0 && exactVariant<=2 && sequence===0) {
    const found=MODELS.find(item=>item.id===exactModel);
    const allowed=found && (filters.category==="mixed"
      ? (!filters.categories || filters.categories.includes(found.category))
      : found.category===filters.category);
    if (allowed && (!filters.difficulty || found.difficulty===filters.difficulty)) {
      challenge=buildChallenge(exactModel,exactVariant);
      challenge.activity=exactShown && ACTIVITIES[exactShown] ? exactShown : (filters.activity==="all" ? "classify" : filters.activity);
      challenge.activityTitle=activityLabel(challenge.activity);
    }
  }
  if (!challenge) {
    challenge=chooseChallenge({
      ...filters,
      seed:(Number(seedValue)+sequence)>>>0,
      recent,
    });
  }
  return challenge;
}

function renderChallenge(challenge) {
  current=challenge;
  clearAnswers();
  const compare=challenge.activity==="compare";
  $("challenge-title").textContent=compare ? "Compare Two Implementations" : challenge.title;
  $("challenge-meta").textContent=categoryLabel(challenge.category)+" · "+activityLabel(challenge.activity)+" · "+labelDifficulty(challenge.difficulty);
  const task=compare?challenge.comparison.task:challenge.task;
  const assumptions=compare?challenge.comparison.assumptions:challenge.assumptions;
  const inputValues=compare?challenge.comparison.assumptions:("Given inputs: "+pretty(challenge.inputs));
  const reviewFocus=compare?challenge.comparison.reviewFocus:challenge.reviewFocus;
  $("task").textContent=task;
  $("construct-focus").textContent=(compare?"Focus for this comparison: ":"Focus for this challenge: ")+reviewFocus+".";
  $("classify-question").textContent="For the stated task and full input assumptions, does the focus shown above contribute meaningful work?";
  $("compare-classify-question").textContent="For the stated task and full input assumptions, does the focus shown above contribute meaningful work in each implementation?";
  $("assumptions").textContent=assumptions;
  $("given-inputs").textContent=compare ? "" : inputValues;
  $("single-code").hidden=compare;
  $("compare-code").hidden=!compare;
  $("classify-controls").hidden=challenge.activity!=="classify";
  $("compare-controls").hidden=!compare;
  $("explain-controls").hidden=challenge.activity!=="explain";
  if (compare) {
    $("compare-a").textContent=challenge.comparison.codeA;
    $("compare-b").textContent=challenge.comparison.codeB;
  } else {
    $("code-a").textContent=challenge.codeA;
  }
  if (challenge.activity==="explain") {
    const container=$("explanation-choices");
    container.replaceChildren();
    for (const choice of buildExplanationChoices(challenge)) {
      const button=document.createElement("button");
      button.type="button";
      button.className="explanation-choice";
      button.dataset.choice=choice.key;
      button.textContent=choice.text;
      button.setAttribute("aria-pressed","false");
      button.addEventListener("click",()=>{
        container.querySelectorAll("button").forEach(item=>{
          item.classList.remove("selected");
          item.setAttribute("aria-pressed","false");
        });
        button.classList.add("selected");
        button.setAttribute("aria-pressed","true");
      });
      container.append(button);
    }
  }
  $("trace-details").open=false;
  beginRecord(challenge);
  $("session-score").textContent="One scored attempt per challenge. Results are saved locally in this browser.";
}

function startChallenge() {
  const filters=readFilters();
  const chosen=applyExactOrChoose();
  if (!chosen) return;
  current=chosen;
  current.activityTitle=activityLabel(current.activity);
  recent.push(current.id,current.modelId,current.comparisonKey);
  recent=recent.slice(-36);
  $("category-filters").hidden=filters.category!=="mixed";
  renderChallenge(current);
  sequence++;
}

function currentComparison() { return current?.comparison; }
function scoreAttempt() {
  if (!current || !recordId) return;
  let correct=false;
  let explanation=current.explanation;
  let misconception="";
  if (current.activity==="classify") {
    const answer=chosenValue("classification");
    if (!answer) { $("action-status").textContent="Choose a classification first."; return; }
    const expected=current.meaningfulA?"meaningful":"superficial";
    correct=answer===expected;
    if (!correct) misconception=answer==="meaningful"
      ? "You may be treating the presence of a construct or a changed internal variable as proof that the task result changed."
      : "You may be assuming a short construct, a single execution, or a possible simpler solution makes behavior superficial.";
  } else if (current.activity==="compare") {
    const comp=currentComparison();
    const answerA=$("compare-class-a").value, answerB=$("compare-class-b").value, eq=chosenValue("equivalence");
    if (!answerA || !answerB || !eq) { $("action-status").textContent="Classify both implementations and compare their shown results."; return; }
    correct=answerA===(comp.meaningfulA?"meaningful":"superficial") &&
      answerB===(comp.meaningfulB?"meaningful":"superficial") &&
      eq===(comp.equivalentShown?"same":"different");
    explanation=comp.focus+" For this comparison, equivalence is judged only on the displayed inputs.";
    if (!correct) misconception="Code length, construct names, and one output alone do not determine all three judgments.";
  } else {
    const selected=$("explanation-choices").querySelector("button.selected");
    if (!selected) { $("action-status").textContent="Choose an explanation first."; return; }
    correct=selected.dataset.choice==="correct";
    if (!correct) misconception=selected.textContent;
  }
  const outcome=tracker.submit(recordId,correct);
  if (!outcome.accepted) {
    $("action-status").textContent="This challenge is already complete. Choose Next Challenge.";
    return;
  }
  if (!correct) tracker.closeIncorrect(recordId);
  document.querySelectorAll('#challenge input[type="radio"], #challenge select').forEach(el=>{el.disabled=true;});
  $("explanation-choices").querySelectorAll("button").forEach(el=>{el.disabled=true;});
  $("submit-answer").disabled=true;
  $("feedback").hidden=false;
  $("feedback").className="feedback "+(correct?"good":"bad");
  $("feedback").textContent=(correct?"Correct. ":"Not quite. ")+explanation+(misconception?"\n\nReasoning to revisit: "+misconception:"");
  $("trace-details").hidden=false;
  if (current.activity==="compare") {
    const comp=currentComparison();
    $("trace-output").textContent=formatRun("Implementation A",comp.runA)+"\n\n"+formatRun("Implementation B",comp.runB)+"\n\nSame task-relevant result for shown inputs: "+(comp.equivalentShown?"Yes":"No");
  } else {
    $("trace-output").textContent=formatRun("Implementation",current.runA);
  }
  $("action-status").textContent=correct?"First attempt recorded as correct.":"First attempt recorded as incorrect.";
  const snap=tracker.snapshot(), game=snap.games["trivial-nontrivial"];
  $("session-score").textContent="This session: "+(game?.attempted||0)+" attempted · "+(game?.firstTry||0)+" first-attempt correct · "+(game?.attempted?Math.round(100*game.firstTry/game.attempted):0)+"% first-attempt accuracy.";
}

function shareLink() {
  if (!current) return;
  const filters=readFilters();
  const url=new URL(location.href);
  url.search="";
  url.searchParams.set("category",filters.category);
  url.searchParams.set("activity",filters.activity);
  url.searchParams.set("difficulty",filters.difficulty);
  if (filters.categories?.length) url.searchParams.set("categories",filters.categories.join(","));
  url.searchParams.set("seed",String(seedValue));
  url.searchParams.set("model",current.modelId);
  url.searchParams.set("variant",String(current.variant));
  url.searchParams.set("shown",current.activity);
  const text=url.toString();
  const status=$("action-status");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      ()=>{status.textContent="Shareable link copied. It opens this challenge with the same filters.";},
      ()=>showShareText(text),
    );
  } else showShareText(text);
}
function showShareText(text) {
  let field=$("share-fallback");
  if (!field) {
    field=document.createElement("input");
    field.id="share-fallback";
    field.type="text";
    field.readOnly=true;
    field.setAttribute("aria-label","Shareable practice link");
    field.className="share-fallback";
    $("action-status").after(field);
  }
  field.value=text;
  field.hidden=false;
  field.focus();
  field.select();
  $("action-status").textContent="Copy the selected shareable link.";
}
function resetSession() {
  if (!window.confirm("Reset this browser's AP CSP practice session? This clears its local performance totals.")) return;
  tracker.reset(true);
  recordId=null;
  if (current) beginRecord(current);
  $("session-score").textContent="Session reset. New results will be saved locally in this browser.";
  $("action-status").textContent="Session reset.";
}

$("category").value=params.get("category")||"mixed";
$("activity").value=params.get("activity")||"all";
$("difficulty").value=params.get("difficulty")||"";
$("seed").value=String(seedValue);
const fromCategories=(params.get("categories")||"").split(",").filter(Boolean);
if (fromCategories.length) {
  document.querySelectorAll("#category-filters input").forEach(input=>{input.checked=fromCategories.includes(input.value);});
}
$("category").addEventListener("change",()=>{exactModel=null;sequence=0;startChallenge();});
$("activity").addEventListener("change",()=>{exactModel=null;sequence=0;startChallenge();});
$("difficulty").addEventListener("change",()=>{exactModel=null;sequence=0;startChallenge();});
$("seed").addEventListener("change",()=>{
  const next=Number($("seed").value);
  if (Number.isFinite(next)) seedValue=next;
  exactModel=null; sequence=0; recent=[]; startChallenge();
});
document.querySelectorAll("#category-filters input").forEach(input=>input.addEventListener("change",()=>{
  const selected=[...document.querySelectorAll("#category-filters input:checked")];
  if (!selected.length) {
    input.checked=true;
    $("action-status").textContent="Keep at least one category selected for Mixed Practice.";
    return;
  }
  exactModel=null; sequence=0; startChallenge();
}));
$("submit-answer").addEventListener("click",scoreAttempt);
$("next-challenge").addEventListener("click",()=>{
  exactModel=null;
  startChallenge();
});
$("share-link").addEventListener("click",shareLink);
$("reset-session").addEventListener("click",resetSession);

const bank=configurationBank();
if (!bank.length) throw new Error("No validated challenges are available.");
startChallenge();

export { startChallenge, scoreAttempt, buildExplanationChoices, renderChallenge };
