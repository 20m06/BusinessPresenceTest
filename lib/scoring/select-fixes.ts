// Which fixes lead the report — pure, no I/O, so it can be tested
// without a database (CLAUDE.md §6).
//
// Impact ÷ effort ranks cheap wins first, which is what we want, but on
// its own it hands the headline to whatever is cheapest regardless of
// whether fixing it is worth anything. See MIN_HEADLINE_IMPACT.

import { MIN_HEADLINE_IMPACT } from "./config";

export interface RankedFix {
  checkKey: string;
  dimension: string;
  impactPoints: number;
}

/**
 * @param ranked Candidates already sorted by priority_ratio, descending.
 * @param limit  How many to show.
 * @param hasWebsite `false` promotes the create-a-website finding to first.
 */
export function selectTopFixes<T extends RankedFix>(
  ranked: readonly T[],
  limit: number,
  hasWebsite: boolean | null
): T[] {
  const picked: T[] = [];
  const takenKeys = new Set<string>();
  const takenDims = new Set<string>();

  const take = (c: T) => {
    picked.push(c);
    takenKeys.add(c.checkKey);
    takenDims.add(c.dimension);
  };

  // Three passes, each looser than the last. The list only comes back
  // short when the business genuinely has fewer problems than `limit`.
  //
  //   1. Worth fixing, and no two from the same dimension — otherwise a
  //      business with a weak Google profile gets three variations of
  //      "fill in your profile" and nothing about its website.
  //   2. Worth fixing, dimension repeats now allowed.
  //   3. Only if nothing at all cleared the bar: the best of the trivia,
  //      so a business in good shape still gets a report instead of an
  //      empty box. Never used to pad a list that already has real work
  //      in it — two fixes worth doing beat three where one is filler.
  for (const c of ranked) {
    if (picked.length >= limit) break;
    if (c.impactPoints < MIN_HEADLINE_IMPACT) continue;
    if (takenDims.has(c.dimension)) continue;
    take(c);
  }
  for (const c of ranked) {
    if (picked.length >= limit) break;
    if (c.impactPoints < MIN_HEADLINE_IMPACT) continue;
    if (takenKeys.has(c.checkKey)) continue;
    take(c);
  }
  if (picked.length === 0) {
    for (const c of ranked) {
      if (picked.length >= limit) break;
      take(c);
    }
  }

  // No website: that finding leads, whatever its impact-over-effort ratio.
  // Checks that can't emit advice without a site already have a null
  // priority_ratio, so they never reach this list at all.
  if (hasWebsite === false) {
    const lead = picked.find((r) => r.checkKey === "site_reachable");
    if (lead) {
      return [lead, ...picked.filter((r) => r.checkKey !== "site_reachable")].slice(
        0,
        limit
      );
    }
  }
  return picked;
}
