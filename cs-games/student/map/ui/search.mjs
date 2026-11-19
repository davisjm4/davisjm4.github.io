import { searchSkills } from '../search.mjs';
import { el } from './dom.mjs';

export function createSkillSearch(model, { layout, query, onQuery, onShow, onPractice }) {
  const workplace=model.courseId==='workplace';
  const noun=workplace?'learning areas':'skills';
  const input = el('input', { id: 'map-skill-search', type: 'search', value: query, maxlength: 120, autocomplete: 'off' });
  const status = el('p', { class: 'muted small', role: 'status' });
  const results = el('ul', { class: 'map-search-results', 'aria-label': 'Matching skills' });
  function render() {
    const term = input.value.trim();
    let matches = searchSkills(model, term);
    if(model.courseId==='workplace')matches=[...new Map(matches.map(match=>[match.stop.id,match])).values()];
    status.textContent = !term ? '' : !matches.length ? `No matching ${noun} in this course.`
      : matches.length === 1 ? workplace?'1 matching area.':'1 matching skill.' : matches.length + ' matching skills.';
    results.hidden = !matches.length;
    results.replaceChildren(...matches.map(({ node, stop, match }) => {
      const link = model.courseId==='workplace'?null:node.practice[0];
      const practiceLabel = link?.kind === 'open' ? 'Open activity' : 'Practice';
      return el('li', {},
        el('strong', { text: model.courseId==='workplace'?stop.title:node.title }),
        el('small', { text: [model.courseTitle, stop.baseTitle, 'Matches ' + match].filter(Boolean).join(' · ') }),
        el('div', { class: 'suggested-actions' },
          el('button', { class: 'btn', type: 'button', 'aria-label': 'Show ' + node.title + ' on ' + layout,
            text: model.courseId==='workplace'?'Start area practice':layout === 'list' ? 'Show in List' : 'Show on Map', onclick: () => onShow(node) }),
          link ? el('a', { class: 'btn', href: link.url, 'data-action': 'practice-search', 'data-return-skill': node.id, 'aria-label': practiceLabel + ' for ' + node.title, text: practiceLabel,
            onclick: event => { if (onPractice({ node, url: link.url, kind: link.kind }) === true) event.preventDefault(); } })
            : el('small', { text: 'Practice activity unavailable' })));
    }));
  }
  input.addEventListener('input', () => { render(); onQuery(input.value, results); });
  render();
  return el('search', { class: 'map-skill-search', 'aria-label': 'Find '+noun+' in ' + model.courseTitle },
    el('label', { for: input.id, text: 'Search '+noun+' in ' + model.courseTitle }), input, status, results);
}
