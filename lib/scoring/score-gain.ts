// How many points of the overall score a single fix would add.
//
// Not the same number as `impactPoints` in the engine. That one ranks
// fixes against each other and assumes full coverage — its denominators
// are 1.0. The overall score an owner actually sees is renormalized over
// evaluated weight only (§6.10), so on a 74%-coverage report the real
// movement is larger than impactPoints suggests. A band that promises
// "adds 2.4 pts" has to promise the number the total will actually move,
// or the owner pays and then watches the score not match.
//
// Pure function, no I/O — same reason the rest of /lib/scoring is.

import { DIMENSION_WEIGHTS, type Dimension } from "./config";

export interface GainRow {
  dimension: string;
  check_key: string;
  normalized_score: number | null;
  weight_in_dim: number;
}

/**
 * Points the overall score gains if `checkKey` goes from its current
 * score to 100 and nothing else changes. Returns null when the check
 * can't move the score: unavailable, unknown, or already perfect.
 */
export function scoreGainForCheck(rows: GainRow[], checkKey: string): number | null {
  const target = rows.find((r) => r.check_key === checkKey);
  if (!target || target.normalized_score === null) return null;
  if (target.normalized_score >= 100) return null;

  // Evaluated checks only — 'unavailable' rows carry a null score and are
  // excluded from denominators rather than counted as zero (rule 7).
  const evaluated = rows.filter((r) => r.normalized_score !== null);

  const dimWeightSum = [...new Set(evaluated.map((r) => r.dimension))].reduce(
    (sum, d) => sum + (DIMENSION_WEIGHTS[d as Dimension] ?? 0),
    0
  );
  if (dimWeightSum === 0) return null;

  const inDimWeightSum = evaluated
    .filter((r) => r.dimension === target.dimension)
    .reduce((sum, r) => sum + r.weight_in_dim, 0);
  if (inDimWeightSum === 0) return null;

  const dimWeight = DIMENSION_WEIGHTS[target.dimension as Dimension] ?? 0;

  // Raising this check to 100 lifts its dimension by its share of the
  // dimension's evaluated weight, which lifts the overall by the
  // dimension's share of evaluated dimension weight.
  const dimensionGain =
    (target.weight_in_dim / inDimWeightSum) * (100 - target.normalized_score);
  return (dimWeight / dimWeightSum) * dimensionGain;
}

/** Display form: "2.4 pts", "1 pt", "<0.1 pts". */
export function formatGain(points: number): string {
  if (points < 0.05) return "<0.1 pts";
  const rounded = Math.round(points * 10) / 10;
  return rounded === 1 ? "1 pt" : `${rounded.toFixed(1)} pts`;
}
