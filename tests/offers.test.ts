import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, INSTAGRAM_URL, getOffers } from "../lib/offers";

// The site is the public face of a student club whose constitution (Article II)
// says it "does not provide services, advice, or recommendations to any
// business, and charges no fees." The commercial surface this codebase started
// with — five services, a founder pitch, a booking calendar — was deleted in
// the 2026-09-12 rebrand. These tests exist to catch it creeping back.

const copyFields = (): string[] => {
  const o = getOffers();
  return [o.headline, o.lead, o.contactLine, o.clubLine];
};

describe("club copy", () => {
  it("quotes no price anywhere", () => {
    for (const line of copyFields()) {
      expect(line).not.toMatch(/\$|\bUSD\b|\bprice\b|\bpricing\b/i);
    }
  });

  it("offers no booking call", () => {
    for (const line of copyFields()) {
      expect(line).not.toMatch(/calendly|book a|schedule a call|sales call/i);
    }
  });

  it("promises no work done on a business's behalf", () => {
    // The deleted services read "We implement your top fixes for you",
    // "We draft the replies", "We set up a phone agent". Anything in that
    // shape contradicts Article II.
    for (const line of copyFields()) {
      expect(line).not.toMatch(
        /done-for-you|we (?:implement|fix|set up|draft|install|manage)/i
      );
    }
  });

  it("names the club and the college in the footer line", () => {
    // Removing this leaves a site that reads commercial while charging
    // nothing, which is the confusing half of both framings.
    expect(getOffers().clubLine).toContain("Diablo Valley College");
  });

  it("routes contact to the club address, not a personal one", () => {
    expect(CONTACT_EMAIL).toBe("storefrontindexdvc@gmail.com");
    expect(getOffers().contactEmail).toBe(CONTACT_EMAIL);
    expect(CONTACT_EMAIL).not.toMatch(/michaelkosenko/i);
  });

  it("points at the club's Instagram", () => {
    expect(INSTAGRAM_URL).toContain("instagram.com/storefrontindexdvc");
    expect(getOffers().instagramUrl).toBe(INSTAGRAM_URL);
  });
});
