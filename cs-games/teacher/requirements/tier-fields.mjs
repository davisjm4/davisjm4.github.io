import { TIERS, explainRequirement, parsePercent, parseWholeNumber } from '../../pathway/requirements/index.mjs';
import { fractionToPercent } from '../../pathway/mastery/arithmetic.mjs';
import { el } from './dom.mjs';

export function tierFields({valueFor = tier => tier, description = () => null, onInput = () => {}} = {}) {
  const fields = [];
  const element = el('div', {class:'mreq-tier-fields'}, TIERS.map(tier => {
    const initial = valueFor(tier);
    const count = el('input', {type:'text', name:'minimumQuestions', inputmode:'numeric', value:String(initial.minimumQuestions), autocomplete:'off'});
    const accuracy = el('input', {type:'text', name:'accuracy', inputmode:'decimal', value:String(fractionToPercent(initial.accuracy)), autocomplete:'off'});
    const summary = el('p', {class:'mreq-hint', 'aria-live':'polite'});
    const read = () => {
      const q = parseWholeNumber(count.value, {label:'Minimum questions'});
      const a = parsePercent(accuracy.value);
      return !q.ok ? {error:q.error, field:count} : !a.ok ? {error:a.error, field:accuracy} :
        {settings:{minimumQuestions:q.value, accuracy:a.fraction}};
    };
    const update = () => {
      const result = read();
      summary.textContent = result.error ?? explainRequirement(result.settings).lines.slice(0,2).join(' ');
      count.setAttribute('aria-invalid',String(result.field === count));
      accuracy.setAttribute('aria-invalid',String(result.field === accuracy));
    };
    for (const input of [count, accuracy]) input.addEventListener('input', () => { update(); onInput(); });
    update();
    fields.push({id:tier.id, read});
    return el('fieldset', {'data-tier':tier.id}, el('legend', {text:tier.label}),
      el('label', {}, 'Minimum questions', count),
      el('label', {}, 'First-attempt accuracy (%)', accuracy), summary, description(tier));
  }));
  return {
    element,
    collect() {
      const edits = {};
      for (const {id,read} of fields) {
        const result = read();
        if (result.error) { result.field.focus(); throw new Error(result.error); }
        edits[id] = result.settings;
      }
      return edits;
    }
  };
}
