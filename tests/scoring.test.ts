import { describe, expect, it } from "vitest";
import { evaluateAudit, isHolidayWithin } from "../lib/scoring/engine";
import type { AuditInputs, PlaceInput, PsiInput, SiteInput } from "../lib/scoring/inputs";
import { analyzeSiteHtml } from "../lib/site-analysis";
import { normalizePlace, normalizePsi } from "../lib/scoring/normalize";
import { CHECKS, DIMENSION_WEIGHTS } from "../lib/scoring/config";

const NOW = new Date("2026-08-15T12:00:00Z");

const healthyPlace: PlaceInput = {
  found: true,
  businessStatus: "OPERATIONAL",
  primaryType: "barbecue_restaurant",
  phone: "(585) 555-0100",
  websiteUri: "https://example.com",
  daysWithHours: 7,
  hasSpecialHoursSoon: true,
  photoCount: 25,
  rating: 4.6,
  reviewCount: 150,
  newestReviewAt: "2026-08-10T00:00:00Z",
  reviewSampleSize: 5,
  reviewsWithOwnerReply: 4,
};

const healthySite: SiteInput = {
  hasWebsite: true,
  fetched: true,
  httpStatusOk: true,
  httpsValid: true,
  htmlAvailable: true,
  jsRendered: false,
  telLinkPresent: true,
  phonePlainTextPresent: true,
  ctaPresent: true,
  transactionPath: { found: true, kind: "direct", host: "toasttab.com" },
  contactFormPresent: true,
  viewportMetaPresent: true,
};

const healthyPsi: PsiInput = {
  available: true,
  performance: 90,
  accessibility: 95,
  seo: 100,
  lcpMs: 1800,
};

function inputs(overrides: Partial<AuditInputs> = {}): AuditInputs {
  return {
    place: healthyPlace,
    site: healthySite,
    psi: healthyPsi,
    manual: {},
    now: NOW,
    ...overrides,
  };
}

describe("Apple Maps presence", () => {
  const onApple = { checked: true, found: true, matchedName: "Test Co", distanceMeters: 40, reason: null };
  const notOnApple = { checked: true, found: false, matchedName: null, distanceMeters: null, reason: null };

  it("weighs exactly the same as being on Google", () => {
    const apple = CHECKS.apple_listing_found.weight;
    const google = CHECKS.gbp_exists.weight;
    expect(apple).toBe(google);
  });

  it("missing from Apple lowers the score without touching Google's checks", () => {
    const on = evaluateAudit(inputs({ apple: onApple }));
    const off = evaluateAudit(inputs({ apple: notOnApple }));
    expect(off.overall as number).toBeLessThan(on.overall as number);
    const gbp = off.checks.find((c) => c.checkKey === "gbp_exists");
    expect(gbp?.normalizedScore).toBe(100);
  });

  it("is unavailable (never 0) when Apple isn't configured", () => {
    const result = evaluateAudit(inputs());
    const check = result.checks.find((c) => c.checkKey === "apple_listing_found");
    expect(check?.status).toBe("unavailable");
    expect(check?.normalizedScore).toBeNull();
  });

  it("is labelled inferred, since matching across providers is a judgement", () => {
    const result = evaluateAudit(inputs({ apple: onApple }));
    const check = result.checks.find((c) => c.checkKey === "apple_listing_found");
    expect(check?.confidence).toBe("inferred");
  });

  it("suggests Apple Business Connect when the listing is missing", () => {
    const result = evaluateAudit(inputs({ apple: notOnApple }));
    const fix = result.topFixes.find((f) => f.checkKey === "apple_listing_found");
    expect(fix?.fixInstruction).toContain("businessconnect.apple.com");
  });
});

describe("dimension weights", () => {
  it("every dimension's check weights still sum to 1.0", () => {
    const sums: Record<string, number> = {};
    for (const def of Object.values(CHECKS)) {
      sums[def.dimension] = (sums[def.dimension] ?? 0) + def.weight;
    }
    for (const [dim, sum] of Object.entries(sums)) {
      expect(`${dim}:${sum.toFixed(4)}`).toBe(`${dim}:1.0000`);
    }
  });
});

describe("healthy business", () => {
  const result = evaluateAudit(inputs());

  it("scores every automated dimension high", () => {
    expect(result.dimensions.discoverability).toBeGreaterThan(85);
    expect(result.dimensions.conversion).toBeGreaterThan(85);
    expect(result.dimensions.social_proof).toBeGreaterThan(85);
    expect(result.dimensions.technical_health).toBeGreaterThan(85);
  });

  it("leaves resilience unscored until manual answers arrive", () => {
    expect(result.dimensions.resilience).toBeNull();
  });

  it("reports partial coverage (manual checks not yet answered)", () => {
    expect(result.automatedCoveragePct).toBeGreaterThan(80);
    expect(result.automatedCoveragePct).toBeLessThan(100);
  });
});

describe("no website (CLAUDE.md §6.6)", () => {
  const noSite: SiteInput = { ...healthySite, hasWebsite: false };
  const place = { ...healthyPlace, websiteUri: null };
  const result = evaluateAudit(
    inputs({ site: noSite, place, psi: { available: false, performance: null, accessibility: null, seo: null, lcpMs: null } })
  );

  it("scores technical health exactly 0 — the one deliberate zero", () => {
    expect(result.dimensions.technical_health).toBe(0);
  });

  it("marks all six technical checks as fail with score 0", () => {
    const tech = result.checks.filter((c) => c.dimension === "technical_health");
    expect(tech).toHaveLength(6);
    for (const c of tech) {
      expect(c.status).toBe("fail");
      expect(c.normalizedScore).toBe(0);
    }
  });

  it("makes conversion site checks unavailable, not zero", () => {
    const tel = result.checks.find((c) => c.checkKey === "tel_link_clickable");
    expect(tel?.status).toBe("unavailable");
    expect(tel?.normalizedScore).toBeNull();
  });

  it("leads with 'create your website' before any other fix", () => {
    expect(result.topFixes[0].checkKey).toBe("site_reachable");
    expect(result.topFixes[0].fixTitle).toBe("Create your website");
  });

  it("never advises fixing a website that doesn't exist", () => {
    const impossible = ["https_valid", "mobile_viewport", "psi_performance", "psi_accessibility", "psi_seo", "gbp_website_link"];
    for (const key of result.topFixes.map((f) => f.checkKey)) {
      expect(impossible).not.toContain(key);
    }
  });

  it("still scores those checks 0 so the dimension math is unchanged", () => {
    const https = result.checks.find((c) => c.checkKey === "https_valid");
    expect(https?.normalizedScore).toBe(0);
    expect(https?.status).toBe("fail");
    expect(https?.priorityRatio).toBeNull(); // scored, but emits no advice
  });

  it("keeps the website finding first even when a cheap fix outranks it", () => {
    // Missing hours is a 2-minute fix worth more points; it must still
    // come second, because it can't be done through a site that doesn't exist.
    const withGaps = evaluateAudit(
      inputs({
        site: noSite,
        place: { ...healthyPlace, websiteUri: null, daysWithHours: 0 },
        psi: { available: false, performance: null, accessibility: null, seo: null, lcpMs: null },
      })
    );
    expect(withGaps.topFixes[0].checkKey).toBe("site_reachable");
    expect(withGaps.topFixes[1].checkKey).toBe("hours_present");
  });
});

describe("no Google profile", () => {
  const result = evaluateAudit(
    inputs({
      place: normalizePlace(null),
    })
  );

  it("fails gbp_exists and makes the rest of discoverability unavailable", () => {
    const gbp = result.checks.find((c) => c.checkKey === "gbp_exists");
    expect(gbp?.normalizedScore).toBe(0);
    const hours = result.checks.find((c) => c.checkKey === "hours_present");
    expect(hours?.status).toBe("unavailable");
  });

  it("discoverability dimension = 0 (only gbp_exists in denominator)", () => {
    expect(result.dimensions.discoverability).toBe(0);
  });

  it("social proof is fully unavailable, not zero", () => {
    expect(result.dimensions.social_proof).toBeNull();
  });
});

describe("unavailable checks are excluded from denominators", () => {
  it("PSI outage does not drag technical health down", () => {
    const noPsi: PsiInput = { available: false, performance: null, accessibility: null, seo: null, lcpMs: null };
    const result = evaluateAudit(inputs({ psi: noPsi }));
    // site_reachable, https_valid, mobile_viewport all pass = 100
    expect(result.dimensions.technical_health).toBe(100);
    const perf = result.checks.find((c) => c.checkKey === "psi_performance");
    expect(perf?.status).toBe("unavailable");
  });
});

describe("tier boundaries", () => {
  const cases: Array<[number, number]> = [
    [0, 0],
    [1, 25],
    [9, 25],
    [10, 50],
    [25, 70],
    [50, 85],
    [100, 100],
  ];
  for (const [count, expected] of cases) {
    it(`review_count ${count} scores ${expected}`, () => {
      const result = evaluateAudit(
        inputs({ place: { ...healthyPlace, reviewCount: count } })
      );
      const check = result.checks.find((c) => c.checkKey === "review_count");
      expect(check?.normalizedScore).toBe(expected);
    });
  }

  it("photos: 4 photos scores 30, 5 scores 60", () => {
    const r4 = evaluateAudit(inputs({ place: { ...healthyPlace, photoCount: 4 } }));
    const r5 = evaluateAudit(inputs({ place: { ...healthyPlace, photoCount: 5 } }));
    expect(r4.checks.find((c) => c.checkKey === "photos_count")?.normalizedScore).toBe(30);
    expect(r5.checks.find((c) => c.checkKey === "photos_count")?.normalizedScore).toBe(60);
  });

  it("review recency: 45 days old scores 80, 400 days scores 0", () => {
    const at45 = new Date(NOW.getTime() - 45 * 86400_000).toISOString();
    const at400 = new Date(NOW.getTime() - 400 * 86400_000).toISOString();
    const r45 = evaluateAudit(inputs({ place: { ...healthyPlace, newestReviewAt: at45 } }));
    const r400 = evaluateAudit(inputs({ place: { ...healthyPlace, newestReviewAt: at400 } }));
    expect(r45.checks.find((c) => c.checkKey === "review_recency")?.normalizedScore).toBe(80);
    expect(r400.checks.find((c) => c.checkKey === "review_recency")?.normalizedScore).toBe(0);
  });
});

describe("gbp_claimed heuristic (CLAUDE.md §6.8)", () => {
  it("5 signals → likely claimed, inferred confidence", () => {
    const result = evaluateAudit(inputs());
    const check = result.checks.find((c) => c.checkKey === "gbp_claimed");
    expect(check?.normalizedScore).toBe(100);
    expect(check?.confidence).toBe("inferred");
  });

  it("2 signals → likely unclaimed", () => {
    const weak: PlaceInput = {
      ...healthyPlace,
      websiteUri: null,
      phone: null,
      photoCount: 1,
      daysWithHours: 7, // signal 1
      businessStatus: "OPERATIONAL", // signal 2
    };
    const result = evaluateAudit(inputs({ place: weak }));
    const check = result.checks.find((c) => c.checkKey === "gbp_claimed");
    expect(check?.normalizedScore).toBe(15);
  });
});

describe("manual answers (CLAUDE.md §6.7)", () => {
  it("unanswered → manual_required, no score", () => {
    const result = evaluateAudit(inputs());
    const check = result.checks.find((c) => c.checkKey === "owner_has_gbp_access");
    expect(check?.status).toBe("manual_required");
    expect(check?.normalizedScore).toBeNull();
  });

  it("yes = 100, no = 0, not_sure = 0 with flag", () => {
    const result = evaluateAudit(
      inputs({
        manual: {
          owner_has_gbp_access: "yes",
          owner_owns_domain: "no",
          owner_has_site_access: "not_sure",
          owner_has_social_access: "yes",
        },
      })
    );
    const get = (k: string) => result.checks.find((c) => c.checkKey === k);
    expect(get("owner_has_gbp_access")?.normalizedScore).toBe(100);
    expect(get("owner_owns_domain")?.normalizedScore).toBe(0);
    const notSure = get("owner_has_site_access");
    expect(notSure?.normalizedScore).toBe(0);
    expect((notSure?.rawValue as { notSure: boolean }).notSure).toBe(true);
    expect(result.dimensions.resilience).toBe(50);
  });
});

describe("ranking by impact ÷ effort (CLAUDE.md §6.9)", () => {
  it("cheap wins beat expensive advice", () => {
    // Missing hours (minutes to fix) vs slow site (days to fix).
    const place = { ...healthyPlace, daysWithHours: 0 };
    const psi: PsiInput = { ...healthyPsi, performance: 20 };
    const result = evaluateAudit(inputs({ place, psi }));
    const keys = result.topFixes.map((c) => c.checkKey);
    expect(keys.indexOf("hours_present")).toBeLessThan(keys.indexOf("psi_performance"));
  });

  it("excludes passing and unavailable checks", () => {
    const result = evaluateAudit(inputs());
    for (const fix of result.topFixes) {
      expect(fix.status).not.toBe("pass");
      expect(fix.status).not.toBe("unavailable");
    }
  });
});

describe("composition math (CLAUDE.md §6.10)", () => {
  it("overall equals hand-computed weighted average of evaluated dimensions", () => {
    const result = evaluateAudit(inputs());
    const d = result.dimensions;
    const evaluated = (["discoverability", "conversion", "social_proof", "technical_health"] as const)
      .filter((k) => d[k] !== null);
    const num = evaluated.reduce((s, k) => s + DIMENSION_WEIGHTS[k] * (d[k] as number), 0);
    const den = evaluated.reduce((s, k) => s + DIMENSION_WEIGHTS[k], 0);
    expect(result.overall).toBeCloseTo(num / den, 6);
  });
});

describe("site analysis (cheerio)", () => {
  it("detects tel link, form, viewport, CTA, and ordering host", () => {
    const html = `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body><header><a href="https://order.toasttab.com/abc">Order online</a></header>
      <a href="tel:+15855550100">Call us</a>
      <form><input type="email" name="email"><textarea name="message"></textarea></form>
      <p>Welcome to our restaurant. ${"x".repeat(300)}</p>
      </body></html>`;
    const s = analyzeSiteHtml(html, "(585) 555-0100");
    expect(s.telLinkPresent).toBe(true);
    expect(s.ctaPresent).toBe(true);
    expect(s.transactionPath).toEqual({ found: true, kind: "direct", host: "toasttab.com" });
    expect(s.contactFormPresent).toBe(true);
    expect(s.viewportMetaPresent).toBe(true);
    expect(s.jsRendered).toBe(false);
  });

  it("plain-text phone without tel link", () => {
    const html = `<html><body><p>Call us at (585) 555-0100 today. ${"x".repeat(300)}</p></body></html>`;
    const s = analyzeSiteHtml(html, "(585) 555-0100");
    expect(s.telLinkPresent).toBe(false);
    expect(s.phonePlainTextPresent).toBe(true);
  });

  it("flags near-empty body as JS-rendered", () => {
    const s = analyzeSiteHtml("<html><body><div id='root'></div></body></html>", null);
    expect(s.jsRendered).toBe(true);
  });
});

describe("PSI normalization", () => {
  it("maps 0-1 category scores to 0-100", () => {
    const psi = normalizePsi({
      lighthouseResult: {
        categories: { performance: { score: 0.42 }, accessibility: { score: 1 }, seo: { score: 0.9 } },
        audits: { "largest-contentful-paint": { numericValue: 3200 } },
      },
    });
    expect(psi.performance).toBe(42);
    expect(psi.accessibility).toBe(100);
    expect(psi.seo).toBe(90);
    expect(psi.lcpMs).toBe(3200);
  });

  it("missing result → unavailable, never zero", () => {
    const psi = normalizePsi(null);
    expect(psi.available).toBe(false);
    expect(psi.performance).toBeNull();
  });
});

describe("holiday window", () => {
  it("finds Thanksgiving from mid-October", () => {
    expect(isHolidayWithin(new Date("2026-10-15T00:00:00Z"), 60)).toBe(true);
  });
  it("independence day windows correctly", () => {
    expect(isHolidayWithin(new Date("2026-05-20T00:00:00Z"), 60)).toBe(true);
  });
});

describe("fix instructions cite what was actually measured", () => {
  const find = (result: ReturnType<typeof evaluateAudit>, key: string) =>
    result.checks.find((c) => c.checkKey === key);

  it("names the category it found instead of describing the problem abstractly", () => {
    const result = evaluateAudit(
      inputs({ place: { ...healthyPlace, primaryType: "restaurant" } })
    );
    expect(find(result, "category_specific")?.fixInstruction).toContain(
      '"restaurant"'
    );
  });

  it("counts the days of hours that are missing", () => {
    const result = evaluateAudit(
      inputs({ place: { ...healthyPlace, daysWithHours: 4 } })
    );
    const text = find(result, "hours_present")?.fixInstruction ?? "";
    expect(text).toContain("4 of 7 days");
    expect(text).toContain("missing 3 days");
  });

  it("quotes the photo and review counts", () => {
    const result = evaluateAudit(
      inputs({
        place: { ...healthyPlace, photoCount: 3, reviewCount: 11, rating: 3.8 },
      })
    );
    expect(find(result, "photos_count")?.fixInstruction).toContain("3 photos");
    expect(find(result, "review_count")?.fixInstruction).toContain("11 Google reviews");
    expect(find(result, "average_rating")?.fixInstruction).toContain("3.8 stars");
  });

  it("dates the newest review rather than saying it is old", () => {
    const result = evaluateAudit(
      inputs({
        place: { ...healthyPlace, newestReviewAt: "2025-03-04T00:00:00Z" },
      })
    );
    const text = find(result, "review_recency")?.fixInstruction ?? "";
    expect(text).toContain("March 2025");
    expect(text).toContain("months ago");
  });

  it("reports owner replies as a share of the visible sample, never the whole", () => {
    const result = evaluateAudit(
      inputs({
        place: { ...healthyPlace, reviewSampleSize: 5, reviewsWithOwnerReply: 1 },
      })
    );
    const text = find(result, "owner_responds")?.fixInstruction ?? "";
    expect(text).toContain("1 of the 5 most recent reviews");
  });

  it("distinguishes an unlinked phone number from a missing one", () => {
    const plain = evaluateAudit(
      inputs({
        site: { ...healthySite, telLinkPresent: false, phonePlainTextPresent: true },
      })
    );
    expect(find(plain, "tel_link_clickable")?.fixInstruction).toContain("plain text");

    const absent = evaluateAudit(
      inputs({
        site: { ...healthySite, telLinkPresent: false, phonePlainTextPresent: false },
      })
    );
    expect(find(absent, "tel_link_clickable")?.fixInstruction).toContain(
      "no phone number anywhere"
    );
  });

  it("states the measured load time in seconds", () => {
    const result = evaluateAudit(
      inputs({ psi: { ...healthyPsi, performance: 35, lcpMs: 6200 } })
    );
    expect(find(result, "psi_performance")?.fixInstruction).toContain("6.2 seconds");
  });

  it("falls back to the generic wording when there is nothing to cite", () => {
    const result = evaluateAudit(
      inputs({ psi: { ...healthyPsi, performance: 35, lcpMs: null } })
    );
    expect(find(result, "psi_performance")?.fixInstruction).toBe(
      CHECKS.psi_performance.fixInstruction
    );
  });
});
