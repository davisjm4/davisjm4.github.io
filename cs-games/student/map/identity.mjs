// A visual identity for every learning area: hue, icon, and a backdrop motif. Known Advanced CS labs get hand-picked identities;
// any other area (AP CSP, Workplace, Robotics, or a lab added later) is matched by keyword, then by a stable hash of its id,
// so a new area always gets a consistent identity without code changes.
const KNOWN = {
  'variable-lab': { hue: 168, icon: 'variable', motif: 'dots' },
  'math-lab': { hue: 32, icon: 'math', motif: 'diagonals' },
  'boolean-conditional-lab': { hue: 268, icon: 'branch', motif: 'circuit' },
  'string-lab': { hue: 330, icon: 'string', motif: 'waves' },
  'loop-lab': { hue: 198, icon: 'loop', motif: 'rings' },
  'array-lab': { hue: 142, icon: 'array', motif: 'grid' },
  'arraylist-lab': { hue: 158, icon: 'arraylist', motif: 'grid' },
  'linkedlist-lab': { hue: 18, icon: 'linkedlist', motif: 'circuit' },
  'method-constructor-lab': { hue: 232, icon: 'method', motif: 'dots' },
  'class-object-lab': { hue: 48, icon: 'cube', motif: 'hex' },
  'inheritance-polymorphism-lab': { hue: 296, icon: 'tree', motif: 'hex' },
  'search-sort-lab': { hue: 214, icon: 'search', motif: 'grid' },
  'recursion-lab': { hue: 350, icon: 'nested', motif: 'rings' },
  'debugger-lab': { hue: 8, icon: 'bug', motif: 'diagonals' },
  'documentation-lab': { hue: 182, icon: 'page', motif: 'waves' },
  'robot-algorithms': { hue: 84, icon: 'robot', motif: 'circuit' },
};
const KEYWORDS = [
  [/binary|bit|ascii|character/, 'binary', 'dots'], [/rgb|color|colour/, 'palette', 'rings'], [/search|sort|hunt/, 'search', 'grid'], [/list|array/, 'array', 'grid'],
  [/boolean|condition|gate/, 'branch', 'circuit'], [/algorithm|loop|iteration/, 'loop', 'rings'], [/network|internet|protocol|packet|tcp|udp/, 'network', 'circuit'],
  [/data|detective|analysis|analog|digital/, 'chart', 'waves'], [/test|trivial|checklist/, 'checklist', 'grid'], [/code|create|response|function|program/, 'bolt', 'diagonals'],
  [/compress|lossless|lossy|round|overflow|numeric/, 'math', 'diagonals'], [/part|robot|motion|structure|fastener|spacing|transmission/, 'gear', 'hex'],
  [/vocabulary|term|reading|writing|document|page/, 'page', 'waves'], [/work|career|professional|communication|team|readiness/, 'briefcase', 'dots'],
];
const COURSE_FALLBACK = { advanced: 'cube', csp: 'compass', workplace: 'briefcase', robotics: 'gear' };
const MOTIFS = ['dots', 'grid', 'waves', 'diagonals', 'rings', 'circuit', 'hex'];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export const areaSlug = (areaId) => String(areaId ?? '').split(':').at(-1);
export function areaIdentity(areaId, courseId = '') {
  const slug = areaSlug(areaId);
  if (KNOWN[slug]) return { ...KNOWN[slug], slug };
  const h = hash(String(areaId));
  const hit = KEYWORDS.find(([re]) => re.test(slug));
  return { hue: h % 360, icon: hit ? hit[1] : (COURSE_FALLBACK[courseId] ?? 'compass'), motif: hit ? hit[2] : MOTIFS[h % MOTIFS.length], slug };
}
