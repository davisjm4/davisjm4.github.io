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
  'math-algebraic-expressions': ['Algebraic Expressions and Vocabulary', 'Algebra uses symbols to express quantities and relationships.'],
  'math-equations-inequalities': ['Equations, Inequalities, and Solving', 'Solving preserves the values that make equations and inequalities true.'],
  'math-functions': ['Functions, Graphs, and Linear Relationships', 'Functions assign outputs to inputs and have multiple representations.'],
  'math-geometry': ['Geometry Fundamentals, Angles, and Lines', 'Geometry studies figures, measurements, and relationships justified by definitions and theorems.'],
  'math-triangles-polygons': ['Triangles, Polygons, and Similarity', 'Polygon properties and triangle relationships support geometric arguments.'],
  'math-measurement': ['Area, Perimeter, Surface Area, and Volume', 'Measurement uses formulas and units for lengths, areas, and solids.'],
  'math-coordinate-transformations': ['Coordinate Geometry and Transformations', 'Coordinates connect algebraic rules to geometric locations and movement.'],
  'math-statistics-probability': ['Statistics, Probability, and Data Interpretation', 'Statistics summarizes data; probability models uncertain outcomes.']
};
// Bounded concept-pair assignments: 20 per topic and difficulty. These reuse
// a small set of explicit reasoning families but pair them with distinct audited
// concepts and worked examples. A model assignment is not a new reasoning family.
const mathModelTemplates = [
  {family:'definition', type:'define', level:'beginner', q:(a,b)=>`What do ${a.term.toLowerCase()} and ${b.term.toLowerCase()} mean?`},
  {family:'definition', type:'define', level:'beginner', q:(a,b)=>`What defining features does the passage give for ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'definition', type:'define', level:'beginner', q:(a,b)=>`What does each term ${a.term.toLowerCase()} and ${b.term.toLowerCase()} name?`},
  {family:'example-interpretation', type:'define', level:'beginner', q:(a,b)=>`What does the example for ${a.term.toLowerCase()} show, and what does the example for ${b.term.toLowerCase()} show?`},
  {family:'example-interpretation', type:'define', level:'beginner', q:(a,b)=>`How do the two worked examples illustrate ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'example-interpretation', type:'define', level:'beginner', q:(a,b)=>`Which mathematical idea does each example demonstrate: ${a.term.toLowerCase()} or ${b.term.toLowerCase()}?`},
  {family:'comparison', type:'compare', level:'intermediate', q:(a,b)=>`How do the defined meanings of ${a.term.toLowerCase()} and ${b.term.toLowerCase()} differ?`},
  {family:'comparison', type:'compare', level:'intermediate', q:(a,b)=>`What distinct role does each term, ${a.term.toLowerCase()} and ${b.term.toLowerCase()}, describe?`},
  {family:'comparison', type:'compare', level:'intermediate', q:(a,b)=>`Which defining features distinguish ${a.term.toLowerCase()} from ${b.term.toLowerCase()}?`},
  {family:'misconception-analysis', type:'compare', level:'intermediate', q:(a,b)=>`What mistake would a student make by treating ${a.term.toLowerCase()} and ${b.term.toLowerCase()} as interchangeable?`},
  {family:'misconception-analysis', type:'compare', level:'intermediate', q:(a,b)=>`What distinction would be lost if ${a.term.toLowerCase()} and ${b.term.toLowerCase()} meant the same thing?`},
  {family:'misconception-analysis', type:'compare', level:'intermediate', q:(a,b)=>`Which misconception about ${a.term.toLowerCase()} and ${b.term.toLowerCase()} do their definitions correct?`},
  {family:'criteria', type:'verify', level:'advanced', q:(a,b)=>`Which defining criteria identify ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'criteria', type:'verify', level:'advanced', q:(a,b)=>`What defining criteria would you check to decide whether a case is ${a.term.toLowerCase()} or ${b.term.toLowerCase()}?`},
  {family:'example-verification', type:'verify', level:'advanced', q:(a,b)=>`Do the examples meet the definitions of ${a.term.toLowerCase()} and ${b.term.toLowerCase()}? What conditions support each?`},
  {family:'example-verification', type:'verify', level:'advanced', q:(a,b)=>`How can each worked example be checked against the defining conditions of ${a.term.toLowerCase()} and ${b.term.toLowerCase()}?`},
  {family:'evidence-limits', type:'verify', level:'advanced', q:(a,b)=>`What do the two examples establish about ${a.term.toLowerCase()} and ${b.term.toLowerCase()}, and what would require more than these examples?`},
  {family:'evidence-limits', type:'verify', level:'advanced', q:(a,b)=>`How do the examples illustrate ${a.term.toLowerCase()} and ${b.term.toLowerCase()} without proving every possible case?`}
];
const mathModels = [];
for (const level of ['beginner','intermediate','advanced']) {
  const familyPlan = level === 'beginner' ? ['definition','example-interpretation']
    : level === 'intermediate' ? ['comparison','misconception-analysis']
      : ['criteria','example-verification','evidence-limits'];
  const variants = Object.fromEntries(familyPlan.map(f => [f, mathModelTemplates.filter(m => m.family === f)]));
  const used = Object.fromEntries(familyPlan.map(f => [f, 0]));
  for (let slot = 0; slot < 20; slot++) {
    const family = familyPlan[slot % familyPlan.length];
    const options = variants[family];
    const template = options[used[family] % options.length];
    mathModels.push(Object.assign({}, template, { level }));
    used[family]++;
  }
}
const sentence = s => s.trim().replace(/[.;,:]+$/, '');
const lowerFirst = s => s.length ? s[0].toLowerCase() + s.slice(1) : s;
const definitionStatement = r => {
  const definition = sentence(r.definition);
  if (/^(if|when)\b/i.test(definition)) return `The ${r.term.toLowerCase()} states that ${lowerFirst(definition)}.`;
  return `${r.term} means ${lowerFirst(definition)}.`;
};
const definitionEvidence = r => {
  const example = r.example.trim().replace(/[.;]+$/, '');
  return definitionStatement(r).replace(/[.]$/, '') + '; for example, ' + lowerFirst(example) + '.';
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
    return { id:r.id, text:full, ev:definitionEvidence(r), tag:r.term.toLowerCase() };
  });
  const topic = { id, subject:'Mathematics', title:meta[0], intro:meta[1], facts, source:file };
  topics.push(topic);
  for (let i = 0; i < mathModels.length; i++) {
    const ai = (i * 2) % records.length, bi = (i * 2 + 1) % records.length, oi = (i * 2 + 2) % records.length;
    const a = records[ai], b = records[bi], off = records[oi], model = mathModels[i];
    const idModel = `${id}-model-${String(i+1).padStart(2,'0')}`;
    if (!a.compatibleQuestionTypes.includes(model.type) || !b.compatibleQuestionTypes.includes(model.type)) throw new Error(`${idModel}: incompatible question type ${model.type}`);
    const aMeaning = lowerFirst(sentence(a.definition));
    const bMeaning = lowerFirst(sentence(b.definition));
    const answer = model.family === 'example-interpretation'
      ? `The first example illustrates ${a.term.toLowerCase()}, while the second illustrates ${b.term.toLowerCase()}.`
      : model.family === 'misconception-analysis'
        ? `They are not interchangeable: ${a.term.toLowerCase()} means ${aMeaning}, whereas ${b.term.toLowerCase()} means ${bMeaning}.`
        : model.family === 'example-verification'
          ? `Both examples fit their definitions: ${a.term.toLowerCase()} involves ${aMeaning}, and ${b.term.toLowerCase()} involves ${bMeaning}.`
          : model.family === 'evidence-limits'
            ? `Each example illustrates one case: ${a.term.toLowerCase()} involves ${aMeaning}, and ${b.term.toLowerCase()} involves ${bMeaning}. The definitions state the general criteria; these examples alone do not prove every case.`
            : `${a.term} means ${aMeaning}; by contrast, ${b.term.toLowerCase()} means ${bMeaning}.`;
    const sum = model.family === 'example-interpretation'
      ? `The first example illustrates ${a.term.toLowerCase()}, and the second illustrates ${b.term.toLowerCase()}.`
      : model.family === 'misconception-analysis'
        ? `The terms are distinct: ${a.term.toLowerCase()} means ${aMeaning}, while ${b.term.toLowerCase()} means ${bMeaning}.`
        : model.family === 'example-verification'
          ? `Together, the examples satisfy two different defining criteria.`
          : model.family === 'evidence-limits'
            ? `The examples illustrate individual cases; the definitions describe the broader rules.`
            : `The examples distinguish the terms: ${a.term.toLowerCase()} means ${aMeaning}, whereas ${b.term.toLowerCase()} means ${bMeaning}.`;
    models.push({ id:idModel, topicId:id, family:model.family, level:model.level,
      questionType:model.type, compatibleQuestionTypes:[model.type],
      q:model.q(a,b), restate:`The response distinguishes ${a.term.toLowerCase()} from ${b.term.toLowerCase()} using their definitions and worked examples.`,
      answer,
      ev:[a.id,b.id],
      exp:[`The example “${a.example.trim().replace(/[.;]+$/, '')}” fits ${a.term.toLowerCase()} because it shows this defining feature: ${lowerFirst(sentence(a.definition))}.`,
        `The separate example “${b.example.trim().replace(/[.;]+$/, '')}” fits ${b.term.toLowerCase()} because it shows this defining feature: ${lowerFirst(sentence(b.definition))}.`],
      sum,
      sumNew:`${sum.slice(0, -1)}. The passage also defines ${off.term.toLowerCase()}.`,
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
