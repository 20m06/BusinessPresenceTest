// The scoring engine — pure functions, zero I/O (CLAUDE.md §6).

import {
  CHECKS,
  CLAIMED_SCORES,
  CLAIMED_SIGNALS,
  CATEGORY_GENERIC_SCORE,
  DIMENSION_WEIGHTS,
  Dimension,
  EFFORT_SCORES,
  EFFORT_LABELS,
  FIXED_HOLIDAYS,
  GENERIC_TYPES,
  HOLIDAY_WINDOW_DAYS,
  HOURS_PARTIAL_SCORE,
  HOURS_SPECIAL_WARN_SCORE,
  NO_WEBSITE_FIX,
  PHOTO_TIERS,
  RATING_TIERS,
  RECENCY_TIERS,
  REVIEW_COUNT_TIERS,
  SCORING_CONFIG_VERSION,
  STATUS_THRESHOLDS,
  TEL_PLAIN_TEXT_SCORE,
} from "./config";
import type { AuditInputs, ManualAnswer } from "./inputs";

export type CheckStatus = "pass" | "warn" | "fail" | "unavailable" | "manual_required";
export type Confidence = "verified" | "inferred" | "manual_required";

export interface CheckResult {
  checkKey: string;
  dimension: Dimension;
  label: string;
  rawValue: unknown;
  normalizedScore: number | null; // null when unavailable / unanswered
  weightInDim: number;
  status: CheckStatus;
  confidence: Confidence;
  fixCostBucket: string;
  impactPoints: number | null;
  effortScore: number | null;
  priorityRatio: number | null;
  fixTitle: string;
  fixInstruction: string;
}

export interface AuditScores {
  version: string;
  overall: number | null;
  dimensions: Partial<Record<Dimension, number | null>>;
  automatedCoveragePct: number;
  checks: CheckResult[];
  topFixes: CheckResult[];
}

function statusFromScore(score: number): CheckStatus {
  if (score >= STATUS_THRESHOLDS.passMin) return "pass";
  if (score >= STATUS_THRESHOLDS.warnMin) return "warn";
  return "fail";
}

function tier(tiers: Array<[number, number]>, value: number): number {
  for (const [min, score] of tiers) {
    if (value >= min) return score;
  }
  return 0;
}

interface Raw {
  score: number | null;
  status?: CheckStatus; // defaults to statusFromScore
  confidence: Confidence;
  rawValue: unknown;
  // Still scored, but emits no fix — used when the advice would be
  // impossible to act on (see NO_WEBSITE_FIX).
  suppressFix?: boolean;
  fixTitle?: string;
  fixInstruction?: string;
}

function make(checkKey: string, raw: Raw): CheckResult {
  const def = CHECKS[checkKey];
  const score = raw.score;
  const status =
    raw.status ?? (score === null ? "unavailable" : statusFromScore(score));
  const scoreable = score !== null && status !== "unavailable";
  const ranked = scoreable && !raw.suppressFix;
  const impact = ranked
    ? DIMENSION_WEIGHTS[def.dimension] * def.weight * (100 - (score as number))
    : null;
  const effort = EFFORT_SCORES[def.fixCostBucket];
  return {
    checkKey,
    dimension: def.dimension,
    label: def.label,
    rawValue: raw.rawValue,
    normalizedScore: score,
    weightInDim: def.weight,
    status,
    confidence: raw.confidence,
    fixCostBucket: def.fixCostBucket,
    impactPoints: impact,
    effortScore: ranked ? effort : null,
    priorityRatio: impact !== null ? impact / effort : null,
    fixTitle: raw.fixTitle ?? def.fixTitle,
    fixInstruction: raw.fixInstruction ?? def.fixInstruction,
  };
}

// ── Holiday helper for hours_special ─────────────────────────────────

function nthWeekdayOfMonth(year: number, month0: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month0, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month0, 1 + offset + (n - 1) * 7));
}

function lastWeekdayOfMonth(year: number, month0: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, month0 + 1, 0 - offset));
}

export function isHolidayWithin(now: Date, windowDays: number): boolean {
  const end = new Date(now.getTime() + windowDays * 86400_000);
  const years = [now.getUTCFullYear(), now.getUTCFullYear() + 1];
  const holidays: Date[] = [];
  for (const y of years) {
    for (const [m, d] of FIXED_HOLIDAYS) holidays.push(new Date(Date.UTC(y, m - 1, d)));
    holidays.push(nthWeekdayOfMonth(y, 10, 4, 4)); // Thanksgiving: 4th Thu of Nov
    holidays.push(lastWeekdayOfMonth(y, 4, 1)); // Memorial Day: last Mon of May
    holidays.push(nthWeekdayOfMonth(y, 8, 1, 1)); // Labor Day: 1st Mon of Sep
  }
  return holidays.some((h) => h >= now && h <= end);
}

// ── The engine ───────────────────────────────────────────────────────

export function evaluateAudit(inputs: AuditInputs): AuditScores {
  const { place, site, psi, apple, manual, now } = inputs;
  const checks: CheckResult[] = [];

  // Apple Maps presence — independent of the Google profile, since a
  // business can be on one map and missing from the other. Marked
  // 'inferred' because matching a name and location across two providers
  // is a judgement, not a lookup by shared id.
  checks.push(
    make("apple_listing_found", {
      score: !apple?.checked ? null : apple.found ? 100 : 0,
      status: !apple?.checked ? "unavailable" : undefined,
      confidence: "inferred",
      rawValue: apple
        ? {
            found: apple.found,
            matchedName: apple.matchedName,
            distanceMeters: apple.distanceMeters,
            reason: apple.reason,
          }
        : { reason: "apple_not_configured" },
    })
  );

  // ── Discoverability ────────────────────────────────────────────────
  const gbpFound = place.found;
  checks.push(
    make("gbp_exists", {
      score: gbpFound ? 100 : 0,
      confidence: "verified",
      rawValue: { found: gbpFound },
    })
  );

  if (!gbpFound) {
    // All other Discoverability checks are unavailable (CLAUDE.md §6.3).
    for (const key of [
      "gbp_claimed",
      "category_specific",
      "hours_present",
      "hours_special",
      "phone_present",
      "photos_count",
    ]) {
      checks.push(
        make(key, {
          score: null,
          status: "unavailable",
          confidence: "verified",
          rawValue: { reason: "no_google_profile" },
        })
      );
    }
  } else {
    // gbp_claimed — heuristic composite (CLAUDE.md §6.8).
    const signals = {
      website: !!place.websiteUri,
      phone: !!place.phone,
      completeHours: place.daysWithHours === 7,
      photos5plus: (place.photoCount ?? 0) >= 5,
      operational: place.businessStatus === "OPERATIONAL",
    };
    const signalCount = Object.values(signals).filter(Boolean).length;
    const claimedScore =
      signalCount >= CLAIMED_SIGNALS.likelyClaimedMin
        ? CLAIMED_SCORES.likely
        : signalCount <= CLAIMED_SIGNALS.likelyUnclaimedMax
          ? CLAIMED_SCORES.unlikely
          : CLAIMED_SCORES.indeterminate;
    checks.push(
      make("gbp_claimed", {
        score: claimedScore,
        confidence: "inferred",
        rawValue: { signals, signalCount },
      })
    );

    const pt = place.primaryType;
    checks.push(
      make("category_specific", {
        score: pt === null ? 0 : GENERIC_TYPES.has(pt) ? CATEGORY_GENERIC_SCORE : 100,
        confidence: "verified",
        rawValue: { primaryType: pt },
      })
    );

    checks.push(
      make("hours_present", {
        score:
          place.daysWithHours === 7 ? 100 : place.daysWithHours > 0 ? HOURS_PARTIAL_SCORE : 0,
        confidence: "verified",
        rawValue: { daysWithHours: place.daysWithHours },
      })
    );

    const holidayNear = isHolidayWithin(now, HOLIDAY_WINDOW_DAYS);
    checks.push(
      make("hours_special", {
        score: !holidayNear || place.hasSpecialHoursSoon ? 100 : HOURS_SPECIAL_WARN_SCORE,
        confidence: "inferred", // Google only exposes ~a week of special hours
        rawValue: { holidayNear, hasSpecialHoursSoon: place.hasSpecialHoursSoon },
      })
    );

    checks.push(
      make("phone_present", {
        score: place.phone ? 100 : 0,
        confidence: "verified",
        rawValue: { phone: place.phone },
      })
    );

    checks.push(
      make("photos_count", {
        score: place.photoCount === null ? null : tier(PHOTO_TIERS, place.photoCount),
        status: place.photoCount === null ? "unavailable" : undefined,
        confidence: "verified",
        rawValue: { photoCount: place.photoCount },
      })
    );
  }

  // ── Conversion ─────────────────────────────────────────────────────
  checks.push(
    make("gbp_website_link", {
      score: gbpFound ? (place.websiteUri ? 100 : 0) : null,
      status: gbpFound ? undefined : "unavailable",
      confidence: "verified",
      rawValue: { websiteUri: place.websiteUri },
      // "Link your website on Google" is useless advice to a business that
      // has no website — the create-a-website finding covers it instead.
      suppressFix: !site.hasWebsite,
    })
  );

  const htmlConfidence: Confidence = site.jsRendered ? "inferred" : "verified";
  const htmlChecksAvailable = site.hasWebsite && site.fetched && site.htmlAvailable;

  const htmlUnavailable = (reason: string): Raw => ({
    score: null,
    status: "unavailable",
    confidence: "verified",
    rawValue: { reason },
  });

  if (!site.hasWebsite) {
    // No website: conversion site checks are unavailable (the punishment
    // for no website lives in Technical Health, CLAUDE.md §6.6).
    checks.push(make("tel_link_clickable", htmlUnavailable("no_website")));
    checks.push(make("primary_cta_present", htmlUnavailable("no_website")));
    checks.push(make("transaction_path", htmlUnavailable("no_website")));
    checks.push(make("contact_form_present", htmlUnavailable("no_website")));
  } else if (!htmlChecksAvailable) {
    checks.push(make("tel_link_clickable", htmlUnavailable("site_unreadable")));
    checks.push(make("primary_cta_present", htmlUnavailable("site_unreadable")));
    checks.push(make("transaction_path", htmlUnavailable("site_unreadable")));
    checks.push(make("contact_form_present", htmlUnavailable("site_unreadable")));
  } else {
    checks.push(
      make("tel_link_clickable", {
        score: site.telLinkPresent ? 100 : site.phonePlainTextPresent ? TEL_PLAIN_TEXT_SCORE : 0,
        confidence: htmlConfidence,
        rawValue: {
          telLink: site.telLinkPresent,
          plainText: site.phonePlainTextPresent,
        },
      })
    );
    checks.push(
      make("primary_cta_present", {
        score: site.ctaPresent ? 100 : 0,
        confidence: htmlConfidence,
        rawValue: { ctaPresent: site.ctaPresent },
      })
    );
    checks.push(
      make("transaction_path", {
        score: site.transactionPath.found ? 100 : 0,
        confidence: htmlConfidence,
        rawValue: site.transactionPath,
      })
    );
    checks.push(
      make("contact_form_present", {
        score: site.contactFormPresent ? 100 : 0,
        confidence: htmlConfidence,
        rawValue: { contactFormPresent: site.contactFormPresent },
      })
    );
  }

  checks.push(manualCheck("contact_form_delivers", manual["contact_form_delivers"]));

  // ── Social Proof ───────────────────────────────────────────────────
  const socialUnavailable = !gbpFound;
  checks.push(
    make("review_count", {
      score: socialUnavailable || place.reviewCount === null
        ? null
        : tier(REVIEW_COUNT_TIERS, place.reviewCount),
      status: socialUnavailable || place.reviewCount === null ? "unavailable" : undefined,
      confidence: "verified",
      rawValue: { reviewCount: place.reviewCount },
    })
  );
  checks.push(
    make("average_rating", {
      score:
        socialUnavailable || place.rating === null ? null : tier(RATING_TIERS, place.rating),
      status: socialUnavailable || place.rating === null ? "unavailable" : undefined,
      confidence: "verified",
      rawValue: { rating: place.rating },
    })
  );

  let recencyScore: number | null = null;
  if (!socialUnavailable) {
    if ((place.reviewCount ?? 0) === 0) {
      recencyScore = 0;
    } else if (place.newestReviewAt) {
      const ageDays = (now.getTime() - new Date(place.newestReviewAt).getTime()) / 86400_000;
      recencyScore = 0;
      for (const [maxDays, score] of RECENCY_TIERS) {
        if (ageDays <= maxDays) {
          recencyScore = score;
          break;
        }
      }
    }
  }
  checks.push(
    make("review_recency", {
      score: recencyScore,
      status:
        socialUnavailable || (recencyScore === null && (place.reviewCount ?? 0) > 0)
          ? "unavailable"
          : undefined,
      confidence: "verified",
      rawValue: { newestReviewAt: place.newestReviewAt },
    })
  );

  const replyDataAvailable =
    !socialUnavailable && place.reviewSampleSize > 0 && place.reviewsWithOwnerReply !== null;
  checks.push(
    make("owner_responds", {
      score: replyDataAvailable
        ? Math.round(((place.reviewsWithOwnerReply as number) / place.reviewSampleSize) * 100)
        : null,
      status: replyDataAvailable ? undefined : "unavailable",
      confidence: "inferred", // limited review sample (CLAUDE.md §6.8)
      rawValue: {
        sampleSize: place.reviewSampleSize,
        withOwnerReply: place.reviewsWithOwnerReply,
      },
    })
  );

  // ── Technical Health ───────────────────────────────────────────────
  if (!site.hasWebsite) {
    // The one place missing scores zero, not unavailable (CLAUDE.md §6.6).
    // site_reachable carries the single "create your website" finding;
    // the other five score 0 for the math but emit no advice, since you
    // cannot speed up or secure a site that doesn't exist.
    checks.push(
      make("site_reachable", {
        score: 0,
        status: "fail",
        confidence: "verified",
        rawValue: { reason: "no_website" },
        fixTitle: NO_WEBSITE_FIX.title,
        fixInstruction: NO_WEBSITE_FIX.instruction,
      })
    );
    for (const key of [
      "https_valid",
      "mobile_viewport",
      "psi_performance",
      "psi_accessibility",
      "psi_seo",
    ]) {
      checks.push(
        make(key, {
          score: 0,
          status: "fail",
          confidence: "verified",
          rawValue: { reason: "no_website" },
          suppressFix: true,
        })
      );
    }
  } else {
    checks.push(
      make("site_reachable", {
        score: site.fetched && site.httpStatusOk ? 100 : 0,
        confidence: "verified",
        rawValue: { fetched: site.fetched, httpStatusOk: site.httpStatusOk },
      })
    );
    checks.push(
      make("https_valid", {
        score: site.httpsValid ? 100 : 0,
        confidence: "verified",
        rawValue: { httpsValid: site.httpsValid },
      })
    );
    checks.push(
      make("mobile_viewport", {
        score: htmlChecksAvailable ? (site.viewportMetaPresent ? 100 : 0) : null,
        status: htmlChecksAvailable ? undefined : "unavailable",
        confidence: htmlConfidence,
        rawValue: { viewportMetaPresent: site.viewportMetaPresent },
      })
    );
    const psiRaw = { available: psi.available, lcpMs: psi.lcpMs };
    checks.push(
      make("psi_performance", {
        score: psi.available ? psi.performance : null,
        status: psi.available && psi.performance !== null ? undefined : "unavailable",
        confidence: "verified",
        rawValue: { ...psiRaw, performance: psi.performance },
      })
    );
    checks.push(
      make("psi_accessibility", {
        score: psi.available ? psi.accessibility : null,
        status: psi.available && psi.accessibility !== null ? undefined : "unavailable",
        confidence: "verified",
        rawValue: { ...psiRaw, accessibility: psi.accessibility },
      })
    );
    checks.push(
      make("psi_seo", {
        score: psi.available ? psi.seo : null,
        status: psi.available && psi.seo !== null ? undefined : "unavailable",
        confidence: "verified",
        rawValue: { ...psiRaw, seo: psi.seo },
      })
    );
  }

  // ── Resilience (manual only) ───────────────────────────────────────
  for (const key of [
    "owner_has_gbp_access",
    "owner_owns_domain",
    "owner_has_site_access",
    "owner_has_social_access",
  ]) {
    checks.push(manualCheck(key, manual[key]));
  }

  return compose(checks, { noWebsite: !site.hasWebsite });
}

function manualCheck(key: string, answer: ManualAnswer | undefined): CheckResult {
  if (answer === undefined) {
    return make(key, {
      score: null,
      status: "manual_required",
      confidence: "manual_required",
      rawValue: { answered: false },
    });
  }
  // "Not sure" is itself the finding (CLAUDE.md §6.7).
  return make(key, {
    score: answer === "yes" ? 100 : 0,
    confidence: "verified",
    rawValue: { answered: true, answer, notSure: answer === "not_sure" },
  });
}

// ── Composition (CLAUDE.md §6.10) ────────────────────────────────────

export function compose(
  checks: CheckResult[],
  opts: { noWebsite?: boolean } = {}
): AuditScores {
  const dimensions: Partial<Record<Dimension, number | null>> = {};
  let coveredWeight = 0;
  let totalWeight = 0;

  for (const dim of Object.keys(DIMENSION_WEIGHTS) as Dimension[]) {
    const dimChecks = checks.filter((c) => c.dimension === dim);
    let num = 0;
    let den = 0;
    for (const c of dimChecks) {
      totalWeight += DIMENSION_WEIGHTS[dim] * c.weightInDim;
      if (c.normalizedScore !== null) {
        num += c.weightInDim * c.normalizedScore;
        den += c.weightInDim;
        coveredWeight += DIMENSION_WEIGHTS[dim] * c.weightInDim;
      }
    }
    dimensions[dim] = den > 0 ? num / den : null;
  }

  let overallNum = 0;
  let overallDen = 0;
  for (const dim of Object.keys(DIMENSION_WEIGHTS) as Dimension[]) {
    const score = dimensions[dim];
    if (score !== null && score !== undefined) {
      overallNum += DIMENSION_WEIGHTS[dim] * score;
      overallDen += DIMENSION_WEIGHTS[dim];
    }
  }

  const ranked = checks
    .filter(
      (c) =>
        c.priorityRatio !== null &&
        c.status !== "pass" &&
        c.status !== "unavailable" &&
        c.status !== "manual_required"
    )
    .sort((a, b) => (b.priorityRatio as number) - (a.priorityRatio as number));

  // Having a website is a prerequisite, not a competing option: nothing
  // else on the list can be done through a site that doesn't exist, so it
  // leads regardless of its impact-over-effort ratio.
  const topFixes = opts.noWebsite
    ? [
        ...ranked.filter((c) => c.checkKey === "site_reachable"),
        ...ranked.filter((c) => c.checkKey !== "site_reachable"),
      ]
    : ranked;

  return {
    version: SCORING_CONFIG_VERSION,
    overall: overallDen > 0 ? overallNum / overallDen : null,
    dimensions,
    automatedCoveragePct: totalWeight > 0 ? (coveredWeight / totalWeight) * 100 : 0,
    checks,
    topFixes,
  };
}

export { EFFORT_LABELS };
