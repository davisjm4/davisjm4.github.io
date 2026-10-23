#!/usr/bin/env node
/* Builds js/data/content-bundle.js from the /content JSON source of truth.
   Never edit the bundle directly. Run `npm run build` after any content edit. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'content', 'topics');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

const topics = [];
const models = [];
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const t of arr) {
    const { models: ms, ...topic } = t;
    topic.source = f;
    topics.push(topic);
    for (const m of ms) models.push({ ...m, topicId: t.id });
  }
}

// Mathematics source records are deliberately separate from the narrative topic files.
// Each topic contributes 50 authored concept records; the adapter creates 18 bounded
// reasoning models per topic and sends them through the same response builder and graders.
const mathFiles = fs.readdirSync(path.join(root, 'content')).filter(f => /^math-[a-z0-9-]+\.json$/.test(f)).sort();
const mathTitles = {
  'math-algebraic-expressions': ['Algebraic Expressions and Vocabulary', 'Algebra uses symbols to describe quantities, relationships, and operations. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-equations-inequalities': ['Equations, Inequalities, and Solving', 'Solving means finding values that make a statement true while preserving its solution set. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-functions': ['Functions, Graphs, and Linear Relationships', 'Functions connect inputs to outputs, and representations reveal how those quantities are related. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-geometry': ['Geometry Fundamentals, Angles, and Lines', 'Geometry describes figures, their measurements, and the relationships that can be justified from definitions and theorems. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-triangles-polygons': ['Triangles, Polygons, and Similarity', 'Polygon properties and triangle relationships support precise geometric arguments. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-measurement': ['Area, Perimeter, Surface Area, and Volume', 'Measurement uses formulas and units to describe lengths, boundaries, surfaces, and three-dimensional space. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-coordinate-transformations': ['Coordinate Geometry and Transformations', 'Coordinates and transformation rules connect algebraic representations to geometric movement and shape. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.'],
  'math-statistics-probability': ['Statistics, Probability, and Data Interpretation', 'Statistics summarizes data, while probability describes uncertainty using a mathematical model. Definitions and worked examples make those relationships precise and support clear written mathematical reasoning.']
};
// Eighteen bounded model slots per topic: six direct-definition applications,
// six comparison/interpretation tasks, and six advanced validity/condition tasks.
// The subject-specific records determine the actual mathematical content.
const mathModels = [
  {family:'definition', type:'define', level:'beginner', q:(a,b)=>`What do ${a.term.toLowerCase()} and ${b.term.toLowerCase()} mean?`},
  {family:'definition-in-context', type:'define', level:'beginner', q:(a,b)=>`What does each definition say about ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'interpretation', type:'define', level:'beginner', q:(a,b)=>`What two mathematical ideas are described by ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'classification', type:'define', level:'beginner', q:(a,b)=>`How can the definitions distinguish ${a.term.toLowerCase()} from ${b.term.toLowerCase()}?`},
  {family:'evidence-link', type:'define', level:'beginner', q:(a,b)=>`What evidence supports the meanings of ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'vocabulary-in-context', type:'define', level:'beginner', q:(a,b)=>`What does each mathematical term ${a.term.toLowerCase()} and ${b.term.toLowerCase()} describe?`},
  {family:'comparison', type:'compare', level:'intermediate', q:(a,b)=>`How are ${a.term.toLowerCase()} and ${b.term.toLowerCase()} different, based on their definitions?`},
  {family:'representation', type:'compare', level:'intermediate', q:(a,b)=>`What does each written definition reveal about ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'true-claim', type:'compare', level:'intermediate', q:(a,b)=>`Which conclusion about ${a.term.toLowerCase()} and ${b.term.toLowerCase()} follows from their definitions?`},
  {family:'misconception-check', type:'compare', level:'intermediate', q:(a,b)=>`Why should ${a.term.toLowerCase()} and ${b.term.toLowerCase()} not be treated as interchangeable?`},
  {family:'reasoning-step', type:'compare', level:'intermediate', q:(a,b)=>`How do the definitions help a student distinguish ${a.term.toLowerCase()} from ${b.term.toLowerCase()}?`},
  {family:'relevance', type:'compare', level:'intermediate', q:(a,b)=>`Which parts of the definitions are relevant to explaining ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'conditions', type:'verify', level:'advanced', q:(a,b)=>`What conditions in the definitions matter when applying ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'validity', type:'verify', level:'advanced', q:(a,b)=>`How can each definition be checked for its required features when reasoning about ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'counterexample', type:'verify', level:'advanced', q:(a,b)=>`What does the difference between ${a.term.toLowerCase()} and ${b.term.toLowerCase()} reveal about confusing their meanings?`},
  {family:'application', type:'apply', level:'advanced', q:(a,b)=>`How would knowing the meanings of ${a.term.toLowerCase()} and ${b.term.toLowerCase()} help interpret a new case?`},
  {family:'evidence-evaluation', type:'apply', level:'advanced', q:(a,b)=>`Why are the supplied definitions relevant evidence for explaining ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'synthesis', type:'apply', level:'advanced', q:(a,b)=>`What broader conclusion about precise mathematical reasoning follows from ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`}
];
const sentence = s => s.trim().replace(/[.;,:]+$/, '');
const lowerFirst = s => s.length ? s[0].toLowerCase() + s.slice(1) : s;
const definitionStatement = r => {
  const definition = sentence(r.definition);
  if (/^(if|when)\b/i.test(definition)) return `The ${r.term.toLowerCase()} states that ${lowerFirst(definition)}.`;
  return `${r.term} means ${lowerFirst(definition)}.`;
};
for (const file of mathFiles) {
  const id = file.slice(0, -5), meta = mathTitles[id];
  if (!meta) throw new Error(`${file}: missing topic metadata`);
  const records = JSON.parse(fs.readFileSync(path.join(root, 'content', file), 'utf8'));
  if (records.length < 50) throw new Error(`${file}: needs at least 50 authored records`);
  const terms = new Set();
  const facts = records.map((r, i) => {
    if (!r.id || !r.topicId || !r.subtopic || !r.misconception || !r.validation || !r.term || !r.definition || !r.example || !r.correctAnswer || !r.supportingEvidence || !r.explanation || !r.compatibleQuestionTypes || !r.difficulty) throw new Error(`${file} record ${i+1}: incomplete validated record`);
    const normalized = r.term.toLowerCase().replace(/[^a-z0-9=+-]/g, '');
    if (terms.has(normalized)) throw new Error(`${file}: duplicate concept ${r.term}`);
    terms.add(normalized);
    const full = definitionStatement(r);
    return { id:r.id, text:full, ev:full, tag:r.term.toLowerCase() };
  });
  const topic = { id, subject:'Mathematics', title:meta[0], intro:`${meta[1]} Accurate evidence and explanations show why these mathematical ideas apply.`, facts, source:file };
  topics.push(topic);
  for (let i = 0; i < mathModels.length; i++) {
    const ai = (i * 2) % records.length, bi = (i * 2 + 1) % records.length, oi = (i * 2 + 2) % records.length;
    const a = records[ai], b = records[bi], off = records[oi], model = mathModels[i];
    const idModel = `${id}-model-${String(i+1).padStart(2,'0')}`;
    if (!a.compatibleQuestionTypes.includes(model.type) || !b.compatibleQuestionTypes.includes(model.type)) throw new Error(`${idModel}: incompatible question type ${model.type}`);
    models.push({ id:idModel, topicId:id, family:model.family, level:model.level,
      questionType:model.type, compatibleQuestionTypes:[model.type],
      q:model.q(a,b), restate:`The response explains what ${a.term.toLowerCase()} and ${b.term.toLowerCase()} mean and how their definitions support those meanings.`,
      answer:`${definitionStatement(a)} ${definitionStatement(b)}`,
      ev:[a.id,b.id],
      exp:[`This evidence names the defining idea of ${a.term.toLowerCase()}, which is exactly what the answer describes.`,
        `This second definition supports the distinct meaning of ${b.term.toLowerCase()} and adds a separate reason.`],
      sum:`Together, the definitions show why precise mathematical meanings help students explain their reasoning.`,
      sumNew:`Together, the definitions show why precise mathematical meanings help students explain their reasoning. The reading also defines ${off.term.toLowerCase()}.`,
      rep:[`This repeats the source detail about ${a.term.toLowerCase()} without explaining its connection.`,`This repeats the source detail about ${b.term.toLowerCase()} without explaining its connection.`],
      bad:`${a.term} and ${b.term} always have exactly the same meaning in every mathematical situation.`,
      badRestate:`The reading also defines ${off.term.toLowerCase()}.`, off:off.id,
      offExp:`The detail about ${off.term.toLowerCase()} is part of the topic, but it does not support this response.`,
      // Keep the bounded passage within its established word band when a selected
      // definition is unusually long or unusually concise.
      factCount: id === 'math-triangles-polygons' && (i === 4 || i === 5) ? 4
        : id === 'math-algebraic-expressions' && i === 15 ? 8
          : id === 'math-statistics-probability' && i === 5 ? 4
            : id === 'math-statistics-probability' && i === 7 ? 6 : undefined,
      });
  }
}

// Verified supplementary facts increase excerpt variety while keeping each generated passage
// within one topic. Source URLs are retained in the data bundle for editorial traceability.
const sourceFactGroups = JSON.parse(fs.readFileSync(path.join(root, 'content', 'source-facts.json'), 'utf8'));
const sourceTopicById = Object.fromEntries(topics.map(t => [t.id, t]));
for (const group of sourceFactGroups) {
  const topic = sourceTopicById[group.topicId];
  if (!topic) throw new Error(`Unknown source-fact topic: ${group.topicId}`);
  for (const fact of group.facts) {
    if (topic.facts.some(existing => existing.id === fact.id)) throw new Error(`${group.topicId}: duplicate source-fact id ${fact.id}`);
    if (!fact.sourceUrl || !/^https:\/\//.test(fact.sourceUrl)) throw new Error(`${group.topicId}/${fact.id}: source URL required`);
    topic.facts.push(fact);
  }
}

// Additional reasoning cases are kept in a separate, editable content source. Each case still
// points to two distinct, topic-grounded facts; the repeat and off-topic distractors are derived
// from those cited facts so the source relationships remain inspectable.
const expansions = JSON.parse(fs.readFileSync(path.join(root, 'content', 'model-expansions.json'), 'utf8'));
const topicById = Object.fromEntries(topics.map(t => [t.id, t]));
for (const group of expansions) {
  const topic = topicById[group.topicId];
  if (!topic) throw new Error(`Unknown expansion topic: ${group.topicId}`);
  const factById = Object.fromEntries(topic.facts.map(f => [f.id, f]));
  for (const c of group.models) {
    const [one, two] = c.ev.map(id => factById[id]);
    const off = factById[c.off];
    if (!one || !two || !off || c.ev[0] === c.ev[1] || c.ev.includes(c.off)) throw new Error(`${c.id}: invalid evidence references`);
    models.push({
      id: c.id, family: c.family, level: c.level, q: c.q, restate: c.restate, answer: c.answer,
      ev: c.ev, exp: c.exp,
      // An Explain distractor must represent the misconception “repeat the evidence”
      // without duplicating the visible Cite sentence verbatim.
      rep: [one, two].map(function (fact) {
        return 'This repeats the source detail about ' + fact.tag + ' without explaining its connection.';
      }),
      sum: c.sum,
      sumNew: c.sum + ' The passage also mentions ' + off.tag + '.',
      bad: c.bad,
      badRestate: 'The passage also describes ' + off.tag + '.',
      off: c.off,
      offExp: 'This detail about ' + off.tag + ' is included in the reading, but it does not explain why the answer follows.',
      topicId: group.topicId
    });
  }
}

const bundle = {
  schemaVersion: 1,
  topics,
  models,
  families: [...new Set(models.map(m => m.family))].sort(),
  subjects: [...new Set(topics.map(t => t.subject))].sort()
};

const out =
`/* AUTO-GENERATED by tools/build.js from /content. Do not edit. */
(function (root) {
  var DATA = ${JSON.stringify(bundle)};
  if (typeof module === 'object' && module.exports) module.exports = DATA;
  else { root.RACECES = root.RACECES || {}; root.RACECES.CONTENT = DATA; }
})(typeof self !== 'undefined' ? self : this);
`;
fs.mkdirSync(path.join(root, 'js', 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'js', 'data', 'content-bundle.js'), out);
console.log(`Built content bundle: ${topics.length} topics, ${models.length} writing models, ${bundle.families.length} reasoning families.`);
