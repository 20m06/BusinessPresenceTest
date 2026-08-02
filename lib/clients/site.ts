import "server-only";
import type { RawSiteFetch } from "../scoring/normalize";

// Site fetch (CLAUDE.md §8.3): plain fetch, 15s timeout, descriptive UA,
// up to 3 redirects followed manually, never executes page JavaScript.

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 500_000;

export async function fetchSite(startUrl: string): Promise<RawSiteFetch> {
  const ua = `BusinessVisibilityTest/1.0 (+${process.env.NEXT_PUBLIC_SITE_URL ?? "https://business-presence-test.vercel.app"})`;
  let url = startUrl;
  let httpsValid = false;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": ua, Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc || hop === MAX_REDIRECTS) {
          return {
            attempted: true,
            ok: false,
            httpsValid,
            finalUrl: url,
            html: null,
            error: "too_many_redirects",
          };
        }
        url = new URL(loc, url).toString();
        continue;
      }

      // If we got a response over https, the certificate was valid —
      // an invalid cert makes fetch throw instead.
      httpsValid = url.startsWith("https://");
      const ok = res.status >= 200 && res.status < 300;
      let html: string | null = null;
      if (ok) {
        const text = await res.text();
        html = text.slice(0, MAX_HTML_BYTES);
      }
      return { attempted: true, ok, httpsValid, finalUrl: url, html, error: null };
    }
    return { attempted: true, ok: false, httpsValid, finalUrl: url, html: null, error: "redirect_loop" };
  } catch (err) {
    return {
      attempted: true,
      ok: false,
      httpsValid: false,
      finalUrl: url,
      html: null,
      error: err instanceof Error ? err.message.slice(0, 200) : "fetch_failed",
    };
  }
}
