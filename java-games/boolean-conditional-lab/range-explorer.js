const PREF_KEY = "javaBoolean.rangeExplorer.v1";
const MAX_RANGES = 6;
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = n => Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(10)));
const validNumber = v => v !== "" && Number.isFinite(Number(v));
const paren = s => `(${s})`;

export function normalizeRange(range, index = 0) {
  return { id: String(range.id ?? index + 1), lo: Number(range.lo), hi: Number(range.hi), loInclusive: Boolean(range.loInclusive), hiInclusive: Boolean(range.hiInclusive) };
}
export function validateRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length < 1 || ranges.length > MAX_RANGES) return { valid:false, message:`Choose between 1 and ${MAX_RANGES} ranges.` };
  for (let i=0; i<ranges.length; i++) {
    const r = ranges[i];
    if (!Number.isFinite(Number(r.lo)) || !Number.isFinite(Number(r.hi))) return { valid:false, message:`Range ${i+1}: enter a valid number for both boundaries.` };
    if (!(Number(r.lo) < Number(r.hi))) return { valid:false, message:`Range ${i+1}: the lower boundary must be less than the upper boundary.` };
  }
  return { valid:true, message:"" };
}
function intervalExpr(r) { return `x ${r.loInclusive ? ">=" : ">"} ${num(r.lo)} && x ${r.hiInclusive ? "<=" : "<"} ${num(r.hi)}`; }
export function buildRangeExpression(ranges, sense = "inside", expanded = false) {
  const normalized = ranges.map(normalizeRange); const check = validateRanges(normalized); if (!check.valid) throw new Error(check.message);
  const inside = normalized.map(intervalExpr);
  if (sense === "inside") return inside.length === 1 ? inside[0] : inside.map(paren).join(" || ");
  if (expanded) {
    const outsideEach = normalized.map(r => `x ${r.loInclusive ? "<" : "<="} ${num(r.lo)} || x ${r.hiInclusive ? ">" : ">="} ${num(r.hi)}`);
    return outsideEach.length === 1 ? outsideEach[0] : outsideEach.map(paren).join(" && ");
  }
  return normalized.length === 1 ? `!${paren(inside[0])}` : `!${paren(inside.map(paren).join(" || "))}`;
}
export function evaluateExpression(ranges, x, sense = "inside") {
  const membership = ranges.map(raw => { const r=normalizeRange(raw); return (r.loInclusive ? x >= r.lo : x > r.lo) && (r.hiInclusive ? x <= r.hi : x < r.hi); });
  const inside = membership.some(Boolean); return { ranges:membership, inside, result:sense === "inside" ? inside : !inside };
}
export function evaluateRangeComparisons(ranges,x) { return ranges.map(raw=>{const r=normalizeRange(raw);return [{expression:`x ${r.loInclusive?">=":">"} ${num(r.lo)}`,result:r.loInclusive?x>=r.lo:x>r.lo},{expression:`x ${r.hiInclusive?"<=":"<"} ${num(r.hi)}`,result:r.hiInclusive?x<=r.hi:x<r.hi}];}); }
function pointRegionExpression(ranges, x) {
  const boundaries = [...new Set(ranges.flatMap(r => [Number(r.lo), Number(r.hi)]))].sort((a,b)=>a-b);
  if (boundaries.includes(x)) return `(x >= ${num(x)} && x <= ${num(x)})`;
  let left = null, right = null; for (const b of boundaries) { if (b < x) left=b; if (b > x) { right=b; break; } }
  if (left === null) return `x < ${num(right)}`;
  if (right === null) return `x > ${num(left)}`;
  return `(x > ${num(left)} && x < ${num(right)})`;
}
export function adaptiveExpression(ranges, x, target = true) {
  const check=validateRanges(ranges); if (!check.valid) throw new Error(check.message);
  const base=pointRegionExpression(ranges.map(normalizeRange), Number(x));
  return { expression:target ? base : `!${paren(base)}`, positionExpression:base, result:Boolean(target), region:describeRegion(ranges,Number(x)) };
}
export function describeRegion(ranges, x) {
  const sorted=[...new Set(ranges.flatMap(r=>[Number(r.lo),Number(r.hi)]))].sort((a,b)=>a-b);
  if(sorted.includes(x)) return `exactly at boundary ${num(x)}`;
  const before=sorted.filter(v=>v<x).at(-1), after=sorted.find(v=>v>x);
  if(before===undefined) return `below ${num(after)}`;
  if(after===undefined) return `above ${num(before)}`;
  return `between ${num(before)} and ${num(after)}`;
}
export function getScale(ranges, includeX = null) {
  const vals=[...ranges.flatMap(r=>[Number(r.lo),Number(r.hi)]),...(Number.isFinite(includeX)?[includeX]:[])]; let min=Math.min(...vals), max=Math.max(...vals);
  let span=max-min; if (!Number.isFinite(span)||span<=0) span=Math.max(1,Math.abs(min)*.1);
  let pad=Math.max(span*.2,Math.abs(min)*.02,Math.abs(max)*.02,Math.max(span,1)*.02);
  min-=pad; max+=pad; if (!(min<max)) {min-=1;max+=1;} return {min,max,step:span > 100 ? 1 : span > 20 ? .5 : .1};
}
function mergedIntervals(ranges) {
  const sorted=ranges.map(normalizeRange).sort((a,b)=>a.lo-b.lo||Number(b.loInclusive)-Number(a.loInclusive)); const out=[];
  for(const r of sorted){const last=out.at(-1);if(!last){out.push({...r});continue;}const touches=r.lo<last.hi||(r.lo===last.hi&&(last.hiInclusive||r.loInclusive));if(!touches){out.push({...r});continue;}if(r.hi>last.hi){last.hi=r.hi;last.hiInclusive=r.hiInclusive;}else if(r.hi===last.hi)last.hiInclusive=last.hiInclusive||r.hiInclusive;}
  return out;
}
function complementIntervals(ranges,scale) {
  const merged=mergedIntervals(ranges), gaps=[];let cursor=scale.min,cursorInclusive=true;
  for(const r of merged){if(r.hi<scale.min||r.lo>scale.max)continue;const lo=Math.max(scale.min,r.lo),hi=Math.min(scale.max,r.hi),gapEndInclusive=lo===r.lo?!r.loInclusive:true;if(cursor<lo||(cursor===lo&&cursorInclusive&&gapEndInclusive))gaps.push({lo:cursor,hi:lo,loInclusive:cursorInclusive,hiInclusive:gapEndInclusive});cursor=hi;cursorInclusive=hi===r.hi?!r.hiInclusive:false;}
  if(cursor<scale.max||(cursor===scale.max&&cursorInclusive))gaps.push({lo:cursor,hi:scale.max,loInclusive:cursorInclusive,hiInclusive:true});return gaps.filter(g=>g.lo<g.hi||(g.lo===g.hi&&g.loInclusive&&g.hiInclusive));
}
function currentCell(ranges,x,scale){const b=[...new Set(ranges.flatMap(r=>[Number(r.lo),Number(r.hi)]))].sort((a,c)=>a-c);if(b.includes(x))return [{lo:x,hi:x,loInclusive:true,hiInclusive:true}];const lo=b.filter(v=>v<x).at(-1),hi=b.find(v=>v>x);return [{lo:lo===undefined?scale.min:lo,hi:hi===undefined?scale.max:hi,loInclusive:lo===undefined?true:false,hiInclusive:hi===undefined?true:false}];}
function activeIntervals(state,scale){if(state.mode==="fixed")return state.sense==="inside"?state.ranges:complementIntervals(state.ranges,scale);const cell=currentCell(state.ranges,state.x,scale);return state.target?cell:complementIntervals(cell,scale);}
export function getActiveTrueSegments(ranges, {mode="fixed",sense="inside",x=0,target=true}={}, scale=getScale(ranges,x)) { return activeIntervals({ranges:ranges.map(normalizeRange),mode,sense,x,target},scale); }
function loadPrefs() { try { const p=JSON.parse(localStorage.getItem(PREF_KEY)||"null"); if(!p||!Array.isArray(p.ranges)||!validateRanges(p.ranges).valid) return null; return p; } catch { return null; } }
function savePrefs(state) { try { localStorage.setItem(PREF_KEY,JSON.stringify({mode:state.mode,sense:state.sense,target:state.target,x:state.x,step:state.step,ranges:state.ranges})); } catch {} }
function tickStep(min,max) { const raw=(max-min)/8, pow=10**Math.floor(Math.log10(raw||1)), q=raw/pow; return (q<2?1:q<5?2:5)*pow; }
function svgNumberLine(state, scale) {
  const W=760, left=48, right=712, y=70, width=right-left, px=x=>left+(x-scale.min)/(scale.max-scale.min)*width;
  const ticks=[]; const step=tickStep(scale.min,scale.max); for(let n=Math.ceil(scale.min/step)*step;n<=scale.max+step*1e-8&&ticks.length<30;n+=step) ticks.push(Number(n.toPrecision(8)));
  const ranges=state.ranges.map((r,i)=>`<line x1="${px(r.lo)}" y1="${y}" x2="${px(r.hi)}" y2="${y}" stroke="${i%2?"#c4a4ff":"#79d3c5"}" stroke-width="12" stroke-opacity=".38"/><circle cx="${px(r.lo)}" cy="${y}" r="7" fill="${r.loInclusive?(i%2?"#c4a4ff":"#79d3c5") :"#18252d"}" stroke="${i%2?"#c4a4ff":"#79d3c5"}" stroke-width="3"/><circle cx="${px(r.hi)}" cy="${y}" r="7" fill="${r.hiInclusive?(i%2?"#c4a4ff":"#79d3c5") :"#18252d"}" stroke="${i%2?"#c4a4ff":"#79d3c5"}" stroke-width="3"/>`).join("");
  const active=activeIntervals(state,scale).map(g=>g.lo===g.hi?`<circle cx="${px(g.lo)}" cy="118" r="7" fill="#8ce0a5"/>`:`<line x1="${px(g.lo)}" y1="118" x2="${px(g.hi)}" y2="118" stroke="#8ce0a5" stroke-width="9" stroke-linecap="butt"/>`).join("");
  return `<svg class="rx-line" viewBox="0 0 ${W} 150" role="img" aria-label="Number line from ${esc(num(scale.min))} to ${esc(num(scale.max))}. Configured intervals are shown above; green shows values where the displayed expression is true. Filled endpoints are included and open endpoints are excluded." data-line><line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#82929a" stroke-width="2"/>${ranges}${ticks.map(n=>`<line x1="${px(n)}" y1="${y-7}" x2="${px(n)}" y2="${y+8}" stroke="#becbd0"/><text x="${px(n)}" y="${y+29}" text-anchor="middle">${esc(num(n))}</text>`).join("")}<text x="${left}" y="145" fill="#8ce0a5" font-size="11">TRUE region</text><g class="rx-active-regions">${active}</g><line data-current-line x1="${px(state.x)}" y1="30" x2="${px(state.x)}" y2="${y-12}" stroke="#ffe082" stroke-width="3"/><path data-current-triangle d="M ${px(state.x)-8} 27 L ${px(state.x)+8} 27 L ${px(state.x)} 39 Z" fill="#ffe082"/><text data-current-label x="${px(state.x)}" y="18" text-anchor="middle" class="rx-x-label">x = ${esc(num(state.x))}</text></svg>`;
}
function expressionDisplay(state) {
  const full=buildRangeExpression(state.ranges,"inside",false), fullExpanded=buildRangeExpression(state.ranges,"inside",true), evals=evaluateExpression(state.ranges,state.x,state.mode==="fixed"?state.sense:"inside");
  if(state.mode==="fixed") {const expression=state.sense==="inside"?full:buildRangeExpression(state.ranges,"outside",true),alternate=state.sense==="inside"?fullExpanded:buildRangeExpression(state.ranges,"outside",false);return {headline:"Fixed expression",expression,full,expanded:alternate,result:evaluateJavaExpression(expression,state.x),explanation:state.sense==="inside"?`This asks whether x is inside at least one configured range. The overall result is ${evals.result}.`:`This asks whether x is outside every configured range. The overall result is ${evals.result}.`, evals,comparisons:evaluateRangeComparisons(state.ranges,state.x)};}
  const adaptive=adaptiveExpression(state.ranges,state.x,state.target); const actual=evaluateJavaExpression(adaptive.expression,state.x); if(actual!==state.target)throw new Error("Adaptive expression did not match the selected target."); return {headline:"Current position condition",expression:adaptive.expression,full,expanded:fullExpanded,result:actual,fullResult:evaluateJavaExpression(full,state.x),region:adaptive.region,explanation:`At x = ${num(state.x)}, the value is ${adaptive.region} the configured boundaries. This condition describes that position and evaluates to ${actual}. It does not replace the complete range condition.`,evals,comparisons:evaluateRangeComparisons(state.ranges,state.x)};
}
function statusMarkup(value,label="Result") { return `<span class="rx-pill ${value?"is-true":"is-false"}" data-status="${label.startsWith("Full")?"full":"primary"}" role="status" aria-live="polite">${esc(label)}: <strong>${value?"TRUE":"FALSE"}</strong></span>`; }

export function mountRangeExplorer(root) {
  const loaded=loadPrefs(); const state={mode:loaded?.mode==="adaptive"?"adaptive":"fixed",sense:loaded?.sense==="outside"?"outside":"inside",target:loaded?.target===false?false:true,x:Number.isFinite(Number(loaded?.x))?Number(loaded.x):80,step:Number.isFinite(Number(loaded?.step))&&Number(loaded.step)>0?Number(loaded.step):1,ranges:(loaded?.ranges||[{id:"1",lo:70,hi:90,loInclusive:true,hiInclusive:true}]).map(normalizeRange),expanded:false};
  let drag=false;
  const render=()=>{
    const check=validateRanges(state.ranges); if(check.valid && !Number.isFinite(state.x))state.x=state.ranges[0].lo;
    const scale=getScale(check.valid?state.ranges:[{lo:70,hi:90}],state.x); state.scale=scale; const shown=check.valid?expressionDisplay(state):null;
    root.innerHTML=`<div class="rx-shell"><div class="eyebrow">Unscored exploration</div><h2>Range Explorer</h2><p class="rx-intro">Explore how Java uses comparison operators and Boolean logic to test whether numbers are inside or outside ranges. Move the slider and watch the conditions change.</p>
      <div class="rx-toolbar"><fieldset><legend>Expression mode</legend><div class="rx-segments"><button type="button" data-mode="fixed" aria-pressed="${state.mode==="fixed"}">Fixed Expression</button><button type="button" data-mode="adaptive" aria-pressed="${state.mode==="adaptive"}">Adaptive Expression</button></div></fieldset><div class="rx-mode-description">${state.mode==="fixed"?"The condition stays the same while you test different x values.":"The current-position condition changes to make your selected TRUE or FALSE target."}</div></div>
      <div class="rx-layout"><section class="rx-card rx-config"><div class="rx-card-heading"><h3>Configure ranges</h3><button type="button" class="secondary" data-action="reset">Reset example</button></div><label class="rx-field">Quick example<select data-preset><option value="">Choose a preset…</option><option value="inclusive">Inclusive range</option><option value="exclusive">Exclusive range</option><option value="mixed">Mixed endpoints</option><option value="negative">Negative range</option><option value="disjoint">Two disjoint ranges</option><option value="overlap">Overlapping ranges</option></select></label>
      <div class="rx-ranges">${state.ranges.map((r,i)=>`<fieldset class="rx-range" data-range="${i}"><legend>Range ${i+1}</legend><label>Lower boundary<input type="number" step="any" data-field="lo" value="${esc(r.lo)}" aria-label="Range ${i+1} lower boundary"></label><label>Upper boundary<input type="number" step="any" data-field="hi" value="${esc(r.hi)}" aria-label="Range ${i+1} upper boundary"></label><label class="rx-check"><input type="checkbox" data-field="loInclusive" ${r.loInclusive?"checked":""}> Include lower endpoint (≥)</label><label class="rx-check"><input type="checkbox" data-field="hiInclusive" ${r.hiInclusive?"checked":""}> Include upper endpoint (≤)</label>${state.ranges.length>1?`<button type="button" class="secondary rx-remove" data-action="remove" data-index="${i}">Remove range ${i+1}</button>`:""}</fieldset>`).join("")}</div>
      <div class="rx-actions"><button type="button" class="secondary" data-action="add" ${state.ranges.length>=MAX_RANGES?"disabled":""}>Add range (${state.ranges.length}/${MAX_RANGES})</button><label class="rx-field">Test step<input type="number" min="0.0000001" step="any" data-step value="${esc(state.step)}"></label></div><p class="rx-validation" role="alert" ${check.valid?"hidden":""}>${check.valid?"":esc(check.message)}</p>
      <fieldset class="rx-sense"><legend>${state.mode==="fixed"?"What should the expression test?":"Target result for the position condition"}</legend>${state.mode==="fixed"?`<div class="rx-segments"><button type="button" data-sense="inside" aria-pressed="${state.sense==="inside"}">Inside any range</button><button type="button" data-sense="outside" aria-pressed="${state.sense==="outside"}">Outside all ranges</button></div>`:`<div class="rx-segments rx-target"><button type="button" data-target="true" aria-pressed="${state.target}">Make TRUE</button><button type="button" data-target="false" aria-pressed="${!state.target}">Make FALSE</button></div>`}</fieldset>
      </section>
      <section class="rx-card rx-visual"><div class="rx-card-heading"><h3>Number line</h3><span class="rx-endpoint-key"><span class="rx-dot filled"></span> included <span class="rx-dot open"></span> excluded</span></div>${check.valid?svgNumberLine(state,scale):""}<label class="rx-value">Current value of x<input type="number" step="any" data-value value="${esc(state.x)}" aria-label="Current value of x"></label><input class="rx-slider" type="range" min="${esc(scale.min)}" max="${esc(scale.max)}" step="any" value="${esc(state.x)}" aria-label="Move x along the number line" ${check.valid?"":"disabled"}><div class="rx-boundaries" aria-label="Boundary test shortcuts">${check.valid?state.ranges.map((r,i)=>`<div class="rx-boundary-group" role="group" aria-label="Range ${i+1} boundary test values"><strong>Range ${i+1}</strong><span>Lower</span>${[-1,0,1].map(offset=>`<button type="button" data-test="${r.lo+offset*state.step}" aria-label="Test x = ${num(r.lo+offset*state.step)}, ${offset<0?"one step below":offset>0?"one step above":"at"} the lower boundary of Range ${i+1}" aria-pressed="${Math.abs(state.x-(r.lo+offset*state.step))<1e-9}">${esc(num(r.lo+offset*state.step))}</button>`).join("")}<span>Upper</span>${[-1,0,1].map(offset=>`<button type="button" data-test="${r.hi+offset*state.step}" aria-label="Test x = ${num(r.hi+offset*state.step)}, ${offset<0?"one step below":offset>0?"one step above":"at"} the upper boundary of Range ${i+1}" aria-pressed="${Math.abs(state.x-(r.hi+offset*state.step))<1e-9}">${esc(num(r.hi+offset*state.step))}</button>`).join("")}</div>`).join(""):""}</div></section></div>
      ${check.valid?`<section class="rx-card rx-expression"><div class="rx-card-heading"><h3 data-headline>${esc(shown.headline)}</h3><div class="rx-expression-actions"><button type="button" class="secondary" data-action="copy">Copy Java expression</button><button type="button" class="secondary" data-action="expand" aria-expanded="${state.expanded}">${state.mode==="adaptive"?(state.expanded?"Hide expanded full range":"Expand full range condition"):(state.expanded?"Show compact expression":"Show equivalent expression")}</button></div></div><pre class="rx-code"><code data-primary-code>${esc(shown.expression)}</code></pre>${statusMarkup(shown.result,state.mode==="adaptive"?"Target result":"Expression result")}${state.mode==="adaptive"?`<div class="rx-full-condition"><strong>Full range condition</strong><pre class="rx-code"><code data-full-code>${esc(state.expanded?shown.expanded:shown.full)}</code></pre>${statusMarkup(shown.fullResult,"Full range result")}<p class="rx-subtle">The current-position condition can be true while the complete range condition is false, and vice versa.</p></div>`:""}<p class="rx-explanation" data-explanation>${esc(shown.explanation)}</p><div class="rx-comparisons"><h4>Comparison evaluations</h4>${shown.comparisons.map((pair,i)=>`<div class="rx-comparison-pair"><strong>Range ${i+1}</strong>${pair.map(c=>`<span class="rx-eval ${c.result?"is-true":"is-false"}"><code>${esc(c.expression)}</code> → ${c.result?"TRUE":"FALSE"}</span>`).join("")}<span class="rx-eval ${shown.evals.ranges[i]?"is-true":"is-false"}">Range result: ${shown.evals.ranges[i]?"TRUE":"FALSE"}</span></div>`).join("")}</div><details class="rx-operators"><summary>Why these operators?</summary><ul><li><code>&gt;=</code> and <code>&lt;=</code> include the boundary; <code>&gt;</code> and <code>&lt;</code> exclude it.</li><li><code>&amp;&amp;</code> requires both comparisons for one bounded range.</li><li><code>||</code> means a value may be inside any one of several ranges.</li><li><code>!</code> reverses the result. Expanded outside conditions use De Morgan’s laws.</li></ul></details></section>`:""}
      <p class="rx-save-note">Exploration is not scored. Your ranges and display settings stay in this browser.</p></div>`;
    bind();
  };
  const refreshLive=()=>{const check=validateRanges(state.ranges);if(!check.valid)return;const scale=state.scale,W=760,left=48,right=712,px=x=>left+(x-scale.min)/(scale.max-scale.min)*(right-left);const shown=expressionDisplay(state);const marker=root.querySelector("[data-current-line]"),tri=root.querySelector("[data-current-triangle]"),label=root.querySelector("[data-current-label]");if(marker){marker.setAttribute("x1",px(state.x));marker.setAttribute("x2",px(state.x));}if(tri)tri.setAttribute("d",`M ${px(state.x)-8} 27 L ${px(state.x)+8} 27 L ${px(state.x)} 39 Z`);if(label){label.setAttribute("x",px(state.x));label.textContent=`x = ${num(state.x)}`;}const active=root.querySelector(".rx-active-regions");if(active)active.innerHTML=activeIntervals(state,scale).map(g=>g.lo===g.hi?`<circle cx="${px(g.lo)}" cy="118" r="7" fill="#8ce0a5"/>`:`<line x1="${px(g.lo)}" y1="118" x2="${px(g.hi)}" y2="118" stroke="#8ce0a5" stroke-width="9"/>`).join("");const value=root.querySelector("[data-value]");if(value&&document.activeElement!==value)value.value=num(state.x);const slider=root.querySelector(".rx-slider");if(slider)slider.value=String(state.x);const code=root.querySelector("[data-primary-code]");if(code)code.textContent=shown.expression;const fullCode=root.querySelector("[data-full-code]");if(fullCode)fullCode.textContent=state.expanded?shown.expanded:shown.full;const headline=root.querySelector("[data-headline]");if(headline)headline.textContent=shown.headline;const explanation=root.querySelector("[data-explanation]");if(explanation)explanation.textContent=shown.explanation;root.querySelectorAll("[data-status]").forEach(el=>{const v=el.dataset.status==="full"?shown.fullResult:shown.result;el.classList.toggle("is-true",Boolean(v));el.classList.toggle("is-false",!v);const strong=el.querySelector("strong");if(strong)strong.textContent=v?"TRUE":"FALSE";});root.querySelectorAll("[data-test]").forEach(b=>b.setAttribute("aria-pressed",String(Math.abs(state.x-Number(b.dataset.test))<1e-9)));root.querySelectorAll(".rx-comparison-pair").forEach((el,i)=>{const items=shown.comparisons[i]||[];el.innerHTML=`<strong>Range ${i+1}</strong>${items.map(c=>`<span class="rx-eval ${c.result?"is-true":"is-false"}"><code>${esc(c.expression)}</code> → ${c.result?"TRUE":"FALSE"}</span>`).join("")}<span class="rx-eval ${shown.evals.ranges[i]?"is-true":"is-false"}">Range result: ${shown.evals.ranges[i]?"TRUE":"FALSE"}</span>`;});};
  const bind=()=>{
    root.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;savePrefs(state);render();});
    root.querySelectorAll("[data-sense]").forEach(b=>b.onclick=()=>{state.sense=b.dataset.sense;savePrefs(state);render();});
    root.querySelectorAll("[data-target]").forEach(b=>b.onclick=()=>{state.target=b.dataset.target==="true";savePrefs(state);render();});
    root.querySelectorAll("[data-range]").forEach(el=>{const index=Number(el.dataset.range);el.querySelectorAll("[data-field]").forEach(input=>input.onchange=()=>{const key=input.dataset.field;if(key.endsWith("Inclusive"))state.ranges[index][key]=input.checked;else if(validNumber(input.value))state.ranges[index][key]=Number(input.value);savePrefs(state);render();});});
    const step=root.querySelector("[data-step]");step.onchange=()=>{if(validNumber(step.value)&&Number(step.value)>0)state.step=Number(step.value);savePrefs(state);render();};
    const value=root.querySelector("[data-value]");value.oninput=()=>{if(validNumber(value.value)){state.x=Number(value.value);savePrefs(state);refreshLive();}};value.onchange=()=>{if(validNumber(value.value)){state.x=Number(value.value);savePrefs(state);if(state.x<state.scale.min||state.x>state.scale.max)render();else refreshLive();}else value.value=num(state.x);};
    const slider=root.querySelector(".rx-slider");if(slider){slider.oninput=()=>{state.x=Number(slider.value);savePrefs(state);refreshLive();};slider.onkeydown=event=>{const direction={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1}[event.key];if(direction){event.preventDefault();state.x=Math.min(state.scale.max,Math.max(state.scale.min,state.x+direction*state.step));savePrefs(state);refreshLive();}};}
    root.querySelectorAll("[data-test]").forEach(b=>b.onclick=()=>{state.x=Number(b.dataset.test);savePrefs(state);refreshLive();});
    const svg=root.querySelector("[data-line]");if(svg){const move=event=>{const box=svg.getBoundingClientRect(),scale=state.scale;const ratio=Math.min(1,Math.max(0,(event.clientX-box.left)/box.width));const plot=(ratio*760-48)/(712-48);state.x=scale.min+Math.min(1,Math.max(0,plot))*(scale.max-scale.min);savePrefs(state);refreshLive();};svg.onpointerdown=e=>{drag=true;svg.setPointerCapture?.(e.pointerId);move(e);};svg.onpointermove=e=>{if(drag)move(e);};svg.onpointerup=()=>drag=false;svg.onpointercancel=()=>drag=false;}
    root.querySelector("[data-preset]").onchange=e=>{const p=e.target.value;const presets={inclusive:[{lo:70,hi:90,loInclusive:true,hiInclusive:true}],exclusive:[{lo:70,hi:90,loInclusive:false,hiInclusive:false}],mixed:[{lo:70,hi:90,loInclusive:true,hiInclusive:false}],negative:[{lo:-12,hi:-3,loInclusive:true,hiInclusive:false}],disjoint:[{lo:20,hi:40,loInclusive:true,hiInclusive:false},{lo:70,hi:90,loInclusive:true,hiInclusive:true}],overlap:[{lo:20,hi:50,loInclusive:true,hiInclusive:true},{lo:40,hi:70,loInclusive:true,hiInclusive:false}]};if(presets[p]){state.ranges=presets[p].map((r,i)=>normalizeRange({...r,id:String(i+1)},i));state.x=state.ranges[0].lo;savePrefs(state);render();}};
    root.querySelectorAll('[data-action="reset"]').forEach(b=>b.onclick=()=>{state.mode="fixed";state.sense="inside";state.target=true;state.ranges=[normalizeRange({id:"1",lo:70,hi:90,loInclusive:true,hiInclusive:true})];state.x=80;state.step=1;state.expanded=false;savePrefs(state);render();});
    root.querySelectorAll('[data-action="add"]').forEach(b=>b.onclick=()=>{if(state.ranges.length>=MAX_RANGES)return;const last=state.ranges.at(-1);const lo=last.hi+Math.max(state.step,1);state.ranges.push(normalizeRange({id:String(state.ranges.length+1),lo,hi:lo+10,loInclusive:true,hiInclusive:true},state.ranges.length));state.x=lo;savePrefs(state);render();});
    root.querySelectorAll('[data-action="remove"]').forEach(b=>b.onclick=()=>{state.ranges.splice(Number(b.dataset.index),1);state.ranges.forEach((r,i)=>r.id=String(i+1));savePrefs(state);render();});
    root.querySelectorAll('[data-action="expand"]').forEach(b=>b.onclick=()=>{state.expanded=!state.expanded;render();});
    root.querySelectorAll('[data-action="copy"]').forEach(b=>b.onclick=async()=>{const d=expressionDisplay(state);const text=d.expression;try{await navigator.clipboard.writeText(text);b.textContent="Copied";setTimeout(()=>{if(b.isConnected)b.textContent="Copy Java expression";},1300);}catch{b.textContent="Copy unavailable";}});
  };
  render();
}

// A deliberately small parser for the Java subset emitted above. It never evaluates input as code.
export function evaluateJavaExpression(expression, x) {
  const tokens=expression.match(/&&|\|\||>=|<=|>|<|!|\(|\)|\bx\b|-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g)||[];
  if(tokens.join("").replace(/\s/g,"")!==expression.replace(/\s/g,"")) throw new Error("Unsupported Java expression syntax.");
  let i=0; const peek=()=>tokens[i], take=t=>{if(tokens[i]!==t)throw new Error(`Expected ${t}`);i++;};
  function primary(){if(peek()==="("){take("(");const v=or();take(")");return v;}let a;if(peek()==="x"){i++;a=Number(x);}else if(peek()!==undefined&&Number.isFinite(Number(peek()))){a=Number(tokens[i++]);}else throw new Error("Expected x or a number.");const op=peek();if([">=","<=",">","<"].includes(op)){i++;const b=peek()==="x"?(i++,Number(x)):Number(tokens[i++]);if(!Number.isFinite(b))throw new Error("Expected a number.");return op===">="?a>=b:op==="<="?a<=b:op===">"?a>b:a<b;}return Boolean(a);}
  function unary(){if(peek()==="!"){i++;return !unary();}return primary();}
  function and(){let v=unary();while(peek()==="&&"){i++;const r=unary();v=v&&r;}return v;}
  function or(){let v=and();while(peek()==="||"){i++;const r=and();v=v||r;}return v;}
  const result=or();if(i!==tokens.length)throw new Error("Unexpected expression token.");return Boolean(result);
}
