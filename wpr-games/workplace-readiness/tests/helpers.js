'use strict';
const { loadLibrary } = require('../tools/load-library.js');
const library = require('../js/core/library.js');
const base = loadLibrary();
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function freshLib() { return library.create(clone({ skills: base.skills, families: base.families, contexts: base.contexts, people: base.people, templates: base.templates })); }
function tpl(id) { return clone(base.templatesById[id]); }
// library with one template replaced/mutated, for negative tests
function libWith(id, mutate) {
  const t = tpl(id); mutate(t);
  const c = clone({ skills: base.skills, families: base.families, contexts: base.contexts, people: base.people, templates: base.templates });
  c.templates = c.templates.map(x => x.id === id ? t : x);
  return { lib: library.create(c), template: t };
}
function deepFreeze(o) { Object.freeze(o); Object.values(o).forEach(v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); }); return o; }
module.exports = { base, clone, tpl, libWith, freshLib, deepFreeze };
