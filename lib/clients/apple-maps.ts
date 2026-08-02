import "server-only";
import { sign as cryptoSign } from "node:crypto";

// Apple Maps Server API (CLAUDE.md §8, added v2.0.0).
//
// Auth is a two-step flow: sign a short-lived JWT with the MapKit private
// key (ES256), exchange it at /v1/token for an access token, then use that
// token as a bearer credential. Access tokens are cached until they expire.
//
// Apple's search returns only name, address and coordinates — no phone,
// hours, ratings or reviews — so the only honest check we can build on it
// is "does a listing for this business exist, at the right place".
//
// Per Apple's license terms we deliberately do NOT persist raw responses;
// only the match verdict and the matched name are stored.

const TOKEN_URL = "https://maps-api.apple.com/v1/token";
const SEARCH_URL = "https://maps-api.apple.com/v1/search";
const MATCH_RADIUS_METERS = 300;

export interface AppleLookup {
  configured: boolean;
  searched: boolean;
  found: boolean;
  matchedName: string | null;
  distanceMeters: number | null;
  error: string | null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function appleMapsConfigured(): boolean {
  return !!(
    process.env.APPLE_MAPS_TEAM_ID &&
    process.env.APPLE_MAPS_KEY_ID &&
    process.env.APPLE_MAPS_PRIVATE_KEY
  );
}

function buildJwt(): string {
  const teamId = process.env.APPLE_MAPS_TEAM_ID as string;
  const keyId = process.env.APPLE_MAPS_KEY_ID as string;
  // .p8 contents; env vars often carry escaped newlines.
  const privateKey = (process.env.APPLE_MAPS_PRIVATE_KEY as string).replace(/\\n/g, "\n");

  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = { iss: teamId, iat, exp: iat + 1800, scope: "server_api" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  // ES256 needs the raw r||s (JOSE) signature, not DER.
  const signature = cryptoSign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${signature.toString("base64url")}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const res = await fetch(TOKEN_URL, {
    headers: { Authorization: `Bearer ${buildJwt()}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apple token exchange failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { accessToken?: string; expiresInSeconds?: number };
  if (!data.accessToken) throw new Error("Apple token response had no accessToken");
  cachedToken = {
    token: data.accessToken,
    expiresAt: Date.now() + (data.expiresInSeconds ?? 1800) * 1000,
  };
  return cachedToken.token;
}

interface ApplePlace {
  name?: string;
  coordinate?: { latitude?: number; longitude?: number };
  structuredAddress?: { postCode?: string; locality?: string };
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|inc|llc|co|company|restaurant|cafe)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  // Token overlap: at least half of the shorter name's words appear.
  const xs = new Set(x.split(" "));
  const ys = y.split(" ");
  const shared = ys.filter((t) => xs.has(t)).length;
  return shared >= Math.ceil(Math.min(xs.size, ys.length) / 2);
}

function distanceMeters(
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

export interface AppleLookupTarget {
  name: string;
  latitude: number | null;
  longitude: number | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
}

export async function lookupOnAppleMaps(target: AppleLookupTarget): Promise<AppleLookup> {
  const base: AppleLookup = {
    configured: appleMapsConfigured(),
    searched: false,
    found: false,
    matchedName: null,
    distanceMeters: null,
    error: null,
  };
  if (!base.configured) return base;

  try {
    const token = await getAccessToken();
    const where = [target.city, target.state].filter(Boolean).join(" ");
    const params = new URLSearchParams({
      q: `${target.name} ${where}`.trim(),
      limitToCountries: "US",
      resultTypeFilter: "Poi",
    });
    if (target.latitude !== null && target.longitude !== null) {
      params.set("searchLocation", `${target.latitude},${target.longitude}`);
    }

    const res = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ...base, searched: true, error: `HTTP ${res.status} ${body.slice(0, 160)}` };
    }

    const data = (await res.json()) as { results?: ApplePlace[] };
    const results = data.results ?? [];

    for (const place of results) {
      if (!place.name || !namesMatch(place.name, target.name)) continue;

      // Prefer a coordinate match; fall back to postal code when Google
      // gave us no coordinates.
      let dist: number | null = null;
      if (
        target.latitude !== null &&
        target.longitude !== null &&
        place.coordinate?.latitude !== undefined &&
        place.coordinate?.longitude !== undefined
      ) {
        dist = distanceMeters(
          { lat: target.latitude, lng: target.longitude },
          { lat: place.coordinate.latitude, lng: place.coordinate.longitude }
        );
        if (dist > MATCH_RADIUS_METERS) continue;
      } else if (target.postalCode && place.structuredAddress?.postCode) {
        if (place.structuredAddress.postCode !== target.postalCode) continue;
      }

      return {
        ...base,
        searched: true,
        found: true,
        matchedName: place.name,
        distanceMeters: dist === null ? null : Math.round(dist),
      };
    }

    return { ...base, searched: true, found: false };
  } catch (err) {
    return {
      ...base,
      searched: true,
      error: err instanceof Error ? err.message.slice(0, 200) : "apple_lookup_failed",
    };
  }
}
