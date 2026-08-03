// Pure matching helpers for the Apple Maps lookup — no I/O, so they can
// be unit-tested. Apple has no shared identifier with Google, so deciding
// "is this the same business?" is name similarity plus proximity, and
// getting it wrong is expensive in both directions: a false positive
// credits a business for someone else's listing, a false negative costs
// it real points.

// Category words that are never distinctive on their own. Two different
// barbershops on the same street share "barbershop" and nothing else.
const GENERIC_WORDS = [
  "the", "inc", "llc", "ltd", "co", "company", "corp",
  "restaurant", "cafe", "coffee", "bar", "grill", "grille", "kitchen",
  "pizza", "pizzeria", "bakery", "deli", "diner", "bistro", "eatery",
  "barbershop", "barber", "barbers", "salon", "spa", "nails", "hair",
  "laundromat", "laundry", "cleaners", "market", "grocery", "store",
  "shop", "auto", "repair", "service", "services", "center", "centre",
  "and", "of", "on", "at",
];

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Light stemming so "Joes" and "Joe's" are the same word. Only for words
// long enough that dropping the s can't mangle them ("gas", "bus").
function stem(token: string): string {
  return token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;
}

// Stemmed, so "nails" -> "nail" is still recognised as a category word.
const GENERIC_NAME_TOKENS = new Set(GENERIC_WORDS.map(stem));

function tokens(s: string): string[] {
  // Drop 1-character tokens so possessives ("joe's" -> "joe s") don't
  // count as shared words between unrelated names.
  return normalizeName(s)
    .split(" ")
    .filter((t) => t.length > 1)
    .map(stem);
}

// All words run together, so a compound split across the two providers
// ("Barbershop" vs "Barber Shop") still lines up.
function squash(t: string[]): string {
  return t.join("");
}

// "exact" means the names are the same once punctuation, possessives and
// compound splits are normalised away. "fuzzy" means they overlap enough
// to be plausible. The caller allows more distance for an exact match,
// because Google and Apple often pin the same storefront differently.
export type NameMatch = "exact" | "fuzzy" | null;

export function matchNames(candidate: string, target: string): NameMatch {
  const a = normalizeName(candidate);
  const b = normalizeName(target);
  if (!a || !b) return null;
  if (a === b) return "exact";

  const at = tokens(candidate);
  const bt = tokens(target);
  if (at.length === 0 || bt.length === 0) return null;

  const sa = squash(at);
  const sb = squash(bt);
  if (sa === sb) return "exact";
  // Containment on the run-together form, but only for names long enough
  // that the overlap means something ("Wegmans" in "Wegmans Food Markets").
  if (
    Math.min(sa.length, sb.length) >= 6 &&
    (sa.includes(sb) || sb.includes(sa))
  ) {
    return "exact";
  }

  // One name fully containing the other, token-wise ("Sunrise Bakery"
  // vs "Sunrise Bakery & Cafe").
  const aSet = new Set(at);
  const bSet = new Set(bt);
  const shorter = at.length <= bt.length ? at : bt;
  const longerSet = at.length <= bt.length ? bSet : aSet;
  if (shorter.every((t) => longerSet.has(t))) return "fuzzy";

  // Otherwise require overlap that includes at least one distinctive word:
  // the part of the name that isn't a category everyone shares.
  const shared = [...aSet].filter((t) => bSet.has(t));
  const distinctiveShared = shared.filter((t) => !GENERIC_NAME_TOKENS.has(t));
  if (distinctiveShared.length === 0) return null;

  return shared.length / Math.min(aSet.size, bSet.size) >= 0.5 ? "fuzzy" : null;
}

export function namesMatch(candidate: string, target: string): boolean {
  return matchNames(candidate, target) !== null;
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
