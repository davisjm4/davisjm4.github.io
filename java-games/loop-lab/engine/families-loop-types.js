/* Scenario families for selecting a control structure. These are design decisions,
 * so they carry a Java example instead of a fabricated trace program. */
export const LOOP_TYPES = {
  for: "Basic for loop",
  while: "while loop",
  do: "do-while loop",
  each: "Enhanced for loop",
};

const family = (id, level, name, best, principle, alternatives, generate) => ({
  id, level, name, best, principle, alternatives, generate,
});
const block = (...lines) => lines.join("\n");
const list = (rng) => [rng.int(1, 8), rng.int(1, 8), rng.int(1, 8)];
const array = (values) => "{" + values.join(", ") + "}";
const total = (values) => values.reduce((a, b) => a + b, 0);
const noun = (rng) => rng.pick(["scores", "weights", "readings", "lengths", "prices", "distances"]);
const action = (rng) => rng.pick(["calibrate a sensor", "check a motor", "sample a signal", "record a measurement", "test a button", "check a connection"]);

export const loopTypeFamilies = [
  family("count-with-header", "beginner", "Counted repetition", "for",
    "Keep a regular counter's initialization, test, and update together when the counter controls repetition.",
    {
      while: "A while loop can count too, but it would put the counter setup and increment outside its header.",
      do: "A do-while loop can count positive repetitions, but it tests after the work and does not group the three counter operations.",
      each: "Enhanced for needs an array or Iterable to visit. Creating one just to count would add unnecessary work.",
    }, (r) => {
      const n = r.int(3, 22);
      return {
        scenario: `Run a check ${n} times to ${action(r)}. Use a counter, with its declaration, limit test, and increment together in the loop header.`,
        why: "A basic for loop puts all three counter operations together and keeps the counter local to the loop.",
        example: block(`for (int count = 0; count < ${n}; count++) {`, "    System.out.println(count);", "}"),
        output: Array.from({length:n}, (_, i) => String(i)),
      };
    }),
  family("check-before-work", "beginner", "Test before doing work", "while",
    "Use a pretest when the starting state may require zero repetitions.",
    {
      for: "A basic for loop with empty setup and update sections can pretest too. A while header expresses the single guard more directly.",
      do: "A do-while body would run once before checking the state. An extra guard outside the loop could prevent that first run.",
      each: "An enhanced for loop follows the elements of an array or Iterable. Here the changing state controls repetition.",
    }, (r) => {
      const start = r.int(0, 14), limit = r.int(4, 12), task = action(r);
      return {
        scenario: `A robot will ${task} only while its stored level is below ${limit}. The check itself updates the level. It starts at ${start} this time, but it may already meet the limit. Keep only the guard in the loop header, with no empty header sections.`,
        why: "A while loop checks the level before work. It can run zero times and does not need counter sections.",
        example: block(`int level = ${start};`, `while (level < ${limit}) {`, "    System.out.println(level);", "    level += 2; // The check updates the level.", "}"),
        output: Array.from({length:Math.max(0, Math.ceil((limit-start)/2))}, (_, i) => String(start+2*i)),
      };
    }),
  family("first-attempt", "beginner", "Run before testing", "do",
    "Use a posttest when the body must produce the first state the condition can inspect.",
    {
      for: "A basic for loop could use a break or a first-run flag, but it would not express the test after the body.",
      while: "A while loop could work with a first-run flag or an attempt before the loop. Both add work outside the requested posttest design.",
      each: "Enhanced for needs a source to traverse. No array or Iterable controls these attempts.",
    }, (r) => {
      const n = r.int(1, 14);
      return {
        scenario: `A calibration routine must ${action(r)} at least once. Each attempt returns a fresh status. In a sample run, the routine succeeds after ${n} ${n === 1 ? "attempt" : "attempts"}, but the number is unknown beforehand. Put the first attempt and all retries in one body, with the retry test below it.`,
        why: "A do-while loop runs the attempt before testing its status. A successful first attempt stops the repetition after one run.",
        example: block("int attempts = 0;", "boolean passed;", "do {", `    passed = ++attempts >= ${n}; // Simulate a calibration result.`, "} while (!passed);", "System.out.println(attempts);"),
        output:[String(n)],
      };
    }),
  family("array-values", "beginner", "Read array elements directly", "each",
    "When the job is to read every element and its position does not matter, iterate directly over the elements.",
    {
      for: "An indexed for loop works, but it introduces an index and subscript the task does not need.",
      while: "A while loop can advance an index manually, but that adds a counter and a manual bound test.",
      do: "An indexed do-while loop would need a guard for an empty array and an explicit index.",
    }, (r) => {
      const name = noun(r), values = list(r);
      return {
        scenario: `Display every value in the int array ${name}, in order. A sample array is ${array(values)}. The array could be empty. Use the values directly, without a separate index or explicit bound test.`,
        why: "Enhanced for binds each value in array order and naturally skips the body for an empty array.",
        example: block(`int[] ${name} = ${array(values)};`, `for (int value : ${name}) {`, "    System.out.println(value);", "}"),
        output:values.map(String),
      };
    }),
  family("report-index", "beginner", "Report element positions", "for",
    "Use indexed traversal when a position is part of the result.",
    {
      while: "A while loop can report positions, but it would put the index declaration and update outside the loop header.",
      do: "An indexed do-while loop needs a separate guard for an empty array and would update the index in the body.",
      each: "Enhanced for supplies the value, not the index. A separate counter could recover it, but would not group the index operations in the header.",
    }, (r) => {
      const name = noun(r), values = list(r);
      return {
        scenario: `Display both the zero-based index and value of every element in ${name}, for example ${array(values)}. Values may repeat. Keep the index declaration, length check, and increment together.`,
        why: "A basic indexed for loop supplies the actual position even when two elements have the same value.",
        example:block(`int[] ${name} = ${array(values)};`, `for (int i = 0; i < ${name}.length; i++) {`, `    System.out.println(i + ": " + ${name}[i]);`, "}"),
        output:values.map((v,i)=>`${i}: ${v}`),
      };
    }),

  family("primed-sentinel", "intermediate", "Check a sentinel before processing", "while",
    "Read or obtain the first value, then test it before processing. The sentinel is a signal and must never enter the calculation.",
    {
      for: "A basic for loop could put the first read and next read in its header, but the first value is already available and this design keeps reads in the body.",
      do: "A do-while loop would enter its body with a possible sentinel. You would need a separate guard or break before processing.",
      each: "Enhanced for can scan an array with a break. This scenario reads from a scanner and asks for a value test in the loop header.",
    }, (r) => {
      const stop = -r.int(1, 12), values = list(r), empty = r.chance(.25), input = empty ? [stop, ...values] : [...values, stop, 99];
      return {
        scenario: `Read integer ${noun(r)} from a Scanner. The first value is already read. Stop at ${stop}, which is guaranteed to occur and must not be added. The sentinel could be the first input. Sample tokens: ${input.join(" ")}. Put only the sentinel check in the header, with no empty header sections, and read the next token after processing a value.`,
        why: "A while loop checks the already-read value before adding it. The sentinel can end the loop before any data is processed.",
        example:block(`Scanner input = new Scanner("${input.join(" ")}");`, "int value = input.nextInt();", "int sum = 0;", `while (value != ${stop}) {`, "    sum += value;", "    value = input.nextInt();", "}", "System.out.println(sum);"),
        output:[String(empty ? 0 : total(values))],
      };
    }),
  family("validation-read-first", "intermediate", "Validate after the first read", "do",
    "Place the test after the body when the first value does not exist until the body reads it.",
    {
      for: "A basic for loop could read a value in its initialization section, but the prompt and read would then be split between initialization and updates.",
      while: "A while loop can use a priming read or a flag. That adds a separate first-read path or an artificial starting value.",
      each: "An enhanced for could examine prepared candidates, but user input is obtained on demand and the requested test comes after the read.",
    }, (r) => {
      const max = r.int(4, 16), valid = r.int(1, max), input = r.chance(.25) ? [valid] : [max+1, 0, valid];
      return {
        scenario:`Prompt for a selection from 1 to ${max}. No selection exists yet. Read one integer each time you display the prompt. Sample inputs are ${input.join(", ")}. Keep the prompt and read in one place, then test the result below the body.`,
        why:"A do-while loop gets the first selection before evaluating its validity and stops as soon as it is in range.",
        example:block(`Scanner input = new Scanner("${input.join(" ")}");`, "int choice;", "do {", '    System.out.println("Choose a number");', "    choice = input.nextInt();", `} while (choice < 1 || choice > ${max});`, "System.out.println(choice);"),
        output:[...input.map(()=>"Choose a number"),String(valid)],
      };
    }),
  family("validate-existing-choice", "intermediate", "Skip retries for an already valid value", "while",
    "If a value is already available, check it before requesting a replacement.",
    {
      for:"A basic for loop with only a condition works, but the empty setup and update sections add clutter to the requested guard.",
      do:"A do-while would request a replacement even when the starting value is valid. An outer check could avoid that extra read.",
      each:"Enhanced for could search a prepared collection of choices, but this program asks for a new value only if the current one fails.",
    }, (r) => {
      const max=r.int(4,16), valid=r.int(1,max), start=r.chance(.5)?valid:r.pick([0,max+1]), retries=start===valid?0:r.int(1,4);
      const input=[...Array(retries ? retries-1 : 0).fill(max+1),valid];
      return {
        scenario:`A selection is already stored. If it is outside 1 through ${max}, read a replacement and check again. The starting value is ${start} in this example, and available replacements are ${input.join(", ")}. A valid starting value must trigger no read. Keep only the validity test in the header, with no empty sections.`,
        why:"A while loop validates the existing selection before reading anything. Each invalid selection leads to one replacement.",
        example:block(`Scanner input = new Scanner("${input.join(" ")}");`, `int choice = ${start};`, "int reads = 0;", `while (choice < 1 || choice > ${max}) {`, "    choice = input.nextInt();", "    reads++;", "}", 'System.out.println(choice + ":" + reads);'),
        output:[`${valid}:${retries}`],
      };
    }),
  family("menu-after-selection", "intermediate", "Repeat a menu until exit", "do",
    "When a menu must appear once, put display and read in one body and use the exit choice as the posttest.",
    {
      for: "A basic for loop with break could run the menu, but it would put the exit test inside the body.",
      while: "A while loop with a flag or a sentinel dummy value can work. Both require state before the first menu is shown.",
      each: "Enhanced for would traverse a preexisting collection of commands. The real menu reads one choice at a time.",
    }, (r) => {
      const exit = r.pick([0, 8, 9]), count = r.int(0, 7);
      const input = [...Array.from({length:count},()=>r.int(1, 3)),exit];
      return {
        scenario:`Show a menu with actions 1–3 and exit option ${exit}. The exit choice may be entered on the first display. A sample run receives ${input.join(", ")}. Put display, read, and handling of non-exit choices in one body. Put the exit test at the end without a dummy initial choice.`,
        why:"A do-while loop displays the menu before it can know the first choice. The if statement skips action handling when the choice is exit.",
        example:block(`Scanner input = new Scanner("${input.join(" ")}");`, "int choice;", "do {", '    System.out.println("Menu");', "    choice = input.nextInt();", `    if (choice != ${exit}) {`, "        System.out.println(choice);", "    }", `} while (choice != ${exit});`),
        output:input.flatMap(v=>v===exit?["Menu"]:["Menu",String(v)]),
      };
    }),
  family("indexed-stride", "intermediate", "Select an indexed subset", "for",
    "Put the starting index, bound, and stride in the header when the sequence of positions is known.",
    {
      while: "A while loop can use the same positions, but setup and stride are separate from its header.",
      do: "A do-while loop needs an extra guard if the offset is outside a short array, and does not group the index operations.",
      each: "Enhanced for would visit every element. To keep only the requested positions, it would need an additional index or a separate slice.",
    }, (r) => {
      const name=noun(r), offset=r.int(1,3), step=r.int(2,4), values=[...list(r),...list(r),...list(r)];
      return {
        scenario:`Sample the ${name} array starting at index ${offset} and advancing by ${step} positions. Example values: ${array(values)}. Some arrays are too short to reach the offset. Group the start, bounds test, and stride together.`,
        why:"A basic for loop directly describes the indexed stride and checks the length before the first access.",
        example:block(`int[] ${name} = ${array(values)};`, `for (int i = ${offset}; i < ${name}.length; i += ${step}) {`, `    System.out.println(${name}[i]);`, "}"),
        output:values.filter((_,i)=>i>=offset && (i-offset)%step===0).map(String),
      };
    }),
  family("iterable-without-index", "intermediate", "Traverse an Iterable", "each",
    "Use an element loop when an Iterable provides the traversal and position is irrelevant.",
    {
      for: "A basic for loop could use an explicit Iterator. This design does not need the additional iterator variable.",
      while: "A while loop over an explicit Iterator could work, but it would require obtaining and advancing the Iterator yourself.",
      do: "An iterator-based do-while loop needs an extra guard before the first next call to handle an empty input.",
    }, (r) => {
      const name = noun(r), values = list(r), cutoff = r.int(2, 7);
      return {
        scenario:`You receive ${name} as an Iterable<Integer> whose concrete type is unknown. Print the values at or above ${cutoff}; example values in iteration order are ${array(values)}. Use direct element traversal without an index or an explicit Iterator variable.`,
        why:"Enhanced for accepts an Iterable and gets each element in its iteration order. The if statement filters values without accessing positions.",
        example:block(`Iterable<Integer> ${name} = Arrays.asList(${values.join(", ")});`, `for (int value : ${name}) {`, `    if (value >= ${cutoff}) {`, "        System.out.println(value);", "    }", "}"),
        output:values.filter(v=>v>=cutoff).map(String),
      };
    }),
  family("element-search-break", "intermediate", "Find a value and stop", "each",
    "Early exit is compatible with enhanced for. Decide whether the search needs an element or its position.",
    {
      for:"An indexed for loop with break can work, but it exposes a position even though the task returns only a value.",
      while:"A while loop can use an index or an Iterator. Both add traversal state that this search does not need.",
      do:"A do-while loop with break can work after guarding empty input, but the extra check and traversal state are unnecessary.",
    }, (r) => {
      const name=noun(r), cutoff=r.int(2, 9), values=[...list(r),...list(r)], answer=values.find(v=>v>=cutoff)??-1;
      return {
        scenario:`Find the first value in ${name} at or above ${cutoff}. For example, the input might be ${array(values)}. Return the value, not its position, and stop as soon as it is found. Keep traversal free of separate position or iterator variables.`,
        why:"Enhanced for visits values directly. A break after a match ends the search early, and an empty array runs zero times.",
        example:block(`int[] ${name} = ${array(values)};`, "int found = -1;", `for (int value : ${name}) {`, `    if (value >= ${cutoff}) {`, "        found = value;", "        break;", "    }", "}", "System.out.println(found);"),
        output:[String(answer)],
      };
    }),

  family("replace-array-slots", "advanced", "Replace array elements", "for",
    "Assign to an array slot to replace its element. Assigning to an enhanced-for variable only changes the local variable.",
    {
      while:"An indexed while loop can replace slots, but index setup and update are separate rather than together in the header.",
      do:"An indexed do-while loop could replace slots, but it needs an extra guard for empty arrays and a separate index update.",
      each:"Assigning to the enhanced-for variable does not write back to the array. You could use an extra index, but that would duplicate traversal state.",
    }, (r) => {
      const name=noun(r), values=[...list(r),...list(r)], floor=r.int(3,9);
      return {
        scenario:`Update ${name} in place, replacing values below ${floor} with ${floor}. Input may be empty; a sample is ${array(values)}. Use the same array, write directly to its slots, and keep the index declaration, bounds test, and update together.`,
        why:"A basic for loop gives the index needed for an assignment to the array slot. The pretest protects empty arrays.",
        example:block(`int[] ${name} = ${array(values)};`, `for (int i = 0; i < ${name}.length; i++) {`, `    if (${name}[i] < ${floor}) {`, `        ${name}[i] = ${floor};`, "    }", "}", `System.out.println(Arrays.toString(${name}));`),
        output:["["+values.map(v=>Math.max(v,floor)).join(", ")+"]"],
      };
    }),
  family("mutate-referenced-object", "advanced", "Mutate objects reached by reference", "each",
    "Distinguish mutating a referenced object from reassigning the local variable that holds its reference.",
    {
      for:"An indexed for loop could call the same methods on the objects, but the design has no use for their positions.",
      while:"A while loop with an index or Iterator could do the same mutation with additional traversal state.",
      do:"An indexed do-while loop could mutate objects with a separate empty-array guard. The guard and index are unnecessary here.",
    }, (r) => {
      const initial = [r.int(1, 8), r.int(1, 8), r.int(1, 8)], suffix = r.pick(["!", ".", "?", "+", "*"]), threshold = r.int(2,8);
      const pieces=initial.map(n=>"x".repeat(n));
      return {
        scenario:`Each element of a StringBuilder[] refers to an existing object. Append "${suffix}" to builders with length at least ${threshold}. Example lengths: ${initial.join(", ")}. Preserve the original references, work for an empty array, and avoid an index or explicit iterator.`,
        why:"Enhanced for gives a local copy of each reference. Calling append mutates the existing object through that reference. Assigning a new StringBuilder to the local variable would not replace the array element.",
        example:block(`StringBuilder[] labels = {`, ...pieces.map((v,i)=>`    new StringBuilder("${v}")${i===pieces.length-1?"":","}`), "};", "for (StringBuilder label : labels) {", `    if (label.length() >= ${threshold}) {`, `        label.append("${suffix}");`, "    }", "}", "System.out.println(Arrays.toString(labels));"),
        output:["["+pieces.map(v=>v.length>=threshold?v+suffix:v).join(", ")+"]"],
      };
    }),
  family("iterator-removal", "advanced", "Remove through an Iterator", "while",
    "When removing the current element during traversal of a mutable ArrayList, use the active Iterator's remove method after next.",
    {
      for:"A basic for loop can use the Iterator, but without setup or update in the header it would use empty sections. An indexed loop would not use the provided Iterator.",
      do:"A do-while loop could use the Iterator after a separate hasNext guard. Without that guard it would call next on an empty input.",
      each:"Enhanced for over this list hides the Iterator, so the body cannot call its remove. Calling list.remove directly during that traversal can invalidate the Iterator.",
    }, (r) => {
      const name=noun(r), cutoff=r.int(2,7), values=[...list(r),...list(r)];
      return {
        scenario:`Remove values below ${cutoff} from a mutable ArrayList<Integer> named ${name}. The list may be empty; sample values are ${array(values)}. An Iterator for the list already exists. Remove through that same Iterator. Put only its guard in the loop header, with no empty header sections.`,
        why:"A while loop checks hasNext before next. The active ArrayList Iterator can remove the element just returned, then continue safely.",
        example:block(`List<Integer> ${name} = new ArrayList<>(Arrays.asList(${values.join(", ")}));`, `Iterator<Integer> iter = ${name}.iterator();`, "while (iter.hasNext()) {", `    if (iter.next() < ${cutoff}) {`, "        iter.remove();", "    }", "}", `System.out.println(${name});`),
        output:["["+values.filter(v=>v>=cutoff).join(", ")+"]"],
      };
    }),
  family("reverse-index-removal", "advanced", "Remove without skipping shifted elements", "for",
    "When deleting by index, moving backward leaves the unvisited lower indexes intact.",
    {
      while:"A backward while loop can remove safely, but the requested initialization, bounds check, and decrement are not all in its header.",
      do:"A backward do-while loop needs a separate empty-list guard and an explicit update inside its body.",
      each:"Enhanced for hides the position. Removing directly from the ArrayList while its Iterator is active can invalidate the traversal. An explicit Iterator can support removal in another design.",
    }, (r) => {
      const name=noun(r), cutoff=r.int(2,7), values=[r.int(0,cutoff-1),r.int(0,cutoff-1),...list(r),...list(r)];
      return {
        scenario:`Remove entries below ${cutoff} from an ArrayList<Integer> named ${name}. For example: ${array(values)}. Adjacent entries may both need removal. Use remove(index), visit positions from the end toward the start, and group initialization, bounds check, and decrement together.`,
        why:"A backward basic for loop gives remove(int) the index to delete. Positions below a deleted index do not shift, so consecutive matches are still visited.",
        example:block(`ArrayList<Integer> ${name} = new ArrayList<>(Arrays.asList(${values.join(", ")}));`, `for (int i = ${name}.size() - 1; i >= 0; i--) {`, `    if (${name}.get(i) < ${cutoff}) {`, `        ${name}.remove(i);`, "    }", "}", `System.out.println(${name});`),
        output:["["+values.filter(v=>v>=cutoff).join(", ")+"]"],
      };
    }),
  family("bounded-validation", "advanced", "Validate with a retry cap", "do",
    "For a required first attempt and a bounded retry policy, test validity and remaining attempts together after each read.",
    {
      for:"A counted for loop can enforce the cap and break on valid input. That splits the two exit conditions between its header and body.",
      while:"A while loop can test both conditions after priming a read or adding a first-pass state. The request asks for a single body that obtains the first state.",
      each:"An enhanced for loop can scan a batch of existing values. Live attempts are read on demand, and the loop must also enforce the cap.",
    }, (r) => {
      const cap=r.int(2,6), max=r.int(4,12), goodAt=r.int(0,cap+1), values=Array.from({length:cap+1},(_,i)=>i===goodAt?r.int(1,max):max+1);
      const attempts=Math.min(goodAt+1,cap);
      return {
        scenario:`Read a choice from 1 to ${max}, with at most ${cap} attempts. There is no value before the first read. Sample inputs: ${values.join(", ")}. Put all reads in one body and express both reasons to stop in a single test after the body, without break.`,
        why:"A do-while loop guarantees the first read. It repeats only if the choice is invalid and attempts remain, so either a valid choice or the cap stops it.",
        example:block(`Scanner input = new Scanner("${values.join(" ")}");`, "int attempts = 0;", "int choice;", "do {", "    choice = input.nextInt();", "    attempts++;", `} while ((choice < 1 || choice > ${max}) && attempts < ${cap});`, `System.out.println(attempts + ":" + (choice >= 1 && choice <= ${max}));`),
        output:[`${attempts}:${goodAt<cap}`],
      };
    }),
  family("guard-with-dependent-progress", "advanced", "Check bounds and dependent progress", "while",
    "Put the bounds check before an indexed access in a short-circuit guard. Keep a state-dependent advance where its inputs are available.",
    {
      for:"A basic for loop can use a compound guard with an empty update section. That adds header sections the design explicitly avoids.",
      do:"A do-while loop would need a separate initial guard before reading the array. Otherwise empty input or an initial stop value enters the body.",
      each:"Enhanced for advances one element at a time. This walk jumps to an index determined by the current value.",
    }, (r) => {
      const name = noun(r), values = r.chance(.15) ? [] : Array.from({length:r.int(3,9)},()=>r.int(0,3));
      const path=[];
      for(let i=0;i<values.length && values[i]>0;i+=values[i])path.push(String(i));
      return {
        scenario:`Start at index 0 in ${name}. A positive value says how far to jump. Zero means stop before using that position. Stop also if the index reaches or passes the length. Sample array: ${array(values)}. Put both safety checks before the body, with no empty header sections, and update the index in the body after using the value.`,
        why:"A while loop can check the bound before checking the array value. Java's && skips the value access when the index is out of range. The positive jump makes progress.",
        example:block(`int[] ${name} = ${array(values)};`, "int i = 0;", `while (i < ${name}.length && ${name}[i] > 0) {`, "    System.out.println(i);", `    i += ${name}[i];`, "}"),
        output:path,
      };
    }),
];
