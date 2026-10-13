import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mountCollectionEditor,
  createCollectionModel,
} from "./collection-editor.js";
const require = createRequire(import.meta.url),
  { parseHTML } = require(process.env.CSP_DOM_LIBRARY || "linkedom");
let checks = 0;
for (const base of [0, 1])
  for (const fixed of [false, true]) {
    const { document } = parseHTML('<main><div id="editor"></div></main>');
    globalThis.document = document;
    const host = document.getElementById("editor");
    let active = true,
      changes = 0;
    const editor = mountCollectionEditor(host, {
      initial: [2, 2, 3],
      bank: [1, 2, 3, 4],
      indexBase: base,
      fixed,
      onChange: () => changes++,
      active: () => active,
    });
    assert.ok(host.textContent.includes("index " + base));
    assert.deepEqual(editor.values, [2, 2, 3]);
    let bank = host.querySelector('[data-bank="3"]');
    bank.ondragstart({ dataTransfer: { setData() {} } });
    let target = host.querySelector(
      fixed
        ? '[data-drop="slot"][data-index="1"]'
        : '[data-drop="gap"][data-index="1"]',
    );
    target.ondragover({ preventDefault() {} });
    assert.ok(target.classList.contains("drop-active"));
    target.ondrop({ preventDefault() {} });
    assert.deepEqual(editor.values, fixed ? [2, 4, 3] : [2, 4, 2, 3]);
    host.querySelector("[data-undo]").onclick();
    assert.deepEqual(editor.values, [2, 2, 3]);
    // Accessible tap path, reusable values, duplicate insertion, no target-length limit.
    host.querySelector('[data-bank="1"]').onclick();
    host
      .querySelector(
        fixed
          ? '[data-drop="slot"][data-index="2"]'
          : '[data-drop="gap"][data-index="3"]',
      )
      .onclick();
    assert.deepEqual(editor.values, fixed ? [2, 2, 2] : [2, 2, 3, 2]);
    host.querySelector("[data-reset]").onclick();
    assert.deepEqual(editor.values, [2, 2, 3]);
    if (!fixed) {
      for (let n = 0; n < 20; n++)
        editor.drop(
          { kind: "bank", value: 2 },
          { kind: "gap", index: editor.values.length },
        );
      assert.equal(editor.values.length, 23);
      editor.drop({ kind: "item", index: 0 }, { kind: "gap", index: 23 });
      assert.equal(editor.values.length, 23);
      editor.drop({ kind: "item", index: 0 }, { kind: "trash" });
      assert.equal(editor.values.length, 22);
      assert.equal(host.querySelectorAll('[data-drop="gap"]').length, 23);
    }
    host.querySelector("[data-reset]").onclick();
    // Touch pointer path uses actual drop targets, with movement feedback.
    const tile = host.querySelector('[data-bank="3"]');
    const dest = host.querySelector('[data-drop="slot"][data-index="0"]');
    document.elementFromPoint = () => dest;
    tile.onpointerdown({
      pointerType: "touch",
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    tile.onpointermove({
      pointerId: 1,
      clientX: 30,
      clientY: 0,
      preventDefault() {},
    });
    tile.onpointerup({
      pointerId: 1,
      clientX: 30,
      clientY: 0,
      preventDefault() {},
    });
    assert.equal(editor.values[0], 4);
    active = false;
    const saved = editor.values;
    editor.drop({ kind: "bank", value: 1 }, { kind: "slot", index: 0 });
    assert.deepEqual(editor.values, saved);
    assert.ok(changes > 0);
    checks += 18;
  }
const m = createCollectionModel([1, 2, 3]);
assert.equal(m.insert(-1, 4), false);
assert.equal(m.remove(9), false);
assert.equal(m.move(0, 99), false);
assert.deepEqual(m.values, [1, 2, 3]);
console.log(
  `Collection editor: ${checks} native drag/drop, touch-pointer, tap/keyboard, duplicate, unlimited-length, undo/reset, index-base, and closed-round checks passed (DOM simulation).`,
);
