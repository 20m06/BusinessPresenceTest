import { describe, expect, it } from "vitest";
import { distanceMeters, matchNames, namesMatch, normalizeName } from "../lib/apple-match";

describe("Apple listing name matching", () => {
  it("matches the same business written differently", () => {
    expect(namesMatch("Dinosaur Bar-B-Que", "Dinosaur Bar-B-Que")).toBe(true);
    expect(namesMatch("Dinosaur Bar B Que", "Dinosaur Bar-B-Que")).toBe(true);
    expect(namesMatch("Sunrise Bakery & Cafe", "Sunrise Bakery")).toBe(true);
    expect(namesMatch("The Corner Deli", "Corner Deli")).toBe(true);
    expect(namesMatch("Joe's Barbershop", "Joes Barber Shop")).toBe(true);
  });

  it("rejects a different business of the same type nearby", () => {
    // The expensive false positive: two barbershops on one street share
    // only the category word.
    expect(namesMatch("Mike's Barbershop", "Joe's Barbershop")).toBe(false);
    expect(namesMatch("Heroes Barbershop", "Zzqx Nonexistent Barbershop")).toBe(false);
    expect(namesMatch("Rochester Pizza", "Brooklyn Pizza")).toBe(false);
    expect(namesMatch("Ana's Nails", "Kim's Nails")).toBe(false);
  });

  it("ignores punctuation and case", () => {
    expect(normalizeName("Joe's Bar-B-Que!")).toBe("joe s bar b que");
    expect(namesMatch("EL RANCHITO", "El Ranchito")).toBe(true);
  });

  it("grades match strength, which decides how far apart the pins may be", () => {
    // Verified against live Apple data: these are the real shapes seen.
    expect(matchNames("Dinosaur Bar-B-Que", "Dinosaur Bar-B-Que")).toBe("exact");
    expect(matchNames("Wegmans Food Markets", "Wegmans")).toBe("exact");
    expect(matchNames("Sunrise Bakery & Cafe", "Sunrise Bakery")).toBe("exact");
    expect(matchNames("Mike's Barbershop", "Joe's Barbershop")).toBeNull();
    // Related but not the same establishment — rejected on purpose.
    expect(matchNames("Genesee Brewing Company", "Genesee Brew House")).toBeNull();
  });

  it("measures distance between coordinates", () => {
    const a = { lat: 43.153297, lng: -77.608261 };
    expect(Math.round(distanceMeters(a, a))).toBe(0);
    // ~1.1km apart in Rochester
    const b = { lat: 43.1644849, lng: -77.6118095 };
    const d = distanceMeters(a, b);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1500);
  });
});
