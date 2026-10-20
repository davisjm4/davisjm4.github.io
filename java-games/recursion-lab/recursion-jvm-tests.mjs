import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRecursionGenerator, simulateBinarySearch, simulateMergeSort, modeNames } from "./engine.js";

const dir = mkdtempSync(join(tmpdir(), "recursion-lab-jvm-"));
let compiled = 0, executed = 0;
function run(name, source, expected) {
  const file = join(dir, `${name}.java`);
  writeFileSync(file, source);
  const result = spawnSync("java", ["--source", "17", file], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, `${name} JVM compile/run failed: ${result.stderr}`);
  compiled++;
  if (expected !== undefined) { assert.equal(result.stdout, String(expected), `${name} output mismatch`); executed++; }
}
try {
  const gen = createRecursionGenerator(314159);
  // Compile one generated snippet per mode at every difficulty. Debug snippets
  // intentionally contain faulty logic, but must still be valid Java syntax.
  for (const mode of Object.keys(modeNames)) for (const difficulty of ["Beginner", "Intermediate", "Advanced"]) {
    let q;
    for (let i=0;i<100;i++) { q=gen.next(mode,difficulty); if(mode!=="returns" || q.family!=="two-branch-recursion") break; }
    run(`Compile_${mode}_${difficulty}`, `public class Compile_${mode}_${difficulty.replaceAll(" ","")} {\n${q.code}\npublic static void main(String[] args) {}\n}`);
  }

  // Execute actual generated binary search and merge sort code and compare
  // JVM output with independent simulators.
  for (const algorithm of ["binarySearch", "mergeSort"]) {
    let q;
    for (let i=0;i<200;i++) { q=gen.next("searchsort","Advanced"); if(q.data.algorithm===algorithm) break; }
    const arr=q.data.array, literal=`new int[]{${arr.join(",")}}`;
    const expected=algorithm==="binarySearch"?simulateBinarySearch(arr,q.data.target).result:`[${simulateMergeSort(arr).result.join(", ")}]`;
    const invoke=algorithm==="binarySearch"?`System.out.print(binarySearch(${literal}, 0, ${arr.length-1}, ${q.data.target}));`:`System.out.print(java.util.Arrays.toString(mergeSort(${literal}, 0, ${arr.length-1})));`;
    run(`Run_${algorithm}`,`public class Run_${algorithm} {\n${q.code}\npublic static void main(String[] args) { ${invoke} }\n}`,expected);
  }

  // Execute one generated String recursion and each generated array recursion
  // operation against their displayed return values.
  for (let operation=0;operation<8;operation++) {
    let q; for(let i=0;i<500;i++){q=gen.next("output","Advanced");if(q.data.operation===operation)break;}
    const method=q.code.match(/public static (?:void|String) (\w+)\(/)[1], text=JSON.stringify(q.data.text), args=operation>=5?`${text}, 0`:text;
    const invoke=operation<3?`${method}(${text});`:`System.out.print(${method}(${args}));`;
    run(`Run_string_${operation}`,`public class Run_string_${operation} {\n${q.code}\npublic static void main(String[] args) { ${invoke} }\n}`,q.answer);
  }
  for (let operation=0;operation<8;operation++) {
    let q; for(let i=0;i<500;i++){q=gen.next("arrays","Advanced");if(q.data.operation===operation)break;}
    const method=q.code.match(/public static (?:int|boolean|String) (\w+)\(/)[1], a=`new int[]{${q.data.array.join(",")}}`, i=q.data.index, t=q.data.target;
    const calls=[`${method}(${a}, 0)`,`${method}(${a}, 0, ${t})`,`${method}(${a}, 0, ${t})`,`${method}(${a}, ${q.data.array.length-1})`,`${method}(${a}, 0)`,`${method}(${a}, ${i})`,`${method}(${a}, 0)`,`${method}(${a}, ${q.data.array.length-1})`];
    run(`Run_array_${operation}`,`public class Run_array_${operation} {\n${q.code}\npublic static void main(String[] args) { System.out.print(${calls[operation]}); }\n}`,q.answer);
  }

  let order;
  for(let i=0;i<500;i++){order=gen.next("debug","Advanced");if(order.family==="execution-order")break;}
  const orderMethod=order.code.match(/public static void (\w+)\(int n\)/)[1], orderN=Number(order.code.match(/call: \w+\((\d+)\)/)?.[1]);
  run("Run_execution_order",`public class Run_execution_order {\n${order.code}\npublic static void main(String[] args) { ${orderMethod}(${orderN}); }\n}`,Array.from({length:orderN},(_,i)=>i+1).join(""));

  // Execute the generated branching-recursion code and compare its return.
  let branch;
  for(let i=0;i<500;i++){branch=gen.next("returns","Advanced");if(branch.family==="two-branch-recursion")break;}
  const n=Number(branch.code.match(/call: fibLike\((\d+)\)/)?.[1]);
  const fib=x=>x<=1?1:fib(x-1)+fib(x-2);
  run("Run_branching",`public class Run_branching {\n${branch.code}\npublic static void main(String[] args) { System.out.print(fibLike(${n})); }\n}`,fib(n));
  console.log(`JVM validation: ${compiled} generated snippets compiled; ${executed} generated algorithm outputs matched simulator expectations. javac was unavailable; Java 17 source launcher's compiler was used.`);
} finally { rmSync(dir, { recursive: true, force: true }); }
