import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";
// String Lab intentionally ships its public engine as ordered classic scripts.
const root=fileURLToPath(new URL("../../java-games/string-lab/js/",import.meta.url));
for(const file of ["rng.js","words.js","java-ast.js","evaluator.js","difficulty.js","distractors.js","gen-helpers.js","families-predict.js","families-trace.js","families-index.js","families-expression.js","families-practice.js","generator.js","feedback.js"])
  vm.runInThisContext(readFileSync(root+file,"utf8"),{filename:file});
const require=createRequire(import.meta.url),race="../../wpr-games/raceces/js/";
globalThis.RACECES={};
for(const [key,path] of Object.entries({RNG:"engine/rng.js",Structure:"engine/structure.js",CONTENT:"data/content-bundle.js",Model:"engine/model.js",Feedback:"engine/feedback.js",Identify:"engine/identify.js",Rearrange:"engine/rearrange.js",Missing:"engine/missing.js",COMPOSE_LIBRARY:"data/compose-bundle.js",Compose:"compose/compose.js",Generator:"engine/generator.js",Validator:"engine/validator.js"}))globalThis.RACECES[key]=require(race+path);
// Workplace Readiness is also shipped as classic browser scripts. Load the
// exact published modules and bundles into the test browser-like global.
globalThis.self=globalThis;globalThis.WRG={};
const wprRoot=new URL("../../wpr-games/workplace-readiness/",import.meta.url);
for(const file of ["js/data/schema.js","js/core/rng.js","js/core/expr.js","js/core/text.js","js/core/order.js","js/core/library.js","js/core/feedback.js","js/core/grader.js","js/core/validator.js","js/core/generator.js","js/data/content-bundle.js","js/compose/engine.js","js/compose/check.js","js/compose/selector.js","js/data/compose-bundle.js"])
  vm.runInThisContext(readFileSync(new URL(file,wprRoot),"utf8"),{filename:file});
