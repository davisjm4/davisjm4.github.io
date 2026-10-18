/* Response Explorer Phase 2, Find the Data engine.
   This module is deliberately separate from the API Project Builder engine. */

export const RESPONSE_EXPLORER_MODE = "response-explorer";
export const FIND_DATA_FORMAT = "find-data";

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
  const exact = accepted.find((item) => item.path === structural);
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

export function providerName(library, id) {
  return library.providers?.find((provider) => provider.id === id)?.name || id;
}

export function findDataChallenges(data) {
  return (data.challenges || []).filter((challenge) => challenge.format === FIND_DATA_FORMAT);
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
