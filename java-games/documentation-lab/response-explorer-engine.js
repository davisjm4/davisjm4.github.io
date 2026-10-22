/* Response Explorer Phase 2, Find the Data engine.
   This module is deliberately separate from the API Project Builder engine. */

export const RESPONSE_EXPLORER_MODE = "response-explorer";
export const FIND_DATA_FORMAT = "find-data";
export const UNDERSTAND_STRUCTURE_FORMAT = "understand-structure";
export const SELECT_NEEDS_FORMAT = "select-needs";

const ARRAY = "[]";
const DEFAULT_DISPLAY = {
  expand: [],
  collapse: [],
  arrayShow: {},
  arrayShowDefault: 3,
  expandElements: "first",
  defaultExpandDepth: 1,
};

export function parsePath(path) {
  if (typeof path !== "string" || !path.startsWith("$")) throw new Error(`Invalid path: ${path}`);
  const out = [];
  let i = 1;
  while (i < path.length) {
    if (path.startsWith("[]", i)) { out.push(ARRAY); i += 2; continue; }
    const index = path.slice(i).match(/^\[(\d+)\]/);
    if (index) { out.push(Number(index[1])); i += index[0].length; continue; }
    if (path[i] === ".") {
      const m = path.slice(i + 1).match(/^[^.\[\]]+/);
      if (!m) throw new Error(`Invalid path: ${path}`);
      out.push(m[0]); i += m[0].length + 1; continue;
    }
    throw new Error(`Invalid path: ${path}`);
  }
  return out;
}

export function formatConcrete(tokens) {
  return "$" + tokens.map((t) => typeof t === "number" ? `[${t}]` : `.${t}`).join("");
}

export function formatStructural(tokens) {
  return "$" + tokens.map((t) => t === ARRAY ? "[]" : `.${t}`).join("");
}

export function structuralOf(path) {
  return formatStructural(parsePath(path).map((t) => typeof t === "number" ? ARRAY : t));
}

function jsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

export function resolve(structuralPath, body) {
  const tokens = parsePath(structuralPath);
  let current = [{ tokens: [], value: body }];
  for (const token of tokens) {
    const next = [];
    for (const item of current) {
      if (token === ARRAY && Array.isArray(item.value)) {
        item.value.forEach((value, index) => next.push({ tokens: [...item.tokens, index], value }));
      } else if (typeof token === "number" && Array.isArray(item.value) && token < item.value.length) {
        next.push({ tokens: [...item.tokens, token], value: item.value[token] });
      } else if (item.value && typeof item.value === "object" && !Array.isArray(item.value) && token in item.value) {
        next.push({ tokens: [...item.tokens, token], value: item.value[token] });
      }
    }
    current = next;
  }
  return current;
}

function isAncestor(ancestor, descendant) {
  const a = parsePath(ancestor), d = parsePath(descendant);
  return a.length < d.length && a.every((token, index) => token === d[index]);
}

function parentOf(path) {
  const tokens = parsePath(path);
  return tokens.length ? formatStructural(tokens.slice(0, -1).map((t) => typeof t === "number" ? ARRAY : t)) : null;
}

function pathLabel(path) {
  const tokens = parsePath(path);
  if (!tokens.length) return "response";
  return tokens.map((token) => typeof token === "number" ? "each item" : token === ARRAY ? "each item" : token).join(" › ");
}

function valueText(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value.length > 74 ? `${value.slice(0, 71)}…` : value);
  if (typeof value === "object") return Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
  return String(value);
}

function displayConfig(challenge) {
  return { ...DEFAULT_DISPLAY, ...(challenge.display || {}), arrayShow: { ...DEFAULT_DISPLAY.arrayShow, ...(challenge.display?.arrayShow || {}) } };
}

function defaultExpanded(structural, depth, index, config) {
  if (config.collapse.includes(structural)) return false;
  const element = structural.endsWith("[]");
  if (element) {
    if (config.expandElements === "none" || (config.expandElements === "first" && index !== 0)) return false;
    if (config.expand.includes(structural)) return true;
    return depth - 1 <= config.defaultExpandDepth;
  }
  return config.expand.includes(structural) || depth <= config.defaultExpandDepth;
}

function childrenOf(value, tokens) {
  if (Array.isArray(value)) return value.map((item, index) => ({ key: `[${index}]`, value: item, tokens: [...tokens, index], index }));
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => ({ key, value: item, tokens: [...tokens, key], index: null }));
  return [];
}

export function buildView(body, challenge, overrides = new Map()) {
  const config = displayConfig(challenge);
  const rows = [];
  const nodes = [];
  const walk = (value, tokens, visible, index = null) => {
    const structural = formatStructural(tokens.map((t) => typeof t === "number" ? ARRAY : t));
    const type = jsonType(value);
    const depth = tokens.length;
    const container = type === "object" || type === "array";
    const initial = container ? (tokens.length === 0 || defaultExpanded(structural, depth, index, config)) : false;
    const key = tokens.length === 0 ? "response" : (typeof tokens.at(-1) === "number" ? `[${tokens.at(-1)}]` : tokens.at(-1));
    const row = { concrete: formatConcrete(tokens), structural, key, type, depth, value, container, expanded: overrides.has(formatConcrete(tokens)) ? overrides.get(formatConcrete(tokens)) : initial, visible, selectable: true };
    nodes.push(row);
    if (visible) rows.push(row);
    if (!container) return;
    const children = childrenOf(value, tokens);
    const show = Array.isArray(value) ? Number(config.arrayShow[structural] ?? config.arrayShowDefault) : children.length;
    children.slice(0, show).forEach((child) => walk(child.value, child.tokens, visible && row.expanded, child.index));
    if (Array.isArray(value) && children.length > show) {
      const more = { concrete: `${formatConcrete(tokens)}[+${children.length - show}]`, structural, key: `+${children.length - show} more`, type: "more", depth: depth + 1, value: null, container: false, expanded: false, visible: visible && row.expanded, selectable: false, hiddenCount: children.length - show };
      nodes.push(more);
      if (more.visible) rows.push(more);
    }
  };
  walk(body, [], true, null);
  return { rows, nodes };
}

function renderTemplate(text, values) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ""));
}

export function gradeFindData(challenge, concretePath, templates) {
  if (!concretePath) return { correct: false, outcome: "empty", misconceptionId: null, feedback: "Select a response node before checking." };
  const spec = challenge.grading;
  const structural = structuralOf(concretePath);
  const accepted = spec.accepted || [];
  const concrete = formatConcrete(parsePath(concretePath));
  const exact = accepted.find((item) => item.match === "concrete" ? item.concretePath === concrete : item.path === structural);
  if (exact) return { correct: true, outcome: exact.kind === "alternative" ? "alternative" : "accepted", structural, accepted: exact, misconceptionId: null, feedback: null };
  if (spec.parentAcceptable && accepted.some((item) => isAncestor(structural, item.path) && structural !== "$")) return { correct: true, outcome: "parent-accepted", structural, misconceptionId: null, feedback: null };
  const rejected = (spec.rejected || []).find((item) => item.path === structural);
  if (rejected) return { correct: false, outcome: "rejected-rule", structural, misconceptionId: rejected.misconceptionId, feedback: rejected.feedback };
  const relation = accepted.some((item) => isAncestor(structural, item.path)) ? "too-broad" : accepted.some((item) => isAncestor(item.path, structural)) ? "too-specific" : accepted.some((item) => parentOf(item.path) === parentOf(structural)) ? "sibling" : "unrelated";
  const templateKey = { "too-broad": "tooBroad", "too-specific": "tooSpecific", sibling: "sibling", unrelated: "unrelated" }[relation];
  const text = spec.classFeedback?.[relation] || templates?.[templateKey] || "That response node does not provide the information this goal needs. Review the surrounding documentation and try again.";
  return { correct: false, outcome: relation, structural, misconceptionId: `auto-${relation}`, feedback: renderTemplate(text, { label: spec.targetConcept || "this information" }) };
}

export function renderExplanation(text, body, relatedBodies = {}) {
  return String(text).replace(/\{\{value:([^@}]+)(?:@([^}]+))?\}\}/g, (_, path, sampleId) => {
    const source = sampleId ? relatedBodies[sampleId] : body;
    const found = resolve(path, source || body)[0]?.value;
    return found === undefined ? "" : JSON.stringify(found);
  });
}

export function sourceSamples(library) {
  const result = new Map();
  for (const scenario of library.scenarios || []) for (const sample of scenario.responseSamples || []) result.set(sample.id, sample.body);
  return result;
}

export function sourceSampleOwners(library) {
  const result = new Map();
  for (const scenario of library.scenarios || []) for (const sample of scenario.responseSamples || []) result.set(sample.id, scenario);
  return result;
}

export function providerName(library, id) {
  return library.providers?.find((provider) => provider.id === id)?.name || id;
}

export function findDataChallenges(data) {
  return (data.challenges || []).filter((challenge) => challenge.format === FIND_DATA_FORMAT);
}

export function challengesForFormat(data, format = "mixed") {
  return (data.challenges || []).filter((challenge) => format === "mixed" || challenge.format === format);
}

export function shuffleChallenges(pool, previousId = "", random = Math.random, previousModelId = "") {
  const queue = [...pool];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  const modelId = (challenge) => challenge.reasoningModelId || challenge.reasoningFamily || "";
  if (queue.length > 1 && (queue[0].id === previousId || (previousModelId && modelId(queue[0]) === previousModelId))) {
    const swap = queue.findIndex((challenge, index) => index > 0 && challenge.id !== previousId && (!previousModelId || modelId(challenge) !== previousModelId));
    if (swap > 0) [queue[0], queue[swap]] = [queue[swap], queue[0]];
  }
  for (let i = 1; i < queue.length; i++) {
    if (modelId(queue[i]) && modelId(queue[i]) === modelId(queue[i - 1])) {
      const swap = queue.findIndex((challenge, index) => index > i && modelId(challenge) !== modelId(queue[i - 1]));
      if (swap > i) [queue[i], queue[swap]] = [queue[swap], queue[i]];
    }
  }
  return queue;
}

export function unseenChallenges(pool, seenIds) {
  return (pool || []).filter((challenge) => !seenIds?.has(challenge.id));
}

export function matchingChallenges(data, { format = "mixed", provider = "all", difficulty = "all" } = {}) {
  return challengesForFormat(data, format).filter((challenge) =>
    (provider === "all" || challenge.providerId === provider) &&
    (difficulty === "all" || challenge.difficulty === difficulty));
}

function normalizeSelection(path) {
  try { return structuralOf(path); } catch { return null; }
}

function relationToAccepted(path, accepted) {
  if (!path) return "empty";
  if (accepted.some((item) => item.path === path)) return "accepted";
  if (accepted.some((item) => isAncestor(path, item.path))) return "too-broad";
  if (accepted.some((item) => isAncestor(item.path, path))) return "too-specific";
  if (accepted.some((item) => parentOf(item.path) === parentOf(path))) return "sibling";
  return "unrelated";
}

function gradeOnePath(spec, concretePath, templates = {}) {
  if (!concretePath) return { correct: false, outcome: "empty", misconceptionId: null, feedback: "Select a node in the response first." };
  const structural = normalizeSelection(concretePath);
  const accepted = spec.accepted || [];
  const exact = accepted.find((item) => item.path === structural && (item.match !== "concrete" || item.concretePath === concretePath));
  if (exact) return { correct: true, outcome: exact.kind === "alternative" ? "alternative" : "accepted", structural, accepted: exact, misconceptionId: null, feedback: null };
  if (spec.parentAcceptable && accepted.some((item) => isAncestor(structural, item.path) && structural !== "$")) return { correct: true, outcome: "parent-accepted", structural, misconceptionId: null, feedback: null };
  const rejected = (spec.rejected || []).find((item) => item.path === structural);
  if (rejected) return { correct: false, outcome: "rejected-rule", structural, misconceptionId: rejected.misconceptionId, feedback: rejected.feedback };
  const relation = relationToAccepted(structural, accepted);
  const key = { "too-broad": "tooBroad", "too-specific": "tooSpecific", sibling: "sibling", unrelated: "unrelated" }[relation];
  return { correct: false, outcome: relation, structural, misconceptionId: `auto-${relation}`, feedback: renderTemplate(spec.classFeedback?.[relation] || templates[key] || "That node does not provide the information this goal needs. Review the surrounding structure and try again.", { label: spec.targetConcept || "this information" }) };
}

export function gradeStructureSingle(challenge, concretePath, templates = {}) {
  return gradeOnePath(challenge.grading, concretePath, templates);
}

export function gradeStructureSlots(challenge, selections, templates = {}) {
  const seen = new Set();
  const slots = (challenge.grading.slots || []).map((slot) => {
    const concrete = selections?.[slot.id] || "";
    const structural = normalizeSelection(concrete);
    if (!concrete) return { slotId: slot.id, correct: false, outcome: "empty", misconceptionId: null, feedback: `Choose a response node for “${slot.label}.”` };
    if (seen.has(structural)) return { slotId: slot.id, correct: false, outcome: "duplicate-node", misconceptionId: "duplicate-node", feedback: "Use a different response node for each part; these two slots need different pieces of the structure." };
    seen.add(structural);
    const result = gradeOnePath(slot, concrete, templates);
    return { slotId: slot.id, ...result };
  });
  const errors = slots.filter((slot) => !slot.correct);
  return { correct: errors.length === 0, outcome: errors.length ? "needs-revision" : "accepted", slots, feedback: errors.slice(0, 2).map((slot) => slot.feedback).join(" ") || null };
}

export function gradeStructureClassification(challenge, choices) {
  const assignments = challenge.grading.assignments || [];
  const results = assignments.map((item) => {
    const chosen = choices?.[item.item];
    if (!chosen) return { itemId: item.item, correct: false, outcome: "empty", feedback: `Choose what “${item.item.toUpperCase()}” describes.` };
    if (chosen === item.correct) return { itemId: item.item, correct: true, outcome: "accepted", feedback: null };
    return { itemId: item.item, correct: false, outcome: "misclassified", misconceptionId: item.misconceptionId, feedback: item.wrong?.[chosen] || "Reconsider which part of the response this value describes." };
  });
  const errors = results.filter((item) => !item.correct);
  return { correct: errors.length === 0, outcome: errors.length ? "needs-revision" : "accepted", items: results, feedback: errors.slice(0, 2).map((item) => `${item.itemId.toUpperCase()}: ${item.feedback}`).join(" ") || null };
}

export function gradeSelectNeeds(challenge, concretePaths, templates = {}) {
  const spec = challenge.grading;
  const policy = challenge.answer || {};
  const selected = [...new Set((concretePaths || []).map(normalizeSelection).filter(Boolean))];
  const requirements = spec.requirements || [];
  const matched = new Set();
  const required = requirements.map((requirement) => {
    const match = selected.find((path) => (requirement.accepted || []).some((accepted) => accepted.path === path));
    if (match) matched.add(match);
    return { id: requirement.id, label: requirement.label, correct: Boolean(match), selectedPath: match || null };
  });
  const optional = new Map((spec.optionalAllowed || []).map((item) => [item.path, item]));
  const distractors = new Map((spec.distractors || []).map((item) => [item.path, item]));
  const extras = selected.filter((path) => !matched.has(path) && !optional.has(path)).map((path) => {
    if (distractors.has(path)) {
      const item = distractors.get(path);
      const acceptedExtra = policy.extrasPolicy !== "minimal";
      return { path, role: item.class || "plausible-unnecessary", correct: acceptedExtra, misconceptionId: item.misconceptionId, feedback: item.feedback };
    }
    return { path, role: "unrelated", correct: false, feedback: "This response value is not needed for the feature described." };
  });
  const missing = required.filter((item) => !item.correct);
  const disallowedExtras = extras.filter((item) => !item.correct);
  const maxExtras = policy.extrasPolicy === "minimal" ? (policy.minimal?.maxExtras ?? 0) : Infinity;
  const correct = missing.length === 0 && disallowedExtras.length === 0 && extras.length <= maxExtras;
  const feedbackParts = [];
  for (const item of missing.slice(0, 2)) feedbackParts.push(`The feature still needs ${item.label.toLowerCase()}. Look for the value that supplies that information.`);
  if (feedbackParts.length < 2) for (const item of disallowedExtras.slice(0, 2 - feedbackParts.length)) feedbackParts.push(item.feedback);
  return { correct, outcome: correct ? "accepted" : "needs-revision", requirements: required, missing, extras, feedback: feedbackParts.join(" ") || null };
}

export function concreteForPath(path, body) {
  const found = resolve(path, body)[0];
  return found ? formatConcrete(found.tokens) : null;
}

export function readablePath(path) {
  return String(path).replace(/^\$\.?/, "").replace(/\.\[\]/g, "[]").replace(/\[\]/g, " › each item").replace(/\[(\d+)\]/g, " › item $1").replace(/\./g, " › ") || "response";
}

export function responseExplorerFormatName(format) {
  return ({ "find-data": "Find the Data", "understand-structure": "Understand the Structure", "select-needs": "Select What the App Needs" })[format] || format;
}

export function firstConcrete(structural, body) {
  const found = resolve(structural, body)[0];
  return found ? formatConcrete(found.tokens) : null;
}

export function acceptedConcretePaths(challenge, body) {
  return (challenge.grading?.accepted || []).map((item) => firstConcrete(item.path, body)).filter(Boolean);
}

export function structuralPathLabel(path) { return pathLabel(path); }
export function typeLabel(row) {
  if (row.type === "object") return `object {${Object.keys(row.value).length}}`;
  if (row.type === "array") return `array [${row.value.length}]`;
  return row.type;
}
