const fs = require('fs');
const path = require('path');
const bundle = require('../js/data/content-bundle.js');
const T = require('./lib.js');

const DIR = path.join(__dirname, '..', 'content');
const files = fs.readdirSync(DIR).filter(f => /^math-.*\.json$/.test(f)).sort();
const byTopic = new Map(files.map(f => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))]));
const byTerm = (topic, term) => byTopic.get(topic).find(r => r.term === term);
const definitionStatement = r => {
  const definition = r.definition.trim().replace(/[.;,:]+$/, '');
  return `The term “${r.term.toLowerCase()}” is defined this way: ${definition[0].toLowerCase()}${definition.slice(1)}.`;
};
const definitionEvidence = r => definitionStatement(r).replace(/[.]$/, '') + '; for example, ' + r.example.trim().replace(/[.;]+$/, '').replace(/^./, c => c.toLowerCase()) + '.';

function run() {
  T.suite('mathematics library records, model compatibility, and numerical fixtures', () => {
    T.eq(files.length, 8, 'all eight mathematics topics have source files');
    const pluralConcept = byTerm('math-geometry', 'Adjacent angles');
    T.ok(definitionStatement(pluralConcept).startsWith('The term “adjacent angles” is defined this way:'), 'plural concept definition uses a singular grammatical subject');
    const pluralModel = bundle.models.find(m => m.topicId === 'math-geometry' && m.family === 'example-verification' && m.answer.includes('adjacent angles'));
    T.ok(pluralModel, 'plural geometry example-verification model exists');
    if (pluralModel) {
      T.ok(!/(?:^|[.;:])\s*(?:adjacent angles|vertical angles) (?:means|involves)\b/i.test(pluralModel.answer), 'plural concept is not used with singular verb agreement');
      T.ok(pluralModel.q.startsWith('Do the examples meet the definitions'), 'verification question uses natural plural agreement');
    }
    const ids = new Set(), topics = new Set(), distinctConcepts = new Set();
    let recordCount = 0;
    for (const [topicId, records] of byTopic) {
      T.ok(records.length >= 50, topicId + ' has at least 50 records');
      const terms = new Set();
      for (const r of records) {
        recordCount++;
        T.ok(r.id && !ids.has(r.id), topicId + ' record id is present and globally unique');
        ids.add(r.id);
        T.eq(r.topicId, topicId, r.id + ' topic reference');
        T.ok(r.subtopic && r.term && r.definition && r.example, r.id + ' has concept and example');
        T.ok(r.correctAnswer && r.supportingEvidence && r.explanation, r.id + ' has answer, evidence, and explanation');
        T.eq(r.correctAnswer, r.definition, r.id + ' answer matches the definition');
        T.eq(r.supportingEvidence, r.example, r.id + ' evidence matches the worked example');
        T.ok(Array.isArray(r.compatibleQuestionTypes) && r.compatibleQuestionTypes.length >= 1, r.id + ' declares compatible question types');
        T.ok(r.misconception && r.difficulty, r.id + ' has misconception and difficulty');
        T.ok(r.validation && r.validation.status === 'reviewed' && /^https:\/\//.test(r.validation.referenceUrl), r.id + ' has review metadata and a reference');
        const norm = r.term.toLowerCase().replace(/[^a-z0-9=+-]/g, '');
        T.ok(!terms.has(norm), topicId + ' has distinct concept terms');
        terms.add(norm);
        const key = norm + '|' + r.definition.toLowerCase().replace(/[^a-z0-9]/g, '');
        T.ok(!distinctConcepts.has(key), 'term-definition concept is distinct from every other record');
        distinctConcepts.add(key);
      }
      const topic = bundle.topics.find(t => t.id === topicId);
      T.ok(topic, topicId + ' is in the student content bundle');
      T.ok(records.every(r => topic.facts.some(f => f.id === r.id)), topicId + ' loads every authored record as a source fact');
      T.ok(records.every(r => topic.facts.find(f => f.id === r.id).text === definitionStatement(r) && topic.facts.find(f => f.id === r.id).ev === definitionEvidence(r)), topicId + ' renders definitions and example-backed citations');
      topics.add(topicId);
      const models = bundle.models.filter(m => m.topicId === topicId);
      T.eq(models.length, 60, topicId + ' has 60 bounded concept-pair assignments');
      T.eq(new Set(models.map(m => m.family)).size, 7, topicId + ' reports seven actual reasoning families');
      for (const level of ['beginner','intermediate','advanced']) {
        T.eq(new Set(models.filter(m => m.level === level).map(m => m.family)).size, level === 'advanced' ? 3 : 2, topicId + ' has the documented reasoning-family mix at ' + level);
      }
      T.eq(models.filter(m => m.level === 'beginner').length, 20, topicId + ' has 20 beginner assignments');
      T.eq(models.filter(m => m.level === 'intermediate').length, 20, topicId + ' has 20 intermediate assignments');
      T.eq(models.filter(m => m.level === 'advanced').length, 20, topicId + ' has 20 advanced assignments');
      for (const m of models) {
        const evidenceRecords = m.ev.map(id => records.find(r => r.id === id));
        T.ok(m.answer.toLowerCase().includes(evidenceRecords[0].term.toLowerCase()) && m.answer.toLowerCase().includes(evidenceRecords[1].term.toLowerCase()), m.id + ' answer addresses both cited concepts');
        T.ok(m.exp.every((x, i) => x.includes(evidenceRecords[i].example.trim().replace(/[.;]+$/, ''))), m.id + ' explanations interpret the corresponding worked examples');
        T.ok(m.ev.length === 2 && m.ev[0] !== m.ev[1] && m.off !== m.ev[0] && m.off !== m.ev[1], m.id + ' cites two distinct records and a separate distractor record');
        T.ok(m.ev.every(id => records.some(r => r.id === id)) && records.some(r => r.id === m.off), m.id + ' references real concept records');
        T.ok(m.compatibleQuestionTypes.includes(m.questionType) && m.ev.every(id => records.find(r => r.id === id).compatibleQuestionTypes.includes(m.questionType)), m.id + ' model type is compatible with both evidence records');
      }
    }
    T.ok(recordCount >= 400, 'at least 400 distinct authored mathematics records');
    T.ok(distinctConcepts.size >= 400, 'at least 400 distinct term-definition concepts after exact duplicate detection');
    T.eq(topics.size, 8, 'all mathematics topics are included in RACECES');

    const fixtures = [
      ['math-algebraic-expressions','Simplify','2x+5x simplifies to 7x.', 2*3+5*3, 21],
      ['math-equations-inequalities','Solution of an equation','x=4 solves 2x=8.', 2*4, 8],
      ['math-equations-inequalities','Reverse inequality rule','-2x<6 becomes x>-3.', (-6)/2, -3],
      ['math-functions','Output','the output for input 3 is 7.', 2*3+1, 7],
      ['math-geometry','Vertical angles','vertical angle is also 48 degrees.', 48, 48],
      ['math-triangles-polygons','Interior angle sum of a triangle','the third is 70 degrees.', 180-45-65, 70],
      ['math-triangles-polygons','Pythagorean theorem','3²+4²=5²', 3*3+4*4, 5*5],
      ['math-measurement','Perimeter','perimeter 22 cm.', 2*(4+7), 22],
      ['math-measurement','Area','area 28 square centimeters.', 4*7, 28],
      ['math-measurement','Volume','volume 24 cubic units.', 2*3*4, 24],
      ['math-coordinate-transformations','Distance formula','distance from (0,0) to (3,4) is 5.', Math.hypot(3,4), 5],
      ['math-coordinate-transformations','Midpoint formula','midpoint of (2,4) and (6,8) is (4,6).', (2+6)/2, 4],
      ['math-coordinate-transformations','Slope formula','slope is 2.', (8-2)/(4-1), 2],
      ['math-coordinate-transformations','Quarter-turn counterclockwise','(2,5) maps to (-5,2).', -5, -5],
      ['math-statistics-probability','Mean','mean of 2, 4, and 9 is 5.', (2+4+9)/3, 5],
      ['math-statistics-probability','Range','range is 8.', 11-3, 8],
      ['math-statistics-probability','Relative frequency','relative frequency 0.20, or 20%.', 12/60, 0.2],
      ['math-statistics-probability','Multiplication rule for independent events','probability 1/2·1/2=1/4.', 0.5*0.5, 0.25],
      ['math-statistics-probability','Expected value','expected value is (1+2+3+4+5+6)/6=3.5.', (1+2+3+4+5+6)/6, 3.5],
      ['math-algebraic-expressions','Difference of squares','x²-25=(x-5)(x+5).', 5*5-25, 0],
      ['math-algebraic-expressions','Order of operations','2+3·4=14 because multiplication precedes addition', 2+3*4, 14],
      ['math-algebraic-expressions','Order of operations','18÷3×2=12 because division and multiplication are evaluated left to right.', 18/3*2, 12],
      ['math-equations-inequalities','Absolute value less-than inequality','For r=3, |x|<3 means -3<x<3.', Math.abs(2) < 3, true],
      ['math-equations-inequalities','Absolute value greater-than inequality','For r=3, |x|>3 means x<-3 or x>3.', Math.abs(4) > 3, true],
      ['math-coordinate-transformations','Slope formula','Between (1,2) and (4,8), slope is 2.', (8-2)/(4-1), 2],
      ['math-measurement','Surface area','A cube with side length 2 has surface area 24 square units.', 6*2*2, 24],
      ['math-measurement','Lateral area','A cylinder\'s lateral area is 2πrh.', 2*Math.PI*2*5, 20*Math.PI],
      ['math-statistics-probability','Conditional probability','the proportion who walk given that they ride a bus is 8/20.', 8/20, 0.4],
      ['math-statistics-probability','Independent events','the event that the first is heads is independent of the event that the second is heads.', 0.5*0.5, 0.25]
    ];
    for (const [topic, term, phrase, actual, expected] of fixtures) {
      const r = byTerm(topic, term);
      T.ok(r, 'fixture record exists: ' + term);
      if (!r) continue;
      T.eq(actual, expected, term + ' independent arithmetic');
      T.ok(r.example.toLowerCase().includes(phrase.toLowerCase()), term + ' authored example matches the fixture');
    }
  });
}

module.exports = { run };
