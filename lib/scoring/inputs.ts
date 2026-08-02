// Normalized inputs to the scoring engine. Built by lib/scoring/normalize.ts
// from raw API responses; the engine itself never sees raw API shapes.

export interface PlaceInput {
  found: boolean;
  businessStatus: string | null; // "OPERATIONAL" etc.
  primaryType: string | null;
  phone: string | null;
  websiteUri: string | null;
  // Days of the week that have hours listed (0-7 of them).
  daysWithHours: number;
  hasSpecialHoursSoon: boolean; // currentOpeningHours differs from regular
  photoCount: number | null; // null = field unavailable
  rating: number | null;
  reviewCount: number | null;
  newestReviewAt: string | null; // ISO timestamp from the review sample
  // Owner-response info over the returned review sample.
  reviewSampleSize: number;
  reviewsWithOwnerReply: number | null; // null = reply data unavailable
}

export interface SiteInput {
  hasWebsite: boolean;
  fetched: boolean; // false = fetch failed entirely
  httpStatusOk: boolean;
  httpsValid: boolean;
  htmlAvailable: boolean; // cheerio saw meaningful markup
  jsRendered: boolean; // body was near-empty; HTML checks are inferred
  telLinkPresent: boolean;
  phonePlainTextPresent: boolean;
  ctaPresent: boolean;
  transactionPath: { found: boolean; kind: "aggregator" | "direct" | "form" | null; host: string | null };
  contactFormPresent: boolean;
  viewportMetaPresent: boolean;
}

export interface AppleInput {
  // false when credentials are absent or the lookup failed — the check
  // then reads 'unavailable' and leaves the math alone, never scoring 0.
  checked: boolean;
  found: boolean;
  matchedName: string | null;
  distanceMeters: number | null;
  reason: string | null;
}

export interface PsiInput {
  available: boolean;
  performance: number | null; // 0-100
  accessibility: number | null;
  seo: number | null;
  lcpMs: number | null;
}

export type ManualAnswer = "yes" | "no" | "not_sure";

export interface AuditInputs {
  place: PlaceInput;
  site: SiteInput;
  psi: PsiInput;
  apple?: AppleInput;
  manual: Partial<Record<string, ManualAnswer>>;
  now: Date;
}
