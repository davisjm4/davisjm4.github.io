import { presentation } from "./api-project-presentation.js?v=curated-v14-step4-metadata";

const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const structuralPath = (path) => String(path).replace(/\[\d+\]/g, "[]");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const humanParameter = (name) => ({
  playlist_id: "Playlist ID", video_id: "Video ID", channel_id: "Channel ID", user_id: "User ID",
  guild_id: "Server ID", role_id: "Role ID", publish_id: "Publishing ID", placeId: "Place ID",
  uris: "Track URIs", input: "Application input", file: "Simulated file", messages: "Application content",
}[name] || String(name).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()));

function selectedFieldLabel(scenario, sourceEndpoint, parameter, path) {
  const choices = presentation(scenario, sourceEndpoint).sourceChoices?.[parameter] || [];
  const choice = choices.find((item) => item.path === path);
  if (choice?.label) return choice.label;
  const field = (sourceEndpoint.responseFields || []).find((item) => item.path === path || item.path.replace(/\[\]/g, "") === String(path).replace(/\[\]/g, ""));
  if (/\.videoId$/.test(path) || /present when id\.kind is youtube#video/i.test(field?.description || "")) return "Video ID";
  if (/\.track\.uri$/.test(path)) return "Each track's Spotify URI";
  if (/\.publish_id$/.test(path)) return "Publishing ID";
  if (/\.placeId$/.test(path)) return "Place ID";
  if (field?.description) return field.description.replace(/[.]$/, "");
  return String(path).replace(/\[\]/g, " → each item").replace(/\./g, " → ");
}

function appInputLabel(scenario, endpoint, parameter, spec) {
  const reason = String(spec?.reason || "");
  const lower = reason.toLowerCase();
  let detail = "";
  if (/lecture|recording|audio/.test(lower)) detail = "simulated lecture audio";
  else if (/photo|image/.test(lower)) detail = "simulated image";
  else if (/essay|writing/.test(lower)) detail = "selected writing";
  else if (/reading packet|document|pdf|file/.test(lower)) detail = "simulated document";
  else if (/passage|reading material|text the student/.test(lower)) detail = "reading passage";
  else if (/search|typed|partial text|query/.test(lower)) detail = "user's search text";
  else if (/gps|location|coordinates|school's/.test(lower)) detail = "configured or device location";
  else if (/selected video|video selected/.test(lower)) detail = "selected video";
  else if (/selected place|destination/.test(lower)) detail = "selected destination";
  else if (/playlist/.test(lower)) detail = "selected playlist";
  else if (/track/.test(lower)) detail = "selected tracks";
  else if (/creator|signed-in user|account/.test(lower)) detail = "authenticated account";
  else if (/teacher/.test(lower)) detail = "teacher-provided content";
  else if (/student|user/.test(lower)) detail = "user-provided content";
  else if (reason && spec?.kind !== "fixed") detail = reason.replace(/^(the )?(app|application) (supplies|provides|places|combines|uses) /i, "").replace(/[. ]+$/, "");
  if (!detail && spec?.kind === "runtime") detail = humanParameter(parameter);
  if (!detail) return null;
  const source = /user|student|typed/.test(lower) ? "User supplies" : "App supplies";
  return `${source}: ${detail}`;
}

function runtimeLabels(scenario, request, endpoint) {
  const config = presentation(scenario, endpoint), labels = [];
  for (const [parameter, spec] of Object.entries(config.automatic || {})) {
    if (spec?.kind === "fixed" && !/gps|location|coordinates|school|selected destination|selected video|search text|user input/i.test(spec.reason || "")) continue;
    const label = appInputLabel(scenario, endpoint, parameter, spec);
    if (label && !labels.includes(label)) labels.push(label);
  }
  for (const [parameter, dependency] of Object.entries(request.dependencies || {})) {
    if (dependency?.source === "context") {
      const label = `App supplies: ${humanParameter(parameter)} from project context`;
      if (!labels.includes(label)) labels.push(label);
    }
  }
  // Symbolic inputs are shown only when they are not already represented by a
  // request-to-request connection or explicit application metadata.
  const containsRuntime = (value) => object(value) && Object.hasOwn(value, "$runtime") || object(value) && Object.values(value).some(containsRuntime) || Array.isArray(value) && value.some(containsRuntime);
  for (const [parameter, value] of Object.entries(request.parameters || {})) {
    if (request.dependencies?.[parameter] || !containsRuntime(value) || /token|key|authorization|credential/i.test(parameter)) continue;
    const label = `App supplies: ${humanParameter(parameter)}`;
    if (!labels.some((existing) => existing.endsWith(label.slice("App supplies: ".length)))) labels.push(label);
  }
  return labels.slice(0, 3);
}

/** Derive a read-only view of the student's current request plan. */
export function buildRequestFlowModel(scenario, requests, endpointMap) {
  const nodes = (requests || []).map((request, index) => {
    const endpoint = endpointMap.get(request.endpointId);
    const description = String(endpoint?.description || "").split(/(?<=[.!?])\s+/)[0] || "Selected API operation.";
    return {
      id: request.id || request.requestId || `request-${index + 1}`,
      endpointId: request.endpointId,
      index,
      number: index + 1,
      title: endpoint?.title || "Unknown request",
      method: endpoint?.method || "",
      purpose: request.purpose || description.slice(0, 170),
      inputs: endpoint ? runtimeLabels(scenario, request, endpoint) : [],
      incoming: [],
      unresolved: [],
    };
  });
  const edges = [];
  for (const [destinationIndex, request] of (requests || []).entries()) {
    const destination = nodes[destinationIndex];
    if (!destination) continue;
    for (const [parameter, dependency] of Object.entries(request.dependencies || {})) {
      if (!dependency || dependency.source === "context") continue;
      if (dependency.source !== "request") continue;
      const bindings = Array.isArray(dependency.bindings) && dependency.bindings.length
        ? dependency.bindings
        : [{ fromRequest: dependency.fromRequest, paths: dependency.paths || [] }];
      let represented = false;
      for (const binding of bindings) {
        const rawSourceIndex = binding.fromRequest;
        const sourceIndex = Number.isInteger(rawSourceIndex) ? rawSourceIndex : Number.isInteger(Number(rawSourceIndex)) && rawSourceIndex !== null && rawSourceIndex !== "" ? Number(rawSourceIndex) : null;
        const source = Number.isInteger(sourceIndex) ? nodes[sourceIndex] : null;
        if (dependency.invalid || !source || sourceIndex >= destinationIndex) {
          destination.unresolved.push({ parameter, label: humanParameter(parameter), text: dependency.invalid ? "Earlier source is no longer available" : "Source not selected" });
          continue;
        }
        const paths = [...new Set(binding.paths || (binding.path ? [binding.path] : []))];
        if (!paths.length) {
          const edge = { id: `${source.id}-${destination.id}-${parameter}-unselected`, sourceId: source.id, destinationId: destination.id, sourceIndex, destinationIndex, parameter, path: null, label: "Response field not selected" };
          edges.push(edge); destination.incoming.push(edge); destination.unresolved.push({ parameter, label: humanParameter(parameter), text: "Response field not selected" }); represented = true;
          continue;
        }
        const sourceEndpoint = endpointMap.get(source.endpointId);
        for (const path of paths) {
          const documented = (sourceEndpoint?.responseFields || []).some((field) => structuralPath(field.path) === structuralPath(path));
          if (!documented) {
            destination.unresolved.push({ parameter, label: humanParameter(parameter), text: "Selected response field is unavailable" });
            continue;
          }
          const edge = { id: `${source.id}-${destination.id}-${parameter}-${path}`, sourceId: source.id, destinationId: destination.id, sourceIndex, destinationIndex, parameter, path, label: selectedFieldLabel(scenario, sourceEndpoint || {}, parameter, path) };
          edges.push(edge); destination.incoming.push(edge); represented = true;
        }
      }
      if (!represented && !destination.unresolved.some((item) => item.parameter === parameter)) destination.unresolved.push({ parameter, label: humanParameter(parameter), text: "Source not selected" });
    }
  }
  return { nodes, edges, requestCount: nodes.length };
}

/** Render the accessible, compact textual diagram from its derived model. */
export function requestFlowContentHtml(model) {
  const nodes = model.nodes.map((node) => `<article class="api-flow-node" role="listitem" data-flow-node="${escapeHtml(node.id)}"><header><span class="api-flow-number">Request ${node.number}</span><strong>${escapeHtml(node.title)}</strong></header><p>${escapeHtml(node.purpose)}</p>${node.inputs.length ? `<ul class="api-flow-inputs" aria-label="Application-supplied information">${node.inputs.map((input) => `<li>${escapeHtml(input)}</li>`).join("")}</ul>` : ""}${node.incoming.length ? `<div class="api-flow-incoming" aria-label="Information used from earlier requests">${node.incoming.map((edge) => `<div class="api-flow-edge" aria-label="Request ${edge.sourceIndex + 1} to Request ${edge.destinationIndex + 1}: ${escapeHtml(edge.label)}"><span>Request ${edge.sourceIndex + 1} · ${escapeHtml(model.nodes[edge.sourceIndex]?.title || "Earlier request")}</span><span class="api-flow-arrow" aria-hidden="true">→</span><strong>${escapeHtml(edge.label)}</strong></div>`).join("")}</div>` : ""}${node.unresolved.map((item) => `<p class="api-flow-unresolved" role="status">${escapeHtml(item.text)}${item.text === "Response field not selected" ? ` for ${escapeHtml(item.label.toLowerCase())}` : ""}</p>`).join("")}</article>`).join("");
  const content = !model.requestCount
    ? `<p class="api-flow-empty">Add a request to see how the app's API operations connect.</p>`
    : model.requestCount === 1
      ? `<p class="api-flow-single">This request can get the information the app needs without another API request.</p>${nodes}`
      : `<p class="api-flow-intro">Requests appear in your current plan order. Arrows show only information sources you selected.</p><div class="api-flow-nodes" role="list">${nodes}</div>`;
  return content;
}

export function requestFlowHtml(model) {
  return `<details class="api-request-flow"${model.requestCount >= 2 ? " open" : ""}><summary>How Your Requests Connect</summary>${requestFlowContentHtml(model)}</details>`;
}
