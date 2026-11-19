// Presentation of the evaluated class requirement or independent formative goal.
import {formatPercent} from './format.mjs';
export const tierLevels = {beginner: 2, intermediate: 3, advanced: 4};
const clamp = value => Math.max(0, Math.min(1, value));

export function skillTarget(node, {enrolled = false} = {}) {
  const result = node.proficiency;
  const level = tierLevels[result?.goal];
  const tier = result?.tiers?.[result.goal];
  const progress = node.progress;
  const requirement = progress?.requirements;
  const classTarget = enrolled && requirement && node.state !== 'unavailable';
  if (!classTarget && (enrolled || !level || !tier)) return null;

  const minimum = classTarget ? requirement.minimumQuestions : tier.minimumQuestions;
  const accuracy = classTarget ? requirement.requiredAccuracyPercent : tier.accuracy * 100;
  const attempt = classTarget ? progress.attempt : tier;
  const answered = (classTarget ? attempt?.attempted : attempt?.answered) ?? 0;
  const correct = attempt?.correct ?? 0;
  const accuracyPercent = attempt?.accuracyPercent ?? null;
  const complete = classTarget ? node.complete : result.goalMet;
  const checks = (classTarget ? progress.requirementChecks : tier.checks) ?? [];
  const unmet = checks.filter(check => !check.met && !['minimumQuestions', 'accuracy'].includes(check.code));
  const recovery = classTarget ? progress.recovery : tier.recovery;
  const practice = classTarget ? null : tier.practice;
  const difficulty = practice?.difficulty ?? null;
  const qualified = difficulty ? `qualifying ${difficulty[0].toUpperCase()+difficulty.slice(1)} question` : 'qualifying question';
  const countMet = answered >= minimum;
  const accuracyMet = checks.find(check=>check.code==='accuracy')?.met ?? (answered>0&&accuracyPercent>=accuracy);
  const qualification = [
    {kind:'count',met:countMet,text:countMet?`Question count met: ${answered} of ${minimum}.`:`${minimum-answered} more ${qualified}${minimum-answered===1?'':'s'} needed: ${answered} of ${minimum}.`},
    {kind:'accuracy',met:accuracyMet,text:accuracyMet?`Accuracy met: ${formatPercent(accuracyPercent)} (at least ${formatPercent(accuracy)} required).`:`Accuracy: ${accuracyPercent==null?'no qualifying answers yet':formatPercent(accuracyPercent)}; at least ${formatPercent(accuracy)} required.`},
    {kind:'coverage',met:unmet.length===0,text:unmet.length?`Coverage still needed: ${unmet.map(check=>check.label).join('; ')}.`:'Coverage requirements met.'}
  ];
  const detail = qualification.filter(check=>!check.met).map(check => check.text);
  if (recovery?.accuracyUnrecoverableInAttempt) detail.unshift('Start a new attempt to reach the required accuracy.');
  else if (answered && accuracyPercent < accuracy && recovery?.additionalCorrectForAccuracy > 0)
    detail.unshift(`${recovery.additionalCorrectForAccuracy} more right in a row to reach ${formatPercent(accuracy)}.`);

  const breadth = unmet.filter(check => Number.isFinite(check.actual) && check.required > 0)
    .map(check => clamp(check.actual / check.required));
  const rates = answered ? [clamp(answered / minimum), accuracy > 0 ? clamp((accuracyPercent ?? 0) / accuracy) : 1] : [0];
  const fraction = complete ? 1 : Math.min(0.99, ...rates, ...breadth);
  const label = classTarget ? 'Class practice target' : `Working toward Level ${level}`;
  const summary = `${answered} qualifying answers · ${correct} right on the first try · ${formatPercent(accuracy)} accuracy required`;
  const count = `${answered} of ${minimum} qualifying answers`;
  return {qualification,practice,difficulty,answered,minimum,attemptId:classTarget?attempt?.id:result?.attempt?.id??null,attemptNumber:classTarget?attempt?.seq:result?.attempt?.number??1,classTarget: Boolean(classTarget), level, complete, fraction, label, summary, count, accuracyPercent, accuracy, correct, detail};
}
