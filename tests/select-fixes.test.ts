import { describe, expect, it } from "vitest";
import { selectTopFixes, type RankedFix } from "../lib/scoring/select-fixes";
import { CHECKS, DIMENSION_WEIGHTS, MIN_HEADLINE_IMPACT } from "../lib/scoring/config";

// Candidates arrive already sorted by priority_ratio, descending — that is
// what the database query guarantees, so the fixtures below preserve it.
const fix = (checkKey: string, dimension: string, impactPoints: number): RankedFix => ({
  checkKey,
  dimension,
  impactPoints,
});

describe("choosing the fixes that lead the report", () => {
  it("drops fixes too small to be worth the owner's week", () => {
    // hours_special has the best ratio here — minutes of work — but it is
    // worth 1.4 points, so it must not take a headline slot from work
    // worth several times as much.
    const picked = selectTopFixes(
      [
        fix("hours_special", "discoverability", 1.4),
        fix("tel_link_clickable", "conversion", 3.3),
        fix("review_recency", "social_proof", 4.05),
      ],
      3,
      true
    );
    expect(picked.map((p) => p.checkKey)).toEqual([
      "tel_link_clickable",
      "review_recency",
    ]);
  });

  it("caps hours_special below the threshold by construction", () => {
    // The guard above is only meaningful while this stays true: even a
    // total miss on holiday hours cannot reach the headline threshold.
    const def = CHECKS.hours_special;
    const maxImpact = DIMENSION_WEIGHTS[def.dimension] * def.weight * 100;
    expect(maxImpact).toBeLessThan(MIN_HEADLINE_IMPACT);
  });

  it("does not hand every slot to one dimension", () => {
    // A business with a bare Google profile would otherwise get three
    // variations of "fill in your profile" and nothing about its website.
    const picked = selectTopFixes(
      [
        fix("category_specific", "discoverability", 2.94),
        fix("hours_present", "discoverability", 2.8),
        fix("photos_count", "discoverability", 2.6),
        fix("tel_link_clickable", "conversion", 2.5),
        fix("review_count", "social_proof", 2.4),
      ],
      3,
      true
    );
    expect(picked.map((p) => p.dimension)).toEqual([
      "discoverability",
      "conversion",
      "social_proof",
    ]);
  });

  it("allows a second fix from a dimension rather than returning short", () => {
    const picked = selectTopFixes(
      [
        fix("category_specific", "discoverability", 2.94),
        fix("hours_present", "discoverability", 2.8),
        fix("photos_count", "discoverability", 2.6),
      ],
      3,
      true
    );
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.checkKey)).size).toBe(3);
  });

  it("falls back to small fixes rather than showing an empty list", () => {
    // A business with nothing but trivia wrong still gets a report.
    const picked = selectTopFixes(
      [
        fix("hours_special", "discoverability", 1.4),
        fix("psi_seo", "technical_health", 1.2),
      ],
      3,
      true
    );
    expect(picked.map((p) => p.checkKey)).toEqual(["hours_special", "psi_seo"]);
  });

  it("leads with the website finding when there is no website", () => {
    const picked = selectTopFixes(
      [
        fix("category_specific", "discoverability", 2.94),
        fix("review_count", "social_proof", 2.5),
        fix("site_reachable", "technical_health", 2.7),
      ],
      3,
      false
    );
    expect(picked[0].checkKey).toBe("site_reachable");
    expect(picked).toHaveLength(3);
  });

  it("never repeats a fix", () => {
    const picked = selectTopFixes(
      [
        fix("tel_link_clickable", "conversion", 3.3),
        fix("primary_cta_present", "conversion", 2.5),
      ],
      3,
      true
    );
    expect(new Set(picked.map((p) => p.checkKey)).size).toBe(picked.length);
  });
});
