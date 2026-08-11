// Pure helpers for reading what Claude sent back — no I/O, no secrets,
// so they can be unit-tested without a network call. The client that
// actually makes the request is lib/clients/anthropic.ts.
//
// Same split as apple-match.ts / clients/apple-maps.ts.

import { normalizeName } from "./apple-match";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * US numbers get written a dozen ways, and Claude may include the country
 * code where Google doesn't. Compare the last 10 digits.
 */
export function phoneEquivalent(a: string, b: string): boolean {
  const x = digitsOnly(a).slice(-10);
  const y = digitsOnly(b).slice(-10);
  return x.length === 10 && x === y;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Does `url` belong to `site` (or a subdomain of it)? */
export function sameSite(url: string, site: string): boolean {
  const a = hostOf(url);
  const b = hostOf(site);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`);
}

/**
 * Did the answer name this business? Normalized containment rather than a
 * raw indexOf, so "Tony's Barber Shop" still matches "Tonys Barbershop".
 * Very short names are rejected — a two-letter name would match almost
 * any paragraph by accident, and a false positive here quietly becomes a
 * wrong data point in the 90-day analysis.
 */
export function answerNames(answer: string, businessName: string): boolean {
  const needle = normalizeName(businessName);
  if (!needle || needle.length < 4) return false;
  return normalizeName(answer).includes(needle);
}

/**
 * Reads the line the knowledge probe asks Claude to end with:
 *   `RESULT: found=yes; phone=(201) 555-0123`
 * Tolerant of spacing and case. Returns null when the line is absent —
 * an unreadable answer is not a "no" (CLAUDE.md rule 7), so the caller
 * marks the check unavailable instead of scoring it 0.
 */
export function parseResultLine(
  answer: string
): { found: boolean; phone: string | null } | null {
  const match = /RESULT:\s*found\s*=\s*(yes|no)\s*;?\s*phone\s*=\s*(.*)$/im.exec(answer);
  if (!match) return null;
  const phoneRaw = match[2].trim().replace(/[.\s]+$/, "");
  const phone =
    !phoneRaw || /^(none|n\/a|unknown|not found|not listed)$/i.test(phoneRaw)
      ? null
      : phoneRaw;
  return { found: match[1].toLowerCase() === "yes", phone };
}
