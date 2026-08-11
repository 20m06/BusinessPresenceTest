import "server-only";

// PageSpeed Insights (CLAUDE.md §8.2): mobile only, three categories,
// then null on failure — PSI checks become 'unavailable' rather than
// failing the whole audit.
//
// Timeout budget. The spec's "45s timeout, one retry" is up to 90s of
// waiting inside a route whose maxDuration is 60, so a slow site got the
// function killed mid-retry: the audit row stayed 'running' forever with
// no checks and no failure_reason.
//
// The retry was the problem, not the timeout — shortening the attempts
// instead just turned slow sites into missing performance scores. So the
// first attempt keeps its full 45s, and the retry happens only if the
// first one failed fast enough to leave room inside the budget. A PSI
// call that times out is not retried at all; there is no time for it.

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Total wall-clock PSI may consume, leaving the route time to write. */
const PSI_BUDGET_MS = 47_000;
const PSI_ATTEMPT_TIMEOUT_MS = 45_000;
/** Below this much remaining budget a retry cannot finish; don't start one. */
const PSI_MIN_RETRY_MS = 10_000;

export async function runPagespeed(url: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const params = new URLSearchParams({ url, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "seo");
  if (apiKey) params.set("key", apiKey);

  const startedAt = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = PSI_BUDGET_MS - (Date.now() - startedAt);
    if (attempt > 0 && remaining < PSI_MIN_RETRY_MS) {
      console.error("PSI: no budget left to retry");
      break;
    }
    try {
      const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
        signal: AbortSignal.timeout(Math.min(PSI_ATTEMPT_TIMEOUT_MS, remaining)),
      });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
      console.error(`PSI attempt ${attempt + 1}: HTTP ${res.status}`);
    } catch (err) {
      console.error(`PSI attempt ${attempt + 1} failed:`, err);
    }
  }
  return null;
}
