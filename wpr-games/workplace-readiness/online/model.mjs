export const VERSION = 1;
export const MAX_QUESTIONS = 50;
export const MIN_CLASS = 5;
export const MODES = ['decision', 'nextstep', 'order', 'find'];
export const LEVELS = ['mixed', 'beginner', 'intermediate', 'advanced'];
export const RETENTION_DAYS = 90;
export const isId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
const str = (value, max, min = 0) => typeof value === 'string' && value.length >= min && value.length <= max;
const int = (value, lo, hi) => Number.isInteger(value) && value >= lo && value <= hi;

export function validateSnapshot(a, now = Date.now()) {
  if (!a || a.version !== VERSION || !str(a.title,120,1) || !a.title.trim() ||
      !['diagnostic','practice'].includes(a.kind) || !['immediate','after'].includes(a.feedbackTiming) ||
      !['once','repeat'].includes(a.retakes) || typeof a.shuffle !== 'boolean' ||
      typeof a.reporting !== 'boolean' || (a.kind === 'diagnostic' && !a.reporting) ||
      !(a.closes === null || int(a.closes, now + 1, now + RETENTION_DAYS * 86400000)) ||
      !Array.isArray(a.questions) || !int(a.questions.length,1,MAX_QUESTIONS)) return 'Check the title, dates, assignment settings and question count.';
  const ids = new Set(), signatures = new Set();
  for (const q of a.questions) {
    if (!q || !isId(q.id) || ids.has(q.id) || !str(q.reasoningSignature,500,1) ||
        signatures.has(q.reasoningSignature) || !isId(q.skillId) || !str(q.topic,130,1) || !isId(q.family) && !/^[a-z0-9-]+\.[a-z0-9-]+$/.test(q.family) ||
        !MODES.includes(q.modeId) || !LEVELS.slice(1).includes(q.difficulty) || !isId(q.contextId) || q.points !== 1 ||
        !str(q.context,2000) || !str(q.prompt,500,1) || !str(q.passage,3500) || !str(q.response,3500) ||
        !Array.isArray(q.choices) || q.choices.length !== 4 || q.choices.some(c => !str(c,600,1) || !c.trim()) ||
        new Set(q.choices.map(c => c.trim().replace(/\s+/g, ' ').toLowerCase())).size !== 4 ||
        !int(q.correctIndex,0,3) || q.correctAnswer !== q.choices[q.correctIndex] || !str(q.explanation,3000,1) ||
        !Array.isArray(q.tags) || q.tags.length > 20 ||
        q.tags.some(t => !t || !isId(t.topicId) || !str(t.topic,130,1) || !isId(t.subtopicId) || !str(t.subtopic,130,1)) ||
        new Set(q.tags.map(t => t.subtopicId)).size !== q.tags.length ||
        !Array.isArray(q.conceptIds) || !q.conceptIds.length || q.conceptIds.some(id => !str(id,160,1) || !id.startsWith(q.skillId + ':')) ||
        !Array.isArray(q.feedback) || q.feedback.length !== 4 ||
        q.feedback.some(f => !f || !str(f.misconception,1000) || !Array.isArray(f.lines) || !f.lines.length ||
          f.lines.some(l => !l || !str(l.kind,30,1) || !str(l.text,2000,1) ||
            (l.items !== undefined && (!Array.isArray(l.items) || l.items.some(t => !str(t,600,1)))))))
      return 'Question validation failed. Generate a fresh version before publishing.';
    ids.add(q.id);
    signatures.add(q.reasoningSignature);
  }
  return null;
}

export function publicQuestion(q) {
  const { id, context, prompt, choices, passage, response } = q;
  return { id, context, prompt, choices, passage, response };
}
export function publicAssignment(record, id) {
  const { title, kind, feedbackTiming, retakes, closes, reporting, shuffle } = record;
  return { id, version: VERSION, title, kind, feedbackTiming, retakes, closes, reporting, shuffle, questions: record.questions.map(publicQuestion) };
}
export function dimensions(q) {
  const map = new Map();
  const add = (scope, id, name, extra = {}) => map.set(scope + ':' + id, { scope, id, name, ...extra });
  add('skill', q.skillId, q.topic || q.skillId);
  for (const t of q.tags || []) {
    add('topic', t.topicId, t.topic);
    add('subtopic', t.subtopicId, t.subtopic, { topicId: t.topicId, topic: t.topic });
  }
  return [...map.values()];
}
export function answerReport(q, answer) {
  return { id:q.id, prompt:q.prompt, context:q.context, correct: answer === q.correctIndex, choice: q.choices[answer],
    best: q.correctAnswer, explanation: q.explanation, feedback: q.feedback[answer].lines,
    dimensions: dimensions(q) };
}
export function grade(record, answers, assignmentId, date) {
  if (!Array.isArray(answers) || answers.length !== record.questions.length ||
      answers.some(v => !int(v, 0, 3))) throw new Error('Answer every question before submitting.');
  let correct = 0;
  const rows = new Map(), aggregates = new Map();
  const bump = (key, n, c) => {
    const cell = aggregates.get(key) || { key, n:0, c:0, g:1 };
    cell.n += n; cell.c += c; aggregates.set(key, cell);
  };
  const review = record.questions.map((q, i) => {
    const right = Number(answers[i] === q.correctIndex);
    correct += right;
    bump('item:' + i, 1, right);
    bump('choice:' + i + ':' + answers[i], 1, right);
    for (const d of dimensions(q)) {
      const key = d.scope + ':' + d.id;
      const row = rows.get(key) || { ...d, n:0, c:0 };
      row.n++; row.c += right;
      rows.set(key, row);
      bump(key, 1, right);
    }
    return answerReport(q, answers[i]);
  });
  bump('overall', answers.length, correct);
  bump('score:' + Math.min(9, Math.floor(10 * correct / answers.length)), 1, 0);
  return { report: { version: VERSION, assignmentId, title: record.title, kind: record.kind, date,
    n: answers.length, c: correct, rows: [...rows.values()], review }, aggregates: [...aggregates.values()] };
}

export function evidence(n, c, settings = {}) {
  const { min = 3, focus = 0.6, ready = 0.8 } = settings;
  if (n === 0) return 'Not assessed';
  if (n < Math.max(3, min)) return 'Insufficient evidence';
  if (c / n < focus) return 'Needs focused practice';
  if (c / n < ready) return 'Developing';
  return 'Demonstrating readiness';
}

export function csv(rows) {
  return rows.map(row => row.map(value => {
    if (typeof value === 'number') return String(value);
    const raw = String(value ?? '');
    const safe = /^[\s\uFEFF]*[=+\-@]|^[\r\n\t]/u.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"','""') + '"';
  }).join(',')).join('\r\n') + '\r\n';
}

export const CSV_HEADER = ['schema_version','assessment_id','assessment_title','assessment_date','official_skill_id','official_skill_name',
  'topic_id','topic_name','subtopic_id','subtopic_name','questions_attempted','questions_correct','accuracy','evidence_status','recommended_practice_link','scope','record_kind'];
export function performanceCsv(report, linkFor, settings) {
  const scopeRows = [{scope:'overall',n:report.n,c:report.c},...report.rows];
  return csv([CSV_HEADER,...scopeRows.map(r=>[VERSION,report.assignmentId,report.title,report.date,
    r.scope==='skill'?r.id:'',r.scope==='skill'?r.name:'',r.scope==='topic'?r.id:r.topicId||'',
    r.scope==='topic'?r.name:r.topic||'',r.scope==='subtopic'?r.id:'',r.scope==='subtopic'?r.name:'',
    r.n,r.c,r.n?r.c/r.n:'',evidence(r.n,r.c,settings),r.scope==='overall'?'':linkFor(r),r.scope,report.kind])]);
}
