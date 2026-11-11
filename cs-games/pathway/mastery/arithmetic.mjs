// Exact accuracy arithmetic shared by every mastery calculation (student progress, teacher previews, tests).
// Accuracy thresholds are held as integer basis points (1/100 of a percent) so that comparisons never touch floating-point
// multiplication. A floating-point ceiling can demand one answer too many: 0.56 * 25 is 14.000000000000002 in JavaScript, so
// Math.ceil(0.56 * 25) asks for 15 correct answers when 14 is exactly enough. (The common 90% and 95% thresholds happen to be
// safe for counts up to several hundred, but a teacher may choose any percentage, and exactness should not depend on luck.)
export const BP = 10000;

/** Convert a fraction (0.95) to integer basis points (9500). Rejects values finer than 0.01 percent. */
export function toBasisPoints(accuracy) {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    throw new RangeError('Accuracy must be a fraction between 0 and 1.');
  }
  const bp = Math.round(accuracy * BP);
  if (Math.abs(accuracy * BP - bp) > 1e-6) throw new RangeError('Accuracy may have at most two decimal places of a percent.');
  return bp;
}
/** 95 -> 0.95. Teachers type percentages; the stored policy keeps the fraction the pathway model already uses. */
export function percentToFraction(percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) throw new RangeError('Percent must be between 0 and 100.');
  const bp = Math.round(percent * 100);
  if (Math.abs(percent * 100 - bp) > 1e-6) throw new RangeError('Percent may have at most two decimal places.');
  return bp / BP;
}
export const fractionToPercent = (fraction) => toBasisPoints(fraction) / 100;
export const formatPercent = (value) => `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}%`;

/** True when correct/total reaches the threshold. Nothing answered never meets an accuracy requirement. */
export const meetsAccuracy = (correct, total, bp) => total > 0 && correct * BP >= bp * total;

/** Smallest number of correct answers that satisfies the threshold when exactly `total` have been answered. */
export const minCorrectFor = (total, bp) => Math.floor((bp * total + BP - 1) / BP);

/**
 * Accuracy-only lower bound: the fewest additional consecutive correct answers after which correct/attempted reaches
 * the threshold. It ignores every other requirement (question minimum, subskills, families, difficulties), so it is
 * a minimum and never a promise of mastery. Returns null when no number of correct answers can recover the
 * threshold (a 100% requirement after any miss).
 */
export function additionalCorrectToRecover(correct, attempted, bp) {
  const floor = attempted === 0 ? 1 : 0;
  const shortfall = bp * attempted - BP * correct;
  if (shortfall <= 0) return floor;
  if (bp >= BP) return null;
  return Math.max(floor, Math.ceil(shortfall / (BP - bp)));
}

/**
 * Mistake allowance.
 * atMinimumCheckpoint: further wrong answers that still leave the threshold reachable when exactly `minimum` questions
 *   have been answered (null once the checkpoint has passed).
 * beforeThresholdBreaks: further wrong answers the current accuracy can absorb before dropping below the threshold
 *   (0 when already below it; null when there is no accuracy requirement).
 */
export function mistakeAllowance({ correct, attempted, minimum, bp }) {
  const missed = attempted - correct;
  const budget = minimum - minCorrectFor(minimum, bp);
  return {
    budgetAtMinimum: budget,
    atMinimumCheckpoint: attempted <= minimum ? Math.max(0, budget - missed) : null,
    checkpointStillReachable: attempted > minimum || missed <= budget,
    beforeThresholdBreaks: bp === 0 ? null : meetsAccuracy(correct, attempted, bp) ? Math.floor((correct * BP) / bp) - attempted : 0,
  };
}
/** Accuracy as a percentage truncated (never rounded up) to one decimal, so 94.96% is shown as 94.9%, not 95%. */
export const accuracyPercent = (correct, attempted) => (attempted ? Math.floor((correct * 1000) / attempted) / 10 : null);
export const accuracyFraction = (correct, attempted) => (attempted ? correct / attempted : null);
