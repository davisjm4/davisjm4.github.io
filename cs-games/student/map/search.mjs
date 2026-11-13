const aliases = {
  'node:advanced:math-lab:modulus': ['modulo', 'remainder', '%'],
  'node:advanced:string-lab:index': ['indexOf', 'find index', 'find a character index'],
  'node:advanced:string-lab:predict': ['substring', 'substring extraction'],
  'node:advanced:string-lab:expr': ['substring', 'substring extraction'],
  'node:advanced:loop-lab:nested': ['nested loops', 'loop inside a loop'],
  'node:advanced:array-lab:nested': ['nested loops', '2D traversal'],
  'node:advanced:class-object-lab:this': ['parameters', 'parameter shadowing'],
  'node:advanced:boolean-conditional-lab:branch': ['conditional statements', 'if else', 'branch'],
  'node:csp:algorithm-architect:CSP-SELECTION': ['conditional statements', 'selection', 'if else'],
  'node:csp:binary-builder:CSP-BINARY': ['binary representation', 'base 2'],
  'node:csp:binary-builder:CSP-REPRESENTATION': ['binary representation', 'digital representation'],
};

const normalize = text => text.normalize('NFKC').toLowerCase()
  .replace(/\(\s*\)/g, '').replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();

export function searchSkills(model, query) {
  const term = normalize(query);
  if (!term) return [];
  return model.stops.flatMap(stop => stop.nodes.flatMap(node => {
    const matches = [node.title, ...(aliases[node.id] ?? []), node.objective].filter(Boolean);
    const exact = matches.find(label => normalize(label) === term);
    const partial = matches.find(label => normalize(label).includes(term));
    const area = normalize(stop.baseTitle ?? stop.title).includes(term);
    if (!exact && !partial && !area) return [];
    return [{ node, stop, match: exact ?? partial ?? stop.baseTitle ?? stop.title, rank: exact ? 0 : partial ? 1 : 2 }];
  })).sort((a, b) => a.rank - b.rank);
}
