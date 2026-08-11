// Map raw API responses to the engine's normalized inputs.
// Pure functions — testable against fixture JSON.

import type { AppleInput, LlmInput, PlaceInput, PsiInput, SiteInput } from "./inputs";
import type { SiteSignals } from "../site-analysis";

// Shape of the subset of Places (New) Place Details we request.
export interface RawPlace {
  id?: string;
  businessStatus?: string;
  primaryType?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    periods?: Array<{ open?: { day?: number } }>;
    weekdayDescriptions?: string[];
  };
  currentOpeningHours?: {
    specialDays?: Array<{ date?: unknown }>;
    periods?: Array<{ open?: { day?: number } }>;
  };
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    publishTime?: string;
    // Places (New) does not consistently expose owner replies; when it
    // does, it appears as an "originalText"-style reply object.
    [key: string]: unknown;
  }>;
  photos?: Array<unknown>;
}

export function normalizePlace(raw: RawPlace | null): PlaceInput {
  if (!raw || !raw.id) {
    return {
      found: false,
      businessStatus: null,
      primaryType: null,
      phone: null,
      websiteUri: null,
      daysWithHours: 0,
      hasSpecialHoursSoon: false,
      photoCount: null,
      rating: null,
      reviewCount: null,
      newestReviewAt: null,
      reviewSampleSize: 0,
      reviewsWithOwnerReply: null,
    };
  }

  const days = new Set<number>();
  for (const p of raw.regularOpeningHours?.periods ?? []) {
    if (p.open?.day !== undefined) days.add(p.open.day);
  }
  // A 24/7 business has a single period with day 0 and no close; Google
  // also expresses full weeks via weekdayDescriptions — trust the larger.
  const daysWithHours = Math.max(
    days.size,
    (raw.regularOpeningHours?.weekdayDescriptions ?? []).filter(
      (d) => d && !/closed/i.test(d)
    ).length
  );

  const hasSpecialHoursSoon = (raw.currentOpeningHours?.specialDays ?? []).length > 0;

  const reviews = raw.reviews ?? [];
  let newest: string | null = null;
  for (const r of reviews) {
    if (r.publishTime && (!newest || r.publishTime > newest)) newest = r.publishTime;
  }

  return {
    found: true,
    businessStatus: raw.businessStatus ?? null,
    primaryType: raw.primaryType ?? null,
    phone: raw.nationalPhoneNumber ?? null,
    websiteUri: raw.websiteUri ?? null,
    daysWithHours: Math.min(daysWithHours, 7),
    hasSpecialHoursSoon,
    photoCount: raw.photos ? raw.photos.length : null,
    rating: raw.rating ?? null,
    reviewCount: raw.userRatingCount ?? null,
    newestReviewAt: newest,
    reviewSampleSize: reviews.length,
    // Owner-reply data is not exposed by Places (New) review objects we
    // request — leave null so the check reads "unavailable" rather than
    // inventing a rate (CLAUDE.md rule 7).
    reviewsWithOwnerReply: null,
  };
}

export interface RawSiteFetch {
  attempted: boolean;
  ok: boolean; // final HTTP status 200-299
  httpsValid: boolean;
  finalUrl: string | null;
  html: string | null;
  error: string | null;
}

export function normalizeSite(
  websiteUri: string | null,
  fetchResult: RawSiteFetch | null,
  signals: SiteSignals | null
): SiteInput {
  if (!websiteUri) {
    return {
      hasWebsite: false,
      fetched: false,
      httpStatusOk: false,
      httpsValid: false,
      htmlAvailable: false,
      jsRendered: false,
      telLinkPresent: false,
      phonePlainTextPresent: false,
      ctaPresent: false,
      transactionPath: { found: false, kind: null, host: null },
      contactFormPresent: false,
      viewportMetaPresent: false,
    };
  }
  const fetched = !!fetchResult?.attempted && !fetchResult.error;
  return {
    hasWebsite: true,
    fetched,
    httpStatusOk: !!fetchResult?.ok,
    httpsValid: !!fetchResult?.httpsValid,
    htmlAvailable: !!signals?.htmlAvailable,
    jsRendered: !!signals?.jsRendered,
    telLinkPresent: !!signals?.telLinkPresent,
    phonePlainTextPresent: !!signals?.phonePlainTextPresent,
    ctaPresent: !!signals?.ctaPresent,
    transactionPath: signals?.transactionPath ?? { found: false, kind: null, host: null },
    contactFormPresent: !!signals?.contactFormPresent,
    viewportMetaPresent: !!signals?.viewportMetaPresent,
  };
}

export interface RawAppleLookup {
  configured: boolean;
  searched: boolean;
  found: boolean;
  matchedName: string | null;
  distanceMeters: number | null;
  error: string | null;
}

export function normalizeApple(raw: RawAppleLookup | null): AppleInput {
  if (!raw || !raw.configured) {
    return {
      checked: false,
      found: false,
      matchedName: null,
      distanceMeters: null,
      reason: "apple_not_configured",
    };
  }
  if (!raw.searched || raw.error) {
    return {
      checked: false,
      found: false,
      matchedName: null,
      distanceMeters: null,
      reason: raw.error ?? "apple_lookup_failed",
    };
  }
  return {
    checked: true,
    found: raw.found,
    matchedName: raw.matchedName,
    distanceMeters: raw.distanceMeters,
    reason: null,
  };
}

export interface RawLlmProbe {
  configured: boolean;
  asked: boolean;
  model: string | null;
  askedAt: string | null;
  discovery: { named: boolean; citedOwnSite: boolean } | null;
  knowledge: {
    found: boolean;
    statedPhone: string | null;
    phoneMatches: boolean | null;
  } | null;
  error: string | null;
}

export function normalizeLlm(raw: RawLlmProbe | null): LlmInput {
  const blank = (reason: string): LlmInput => ({
    checked: false,
    askedAt: null,
    model: null,
    recommended: null,
    named: null,
    citedOwnSite: false,
    known: null,
    statedPhone: null,
    phoneMatches: null,
    reason,
  });

  if (!raw || !raw.configured) return blank("llm_not_configured");
  if (!raw.asked || raw.error) return blank(raw.error ?? "llm_probe_failed");

  return {
    // A probe that came back with neither half readable is not a "no".
    checked: !!(raw.discovery || raw.knowledge),
    askedAt: raw.askedAt,
    model: raw.model,
    recommended: raw.discovery ? raw.discovery.named || raw.discovery.citedOwnSite : null,
    named: raw.discovery ? raw.discovery.named : null,
    citedOwnSite: !!raw.discovery?.citedOwnSite,
    known: raw.knowledge ? raw.knowledge.found : null,
    statedPhone: raw.knowledge?.statedPhone ?? null,
    phoneMatches: raw.knowledge?.phoneMatches ?? null,
    reason: null,
  };
}

export interface RawPsi {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
      accessibility?: { score?: number };
      seo?: { score?: number };
    };
    audits?: {
      "largest-contentful-paint"?: { numericValue?: number };
    };
  };
}

export function normalizePsi(raw: RawPsi | null): PsiInput {
  const cats = raw?.lighthouseResult?.categories;
  if (!cats) {
    return { available: false, performance: null, accessibility: null, seo: null, lcpMs: null };
  }
  const pct = (v: number | undefined | null) =>
    v === undefined || v === null ? null : Math.round(v * 100);
  return {
    available: true,
    performance: pct(cats.performance?.score),
    accessibility: pct(cats.accessibility?.score),
    seo: pct(cats.seo?.score),
    lcpMs:
      raw?.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue ?? null,
  };
}
