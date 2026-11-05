(function (root) {
  'use strict';
  const W = root.WRG;
  const path = '/wpr-games/workplace-readiness/';
  const lists = ['skills', 'topics', 'subtopics', 'modes', 'contexts'];
  function practiceLink(filters) {
    const params = new URLSearchParams();
    for (const key of lists) for (const value of filters[key] || []) params.append(key, value);
    for (const key of ['category', 'difficulty', 'context', 'count']) {
      if (filters[key] && filters[key] !== 'mixed') params.set(key, filters[key]);
    }
    params.set('practice', '1');
    return path + '?' + params;
  }
  function readLink(href) {
    const p = new URL(href).searchParams;
    if (p.get('practice') !== '1') return null;
    const f = Object.fromEntries(lists.map(key => [key, p.getAll(key).slice(0, 50)]));
    f.category = p.get('category');
    f.difficulty = p.get('difficulty') || 'mixed';
    f.context = p.get('context');
    const count = Number(p.get('count'));
    f.count = Number.isInteger(count) && count > 0 && count <= 100 ? count : null;
    return f;
  }
  let linked = {}, nodes = {};
  function mountPractice(lib, filters, changed) {
    const { h } = W.ui;
    const host = document.getElementById('targeted-options');
    linked = filters || {};
    const field = (name, items) => {
      const box = h('fieldset', { class: 'target-options' }, h('legend', { text: name }));
      const out = {};
      for (const [id, label] of items) {
        const input = h('input', { type: 'checkbox', value: id });
        out[id] = input;
        box.append(h('label', {}, input, ' ' + label));
      }
      return { box, out };
    };
    const topics = field('Topics', lib.topics.map(t => [t.id, t.name]));
    const subs = field('Subtopics', lib.topics.flatMap(t => t.subtopics.map(s => [s[0], s[1]])));
    nodes = { topics: topics.out, subtopics: subs.out };
    for (const key of Object.keys(nodes)) for (const id of linked[key] || []) {
      if (nodes[key][id]) nodes[key][id].checked = true;
    }
    for (const t of lib.topics) if (t.subtopics.some(([id]) => subs.out[id].checked)) topics.out[t.id].checked = true;
    const update = () => {
      const active = selected('topics');
      for (const topic of lib.topics) for (const [id] of topic.subtopics) {
        const el = subs.out[id], visible = active.includes(topic.id);
        el.parentElement.hidden = !visible;
        if (!visible) el.checked = false;
      }
      subs.box.hidden = !active.length;
      changed();
    };
    topics.box.addEventListener('change', () => {
      for (const key of ['topics','subtopics']) linked[key] = (linked[key] || []).filter(id => nodes[key][id]);
      document.getElementById('shared-topic-notice')?.remove();
      update();
    });
    subs.box.addEventListener('change', changed);
    const status = h('p', { role: 'status' });
    host.append(h('details', { open: selected('topics').length > 0 }, h('summary', { text: 'Target specific topics' }), h('p', { text: 'Choose one or more topics. If you select subtopics, practice is limited to those subtopics.' }), topics.box, subs.box),
      h('button', { type: 'button', class: 'btn', text: 'Copy practice link', onclick: async () => {
        const url = new URL(practiceLink(W.ui.readOptions()), root.location.href).href;
        try { await navigator.clipboard.writeText(url); status.textContent = 'Practice link copied.'; }
        catch { status.replaceChildren(h('a', { href: url, text: url })); }
      } }), status);
    const linkedFilters = [['opt-skill','skills'], ['opt-mode','modes'], ['opt-context','contexts']];
    for (const [id,key] of linkedFilters) {
      const select = document.getElementById(id);
      if (key === 'contexts' ? linked[key]?.length : linked[key]?.length > 1) {
        const entry = new Option('Shared selection (' + linked[key].length + ')', 'shared');
        select.add(entry); select.value = 'shared';
      }
      select.addEventListener('change', changed);
    }
    const unknown = ['topics', 'subtopics'].some(key => linked[key]?.some(id => !nodes[key][id]));
    if (unknown) host.append(h('p', { class: 'notice', id: 'shared-topic-notice', text: 'This link refers to an unavailable topic. Change the topic selections to choose available content.' }));
    update();
  }
  function selected(key) {
    return Object.keys(nodes[key] || {}).filter(id => nodes[key][id].checked);
  }
  function readPractice(f) {
    const by = (id, key) => document.getElementById(id).value === 'shared' ? linked[key] : f[key];
    const topicIds = selected('topics'), subtopicIds = selected('subtopics');
    for (const key of ['topics','subtopics']) {
      for (const id of linked[key] || []) if (!nodes[key]?.[id]) (key === 'topics' ? topicIds : subtopicIds).push(id);
    }
    return { ...f, skills: by('opt-skill','skills'), modes: by('opt-mode','modes'), contexts: by('opt-context','contexts'),
      topics: topicIds, subtopics: subtopicIds, count: linked.count || null };
  }
  W.targeted = { practiceLink, readLink, mountPractice, readPractice };
}(globalThis));
