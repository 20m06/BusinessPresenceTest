import "server-only";

// PageSpeed Insights (CLAUDE.md §8.2): mobile only, three categories,
// 45s timeout, one retry, then null — PSI checks become 'unavailable'
// rather than failing the whole audit.

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function runPagespeed(url: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const params = new URLSearchParams({ url, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "seo");
  if (apiKey) params.set("key", apiKey);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
      console.error(`PSI attempt ${attempt + 1}: HTTP ${res.status}`);
    } catch (err) {
      console.error(`PSI attempt ${attempt + 1} failed:`, err);
    }
  }
  return null;
}
