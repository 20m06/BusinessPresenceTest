import { afterEach, describe, expect, it } from "vitest";
import { getFixOffer, getOffers, getServiceSlugs } from "../lib/offers";

// §13: flipping NEXT_PUBLIC_OFFER_MODE must convert every commercial
// surface with no code edit. Prices are the surface most likely to be
// forgotten — a "free student club service" quoting $200 is the one
// contradiction a transfer reader would notice.

const original = process.env.NEXT_PUBLIC_OFFER_MODE;
afterEach(() => {
  process.env.NEXT_PUBLIC_OFFER_MODE = original;
});

describe("offer mode", () => {
  it("prices the services in commercial mode", () => {
    process.env.NEXT_PUBLIC_OFFER_MODE = "commercial";
    expect(getOffers().servicePrice).toBe("$200");
  });

  it("never shows a price in pro_bono mode", () => {
    process.env.NEXT_PUBLIC_OFFER_MODE = "pro_bono";
    const offers = getOffers();
    expect(offers.servicePrice).toBe("Free");
    expect(offers.servicePrice).not.toMatch(/\$/);
  });

  it("keeps money out of the pro_bono fix bands too", () => {
    process.env.NEXT_PUBLIC_OFFER_MODE = "pro_bono";
    for (const bucket of ["minutes", "hours", "days", "money"]) {
      const offer = getFixOffer(bucket, "Some check");
      expect(offer.price, bucket).toBe("Free");
      expect(offer.ariaLabel, bucket).not.toMatch(/\$/);
      expect(offer.href, bucket).not.toContain("stripe");
    }
  });

  it("prices fix bands by cost bucket in commercial mode", () => {
    process.env.NEXT_PUBLIC_OFFER_MODE = "commercial";
    expect(getFixOffer("minutes", "c").price).toBe("$50");
    expect(getFixOffer("hours", "c").price).toBe("$75");
    expect(getFixOffer("days", "c").price).toBe("$200");
    expect(getFixOffer("money", "c").price).toBe("$200");
    // Unknown bucket must not silently land on the top tier.
    expect(getFixOffer(null, "c").price).toBe("$75");
  });

  it("counts down only in commercial mode", () => {
    process.env.NEXT_PUBLIC_OFFER_MODE = "commercial";
    expect(getOffers().urgencyLine).toContain("24 hours");

    // A countdown to a free offer, in the mode where everything is
    // already free, would be both meaningless and coercive.
    process.env.NEXT_PUBLIC_OFFER_MODE = "pro_bono";
    expect(getOffers().urgencyLine).toBeNull();
  });

  it("sends the service price somewhere appropriate to the mode", () => {
    process.env.NEXT_PUBLIC_OFFER_MODE = "pro_bono";
    const proBono = getOffers();
    expect(proBono.serviceHref).not.toContain("stripe");
    expect(proBono.serviceHref).toContain("calendly");
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
