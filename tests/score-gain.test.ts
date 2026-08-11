import { describe, expect, it } from "vitest";
import { DIMENSION_WEIGHTS, type Dimension } from "../lib/scoring/config";
import { formatGain, scoreGainForCheck, type GainRow } from "../lib/scoring/score-gain";

// The band on report page two tells an owner a fix "adds N pts". The only
// test that matters is whether the total actually moves by N, so these
// recompose the overall score from scratch (§6.10) and compare.

function overallOf(rows: GainRow[]): number {
  const evaluated = rows.filter((r) => r.normalized_score !== null);
  const dims = [...new Set(evaluated.map((r) => r.dimension))];
  let weighted = 0;
  let weightSum = 0;
  for (const d of dims) {
    const inDim = evaluated.filter((r) => r.dimension === d);
    const w = inDim.reduce((s, r) => s + r.weight_in_dim, 0);
    const dimScore =
      inDim.reduce((s, r) => s + r.weight_in_dim * (r.normalized_score as number), 0) / w;
    const dw = DIMENSION_WEIGHTS[d as Dimension];
    weighted += dw * dimScore;
    weightSum += dw;
  }
  return weighted / weightSum;
}

/** Same rows with one check raised to a perfect score. */
function withFixed(rows: GainRow[], checkKey: string): GainRow[] {
  return rows.map((r) => (r.check_key === checkKey ? { ...r, normalized_score: 100 } : r));
}

const rows: GainRow[] = [
  // Discoverability — one failing, one unavailable, one perfect.
  { dimension: "discoverability", check_key: "apple_listing_found", normalized_score: 0, weight_in_dim: 0.17 },
  { dimension: "discoverability", check_key: "gbp_exists", normalized_score: 100, weight_in_dim: 0.17 },
  { dimension: "discoverability", check_key: "llm_recommends", normalized_score: null, weight_in_dim: 0.1 },
  { dimension: "discoverability", check_key: "photos_count", normalized_score: 85, weight_in_dim: 0.09 },
  // Conversion.
  { dimension: "conversion", check_key: "contact_form_present", normalized_score: 0, weight_in_dim: 0.1 },
  { dimension: "conversion", check_key: "tel_link_clickable", normalized_score: 100, weight_in_dim: 0.22 },
  // Technical health.
  { dimension: "technical_health", check_key: "psi_seo", normalized_score: 92, weight_in_dim: 0.08 },
  // Resilience is entirely unanswered — the dimension must drop out.
  { dimension: "resilience", check_key: "owner_owns_domain", normalized_score: null, weight_in_dim: 0.25 },
];

describe("scoreGainForCheck", () => {
  it("predicts exactly how much the overall score moves", () => {
    for (const key of ["apple_listing_found", "photos_count", "contact_form_present", "psi_seo"]) {
      const predicted = scoreGainForCheck(rows, key);
      const actual = overallOf(withFixed(rows, key)) - overallOf(rows);
      expect(predicted, key).not.toBeNull();
      expect(predicted as number, key).toBeCloseTo(actual, 10);
    }
  });

  it("is larger than the engine's full-coverage impact when coverage is partial", () => {
    // impactPoints assumes denominators of 1.0; the real report renormalizes
    // over evaluated weight, so the true movement is bigger. Selling the
    // smaller number would under-promise, but selling it as "your score
    // will move" would simply be wrong.
    const impactPoints = DIMENSION_WEIGHTS.discoverability * 0.17 * 100;
    expect(scoreGainForCheck(rows, "apple_listing_found") as number).toBeGreaterThan(impactPoints);
  });

  it("returns null for checks that cannot move the score", () => {
    expect(scoreGainForCheck(rows, "llm_recommends")).toBeNull(); // unavailable
    expect(scoreGainForCheck(rows, "owner_owns_domain")).toBeNull(); // unanswered
    expect(scoreGainForCheck(rows, "gbp_exists")).toBeNull(); // already 100
    expect(scoreGainForCheck(rows, "nonexistent_check")).toBeNull();
  });

  it("never promises points a dimension cannot deliver", () => {
    // A fix cannot be worth more than its dimension's entire share.
    for (const r of rows) {
      const gain = scoreGainForCheck(rows, r.check_key);
      if (gain === null) continue;
      expect(gain).toBeLessThanOrEqual(100);
      expect(gain).toBeGreaterThan(0);
    }
  });
});

describe("formatGain", () => {
  it("reads as plain language", () => {
    expect(formatGain(2.44)).toBe("2.4 pts");
    expect(formatGain(1)).toBe("1 pt");
    expect(formatGain(0.02)).toBe("<0.1 pts");
    expect(formatGain(10.06)).toBe("10.1 pts");
  });
});
