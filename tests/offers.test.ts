import { describe, expect, it } from "vitest";
import { getFixOffer, getOffers, getServiceSlugs } from "../lib/offers";

// The site is a free student-club service (owner decision, 2026-08-22).
// Prices are the surface most likely to creep back in — a free service
// quoting $200 is the one contradiction a business owner, or a transfer
// reader, would notice immediately. These tests exist to catch that.

describe("offers", () => {
  it("never quotes a price for a service", () => {
    const offers = getOffers();
    expect(offers.serviceCostLabel).toBe("Free");
    expect(offers.serviceCostLabel).not.toMatch(/\$/);
  });

  it("keeps money out of the fix bands", () => {
    for (const bucket of ["minutes", "hours", "days", "money", null]) {
      const offer = getFixOffer(bucket, "Some check");
      expect(offer.costLabel, String(bucket)).toBe("Free");
      expect(offer.ariaLabel, String(bucket)).not.toMatch(/\$/);
      expect(offer.href, String(bucket)).not.toContain("stripe");
      expect(offer.href, String(bucket)).toContain("calendly");
    }
  });

  it("sends a service click to the booking calendar, not a checkout", () => {
    const offers = getOffers();
    expect(offers.serviceHref).not.toContain("stripe");
    expect(offers.serviceHref).toContain("calendly");
  });

  it("names the club on every page that carries the footer line", () => {
    // Removing this line would leave a site that reads commercial while
    // charging nothing, which is the confusing half of both framings.
    expect(getOffers().clubLine).toContain("Diablo Valley College");
  });

  it("gives every service a page of its own", () => {
    // SERVICES drives /services/[slug]; a listed service with no slug
    // would render a dead link from the report CTA block.
    const slugs = getServiceSlugs();
    expect(slugs).toContain("chat-widget");
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of getOffers().services) {
      expect(slugs, s.name).toContain(s.slug);
      expect(s.body.length, s.name).toBeGreaterThan(0);
    }
  });
});
