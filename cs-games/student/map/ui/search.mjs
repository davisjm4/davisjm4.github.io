import { searchSkills } from '../search.mjs';
import { el } from './dom.mjs';

export function createSkillSearch(model, { layout, query, onQuery, onShow, onPractice }) {
  const input = el('input', { id: 'map-skill-search', type: 'search', value: query, maxlength: 120, autocomplete: 'off' });
  const status = el('p', { class: 'muted small', role: 'status' });
  const results = el('ul', { class: 'map-search-results', 'aria-label': 'Matching skills' });
  function render() {
    const term = input.value.trim();
    const matches = searchSkills(model, term);
    status.textContent = !term ? '' : !matches.length ? 'No matching skills in this course.'
      : matches.length === 1 ? '1 matching skill.' : matches.length + ' matching skills.';
    results.hidden = !matches.length;
    results.replaceChildren(...matches.map(({ node, stop, match }) => {
      const link = node.practice[0];
      return el('li', {},
        el('strong', { text: node.title }),
        el('small', { text: [model.courseTitle, stop.baseTitle, 'Matches ' + match].filter(Boolean).join(' · ') }),
        el('div', { class: 'suggested-actions' },
          el('button', { class: 'btn', type: 'button', 'aria-label': 'Show ' + node.title + ' on ' + layout,
            text: layout === 'list' ? 'Show in List' : 'Show on Map', onclick: () => onShow(node) }),
          link ? el('a', { class: 'btn', href: link.url, 'data-action': 'practice-search', 'aria-label': 'Practice ' + node.title, text: 'Practice',
            onclick: event => { if (onPractice({ node, url: link.url, kind: link.kind }) === true) event.preventDefault(); } })
            : el('small', { text: 'Practice activity unavailable' })));
    }));
  }
  input.addEventListener('input', () => { render(); onQuery(input.value, results); });
  render();
  return el('search', { class: 'map-skill-search', 'aria-label': 'Find skills in ' + model.courseTitle },
    el('label', { for: input.id, text: 'Search skills in ' + model.courseTitle }), input, status, results);
}
