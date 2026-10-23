const fs = require('fs');
const path = require('path');
const bundle = require('../js/data/content-bundle.js');
const T = require('./lib.js');

const DIR = path.join(__dirname, '..', 'content');
const files = fs.readdirSync(DIR).filter(f => /^math-.*\.json$/.test(f)).sort();
const byTopic = new Map(files.map(f => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))]));
const byTerm = (topic, term) => byTopic.get(topic).find(r => r.term === term);

function run() {
  T.suite('mathematics library records, model compatibility, and numerical fixtures', () => {
    T.eq(files.length, 8, 'all eight mathematics topics have source files');
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
      T.ok(records.every(r => topic.facts.find(f => f.id === r.id).text === `${r.term} means ${r.definition[0].toLowerCase()}${r.definition.slice(1).replace(/[.;,:]+$/, '')}.`), topicId + ' renders definitions as grammatical source evidence');
      topics.add(topicId);
      const models = bundle.models.filter(m => m.topicId === topicId);
      T.eq(models.length, 18, topicId + ' has 18 authored reasoning models');
      T.eq(new Set(models.map(m => m.family)).size, 18, topicId + ' has distinct reasoning-model families');
      T.eq(models.filter(m => m.level === 'beginner').length, 6, topicId + ' has six beginner models');
      T.eq(models.filter(m => m.level === 'intermediate').length, 6, topicId + ' has six intermediate models');
      T.eq(models.filter(m => m.level === 'advanced').length, 6, topicId + ' has six advanced models');
      for (const m of models) {
        T.ok(!/means\s+[A-Z]/.test(m.answer), m.id + ' does not duplicate the definition opener');
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
      ['math-statistics-probability','Expected value','expected value is (1+2+3+4+5+6)/6=3.5.', (1+2+3+4+5+6)/6, 3.5]
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
