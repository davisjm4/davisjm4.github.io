/* Workplace Readiness Games - content library index.
 * Turns raw authored content (skills, families, contexts, people, templates) into
 * lookup tables used by the generator, validator and coverage tools.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.library = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function byId(list) {
    var m = Object.create(null);
    list.forEach(function (x) { m[x.id] = x; });
    return m;
  }

  /* content: { skills:[], families:[], contexts:[], people:[], templates:[] } */
  function create(content) {
    var lib = {
      skills: content.skills,
      families: content.families,
      contexts: content.contexts,
      people: content.people,
      templates: content.templates,
      skillsById: byId(content.skills),
      familiesById: byId(content.families),
      contextsById: byId(content.contexts),
      templatesById: byId(content.templates),
      skillByCode: Object.create(null),
      conceptIds: Object.create(null)
    };
    content.skills.forEach(function (s) {
      lib.skillByCode[s.code] = s;
      s.concepts.forEach(function (c) { lib.conceptIds[c.id] = s.id; });
    });
    lib.templatesBySkill = Object.create(null);
    content.skills.forEach(function (s) { lib.templatesBySkill[s.id] = []; });
    content.templates.forEach(function (t) {
      if (lib.templatesBySkill[t.skill]) lib.templatesBySkill[t.skill].push(t);
    });
    lib.skillOrder = content.skills.slice().sort(function (a, b) { return a.number - b.number; }).map(function (s) { return s.id; });
    return lib;
  }

  /* Contexts a template may be rendered in, honouring "any". */
  function contextsFor(lib, template) {
    if (template.contexts === 'any' || !template.contexts) return lib.contexts.map(function (c) { return c.id; });
    return template.contexts.filter(function (id) { return lib.contextsById[id]; });
  }

  return { create: create, contextsFor: contextsFor };
}));
