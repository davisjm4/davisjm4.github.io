import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assessLoop, createLoopSession, DIFFICULTIES, generateChallenge, validateChallenge } from "../loop-engine.js";
import { findJava, javaVersion } from "./jvm-harness.mjs";

// Independent review table. Each family is keyed by the visible design
// constraint that determines the recommendation, including the boundary case.
const keys = {
  "count-with-header": ["beginner", "Basic for loop", /declaration, limit test, and increment together/],
  "check-before-work": ["beginner", "while loop", /may already meet the limit.*only the guard/],
  "first-attempt": ["beginner", "do-while loop", /at least once.*test below/],
  "array-values": ["beginner", "Enhanced for loop", /could be empty.*without a separate index/],
  "report-index": ["beginner", "Basic for loop", /index and value.*increment together/],
  "primed-sentinel": ["intermediate", "while loop", /first value is already read.*only the sentinel check/],
  "validation-read-first": ["intermediate", "do-while loop", /No selection exists yet.*test the result below/],
  "validate-existing-choice": ["intermediate", "while loop", /valid starting value must trigger no read.*only the validity test/],
  "menu-after-selection": ["intermediate", "do-while loop", /exit test at the end without a dummy/],
  "indexed-stride": ["intermediate", "Basic for loop", /Group the start, bounds test, and stride/],
  "iterable-without-index": ["intermediate", "Enhanced for loop", /Iterable<Integer>.*without an index or an explicit Iterator/],
  "element-search-break": ["intermediate", "Enhanced for loop", /Return the value, not its position.*free of separate position or iterator/],
  "replace-array-slots": ["advanced", "Basic for loop", /write directly to its slots.*bounds test, and update together/],
  "mutate-referenced-object": ["advanced", "Enhanced for loop", /Preserve the original references.*avoid an index or explicit iterator/],
  "iterator-removal": ["advanced", "while loop", /same Iterator.*only its guard/],
  "reverse-index-removal": ["advanced", "Basic for loop", /remove\(index\).*from the end.*decrement together/],
  "bounded-validation": ["advanced", "do-while loop", /at most.*single test after the body, without break/],
  "guard-with-dependent-progress": ["advanced", "while loop", /both safety checks before the body.*update the index in the body/],
};

const checked = new Set(), positions = new Set(), examples = [];
let generated = 0;
for (const [family, [difficulty, answer, constraint]] of Object.entries(keys)) {
  const variants = new Set();
  for (let i = 0; i < 180; i++) {
    const seed = i * 27091 + 61;
    const q = generateChallenge({mode:"looptype",difficulty,seed,family});
    assert.equal(q.variant, family);
    assert.equal(q.difficulty, difficulty);
    assert.match(q.scenario, constraint);
    assert.equal(q.answer, answer);
    assert.equal(q.javaProgram, null, "design choices carry no simulated trace");
    assert.equal(q.code, "", "worked example is separate from the question");
    assert.ok(q.principle.length > 20 && q.explanation.length > 20);
    assert.ok(validateChallenge(q));
    assert.deepEqual(q.choices.filter(value=>assessLoop(q,{answer:value})),[answer]);
    for (const distractor of q.distractors) assert.ok(distractor.note.length > 30);
    assert.doesNotMatch(q.scenario, /undefined|NaN/);
    if (i % 40 === 0) {
      examples.push([family,q.example.code,q.example.output]);
      assert.deepEqual(q,generateChallenge({mode:"looptype",difficulty,seed,family}));
    }
    variants.add(q.signature.exact);
    positions.add(q.choices.indexOf(q.answer));
    checked.add(q.variant);
    generated++;
  }
  assert.ok(variants.size>=25,`${family}: needs enough real scenario variations (${variants.size})`);
}
assert.equal(positions.size,4);
assert.throws(()=>generateChallenge({mode:"looptype",difficulty:"beginner",family:"iterator-removal"}),/requested difficulty/);
assert.equal(checked.size,Object.keys(keys).length);

const sessionCases = 20;
for (const difficulty of DIFFICULTIES) {
  const familyIds = Object.keys(keys).filter(id=>keys[id][0]===difficulty);
  assert.ok(familyIds.length >= 5);
  assert.equal(new Set(familyIds.map(id=>keys[id][1])).size,4);
  for (let seed = 1; seed <= sessionCases; seed++) {
    const session = createLoopSession({seed});
    const recent = [], seenFamilies = new Set();
    for (let i = 0; i < 100; i++) {
      const q = session.next({mode:"looptype",difficulty});
      assert.ok(!recent.some(item=>item.signature.exact===q.signature.exact), "no exact repeat inside 50 questions");
      assert.notEqual(q.reasoningFamily,recent.at(-1)?.reasoningFamily);
      seenFamilies.add(q.reasoningFamily);
      recent.push(q);
      if (recent.length>50) recent.shift();
    }
    assert.deepEqual(seenFamilies,new Set(familyIds));
  }
  const mixed = createLoopSession({seed:40831});
  const seen = new Set(Array.from({length:150},()=>mixed.next({mode:"mixed",difficulty}).mode));
  assert.ok(seen.has("choose") && seen.has("looptype"));
}
console.log(`Decision checks passed: ${generated} generated questions across ${checked.size} reviewed families and ${sessionCases*3*100} session draws.`);

// Compile the same snippets students see and several edge cases that
// demonstrate why an alternative is possible or where its behavior changes.
examples.push(
  ["zero pretest vs one posttest", "int n = 0;\nwhile (n < 0) { n++; }\nSystem.out.println(n);\ndo { n++; } while (n < 0);\nSystem.out.println(n);", ["0","1"]],
  ["basic for can pretest", "int n = 0;\nfor (; n < 3;) { n++; }\nSystem.out.println(n);", ["3"]],
  ["while can count", "int n = 0;\nwhile (n < 3) { n++; }\nSystem.out.println(n);", ["3"]],
  ["array value reassignment", "int[] a = {1, 2};\nfor (int value : a) { value = 9; }\nSystem.out.println(Arrays.toString(a));", ["[1, 2]"]],
  ["array reference reassignment", 'StringBuilder[] a = {new StringBuilder("x")};\nfor (StringBuilder value : a) { value = new StringBuilder("y"); }\nSystem.out.println(Arrays.toString(a));', ["[x]"]],
  ["array empty enhanced for", "int[] a = {};\nfor (int value : a) { System.out.println(value); }", []],
  ["empty iterator removal", "Iterator<Integer> it = new ArrayList<Integer>().iterator();\nwhile (it.hasNext()) { it.next(); it.remove(); }\nSystem.out.println(it.hasNext());", ["false"]],
  ["adjacent reverse index removal", "ArrayList<Integer> a = new ArrayList<>(Arrays.asList(1, 2, 3, 4));\nfor (int i = a.size() - 1; i >= 0; i--) { if (a.get(i) < 3) { a.remove(i); } }\nSystem.out.println(a);", ["[3, 4]"]],
  ["structural change invalidates ArrayList iterator", "List<Integer> a = new ArrayList<>(Arrays.asList(1, 2, 3));\ntry { for (int value : a) { if (value == 1) { a.remove(0); } } } catch (ConcurrentModificationException ex) { System.out.println(ex.getClass().getSimpleName()); }", ["ConcurrentModificationException"]],
  ["sentinel first", 'Scanner in = new Scanner("-1 8");\nint value = in.nextInt();\nint sum = 0;\nwhile (value != -1) { sum += value; value = in.nextInt(); }\nSystem.out.println(sum);', ["0"]],
);
const java = findJava();
assert.ok(java, "Install a JDK or set JAVA_HOME to verify the examples");
const dir = mkdtempSync(join(tmpdir(),"loop-types-jvm-"));
try {
  const methods = examples.map(([,code],i)=>`  static void check${i}() {\n${code}\n  }`).join("\n");
  const calls = examples.map((_,i)=>`    System.out.println("@@CASE ${i}"); check${i}();`).join("\n");
  const file = join(dir,"LoopTypeExamples.java");
  writeFileSync(file,`import java.util.*;\nclass LoopTypeExamples {\n  public static void main(String[] args) {\n${calls}\n  }\n${methods}\n}\n`);
  const stdout = execFileSync(java,[file],{encoding:"utf8",timeout:25000});
  const blocks = stdout.split(/^@@CASE \d+\r?\n/m).slice(1).map(block=>block.replace(/\r?\n$/,"").split(/\r?\n/).filter(Boolean));
  assert.equal(blocks.length,examples.length);
  for (const [i,[name,,output]] of examples.entries()) assert.deepEqual(blocks[i],output,name);
} finally { rmSync(dir,{recursive:true,force:true}); }
console.log(`Loop type JVM: ${examples.length} worked examples and alternative/edge cases passed on ${javaVersion(java).split("\n")[0]}.`);
