// All CTA and club copy lives here — no CTA text hardcoded in components.
//
// Rebrand, 2026-09-12: the site is the public face of The Storefront Index at
// DVC, a student club. The former commercial surface is gone entirely — the
// five "services", the founder pitch block, and the Calendly booking link were
// deleted rather than reworded, because the club's constitution (Article II)
// states it "does not provide services, advice, or recommendations to any
// business, and charges no fees."
//
// What remains is a contact address. A business that wants its own results can
// ask for them; nothing is offered to a business that has not asked.

export interface OfferCopy {
  /** Closing block on the report. */
  headline: string;
  lead: string;
  /** Contact route for a business that wants its own results. */
  contactEmail: string;
  contactLine: string;
  /** Footer / report attribution. */
  clubLine: string;
  instagramUrl: string;
  instagramHandle: string;
}

export const CONTACT_EMAIL = "storefrontindexdvc@gmail.com";
export const INSTAGRAM_URL = "https://www.instagram.com/storefrontindexdvc/";
export const INSTAGRAM_HANDLE = "@storefrontindexdvc";

export function getOffers(): OfferCopy {
  return {
    headline: "Where this report comes from",
    lead:
      "The Storefront Index at DVC is a student club. We study how small businesses across the Bay Area appear online — search visibility, listing accuracy, and whether websites function — using only publicly available information, and publish a regional report each semester for city governments, chambers of commerce, and economic development offices.",
    contactEmail: CONTACT_EMAIL,
    contactLine:
      "Questions about your results, or want them removed from our records? Email us.",
    clubLine:
      "A student club at Diablo Valley College. Nothing on this site is for sale.",
    instagramUrl: INSTAGRAM_URL,
    instagramHandle: INSTAGRAM_HANDLE,
  };
}
