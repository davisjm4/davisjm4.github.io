/* Workplace Readiness Games - schema constants shared by generator, validator and UI.
 * Authored instructional content lives in /content (JSON); this file holds only structure.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.schema = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODES = {
    decision: { id: 'decision', code: 'D', label: 'Workplace Decisions', short: 'Decisions', weight: 0.40,
      blurb: 'Read a situation and choose the most appropriate response.' },
    nextstep: { id: 'nextstep', code: 'N', label: 'Best Next Step', short: 'Next Step', weight: 0.25,
      blurb: 'Decide what to do first, given the timing and priorities.' },
    order: { id: 'order', code: 'O', label: 'Put the Steps in Order', short: 'Order', weight: 0.20,
      blurb: 'Arrange workplace actions into a sensible sequence.' },
    find: { id: 'find', code: 'F', label: 'Find the Problem', short: 'Find Problem', weight: 0.15,
      blurb: 'Spot the one line or action that does not belong.' }
  };

  var DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
  var DIFFICULTY_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  var CATEGORIES = {
    personal: { id: 'personal', label: 'Personal Qualities and Abilities' },
    interpersonal: { id: 'interpersonal', label: 'Interpersonal Skills' },
    professional: { id: 'professional', label: 'Professional Competencies' }
  };

  var CONTEXTS = {
    healthcare: 'Healthcare', construction: 'Construction', hospitality: 'Hospitality',
    culinary: 'Culinary Arts', business: 'Business and Finance', retail: 'Retail',
    education: 'Education', automotive: 'Automotive Technology', manufacturing: 'Manufacturing',
    agriculture: 'Agriculture', engineering: 'Engineering', it: 'Information Technology',
    media: 'Digital Media and Design'
  };

  /* Context "setting bundles" are coherent: every field in one bundle belongs to the same
   * workplace, so generated text never mixes (for example) a dental role with a kitchen hazard.
   * form 'bare'  : lower-case noun without determiner; templates add {slot|a} or {slot|the}.
   * form 'phrase': complete noun phrase that reads correctly on its own.
   * A field may be a string, {text, plural}, or an array of those (one is chosen per instance). */
  var SLOTS = {
    workplace:   { form: 'bare',   desc: 'a place of work' },
    role:        { form: 'bare',   desc: 'an entry-level job title' },
    lead:        { form: 'bare',   desc: 'the person the employee reports to day to day' },
    client:      { form: 'bare',   desc: 'a person the workplace serves', plural: true },
    record:      { form: 'bare',   desc: 'a log, sheet or form the employee keeps accurate' },
    equipment:   { form: 'bare',   desc: 'shared equipment that is inspected, used or reported on' },
    system:      { form: 'bare',   desc: 'software or system used to store or send information' },
    document:    { form: 'bare',   desc: 'a work document such as a ticket, note or order' },
    deliverable: { form: 'bare',   desc: 'a finished product or completed piece of work' },
    task:        { form: 'bare',   desc: 'a recurring duty or checklist' },
    hazard:      { form: 'phrase', desc: 'a safety hazard anyone would recognize without special training' }
  };

  var PERSON_SLOT = 'person';
  var PRONOUN_KEYS = ['subj', 'obj', 'poss', 'refl'];

  /* Text that must never appear in scenarios/prompts because it gives the answer away
   * or names the target skill instead of requiring interpretation. */
  var SCENARIO_LEAK_PHRASES = [
    'the right thing', 'the best choice', 'the correct', 'the ethical', 'the professional thing',
    'should do', 'what is best', 'integrity', 'work ethic', 'teamwork', 'professionalism',
    'critical thinking', 'conflict resolution', 'workplace readiness'
  ];

  /* Distractors must be plausible. These words signal an absurd or cartoonish option. */
  var ABSURD_OPTION_WORDS = ['yell', 'scream', 'curse', 'punch', 'steal', 'sabotage', 'quit your job', 'laugh at', 'insult'];

  /* Jurisdiction-specific or mandatory-law claims need explicit template review. */
  var LEGAL_CLAIM_PATTERNS = [
    /\bby law\b/i, /\blegally (required|obligated|allowed)\b/i, /\bit is illegal\b/i,
    /\bOSHA (requires|says|states|rules)\b/i, /\bfederal law\b/i, /\bstate law\b/i,
    /\bwill be (fired|sued|arrested)\b/i
  ];

  var LIMITS = {
    optionCount: 4,
    stepsMin: 3, stepsMax: 5,
    segmentsMin: 3, segmentsMax: 7,
    maxOrderValidFraction: 0.25,
    scenarioWords: { beginner: 60, intermediate: 80, advanced: 100 },
    feedbackWords: 48,
    optionWordsMax: 36,
    optionWordsMin: 5,
    bestLongestRatio: 1.25
  };

  var REVIEW_REQUIRED_SKILLS = ['workplace-safety', 'information-security', 'integrity', 'career-and-life-management', 'mathematics'];

  return {
    MODES: MODES, DIFFICULTIES: DIFFICULTIES, DIFFICULTY_LABELS: DIFFICULTY_LABELS,
    CATEGORIES: CATEGORIES, CONTEXTS: CONTEXTS, SLOTS: SLOTS, PERSON_SLOT: PERSON_SLOT,
    PRONOUN_KEYS: PRONOUN_KEYS, SCENARIO_LEAK_PHRASES: SCENARIO_LEAK_PHRASES,
    ABSURD_OPTION_WORDS: ABSURD_OPTION_WORDS, LEGAL_CLAIM_PATTERNS: LEGAL_CLAIM_PATTERNS,
    LIMITS: LIMITS, REVIEW_REQUIRED_SKILLS: REVIEW_REQUIRED_SKILLS
  };
}));
