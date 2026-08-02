import "server-only";

// Google Places API (New) — Text Search only in this module.
// Endpoint shape verified against current docs 2026-08-02:
// POST https://places.googleapis.com/v1/places:searchText
// Key in X-Goog-Api-Key, field mask in X-Goog-FieldMask.
// The field mask determines the billing SKU — request nothing extra.

export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  primaryType: string | null;
}

interface TextSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    primaryType?: string;
  }>;
}

const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.primaryType",
].join(",");

export async function searchPlacesText(query: string): Promise<PlaceCandidate[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not set.");
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, pageSize: 5 }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Places Text Search failed: HTTP ${res.status} ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as TextSearchResponse;
  return (data.places ?? []).slice(0, 5).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "(unnamed)",
    address: p.formattedAddress ?? "",
    primaryType: p.primaryType ?? null,
  }));
}
