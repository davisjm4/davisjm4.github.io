/* Verify a hosted build fails visibly when compositional assets are unavailable. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const main = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
const stage = { children: [], textContent: 'old content', appendChild(x) { this.children.push(x); } };
const toolbar = { hidden: false };
const document = {
  getElementById(id) { return ({ main, stage, toolbar })[id] || null; },
  createElement(tag) {
    return { tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(x) { this.children.push(x); } };
  }
};
const context = {
  document,
  location: { protocol: 'https:' },
  RACECES: { dom: { el() {}, announce() {} }, Structure: {} }
};
vm.runInNewContext(fs.readFileSync('js/ui/app.js', 'utf8'), context, { filename: 'app.js' });
assert.strictEqual(toolbar.hidden, true, 'practice controls must remain hidden');
assert.strictEqual(stage.textContent, '', 'stale practice content must be cleared');
assert.strictEqual(stage.children.length, 1, 'one visible failure panel must be shown');
assert.strictEqual(stage.children[0].children[1].attrs.role, 'alert', 'the failure must be announced');
assert.match(stage.children[0].children[1].textContent, /compositional writing assets did not load/i);
assert.strictEqual(main.attrs['aria-busy'], 'false');
console.log('Production asset failure guard: 6 checks passed');
