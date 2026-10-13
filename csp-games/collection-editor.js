// Shared manipulation model. Index base is explicit at every call site.
export function createCollectionModel(initial, { fixed = false } = {}) {
  let values = [...initial],
    history = [];
  function change(next) {
    history.push([...values]);
    if (history.length > 200) history.shift();
    values = next;
    return true;
  }
  return {
    get values() {
      return [...values];
    },
    get canUndo() {
      return history.length > 0;
    },
    insert(index, value) {
      if (
        fixed ||
        !Number.isInteger(index) ||
        index < 0 ||
        index > values.length
      )
        return false;
      const next = [...values];
      next.splice(index, 0, value);
      return change(next);
    },
    replace(index, value) {
      if (index < 0 || index >= values.length) return false;
      const next = [...values];
      next[index] = value;
      return change(next);
    },
    remove(index) {
      if (fixed || index < 0 || index >= values.length) return false;
      const next = [...values];
      next.splice(index, 1);
      return change(next);
    },
    move(from, to) {
      if (from < 0 || from >= values.length || to < 0 || to > values.length)
        return false;
      const next = [...values];
      if (fixed) {
        if (to >= values.length) return false;
        [next[from], next[to]] = [next[to], next[from]];
      } else {
        const [v] = next.splice(from, 1);
        next.splice(to > from ? to - 1 : to, 0, v);
      }
      return change(next);
    },
    load(next) {
      if (!Array.isArray(next) || (fixed && next.length !== initial.length))
        return false;
      return change([...next]);
    },
    undo() {
      if (!history.length) return false;
      values = history.pop();
      return true;
    },
    reset() {
      return change([...initial]);
    },
  };
}
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function mountCollectionEditor(
  host,
  {
    initial,
    bank,
    indexBase,
    fixed = false,
    columns = 0,
    onChange = () => {},
    active = () => true,
  },
) {
  if (![0, 1].includes(indexBase))
    throw Error("Specify zero- or one-based indexing");
  host.classList.add("collection-editor");
  const model = createCollectionModel(initial, { fixed });
  let selected = null,
    drag = null,
    suppressClick = false;
  function apply(target) {
    if (!selected || !active()) return false;
    let changed = false;
    if (target.kind === "trash") {
      if (selected.kind === "item") changed = model.remove(selected.index);
    } else if (target.kind === "slot") {
      changed =
        selected.kind === "bank"
          ? model.replace(target.index, selected.value)
          : model.move(selected.index, target.index);
    } else if (target.kind === "gap") {
      changed =
        selected.kind === "bank"
          ? model.insert(target.index, selected.value)
          : model.move(selected.index, target.index);
    }
    if (changed) {
      selected = null;
      onChange(model.values);
      render();
    }
    return changed;
  }
  function tokens(values, editable) {
    return values
      .map(
        (v, i) =>
          `<div class="collection-item"><small>${columns ? `[${Math.floor(i / columns)}][${i % columns}]` : `index ${i + indexBase}`}</small><button ${editable ? `draggable="true" data-item="${i}" data-drop="slot" data-index="${i}"` : ""} class="collection-value" aria-label="${editable ? "Select or drag" : "Starting"} value ${esc(v)} at ${columns ? `row ${Math.floor(i / columns)}, column ${i % columns}` : `index ${i + indexBase}`}">${esc(v)}</button></div>`,
      )
      .join("");
  }
  function render() {
    const values = model.values;
    host.innerHTML = `<p class="muted">Drag a bank value or an existing element. Touch/keyboard alternative: select a value, then tap a gap, element, or removal area. ${fixed ? "Arrays have fixed length: drop onto an element to replace it, or swap existing elements." : "Gaps insert. A bank value dropped on an element replaces it; existing elements can be dragged to rearrange. The list grows and shrinks freely."}</p><h3>Starting collection</h3><div class="collection-row collection-start" ${columns ? `style="display:grid;grid-template-columns:repeat(${columns},minmax(50px,1fr))"` : ""}>${tokens(initial, false)}</div><h3>Value bank (reusable)</h3><div class="collection-bank">${bank.map((v, i) => `<button draggable="true" class="secondary collection-value" data-bank="${i}">${esc(v)}</button>`).join("")}</div><h3>Working collection</h3><div class="collection-row collection-work" ${columns ? `style="display:grid;grid-template-columns:repeat(${columns},minmax(50px,1fr))"` : ""}>${
      fixed
        ? tokens(values, true)
        : Array.from(
            { length: values.length + 1 },
            (_, i) =>
              `<button class="collection-gap secondary" data-drop="gap" data-index="${i}" aria-label="Insert before index ${i + indexBase}">+</button>${
                i < values.length
                  ? tokens([values[i]], true)
                      .replaceAll(
                        "index " + indexBase,
                        "index " + (i + indexBase),
                      )
                      .replaceAll('data-item="0"', `data-item="${i}"`)
                      .replaceAll('data-index="0"', `data-index="${i}"`)
                  : ""
              }`,
          ).join("")
    }</div>${!fixed ? '<button class="collection-trash secondary" data-drop="trash">Remove / Trash — drop an existing element here</button>' : ""}<p class="collection-selection" role="status">${selected ? `Selected ${selected.kind === "bank" ? "bank value " + selected.value : "element at index " + (selected.index + indexBase)}. Choose a destination.` : "No value selected."}</p><div class="row"><button class="secondary" data-undo ${!model.canUndo ? "disabled" : ""}>Undo</button><button class="secondary" data-reset>Reset Working Collection</button></div>`;
    for (const el of host.querySelectorAll("[data-bank],[data-item]")) {
      const payload = () =>
        el.hasAttribute("data-bank")
          ? { kind: "bank", value: bank[Number(el.dataset.bank)] }
          : { kind: "item", index: Number(el.dataset.item) };
      el.onclick = () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        if (!active()) return;
        if (selected && el.hasAttribute("data-drop")) {
          apply({ kind: el.dataset.drop, index: Number(el.dataset.index) });
          return;
        }
        selected = payload();
        render();
      };
      el.ondragstart = (e) => {
        if (!active()) {
          e.preventDefault();
          return;
        }
        selected = payload();
        e.dataTransfer?.setData("text/plain", "collection-value");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "copyMove";
        host.classList.add("dragging");
      };
      el.ondragend = () => {
        host.classList.remove("dragging");
        for (const d of host.querySelectorAll(".drop-active"))
          d.classList.remove("drop-active");
      };
      el.onpointerdown = (e) => {
        if (e.pointerType === "mouse" || !active()) return;
        drag = {
          payload: payload(),
          x: e.clientX,
          y: e.clientY,
          moved: false,
          id: e.pointerId,
        };
        el.setPointerCapture?.(e.pointerId);
      };
      el.onpointermove = (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
          drag.moved = true;
          selected = drag.payload;
          e.preventDefault();
          host.classList.add("dragging");
          for (const d of host.querySelectorAll("[data-drop]"))
            d.classList.toggle(
              "drop-active",
              d ===
                document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest("[data-drop]"),
            );
        }
      };
      el.onpointerup = (e) => {
        if (!drag) return;
        const was = drag;
        drag = null;
        host.classList.remove("dragging");
        if (was.moved) {
          suppressClick = true;
          e.preventDefault();
          selected = was.payload;
          const target = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest("[data-drop]");
          if (target && host.contains(target))
            apply({
              kind: target.dataset.drop,
              index: Number(target.dataset.index),
            });
        }
      };
      el.onpointercancel = () => {
        drag = null;
        host.classList.remove("dragging");
      };
    }
    for (const el of host.querySelectorAll("[data-drop]")) {
      el.ondragover = (e) => {
        if (active()) {
          e.preventDefault();
          el.classList.add("drop-active");
        }
      };
      el.ondragleave = () => el.classList.remove("drop-active");
      el.ondrop = (e) => {
        e.preventDefault();
        host.classList.remove("dragging");
        apply({ kind: el.dataset.drop, index: Number(el.dataset.index) });
      };
      if (!el.hasAttribute("data-item"))
        el.onclick = () =>
          apply({ kind: el.dataset.drop, index: Number(el.dataset.index) });
    }
    host.querySelector("[data-undo]").onclick = () => {
      if (active() && model.undo()) {
        selected = null;
        onChange(model.values);
        render();
      }
    };
    host.querySelector("[data-reset]").onclick = () => {
      if (active()) {
        model.reset();
        selected = null;
        onChange(model.values);
        render();
      }
    };
  }
  render();
  return {
    model,
    refresh: render,
    drop(payload, target) {
      selected = payload;
      return apply(target);
    },
    get values() {
      return model.values;
    },
  };
}
