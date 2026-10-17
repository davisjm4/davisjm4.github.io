import { loadApiContent, validatePlan, endpointsFor, createScenarioPicker, requestFor, MODE_TITLE } from "./api-project-builder-engine.js";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const clone = (v) => JSON.parse(JSON.stringify(v));
const endpointIndex = (data) => new Map(data.providers.flatMap((p) => p.endpoints.map((e) => [e.id, e])));
const method = (e) => '<span class="api-method api-' + e.method.toLowerCase() + '">' + esc(e.method) + '</span>';
function fieldValue(value) { return value === undefined ? "" : String(value); }
function parameterInput(p, value, provided = false) {
  const values = p.allowedValues ? '<option value="">Choose…</option>' + p.allowedValues.map((v) => '<option value="' + esc(v) + '"' + (String(value) === String(v) ? " selected" : "") + '>' + esc(v) + '</option>').join("") : "";
  const input = p.allowedValues ? '<select data-param="' + esc(p.name) + '">' + values + '</select>' : '<input data-param="' + esc(p.name) + '" type="' + (p.type === "integer" ? "number" : "text") + '" value="' + esc(fieldValue(value)) + '"' + (p.min != null ? ' min="' + p.min + '"' : "") + (p.max != null ? ' max="' + p.max + '"' : "") + '>';
  return '<label class="api-param"><span>' + esc(p.name) + (p.required ? ' <b>required</b>' : ' <i>optional</i>') + ' <small>' + esc(p.location) + '</small>' + (provided ? ' <mark>provided by project</mark>' : '') + '</span>' + input + '<em>' + esc(p.description) + '</em></label>';
}
function responseHtml(e) { return '<ul class="api-fields">' + e.responseFields.map((f) => '<li><code>' + esc(f.path) + '</code> <span>' + esc(f.type) + '</span> — ' + esc(f.description) + '</li>').join("") + '</ul>'; }
function parameterSummary(p) {
  const allowed = p.allowedValues && p.allowedValues.length ? "Allowed values: " + p.allowedValues.join(", ") : (p.min != null || p.max != null ? "Range: " + (p.min != null ? p.min : "any") + "–" + (p.max != null ? p.max : "any") : "");
  return '<div class="api-doc-param"><strong>' + esc(p.name) + '</strong><span>' + (p.required ? "Required" : "Optional") + ' · ' + esc(p.location) + ' parameter · ' + esc(p.type) + '</span><p>' + esc(p.description) + '</p>' + (allowed ? '<small>' + esc(allowed) + '</small>' : '') + '</div>';
}
function docsHtml(e, selected) {
  return '<article class="api-entry' + (selected ? " is-selected" : "") + '" data-endpoint="' + esc(e.id) + '"><div class="api-entry-head">' + method(e) + '<code>' + esc(e.path) + '</code></div><h3>' + esc(e.title) + '</h3><p>' + esc(e.description) + '</p><button type="button" class="secondary api-add" data-add="' + esc(e.id) + '">Add Request</button><details><summary>Read Documentation</summary><div class="api-doc-detail"><p><strong>Parameters</strong></p><div class="api-param-list">' + (e.parameters.length ? e.parameters.map(parameterSummary).join("") : "<p>None.</p>") + '</div><p><strong>Authentication:</strong> ' + esc(e.authentication.description || (e.authentication.required ? "Required." : "Not required.")) + '</p><p><strong>Response fields</strong></p>' + responseHtml(e) + '<p><a href="' + esc(e.sourceUrl) + '" target="_blank" rel="noreferrer">Open source documentation ↗</a></p></div></details></article>';
}
function planHtml(plan, map, scenario) {
  return plan.length ? plan.map((r, i) => { const e = map.get(r.endpointId); return '<article class="api-request" data-request="' + i + '"><div class="api-request-head"><span class="api-step">' + (i + 1) + '</span><div><strong>' + method(e) + ' ' + esc(e.path) + '</strong><small>' + esc(e.title) + '</small></div><button type="button" class="secondary api-remove" data-remove="' + i + '">Remove</button></div><div class="api-request-params">' + e.parameters.map((p) => parameterInput(p, r.parameters[p.name], scenario.providedParameters?.[r.endpointId]?.[p.name] !== undefined)).join("") + '</div></article>'; }).join("") : '<p class="muted">No requests yet. Read the documentation and add the requests your application needs.</p>';
}
function feedbackHtml(result, scenario, map) {
  const label = (r) => { const e = map.get(r.endpointId || r); return e ? esc(e.title) + ' <code>(' + esc(e.method + " " + e.path) + ')</code>' : esc(r.endpointId || r); };
  const section = (title, values) => values && values.length ? '<li><strong>' + title + ':</strong> ' + values.map(label).join(", ") + '</li>' : "";
  const best = scenario.acceptedPlans.find((p) => p.efficiency === "smallest-sufficient") || scenario.acceptedPlans[0];
  const solution = '<details class="api-solution"><summary>Review a valid complete plan</summary><ol>' + best.requests.map((r) => { const e = map.get(r.endpointId); const params = Object.entries(r.parameters || {}).map(([k, v]) => esc(k) + " = " + esc(v)).join(", "); return '<li><strong>' + esc(e.title) + '</strong> <code>(' + esc(e.method + " " + e.path) + ')</code>' + (params ? ' — ' + params : '') + '</li>'; }).join("") + '</ol></details>';
  return '<strong>' + (result.status === "correct" ? "✓ Correct plan." : result.status === "valid-less-efficient" ? "✓ Valid, but less efficient." : "✗ Plan needs revision.") + '</strong><p>' + esc(result.message) + '</p><ul class="api-review">' + section("Missing request", result.missing) + section("Unnecessary endpoint", result.unnecessary) + section("Incorrect endpoint", result.incorrectEndpoints) + section("Incomplete request", result.incompleteRequests) + section("Incorrect parameter choice", result.incorrectParameters) + section("Invalid parameter value", result.invalidParameterRequests) + (result.errors.length ? '<li><strong>Documentation checks:</strong> ' + result.errors.map((e) => esc(e)).join(" ") + '</li>' : "") + '</ul>' + '<p class="api-explanation"><strong>Why:</strong> ' + esc(scenario.explanation) + '</p>' + solution;
}
export function mount({ root, controls, tracker, dev = false }) {
  const state = { stopped:false, data:null, scenario:null, plan:[], picker:null, instance:null, closed:false };
  const set = (id, html) => { const el = root.querySelector("#" + id); if (el) el.innerHTML = html; };
  const stat = () => { const el = document.getElementById("stats"); if (el && controls.roundSummary) el.textContent = controls.roundSummary(); };
  const touch = () => { if (state.instance && tracker.status(state.instance) === "active") tracker.interact(state.instance); };
  const stop = () => { state.stopped=true; document.getElementById("stage").classList.remove("api-mode"); if (state.instance && tracker.status(state.instance) === "active") tracker.skip(state.instance); };
  const next = () => controls.next();
  const renderPlan = () => {
    const map = endpointIndex(state.data);
    set("interaction", '<div class="api-plan"><div class="api-plan-head"><h3>My Request Plan</h3><p class="muted">Configure the requests you selected. Values supplied by the project are already filled in. Order does not affect your score.</p></div><div id="api-plan-list">' + planHtml(state.plan,map,state.scenario) + '</div><p class="api-plan-note">One request may be enough for one project; another project may require related resources. Use the response fields in the documentation to decide.</p></div>');
    for (const card of root.querySelectorAll("[data-request]")) {
      const i=Number(card.dataset.request);
      for (const input of card.querySelectorAll("[data-param]")) input.oninput=input.onchange=()=>{ state.plan[i].parameters[input.dataset.param]=input.value; touch(); };
      const remove=card.querySelector("[data-remove]"); if(remove) remove.onclick=()=>{state.plan.splice(i,1);touch();renderPlan();};
    }
  };
  const bindDocs = () => {
    const map=endpointIndex(state.data);
    for(const b of root.querySelectorAll("[data-add]")) b.onclick=()=>{const e=map.get(b.dataset.add); state.plan.push(requestFor(e.id, state.scenario.providedParameters?.[e.id] || {})); touch(); renderPlan(); b.textContent="Added — configure in your plan"; b.disabled=true;};
  };
  const renderDocs = (query="") => {
    const endpoints=endpointsFor(state.data,state.scenario).filter(e=>(e.title+" "+e.path+" "+e.description+" "+e.method).toLowerCase().includes(query.toLowerCase()));
    set("docs", '<div class="api-docs-browser"><div class="api-docs-head"><h3>Browse API documentation</h3><label class="api-search">Search documentation <input id="api-search" type="search" placeholder="Search title, path, or description"></label></div><p class="muted">Every listed operation is available to inspect. Open the documentation before deciding what belongs in your plan.</p><div class="api-entry-list">' + endpoints.map((e)=>docsHtml(e,state.plan.some(r=>r.endpointId===e.id))).join("") + '</div></div>');
    const search=root.querySelector("#api-search"); if(search){search.value=query;search.oninput=()=>renderDocs(search.value); }
    bindDocs();
  };
  const submit = () => {
    if(state.closed || !state.instance) return;
    for (const card of root.querySelectorAll("[data-request]")) {
      const i = Number(card.dataset.request);
      for (const input of card.querySelectorAll("[data-param]")) state.plan[i].parameters[input.dataset.param] = input.value;
    }
    const result=validatePlan(state.data,state.scenario,{requests:state.plan});
    const rec=tracker.submit(state.instance,result.correct); if(!rec.accepted)return;
    if(!result.correct) tracker.reveal(state.instance);
    state.closed=true;
    root.querySelectorAll("input,select,button").forEach((b)=>b.disabled=true);
    const fb=document.getElementById("feedback"); fb.hidden=false; fb.className="feedback dl-feedback "+(result.correct?"good":"bad"); fb.innerHTML=feedbackHtml(result,state.scenario,endpointIndex(state.data));
    controls.submit.hidden=true; controls.show.hidden=true; controls.skip.hidden=true; controls.nextButton.hidden=false; controls.nextButton.disabled=false; controls.nextButton.focus({preventScroll:true}); stat();
  };
  const show = () => {
    if(state.closed || !state.instance) return;
    const plan=state.scenario.acceptedPlans.find((p)=>p.efficiency==="smallest-sufficient") || state.scenario.acceptedPlans[0];
    state.plan=clone(plan.requests); tracker.reveal(state.instance); state.closed=true;
    renderPlan(); root.querySelectorAll("input,select,button").forEach((b)=>b.disabled=true);
    const fb=document.getElementById("feedback"); fb.hidden=false; fb.className="feedback dl-feedback shown"; fb.innerHTML='<strong>Answer shown.</strong><p>' + esc(state.scenario.explanation) + '</p><p class="muted dl-small">Recorded as revealed (no credit).</p>';
    controls.submit.hidden=true;controls.show.hidden=true;controls.skip.hidden=true;controls.nextButton.hidden=false;controls.nextButton.disabled=false;controls.nextButton.focus({preventScroll:true});stat();
  };
  const start = async () => {
    try {
      document.getElementById("stage").classList.add("api-mode");
      state.data=await loadApiContent();
      if(state.stopped)return;
      if(!dev && !state.data.published){ set("interaction",'<div class="api-unavailable"><strong>API Project Builder is not available yet.</strong><p>Verified real API content has not been integrated. This development fixture is intentionally hidden from students.</p></div>'); return; }
      state.picker=createScenarioPicker(state.data);
      state.scenario=state.picker();
      state.plan=[];
      state.instance=tracker.begin("documentation-lab","Documentation Lab","api-builder",MODE_TITLE);
      document.getElementById("mode-label").textContent=MODE_TITLE;
      document.getElementById("family").textContent=state.scenario.title;
      document.getElementById("instructions").textContent="Project Goal → Browse API Docs → Build Requests → Submit → Explanation";
      document.getElementById("prompt").textContent="";
      document.getElementById("prompt").hidden=true;
      document.getElementById("question").textContent="Choose the documented requests that supply the application's requirements.";
      const provider=state.data.providers.find((p)=>p.id===state.scenario.providerId);
      set("blocks",'<div class="api-project-goal"><div class="api-fixture-banner">Development fixture — fictional API; not a production activity.</div><h3>Project Brief: '+esc(state.scenario.title)+'</h3><h4>Goal</h4><p>'+esc(state.scenario.goal)+'</p><h4>Required information</h4><ul>'+state.scenario.requirements.map((r)=>'<li><strong>'+esc(r.label)+':</strong> '+esc(r.description)+'</li>').join("")+'</ul><h4>Constraints</h4><p class="api-constraint">'+esc(state.scenario.constraints.text)+'</p><h4>Provided identifiers</h4><ul class="api-identifiers">'+(state.scenario.providedIdentifiers||[]).map((v)=>'<li><code>'+esc(v.name)+' = '+esc(v.value)+'</code> — '+esc(v.description)+'</li>').join("")+'</ul><p class="muted"><strong>Provider:</strong> '+esc(provider.name)+' · <a href="'+esc(provider.documentationUrl)+'" target="_blank" rel="noreferrer">official documentation ↗</a></p></div>');
      renderDocs(); renderPlan();
      controls.submit.hidden=false;controls.show.hidden=false;controls.skip.hidden=false;controls.nextButton.hidden=true;controls.submit.disabled=false;controls.show.disabled=false;controls.skip.disabled=false;stat();
    } catch(error) {
      set("interaction",'<div class="api-unavailable"><strong>Content could not be loaded.</strong><p>'+esc(error.message)+'</p></div>');
    }
  };
  controls.submit.onclick=submit; controls.show.onclick=show; controls.skip.onclick=next; controls.nextButton.onclick=next;
  start();
  return { stop };
}
