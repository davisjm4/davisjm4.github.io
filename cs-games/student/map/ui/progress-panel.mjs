import {demonstrationDetails,proficiencyDetails,proficiencyLink} from './proficiency.mjs?v=map-progression-v1';
// The skill progress panel. It renders the evaluated progress contract and explains it in plain language.
// It never calculates: questions left, accuracy, and "correct in a row" all arrive from the engine's recovery object.
import { attemptLabel, attemptLine, checklist, detailLines, exampleNotice, isClosedAttempt, leadText, lifetimeLine, optionalBlurb, practiceSummary, requirementLine, whatsLeft } from '../copy.mjs';
import { formatDay, formatPercent, formatStamp, plural } from '../format.mjs';
import { STATES } from '../states.mjs';
import { icon } from '../icons.mjs';
import { el } from './dom.mjs';
import { stateBadge } from './skill-node.mjs';

let uid = 0;
const meter = ({ label, valueText, share, goalShare = null }) => el('div', { class: 'meter', role: 'img', 'aria-label': `${label}: ${valueText}` },
  el('span', { class: 'meter-fill', style: `width:${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` }),
  goalShare !== null ? el('span', { class: 'meter-goal', style: `left:${Math.round(goalShare * 100)}%`, 'aria-hidden': 'true' }) : null);
const stat = (term, value, note) => el('div', { class: 'stat' }, el('dt', { text: term }), el('dd', {}, el('strong', { text: value }), note ? el('small', { text: note }) : null));

function primaryLabel(node) {
  if (node.state === 'not-started') return 'Practice this skill';
  if (node.state === 'requirements-met' || node.state === 'mastered') return 'Practice more';
  return 'Continue practicing';
}

/**
 * @param node a model node view
 * @param {{stop:object, model:object, timeZone?:string, canRestart:boolean, onPractice:(info)=>boolean|void, onClose:()=>void,
 *          onSelectNode:(id)=>void, onRestart:(node)=>Promise<{ok:boolean,message?:string}>}} ctx
 */
export function createProgressPanel(node, ctx) {
  const id = ++uid, titleId = `skill-title-${id}`;
  const p = node.progress, req = p?.requirements, att = p?.attempt, rec = p?.recovery;
  const root = el('section', { class: 'skill-panel', 'data-state': node.state, 'data-node-id': node.id, 'aria-labelledby': titleId });

  root.append(el('div', { class: 'panel-top' },
    el('p', { class: 'panel-crumb', text: `${ctx.stop.title} · Skill ${node.order} of ${node.orderOf}` }),
    el('button', { type: 'button', class: 'btn panel-close', onclick: ctx.onClose }, icon('back', { size: 18 }), 'Back to skills')));
  root.append(el('h3', { id: titleId, class: 'panel-title', tabindex: '-1', text: node.title }));
  if(node.objective&&node.objective!==node.title)root.append(el('p',{class:'muted',text:node.objective}));
  root.append(el('p', { class: 'badge-row' }, stateBadge(node.state, { optional: node.optional }),
    node.optional ? el('span', { class: 'tag', text: 'Optional' }) : null,
    node.example ? el('span', { class: 'tag tag-example', text: 'Example requirement' }) : null));
  if (node.optional) root.append(el('p', { class: 'muted', text: optionalBlurb }));

  const goal = node.skillTarget;
  if (goal && !goal.complete) root.append(el('section', {class:'skill-target'},
    el('h4',{text:goal.label}), el('p',{text:`Attempt ${goal.attemptNumber} · ${goal.count}`}),
    el('ul',{'aria-label':'Qualification requirements'},goal.qualification.map(check=>el('li',{'data-requirement':check.kind,text:check.text}))),
    el('progress', {max:100,value:Math.floor(goal.fraction*100),'aria-label':goal.label,'aria-valuetext':`${goal.count}. ${goal.summary}.`}),
    el('p',{text:`${goal.correct} right on the first try · ${formatPercent(goal.accuracy)} accuracy required${goal.accuracyPercent==null?'':` · ${formatPercent(goal.accuracyPercent)} so far`}`}),
    goal.detail.length?el('details',{},el('summary',{text:'What still counts toward this target'}),
      el('ul',{},goal.detail.map(text=>el('li',{text})))):null));
  const formative=proficiencyDetails(node);
  if(formative)root.append(formative);

  // What the engine says, in its own words first.
  if(!ctx.model.guest)root.append(el('p', { class: 'lead', text: leadText(node) }));
  for (const line of detailLines(node)) root.append(el('p', { class: 'muted', text: line }));
  if (node.complete && (ctx.model.guest || ctx.model.pathwayCompletion)) root.append(el('p',{class:'ok',
    text:ctx.model.enrolled?'You completed this skill for your class pathway.':'You met the formative target for this skill.'}));
  else if (node.state === 'requirements-met' && !detailLines(node).some((l) => /practice milestone/.test(l))) root.append(el('p', { class: 'note', text: STATES['requirements-met'].blurb }));
  if (node.state === 'mastered') root.append(el('p', { class: 'note', text: `${STATES.mastered.blurb}${p.award?.issuedAt ? ` (${formatStamp(p.award.issuedAt, ctx.timeZone)})` : ''}` }));
  else if(node.verifiedAward)root.append(el('p',{class:'note',text:'Verified mastery recorded for this skill.'}));
  else if(node.earlierVerifiedAward)root.append(el('p',{class:'note',text:'Earlier verified mastery stays in your history.'}));
  if (node.state === 'unavailable') root.append(el('p', { class: 'note', text: STATES.unavailable.blurb }));

  const left = whatsLeft(node);
  if (left.length) {
    root.append(el('h4', { text: 'What’s left' }));
    root.append(el('ul', { class: 'left' }, left.map((l) => el('li', { 'data-kind': l.kind },
      l.text, l.long && ctx.canRestart ? el('span', { class: 'muted', text: ' That is a lot of answers; starting a new attempt is another option.' }) : null))));
  } else if (!node.complete && (node.state === 'requirements-met' || node.state === 'mastered')) {
    root.append(el('p', { class: 'ok', text: 'Nothing is left for this requirement.' }));
  }
  // Practice.
  const tier=node.proficiency?.goal;
  const primary = tier&&!node.proficiency.goalMet
    ? proficiencyLink(node,node.proficiency.tiers[tier]?.practice)
    : node.practice[0];
  const actions = el('div', { class: 'panel-actions' });
  const next = node.complete ? ctx.next : null;
  if (next) actions.append(el('button',{type:'button',class:'btn btn-primary','data-action':'next-learning',
    text:next.stopId===node.stopId?'Next skill · '+next.title:'Next area · '+ctx.model.stops.find(stop=>stop.id===next.stopId).baseTitle,
    onclick:()=>ctx.onNext(next)}));
  if (primary) {
    const extension = node.complete && node.proficiency?.extensionAvailable;
    const practice = extension ? proficiencyLink(node,node.proficiency.tiers.advanced.practice) ?? primary : primary;
    actions.append(el('a', { class: node.complete ? 'btn' : 'btn btn-primary', href: practice.url, 'data-action': 'practice',
      onclick: (e) => { if (ctx.onPractice({ node, url: practice.url, kind: practice.kind }) === true) e.preventDefault(); },
      text: extension ? 'Optional Level 4 practice' : primaryLabel(node) }));
    for (const l of node.practice.slice(1)) actions.append(el('a', { class: 'btn', href: l.url, 'data-action': 'practice-other', text: l.label, onclick: (e) => { if (ctx.onPractice({ node, url: l.url, kind: l.kind }) === true) e.preventDefault(); } }));
  } else actions.append(el('p', { class: 'muted', text: 'No practice activity is linked to this skill yet.' }));
  const mixed = ctx.stop.mixed;
  if (mixed&&!node.practice.some(link=>link.url===mixed.url)) actions.append(el('a', { class: 'btn', href: mixed.url, 'data-action': 'mixed', text: 'Mixed Practice', 'aria-label': mixed.label, onclick: (e) => { if (ctx.onPractice({ node, url: mixed.url, kind: 'mixed' }) === true) e.preventDefault(); } }));
  if (node.complete) root.insertBefore(actions,root.querySelector('.proficiency-details,.lead')||null);
  else root.append(actions);
  if(ctx.guestSkillControls&&node.guest)root.append(ctx.guestSkillControls(node));
  if (req && node.mixed?.url.startsWith('/java-games/')) root.append(el('p', { class: 'muted small', text: 'Mixed Practice counts here when it asks about this skill.' }));

  // Requirement, then this attempt.
  if(req || node.teacherAssessmentRequired)root.append(el('h4', { text: 'Requirement' }), el('p', { text: requirementLine(node) }));
  else if(node.practiceGoal){
    const {questions,accuracy,met}=node.practiceGoal;
    root.append(el('p',{class:'muted',text:`Practice goal · ${questions} first attempts at ${formatPercent(accuracy*100)} accuracy${met?' · met':''}`}));
  }
  if (node.example) root.append(el('p', { class: 'muted', text: exampleNotice }));

  if (req && att) {
    root.append(el('h4', { text: 'This attempt' }));
    root.append(el('dl', { class: 'stats' },
      stat('Questions answered', `${att.attempted} of ${req.minimumQuestions}`),
      stat('Right on the first try', String(att.correct)),
      stat('Accuracy', att.accuracyPercent === null ? 'No answers yet' : formatPercent(att.accuracyPercent), `goal ${formatPercent(req.requiredAccuracyPercent)}`)));
    root.append(meter({ label: 'Questions answered', valueText: `${att.attempted} of ${req.minimumQuestions}`, share: req.minimumQuestions ? att.attempted / req.minimumQuestions : 0 }));
    root.append(meter({ label: 'Accuracy', valueText: att.accuracyPercent === null ? 'no answers yet' : formatPercent(att.accuracyPercent), share: (att.accuracyPercent ?? 0) / 100, goalShare: req.requiredAccuracyPercent / 100 }));
  } else if (att && att.attempted > 0) {
    root.append(el('h4', { text: 'Your practice' }), el('p', { text: practiceSummary(node) }));
  }

  const checks = checklist(node);
  if (checks.length) {
    root.append(el('ul', { class: 'checks', 'aria-label': 'Requirement checklist' }, checks.map((c) => el('li', { 'data-met': c.met ? 'true' : 'false' },
      icon(c.met ? 'check' : 'circle', { size: 16 }), el('span', { text: c.label }), el('span', { class: 'sr-only', text: c.met ? ' (met)' : ' (not met yet)' })))));
  }

  // Attempts: this attempt vs the whole history, kept visibly separate.
  if (req) {
    const status = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    const history = node.attempts;
    const closed = history.filter(isClosedAttempt);
    const attemptsBox = el('div', { class: 'attempts' }, el('h4', { text: 'Your attempts' }),
      el('p', { class: 'muted small', text: 'The current attempt is what counts toward the requirement. Lifetime practice is everything you have ever answered. Starting a new attempt never deletes either one, or mastery you already earned.' }));
    if (req && att) attemptsBox.append(el('p', { class: 'attempt-now' }, el('strong', { text: `Current attempt${att.seq ? ` (attempt ${att.seq})` : ''}: ` }), `${att.attempted} answered, ${att.correct} correct.`));
    const startArea = el('div', { class: 'restart' });
    const canStart = ctx.canRestart && att?.id && att.attempted > 0 && ['in-progress', 'review'].includes(node.state);
    if (canStart) {
      const confirm = el('div', { class: 'confirm', role: 'group', 'aria-label': 'Confirm a new attempt', hidden: true });
      const open = el('button', { type: 'button', class: 'btn', 'data-action': 'restart', 'aria-expanded': 'false', text: 'Start a new attempt' });
      const yes = el('button', { type: 'button', class: 'btn btn-primary', 'data-action': 'restart-confirm', text: 'Yes, start a new attempt' });
      const no = el('button', { type: 'button', class: 'btn', 'data-action': 'restart-cancel', text: 'Keep this attempt' });
      confirm.append(el('p', { text: `Start a new attempt for ${node.title}? Only the count for this attempt starts over. Your earlier answers, your lifetime practice, and any mastery you earned stay in your history.` }), yes, no);
      open.addEventListener('click', () => { confirm.hidden = false; open.setAttribute('aria-expanded', 'true'); yes.focus(); });
      no.addEventListener('click', () => { confirm.hidden = true; open.setAttribute('aria-expanded', 'false'); open.focus(); });
      const failure=el('p',{class:'error',hidden:true});
      yes.addEventListener('click', async () => {
        failure.hidden=true;
        yes.disabled = no.disabled = true; status.textContent = 'Starting a new attempt.';
        const result = await ctx.onRestart(node);
        if (!result?.ok) {
          yes.disabled = no.disabled = false;
          status.textContent = result?.message ?? 'The new attempt could not be started.';
          failure.textContent=status.textContent;
          failure.hidden=false;
          yes.focus();
        }
      });
      confirm.append(failure);
      startArea.append(open, confirm);
    } else if (req && att && ctx.canRestart) startArea.append(el('p', { class: 'muted small', text: att.attempted === 0 ? 'This attempt has no answers yet, so there is nothing to start over.' : 'You can start a new attempt if this one stops being useful.' }));
    attemptsBox.append(startArea);
    attemptsBox.append(el('details', { class: 'prev', 'data-section': 'previous' },
      el('summary', { text: closed.length ? `View previous attempts (${closed.length}${p.historyCount>closed.length?` of ${p.historyCount}`:''})` : 'View previous attempts' }),
      closed.length ? el('ol', { class: 'attempt-list' }, [...closed].sort((a, b) => b.seq - a.seq).map((a) => el('li', { 'data-status': a.status }, el('strong', { text: attemptLabel(a) }), el('span', { text: attemptLine(a, ctx.timeZone) }))))
        : el('p', { class: 'muted', text: 'No earlier attempts yet.' })));
    const life = p?.lifetime;
    // Lifetime totals are shown only when the host supplies them; the section is left out rather than showing a made-up zero.
    if (life) attemptsBox.append(el('details', { class: 'life', 'data-section': 'lifetime' },
      el('summary', { text: 'View lifetime practice' }),
      el('p', { text: lifetimeLine(node) }),
      el('p', { class: 'muted', text: `${plural(life.attempts, 'attempt')} so far${life.restarts ? `, ${plural(life.restarts, 'restart')}` : ''}.` }),
      p?.lastCompletedAttempt ? el('p', { class: 'muted', text: `Requirements were last met in attempt ${p.lastCompletedAttempt.seq}${p.lastCompletedAttempt.closedAt ? ` (${formatStamp(p.lastCompletedAttempt.closedAt, ctx.timeZone)})` : ''}. That stays in your history.` }) : null));
    attemptsBox.append(status);
    root.append(attemptsBox);
  }

  root.append(demonstrationDetails(node,ctx.model));

  if (node.prerequisites.length) {
    const known = node.prerequisites.filter((x) => ctx.model.nodeIndex[x.id]);
    if (known.length) root.append(el('div', { class: 'builds-on' }, el('h4', { text: 'Builds on' }),
      el('p', { class: 'muted small', text: 'A suggestion for what helps first. You can start here anyway.' }),
      el('ul', {}, known.map((x) => el('li', {}, el('button', { type: 'button', class: 'link-btn', text: x.title, onclick: () => ctx.onSelectNode(x.id) }))))));
  }
  if (node.target) root.append(el('p', { class: 'target-line', 'data-tone': node.target.tone }, icon('calendar', { size: 16 }), el('span', { text: `${node.target.text}. A target, not a deadline.` })));
  if (p?.simulated) root.append(el('p', { class: 'muted small', text: 'Simulated in this prototype. Nothing was saved.' }));
  void formatDay;
  return root;
}

/** Shown in the side column when nothing is selected (wide screens only). */
export function createPanelPlaceholder(model) {
  return el('section', { class: 'skill-panel placeholder', 'aria-label': 'Skill details' },
    el('h3', { class: 'panel-title', text: 'Pick a skill' }),
    el('p', { class: 'lead', text: 'Select any skill to see what you have done, what is left, and how to practice it.' }),
    el('p', { class: 'muted', text: model.mode === 'practice' ? 'There are no requirements to meet yet, so progress shows your practice. Everything is open to explore.' : 'You can practice any skill in any order.' }));
}
