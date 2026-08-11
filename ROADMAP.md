# Roadmap — deliberately out of scope for v1

These are intentionally not built in v1. See CLAUDE.md Section 17.

- **Peer/competitor benchmarking** — positioned as a paid deliverable; also avoids extra Nearby Search API cost per audit.
- **Category-specific scoring branches** (food vs. service) — generic v1 per owner's decision.
- **Admin dashboard** — owner uses the Supabase SQL editor instead.
- **LLM-generated fix copy or review replies** — that's the paid product.
- **PDF export** — hosted report page + email only.
- **Yelp / Facebook data** — Google Places, Apple Maps, PageSpeed Insights, and the Claude probe only. *(Apple Maps shipped in scoring config 2.0.0 and is no longer out of scope.)*
- **ChatGPT visibility** — the Claude probe shipped in scoring config 3.0.0 (CLAUDE.md §8.4); ChatGPT did not. Scraping chatgpt.com is off the table: it violates OpenAI's ToS and CLAUDE.md rule 4. The legitimate route is the **OpenAI API**, which does *not* require a ChatGPT Plus subscription — it is separate pay-as-you-go billing with a ~$5 minimum credit. Deferred because it is a second vendor, a second key in Vercel, and a second line against the $50/month ceiling, not because it can't be done. `lib/clients/anthropic.ts` and `lib/llm-answer.ts` are already split so a second provider drops in beside the first; the checks would need new keys and a version bump, since re-weighting a scored dimension is never free.
- **Repeat sampling of LLM answers** — each probe is asked once per audit, so a day-0 vs day-90 delta on `llm_recommends` can move on model noise alone. Asking N times and scoring N/3 is the fix, and it multiplies the per-audit cost by N. Revisit if the cohort numbers look unstable.
- **User accounts or login.**
- **Payments.**
