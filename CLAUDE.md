# CLAUDE.md — Small Business Web Presence Scorecard

> **How to use this file:** Save it as `CLAUDE.md` in the root of an empty folder. Open Claude Code in that folder. Claude Code reads this file automatically on every session. Then work through the build phases in Section 15, one prompt at a time. Do not paste the whole file as a prompt — it lives on disk and gets read automatically.

---

## 0. READ THIS FIRST — accounts and corrections

### 0.1 Corrections to assumptions the owner made

| Assumption | Reality |
|---|---|
| "I'll use my Anthropic API key for the data" | Wrong API. Google Places and PageSpeed Insights are **Google** products. You need a Google Cloud project with billing enabled and a Google Maps Platform API key. The Anthropic subscription pays for Claude Code writing this app; it has nothing to do with the app's runtime. |
| "Free tier will cover it" | Google Maps Platform has a monthly free allowance that a 50-audit/day cap should stay within, but **billing must be enabled and a card on file**. Set a Cloud Billing budget alert at $50 with email notification at 50% / 90% / 100%. |
| "Resend will give me a good address" | Resend requires a **verified domain** to send from a custom address. Without a domain you can only send to your own verified inbox — meaning zero owners receive reports. Buy a domain (~$12/yr) before launch. Spec below supports both modes. |
| "No terms needed" | You are collecting business owners' email addresses and will later publish outcome data. Ship a one-paragraph privacy note and a consent checkbox. This is 20 minutes of work and it is the difference between usable and unusable research data. Spec in Section 10.4. |

### 0.2 Accounts to create before Phase 1

1. **Google Cloud** — new project. Enable: *Places API (New)* and *PageSpeed Insights API*. Create one API key. Restrict it to those two APIs. Set a budget alert at $50.
2. **Supabase** — free tier project. Copy the project URL, anon key, and service role key.
3. **Vercel** — free Hobby account, connected to a GitHub account.
4. **GitHub** — a private repo for the code.
5. **Resend** — free tier. Verify a domain if you have one.
6. **Calendly** — free tier. Create one event type: *"Free 20-minute digital audit review"*, 20 min, at least 3 slots/week.
7. **Domain (recommended)** — any registrar. Point it at Vercel and verify it in Resend.

---

## 1. What this is

A web tool that scores a local small business's online presence and returns a prioritized, one-page action report.

**Two audiences, one system:**

- **Public self-serve.** Anyone types a business name and city, gets an automated score and a report page, receives an email copy.
- **Clinic cohort.** A student club recruits ~40 local businesses (immigrant-owned restaurants, barbershops, laundromats), audits each one, and re-audits at 30 and 90 days to measure whether recommended fixes moved real numbers.

The clinic is the point. The public tool is the recruiting funnel and the scalable product surface. **Both must exist from day one, sharing one data model.**

### 1.1 Why the data model matters more than the UI

The owner's end goal is a defensible claim of the form: *"Businesses that implemented their top-three fixes saw a median X% increase in Google profile actions over 90 days, n=34."*

That claim is only possible if **every audit is stored as an immutable, timestamped snapshot with the scoring config version that produced it.** Never update an audit row. Never overwrite. If a re-run happens, it is a new row. This is the single most important architectural constraint in the project — a schema mistake here is unrecoverable three months from now.

### 1.2 Constraints from the owner

- Owner has **zero coding experience**. Every phase must end in something runnable, with plain-language instructions for what to click and where. Explain *what* a command does before giving it.
- Solo project. No collaborators, no team conventions needed.
- Budget ceiling: **$50/month, hard.**
- Must be plausibly a scalable startup (class requirement) *and* convertible to a free pro-bono club service later (transfer application narrative). See Section 13 — one env var flips the entire commercial layer off.

---

## 2. Non-negotiable rules

1. **Audits are append-only.** No `UPDATE` on the `audits` table except to move `status` from `pending`→`running`→`complete`/`failed` and to write results into the row that was created for that run.
2. **Scoring config is versioned.** Every audit records `scoring_config_version`. Never change weights without incrementing the version. Historical comparisons must know which ruleset scored them.
3. **Honest confidence labels.** Some checks are heuristics, not facts (Section 6.7). Every check carries a `confidence` field of `verified` | `inferred` | `manual_required`. The report visibly distinguishes them. Do not present an inference as a measurement — this is both an ethics issue and a research-validity issue.
4. **No scraping.** Google Places API and PageSpeed Insights API only. Do not scrape Google Search, Google Maps HTML, or Yelp. It violates ToS and will get the API key revoked.
5. **Secrets are server-side only.** No API key ever reaches the browser. All external calls happen in Next.js Route Handlers.
6. **Cost caps enforced in code, not just in Google Cloud.** A global daily audit cap plus a kill switch, both checked before any paid API call.
7. **Never invent data.** If an API returns nothing for a field, the check is `unavailable`, not `failed`. Unavailable checks are excluded from the dimension's denominator, not scored as zero. The one exception is Section 6.6 (no website).

---

## 3. Tech stack

Do not substitute without asking.

| Layer | Choice | Note |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript** | Use the current stable version. |
| Styling | **Tailwind CSS** | |
| Database | **Supabase (Postgres)** | Access server-side with the service role key via `@supabase/supabase-js`. |
| Hosting | **Vercel** | Hobby tier. Note: Hobby is non-commercial — if real money is ever charged through the site, upgrade. In-person upsells are fine. |
| Email | **Resend** | |
| HTML parsing | **cheerio** | |
| Scheduling | **Vercel Cron** | One daily job. |
| Validation | **zod** | All API inputs. |

**No headless browser.** Playwright/Puppeteer on serverless is a deployment trap and this project does not need it. PageSpeed Insights returns a rendered-DOM audit; combine that with a plain `fetch` + cheerio pass on the raw HTML. Where that combination genuinely cannot answer a question, the question becomes a manual field (Section 6.5).

**API version note:** Claude Code — the exact Places API (New) endpoint shapes and field-mask syntax may have changed. Before writing the integration in Phase 3, fetch and read the current Google docs. Do not rely on memorized endpoint signatures.

---

## 4. Environment variables

Create `.env.local` for local dev and mirror every one of these into Vercel's project settings.

```
# Google
GOOGLE_MAPS_API_KEY=

# Claude visibility probe (§8.4). A Claude Pro/Max subscription is NOT
# this — create a key at console.anthropic.com, which bills separately.
# Leave blank and the two llm_* checks read 'unavailable'; nothing breaks.
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM="Digital Audit <reports@yourdomain.com>"
EMAIL_REPLY_TO=
EMAIL_ENABLED=true

# Booking
NEXT_PUBLIC_CALENDLY_URL=

# Mode: "commercial" (paid upsells) or "pro_bono" (free club framing)
NEXT_PUBLIC_OFFER_MODE=commercial

# Cost + abuse control
DAILY_AUDIT_CAP=50
PER_IP_DAILY_CAP=10
AUDITS_ENABLED=true
# The Claude probe is the only check billed per call on top of tokens, so
# it gets its own cap. At ~$0.04/audit, 20/day is ~$24/month worst case.
# Past the cap audits still complete; the llm_* checks read 'unavailable'.
LLM_PROBE_DAILY_CAP=20

# Secrets
CRON_SECRET=
ADMIN_TOKEN=

# Public
NEXT_PUBLIC_SITE_URL=https://businessvisibilitytest.vercel.app
NEXT_PUBLIC_SITE_NAME="Business Visibility Test"
```

`PER_IP_DAILY_CAP` is set to 10 rather than unlimited. The owner asked for no per-IP limit, but a single script could consume the entire daily budget in under a minute. Setting it to `50` disables it effectively. Explain this tradeoff and let the owner decide.

Generate `CRON_SECRET` and `ADMIN_TOKEN` as long random strings. Tell the owner exactly how (`openssl rand -hex 32`) and that they must be pasted into Vercel, not committed to git.

---

## 5. Data model

Write this as a single SQL migration file in `/supabase/migrations/`. All tables have Row Level Security enabled with **no public policies** — access is exclusively server-side via the service role key.

```sql
-- Businesses: one row per unique Google place
create table businesses (
  id                uuid primary key default gen_random_uuid(),
  google_place_id   text unique not null,
  name              text not null,
  formatted_address text,
  city              text,
  state             text,
  postal_code       text,
  latitude          double precision,
  longitude         double precision,
  primary_type      text,
  types             text[],
  website_url       text,
  phone             text,
  is_cohort_member  boolean not null default false,
  cohort_notes      text,
  created_at        timestamptz not null default now()
);

-- Contacts: who requested an audit
create table contacts (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references businesses(id),
  email                 text not null,
  role                  text,             -- 'owner' | 'staff' | 'other' | null
  consent_email_report  boolean not null default true,
  consent_followup      boolean not null default false,
  consent_research      boolean not null default false,
  ip_hash               text,
  created_at            timestamptz not null default now()
);
create index on contacts (business_id);
create index on contacts (email);

-- Audits: IMMUTABLE snapshots. One row per run. Never overwrite.
create table audits (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references businesses(id),
  contact_id              uuid references contacts(id),
  public_token            text unique not null,
  scoring_config_version  text not null,
  run_type                text not null,   -- 'initial'|'day_30'|'day_90'|'manual'
  status                  text not null default 'pending',
                                           -- 'pending'|'running'|'complete'|'failed'
  failure_reason          text,

  overall_score               numeric(5,2),
  discoverability_score       numeric(5,2),
  conversion_score            numeric(5,2),
  social_proof_score          numeric(5,2),
  technical_health_score      numeric(5,2),
  resilience_score            numeric(5,2),
  automated_coverage_pct      numeric(5,2), -- % of total weight scored automatically

  has_website             boolean,
  website_url_checked     text,

  -- Longitudinal tracking fields, denormalized on purpose for easy analysis
  review_count            integer,
  average_rating          numeric(2,1),
  photo_count             integer,
  newest_review_at        timestamptz,
  psi_mobile_performance  integer,

  raw_places              jsonb,
  raw_psi                 jsonb,
  raw_site                jsonb,

  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);
create index on audits (business_id, created_at desc);
create index on audits (status);
create index on audits (run_type);

-- Individual check results
create table audit_checks (
  id                uuid primary key default gen_random_uuid(),
  audit_id          uuid not null references audits(id) on delete cascade,
  dimension         text not null,
  check_key         text not null,
  label             text not null,
  raw_value         jsonb,
  normalized_score  numeric(5,2),      -- 0..100, null when unavailable
  weight_in_dim     numeric(5,4) not null,
  status            text not null,      -- 'pass'|'warn'|'fail'|'unavailable'|'manual_required'
  confidence        text not null,      -- 'verified'|'inferred'|'manual_required'
  fix_cost_bucket   text,               -- 'minutes'|'hours'|'days'|'money'
  impact_points     numeric(6,3),
  effort_score      numeric(6,3),
  priority_ratio    numeric(8,4),
  fix_title         text,
  fix_instruction   text,
  created_at        timestamptz not null default now()
);
create index on audit_checks (audit_id);
create index on audit_checks (check_key);

-- Owner-supplied answers that unlock manual-only checks
create table manual_responses (
  id            uuid primary key default gen_random_uuid(),
  audit_id      uuid not null references audits(id) on delete cascade,
  question_key  text not null,
  answer        jsonb not null,
  answered_at   timestamptz not null default now(),
  unique (audit_id, question_key)
);

-- Scheduled 30/90-day re-runs
create table scheduled_runs (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id),
  contact_id    uuid references contacts(id),
  run_type      text not null,           -- 'day_30' | 'day_90'
  due_on        date not null,
  status        text not null default 'pending',
                                          -- 'pending'|'complete'|'skipped'|'failed'
  audit_id      uuid references audits(id),
  attempts      integer not null default 0,
  last_error    text,
  created_at    timestamptz not null default now()
);
create index on scheduled_runs (due_on, status);

-- Cost + abuse tracking
create table usage_counters (
  day             date primary key,
  audits_started  integer not null default 0,
  places_calls    integer not null default 0,
  psi_calls       integer not null default 0
);

create table ip_counters (
  day       date not null,
  ip_hash   text not null,
  count     integer not null default 0,
  primary key (day, ip_hash)
);
```

**Notes for Claude Code:**
- `public_token`: 24+ chars of URL-safe randomness. This is what makes `/report/[token]` unguessable. Do not use sequential IDs in URLs.
- `ip_hash`: SHA-256 of IP + a server-side salt. Never store raw IPs.
- Store the full raw API responses in the `raw_*` jsonb columns. Disk is cheap; re-running an audit to recover a field you forgot to extract is not possible retroactively.

---

## 6. The scoring engine

This is the core of the product. Build it as **pure functions with zero I/O** in `/lib/scoring/`, so it can be unit-tested without network calls.

### 6.1 Config file

Create `/lib/scoring/config.ts` exporting a single versioned object. Weights and thresholds live here and **nowhere else**. Hardcoding a threshold inside check logic is a bug.

```ts
export const SCORING_CONFIG_VERSION = "1.0.0";
```

### 6.2 Dimensions and weights

| Dimension | Weight | Automatable? |
|---|---|---|
| Discoverability | 35% | Mostly |
| Conversion | 25% | Mostly |
| Social Proof | 20% | Partly |
| Technical Health | 15% | Fully |
| Resilience | 5% | Manual only |

**Two-phase scoring.** Phase 1 runs everything automated and produces a score over the weight that could actually be evaluated, renormalized to 0–100. Record the real coverage in `automated_coverage_pct`. Phase 2 unlocks when the owner answers the manual questions, producing a full-coverage score. Both are separate audit-check rows on the same audit; recompute and store the improved score without deleting the Phase 1 numbers.

### 6.3 Checks — Discoverability (35%)

Weights are within the dimension and must sum to 1.0.

"Found" covers three surfaces, not one: Google, Apple Maps, and AI assistants. Weights below are as of scoring config **3.0.0**.

| key | label | weight | Source | Logic |
|---|---|---|---|---|
| `gbp_exists` | Google profile found | 0.17 | Places | Found = 100, not found = 0. If 0, all other *Google* checks are `unavailable` (Apple and the LLM checks are independent). |
| `apple_listing_found` | Apple Maps listing found | 0.17 | Apple Maps Server API | Matched listing = 100, none = 0. Confidence `inferred` — matching name + location across two providers is a judgement. |
| `llm_recommends` | AI assistants recommend you | 0.10 | Claude + web search | Named in the answer to "best {category} in {city}" = 100, absent = 0. A citation of the business's own domain counts as named. See 6.8. |
| `llm_knows_you` | AI assistants know your details | 0.06 | Claude + web search | Found by name with a matching phone number = 100; found but quoting a phone number that isn't theirs = 50; not found = 0. See 6.8. |
| `gbp_claimed` | Profile appears claimed | 0.10 | Places (inferred) | See 6.8 — heuristic. Confidence `inferred`, and add a `manual_required` confirm question. |
| `category_specific` | Category is specific | 0.10 | Places | `primaryType` against a generic-terms denylist (`establishment`, `point_of_interest`, `store`, `food`, `restaurant` alone, `business`). Specific = 100, generic = 30, missing = 0. |
| `hours_present` | Hours listed | 0.13 | Places | All 7 days present = 100; partial = 50; none = 0. |
| `hours_special` | Holiday hours set | 0.03 | Places | Compare `currentOpeningHours` vs `regularOpeningHours`. Warn if no special hours exist within 60 days of a US holiday. |
| `phone_present` | Phone number listed | 0.05 | Places | Present = 100. |
| `photos_count` | Photos on profile | 0.09 | Places | 0 photos = 0; 1–4 = 30; 5–9 = 60; 10–19 = 85; 20+ = 100. |

The two LLM checks are deliberately weighted below the map listings. A Google or Apple listing either exists or it doesn't; an assistant's answer is one sample that moves on its own between runs. Neither ever takes a headline slot — see 6.9.

**NAP consistency is not automatable** without paid third-party data. Do not fake it. It becomes a manual question and is excluded from v1 scoring.

### 6.4 Checks — Conversion (25%)

| key | label | weight | Source | Logic |
|---|---|---|---|---|
| `gbp_website_link` | Website linked on profile | 0.15 | Places | Present = 100. |
| `tel_link_clickable` | Tappable phone number | 0.22 | Site HTML | `a[href^="tel:"]` exists = 100; number appears as plain text only = 40; absent = 0. |
| `primary_cta_present` | Clear next step | 0.20 | Site HTML | Look for order/book/reserve/call/directions/menu intent in anchor text and `href` within the first `<header>` + first 2000 chars of `<body>`. Present = 100. |
| `transaction_path` | Way to order or book | 0.23 | Site HTML + Places | Any link to a known ordering/booking host, or an on-page form with those keywords = 100; absent = 0. Also record *which* — aggregator vs direct — in `raw_value`. Do not score aggregator lower in v1; surface it as a talking point. |
| `contact_form_present` | Contact form exists | 0.10 | Site HTML | A `<form>` with an email or message field = 100. |
| `contact_form_delivers` | Form actually delivers | 0.10 | Manual | `manual_required` always. |

### 6.5 Checks — Social Proof (20%)

| key | label | weight | Source | Logic |
|---|---|---|---|---|
| `review_count` | Number of reviews | 0.28 | Places | 0 = 0; 1–9 = 25; 10–24 = 50; 25–49 = 70; 50–99 = 85; 100+ = 100. *Absolute tiers in v1 — peer benchmarking is deliberately deferred (Section 13).* |
| `average_rating` | Star rating | 0.18 | Places | <3.0 = 20; 3.0–3.9 = 50; 4.0–4.4 = 80; 4.5+ = 100. |
| `review_recency` | Newest review age | 0.27 | Places | ≤30d = 100; ≤90d = 80; ≤180d = 50; ≤365d = 25; >365d or none = 0. |
| `owner_responds` | Owner replies to reviews | 0.27 | Places (partial) | See 6.7 — Places returns a limited review sample. Confidence `inferred`; pair with a manual question. |

### 6.6 Checks — Technical Health (15%)

**If the business has no website at all:** every Technical Health check is `fail` with score 0, the dimension scores 0, and a top-priority finding fires: *"You have no website."* This is the one place a missing thing scores zero rather than being excluded — per the owner's explicit decision. Skip the PSI call entirely (saves quota).

| key | label | weight | Source | Logic |
|---|---|---|---|---|
| `site_reachable` | Site loads | 0.18 | fetch | HTTP 200 within 15s = 100; 3xx→200 = 100; 4xx/5xx/timeout = 0. |
| `https_valid` | Secure connection | 0.17 | fetch | HTTPS with valid cert = 100; HTTP only = 0; cert error = 0. |
| `mobile_viewport` | Built for phones | 0.15 | Site HTML | `<meta name="viewport">` with `width=device-width` = 100. |
| `psi_performance` | Mobile load speed | 0.32 | PSI | Use PSI mobile performance score directly (0–100). Also store LCP in `raw_value`. |
| `psi_accessibility` | Basic accessibility | 0.10 | PSI | PSI accessibility score directly. |
| `psi_seo` | Basic on-page SEO | 0.08 | PSI | PSI SEO category score directly. |

### 6.7 Checks — Resilience (5%) — manual only

All four are `manual_required`, weight 0.25 each, scored only after the owner answers.

| key | question |
|---|---|
| `owner_has_gbp_access` | Can you personally sign in and edit your Google Business Profile? |
| `owner_owns_domain` | Is your website domain registered in your name or your business's name? |
| `owner_has_site_access` | Can you log in to change your website? |
| `owner_has_social_access` | Do you have the passwords to your business's social accounts? |

Yes = 100, No = 0, "Not sure" = 0 with a distinct flag. **"Not sure" is itself the finding** — the owner's stated experience is that this is frequently the single most valuable discovery in an audit. Give it prominent report treatment.

### 6.8 Heuristic checks — mandatory honesty

Four checks cannot be measured directly and **must** carry `confidence: 'inferred'` and render with a visible "inferred" marker. The two Google ones are paired with a manual confirmation question.

- **`gbp_claimed`.** The Places API does not expose claimed status. Infer from a composite signal: website present, phone present, complete hours, ≥5 photos, `businessStatus = OPERATIONAL`. 4+ signals → likely claimed. ≤2 → likely unclaimed. In between → indeterminate. Report copy must read *"Your profile appears unclaimed"*, never *"Your profile is unclaimed."*
- **`owner_responds`.** Places returns a small sample of reviews, not the full set, and owner-response data is not consistently exposed. Compute the rate over whatever sample is returned, store the sample size in `raw_value`, and label the check *"based on N recent reviews."* Never state a full-population response rate.
- **`llm_recommends` and `llm_knows_you`.** An LLM answer is a sample, not a fact. It varies by who is asking, from where, on which model version, on which day. **Each is asked exactly once per audit** — budget, not laziness (see 8.4) — so `raw_value` records `sampleSize: 1`, the model id, and the timestamp, and the report reads *"we asked once, on {date}. Answers vary between people and change over time."* Never write *"Claude doesn't know you"* as a standing fact, and never compute a percentage from one sample. Store the full prompt and answer in `audits.raw_llm`: an LLM response cannot be re-derived after the fact, so anything not captured at ask-time is gone permanently.

### 6.9 Ranking fixes by impact ÷ effort

The report is ordered by fixability, not by badness.

```
impact_points  = dimension_weight × weight_in_dim × (100 − normalized_score)
effort_score   = { minutes: 1, hours: 3, days: 8, money: 15 }[fix_cost_bucket]
priority_ratio = impact_points / effort_score
```

Rank descending. `unavailable` and already-passing checks are excluded. This is deliberately biased toward cheap wins: *"add your hours"* should beat *"rebuild your site"* every time, because owners abandon reports that lead with expensive advice.

**Headline exclusions.** A check with no cheap version never takes one of the three headline slots, whatever its ratio — the headline list is a to-do for this week. `llm_recommends` and `llm_knows_you` are excluded (`HEADLINE_EXCLUDED_CHECKS` in the config): failing `llm_recommends` is worth 3.5 points of the overall score and would otherwise outrank real work with advice the owner cannot act on. They still score, still appear in full findings, and get their own callout on report page one.

Assign a `fix_cost_bucket` and a one-sentence `fix_instruction` to every check in the config. **Instructions are directives, not tutorials** — *"Add photos of your food, storefront, and interior to your Google Business Profile. Aim for 20."* Not a numbered walkthrough. Step-by-step is the paid/club service.

### 6.10 Composition

```
dimension_score = Σ(weight_in_dim × normalized_score) / Σ(weight_in_dim)
                  — over evaluated checks only, excluding 'unavailable'
overall_score   = Σ(dimension_weight × dimension_score) / Σ(dimension_weight)
                  — over evaluated dimensions only
automated_coverage_pct = evaluated weight / total weight × 100
```

Round to one decimal for display, store two.

---

## 7. Application flow

```
/                     Search-first landing. Name + city/state. One field group, one button.
/searching            Disambiguation: up to 5 Places matches, user picks theirs.
/audit/[token]/email  Email gate + consent checkboxes.
/report/[token]       Live status → results. Polls until complete.
/report/[token]/complete-audit   Manual questions. Unlocks Resilience + full score.
/privacy              One-page privacy note.
/api/*                See below.
```

### 7.1 Route handlers

| Route | Method | Purpose |
|---|---|---|
| `/api/search` | POST | Places Text Search. Returns up to 5 candidates. Checks caps first. |
| `/api/audit/start` | POST | Takes `place_id` + email + consents. Places Details call, creates `businesses` + `contacts` + `audits` (status `pending`), schedules day-30/day-90 rows, returns `public_token`. Fast — no PSI. |
| `/api/audit/[token]/process` | POST | Runs site fetch + PSI + scoring, writes `audit_checks`, sets `complete`. Idempotent: no-op if already complete. |
| `/api/audit/[token]/status` | GET | Poll target. Returns status + score summary. |
| `/api/audit/[token]/manual` | POST | Stores `manual_responses`, recomputes full score. |
| `/api/cron/rerun` | GET | Daily. Auth via `CRON_SECRET`. |
| `/api/admin/rerun` | POST | Manual re-run trigger. Auth via `ADMIN_TOKEN`. |

**Why start and process are split:** PageSpeed Insights can take 20–30 seconds on a slow site. One serverless function doing search + details + PSI + parsing risks hitting the execution limit. Splitting keeps each function fast and gives the user an honest progress screen. Set `export const maxDuration = 60` on the process route.

### 7.2 Email gate timing

Per the owner's decision: **collect email, then show results immediately on-screen.** Do not withhold results pending an email click — it kills completion and reads as a lead-generation trap. The email is a copy, not the delivery mechanism.

---

## 8. External API integration

Put every external call in `/lib/clients/` with typed wrappers. Every call increments the relevant `usage_counters` column.

### 8.1 Google Places (New)

- **Text Search** for the search step. Query: `"{name} {city} {state}"`. Request only the fields needed for disambiguation — field masks are how Places billing tiers work, so a lazy mask costs real money.
- **Place Details** for the audit. Request only: id, displayName, formattedAddress, addressComponents, location, primaryType, types, nationalPhoneNumber, websiteUri, regularOpeningHours, currentOpeningHours, rating, userRatingCount, reviews, photos, businessStatus, googleMapsUri.

Claude Code: **read the current Google docs before writing this.** Field-mask syntax and SKU tiers change.

### 8.2 PageSpeed Insights

`GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed` with `strategy=mobile` and categories performance, accessibility, seo. Mobile only — this traffic is overwhelmingly phones and a desktop run doubles cost for no insight. Timeout at 45s, one retry, then mark PSI checks `unavailable` rather than failing the whole audit.

### 8.3 Site fetch

Plain `fetch` with a 15s timeout and a descriptive User-Agent identifying the tool. Follow up to 3 redirects. Parse with cheerio. Never execute page JavaScript. If the site is JS-rendered and cheerio sees an empty body, fall back to PSI's DOM data and mark HTML-derived checks `inferred`.

---

### 8.4 Claude visibility probe

`@anthropic-ai/sdk` against `claude-sonnet-5`, with the `web_search_20260209` server tool. **This is a Google-independent check on the business, not on the site** — it runs whether or not there's a website.

Two messages, sent in parallel, **once each**:

1. **Discovery** — *"What are the best {primaryType} in {city}, {state}? Recommend specific businesses by name."* Scored by whether the business's name appears in the answer (normalized containment, so *"Tony's Barber Shop"* matches *"Tonys Barbershop"*), or its own domain appears in the citations.
2. **Knowledge** — *"Do you know the business "{name}" in {city}, {state}? Search for it, then give its phone number."* The system prompt requires a trailing `RESULT: found=<yes|no>; phone=<...>` line. Compare the last 10 digits against the Places phone number.

Settings and why:

- `user_location` is set to the business's own city. The realistic scenario is a customer standing nearby asking their phone, not a search from across the country.
- `max_uses: 2` per query. Web search bills **$10 per 1,000 searches** on top of the tokens the results occupy, so this is the real cost cap, not a quality knob.
- Adaptive thinking stays **on** with `effort: "medium"`. Sonnet 5 reaches for tools less readily with thinking disabled, and an un-searched *"no"* would be a false negative written permanently into the dataset.
- Timeout 45s, one retry. On failure, timeout, or an unparseable reply, both checks are `unavailable` — **never** `fail`. An answer we couldn't read is not a "no" (rule 7).
- No API key configured → same thing: `unavailable`, excluded from the denominator. The audit completes normally, exactly as it does without Apple Maps credentials.

Pure parsing lives in `/lib/llm-answer.ts` so it is unit-testable without a network call; the request itself is in `/lib/clients/anthropic.ts`. Same split as `apple-match.ts` / `clients/apple-maps.ts`.

**ChatGPT is deliberately not covered in v1.** Scraping chatgpt.com violates OpenAI's ToS and rule 4. The legitimate route is the OpenAI API — which does *not* require a ChatGPT Plus subscription, being separate pay-as-you-go billing — and it is a second vendor, second key, and second budget line. Noted in `ROADMAP.md`.

## 9. The report page

### 9.1 Structure — page one only

The owner reads page one. Everything else is defensibility.

1. Business name, city, audit date.
2. **Overall score** as the visual anchor, with coverage disclosure: *"Scored on 95% of checks. Answer 4 questions to complete it."*
3. Five dimension bars with one-line plain-language labels. "found" reads *"can customers and AI assistants find you"*.
4. **The AI callout** — one box saying what happened when we asked Claude, colour-coded pass/warn/fail, with the inferred marker and *"we asked once, on {date}. Answers vary between people and change over time."* This sits above the fixes precisely because it is not one of them (§6.9).
5. **Your three highest-impact fixes this week** — ranked by `priority_ratio`, excluding `HEADLINE_EXCLUDED_CHECKS`. Each: what's wrong (one line), what to do (one line), rough effort ("4 minutes" / "an afternoon").
6. Single primary CTA (Section 13).
7. Link to full findings.

### 9.2 Page two

Every check grouped by dimension, with status, confidence badge, and raw value. Inferred checks visibly marked. Unavailable checks shown as unavailable with a reason — not hidden, not scored.

### 9.3 Loading state

The audit takes 15–45 seconds. Show named steps, not a spinner: *"Reading your Google profile" → "Checking your website" → "Measuring load speed on mobile" → "Scoring."* Copy must be plain and non-technical.

---

## 10. Email

### 10.1 Report email

Sent on completion when `consent_email_report` is true. Subject: `Your web presence score: {score}/100 — {business name}`. Body: score, three fixes as plain text, a button to the report URL, unsubscribe link. Keep it short — this is a summary that drives a click, not a duplicate of the report.

### 10.2 Re-run emails

Day 30 and day 90, only when `consent_followup` is true. Subject frames movement: `Your score moved from 61 to 74`. Body shows before/after per dimension and what changed. **This email is the engine of the whole longitudinal dataset** — it is what makes owners come back and what generates the outcome data. Give it real care.

### 10.3 Domain fallback

If no verified domain exists, set `EMAIL_ENABLED=false`. Everything still works — the report renders on-screen and the URL is shown with a "copy link" button — and no email is attempted. Do not let a missing domain break the audit flow.

### 10.4 Consent and privacy

Three checkboxes on the email gate:

- ☑ *Email me this report* (pre-checked, required to send)
- ☐ *Re-check my business in 30 and 90 days and email me what changed* (unchecked)
- ☐ *Include my anonymized results in aggregate research about small business web presence* (unchecked)

Third one matters. `consent_research` is what makes the eventual write-up defensible, and retrofitting consent onto already-collected data is not possible. Ship a `/privacy` page: what's collected, why, how to request deletion, contact email. Plain language, under 300 words.

---

## 11. Re-run system

`/api/cron/rerun`, daily at 14:00 UTC, configured in `vercel.json`.

1. Reject requests without a matching `CRON_SECRET` header.
2. Check kill switch and remaining daily cap.
3. Select `scheduled_runs` where `due_on <= today`, `status = 'pending'`, `attempts < 3`.
4. Process at most 20 per day, oldest first, so re-runs never consume the entire budget.
5. For each: new `audits` row with the correct `run_type`, full pipeline, mark the scheduled row complete, send the comparison email if consented.
6. On failure: increment `attempts`, store `last_error`, leave pending. After 3, mark `failed`.

Vercel Hobby permits one cron invocation per day, which is exactly right here.

---

## 12. Cost and abuse control

Before **any** paid API call, in this order:

1. `AUDITS_ENABLED === 'true'`, else return a friendly "audits are paused" message.
2. Today's `usage_counters.audits_started < DAILY_AUDIT_CAP`.
3. This IP hash's `ip_counters.count < PER_IP_DAILY_CAP`.

Increment counters in the same transaction that creates the audit. When the daily cap is hit, show: *"We've hit today's audit limit. Check back tomorrow, or book a call and we'll run yours manually."* — with the Calendly link. A cap hit becomes a lead.

Also: cache Place Details results for 24h keyed by `place_id`, so a re-search of the same business inside a day costs nothing extra.

**The Claude probe has a fourth gate of its own**, checked in `llmProbeAllowed()` before the request: today's `usage_counters.llm_probes < LLM_PROBE_DAILY_CAP`. It is the only check billed per call *on top of* tokens — web search runs $10 per 1,000 searches — and the $50/month ceiling is shared with Google. Hitting this cap must never fail an audit: the two `llm_*` checks read `unavailable` and drop out of the denominator, exactly as they do with no API key. `usage_counters` tracks `llm_probes` and `llm_searches` separately so the real spend is visible in the SQL editor.

---

## 13. Offer mode — commercial vs pro bono

`NEXT_PUBLIC_OFFER_MODE` flips every commercial surface. All copy lives in one file, `/lib/offers.ts`. **No CTA text hardcoded in components.**

### commercial (class project)

Report CTA block, headline *"Want these fixed for you?"*:

- **Review reply drafter** — drafted responses to every review, in the business's voice.
- **AI phone agent** — answers calls when nobody can reach the phone, takes orders and bookings.
- **Competitor benchmark** — how the business ranks against similar businesses in the same ZIP.
- **Done-for-you fixes** — implementation of the top three.

Single button: *"Book a free 20-minute review"* → Calendly. The CTA block itself carries **no prices** — those four services are scoped on a call, not bought off a page.

**Per-fix pricing on report page two** (owner decision, 2026-08-11 — this reverses the earlier "no prices anywhere on the site" rule). Every check scoring below 100 gets a blue band beneath it reading *"Fix it now in 5 minutes!"* with a price pill on the right. Price is derived from the check's own `fixCostBucket` — `minutes` → $50, `hours` → $75, `days` and `money` → $200 — so a check added to `config.ts` is priced automatically and its price can never disagree with the effort estimate shown on page one. Copy and tiers live in `/lib/offers.ts` (`getFixOffer`), never in the component.

Bands are shown only for checks with a real score. `unavailable` and `manual_required` checks carry a null score and get no band: selling a fix for something we could not measure, or for a question only the owner can answer, would be selling air.

In `pro_bono` mode the pill reads *"Free"* and links to Calendly instead. A free student-club service quoting $200 would contradict the whole framing, so the price must never survive the mode flip.

> **Demo caveat — revisit before real traffic.** The band currently links to `https://dashboard.stripe.com/login`, which is the *merchant* sign-in, not a customer checkout. It exists to make the flow look connected in a pitch. A real owner clicking a $75 pill lands on a Stripe login for an account they do not have. Before the site is put in front of actual businesses, this must become either a real Checkout session or the Calendly link.

Peer benchmarking is deliberately excluded from the free report and positioned as a paid deliverable. This also conveniently avoids the extra Nearby Search cost per audit.

### pro_bono (club)

Same block, headline *"We'll help you fix these — free."* Same four items, framed as free student-club services. Same Calendly button, relabeled *"Book time with a student advisor."* Add a line naming the club and the college.

Flipping one env var in Vercel must fully convert the site. Verify this works before Phase 8 is called done.

---

## 14. Design direction

The owner asked for white, with search as the first thing on the page. Honor that literally: no hero image, no marketing preamble, no scroll before the input.

**Concept: a diagnostic instrument, not a marketing site.** The subject world is small retail — receipts, taped-up hours, hand-lettered window signs, the paper artifacts of a corner business. Lean into that for the score display specifically.

**Tokens:**

```
--paper:   #FCFCFA   page
--ink:     #14161A   primary text
--muted:   #5A6068   secondary text
--rule:    #E3E2DE   hairlines, borders
--pass:    #1F7A5C
--warn:    #B8730A
--fail:    #B23A2E
```

Signal colors appear **only** as status. Never decorative. On a white page carrying bad news, restraint is what makes it read as an honest instrument rather than a sales funnel.

**Type:** Archivo (variable) for UI and headings — set headings tight, around -0.02em. IBM Plex Mono for all numbers, scores, check keys, and labels. Both from Google Fonts via `next/font`.

**Signature element:** render the score summary as a **receipt** — a narrow monospace column, line items with leader dots, a rule, and a total. It is grounded in the world of the businesses being audited, it makes a dense score breakdown genuinely scannable, and it is memorable in a way a progress bar is not. Spend the design boldness here and keep everything else quiet.

**Avoid:** cream backgrounds with terracotta accents, dark mode with a single acid accent, gradient hero numbers, generic dashboard chrome. These are the current AI-design defaults and they will read as templated.

**Floor:** responsive to 360px, visible keyboard focus, `prefers-reduced-motion` respected, real `<label>` on every input, WCAG AA contrast throughout.

**Copy voice:** plain and direct. *"No one can find your hours"* — not *"Suboptimal hours configuration detected."* Many of these owners are not native English speakers. Short sentences, common words, no jargon, no exclamation marks. Errors say what happened and what to do next.

---

## 15. Build phases

Work one phase at a time. End every phase with something the owner can see running, plus a plain-language "here's what to do" note. **Do not start the next phase until the owner confirms the current one works.**

**Phase 1 — Skeleton.** Next.js + TypeScript + Tailwind, fonts, tokens, landing page with search form (no backend). Deploy to Vercel. *Deliverable: a live URL with a working-looking form.*

**Phase 2 — Database.** Supabase migration, typed client, one seeded test row. *Deliverable: tables visible in the Supabase dashboard, screenshot-guided.*

**Phase 3 — Places search.** `/api/search`, disambiguation page, cap checks. *Deliverable: search a real local business, see real candidates.*

**Phase 4 — Scoring engine.** All of Section 6 as pure functions, plus unit tests against fixture JSON. No network. *Deliverable: `npm test` passes, with an explanation of what a test is and why it matters here.*

**Phase 5 — Audit pipeline.** `/api/audit/start`, `/api/audit/[token]/process`, site fetch, PSI, persistence. *Deliverable: a completed audit row with populated checks.*

**Phase 6 — Report.** Email gate, consent, status polling, report pages one and two, receipt component. *Deliverable: end-to-end run on the owner's own chosen business.*

**Phase 7 — Manual questions.** Complete-audit flow, Resilience scoring, full-coverage recompute. *Deliverable: score updates after answering.*

**Phase 8 — Email + offers.** Resend integration, both email templates, `/lib/offers.ts`, mode switching, privacy page. *Deliverable: a real report email received, and mode-flip verified.*

**Phase 9 — Re-runs.** Cron route, `vercel.json`, scheduling on audit creation, comparison email, admin trigger. *Deliverable: a manually triggered re-run producing a second audit row for the same business.*

**Phase 10 — Cohort tooling.** Mark cohort members, force-schedule re-runs, a SQL file of analysis queries: score deltas by dimension, implementation rate of top-three fixes, median change in review count / photo count / PSI over 90 days. *Deliverable: queries the owner can paste into Supabase's SQL editor and get numbers from.*

---

## 16. Definition of done

- [ ] Search a real business, get correct candidates
- [ ] Full audit completes in under 60s for a business with a website
- [ ] Business with no website completes without error and scores Technical Health 0
- [ ] Business with no Google profile fails gracefully with a clear message
- [ ] Every heuristic check displays an "inferred" badge
- [ ] Unavailable checks are excluded from denominators, never scored 0
- [ ] With `ANTHROPIC_API_KEY` unset, the audit completes and both `llm_*` checks read `unavailable` — not `fail`
- [ ] Past `LLM_PROBE_DAILY_CAP`, the same: audit completes, `llm_*` unavailable
- [ ] The AI callout never appears in the three headline fixes, even when it is the worst-scoring check
- [ ] `audits.raw_llm` holds both prompts and both full answers
- [ ] Report readable at 360px width
- [ ] Daily cap blocks audit 51 and shows the Calendly fallback
- [ ] Kill switch stops all paid calls
- [ ] Report email received in a real inbox
- [ ] `OFFER_MODE` flip changes every CTA with no code edit
- [ ] Re-run creates a new audit row; original is byte-identical
- [ ] No secret appears in any client bundle (verify: search the built output)
- [ ] `scoring_config_version` present on every audit row

---

## 17. Deliberately out of scope for v1

Do not build these. Note them in a `ROADMAP.md` instead.

- Peer/competitor benchmarking (paid deliverable + extra API cost)
- Category-specific scoring branches (food vs service) — generic v1 per owner's decision
- Admin dashboard — owner will use the Supabase SQL editor
- LLM-generated fix copy or review replies (that's the paid product)
- PDF export — hosted page + email only
- Yelp / Facebook / Apple Maps data
- User accounts or login
- Payments

---

## 18. Open questions for the owner

Ask these when the relevant phase arrives — do not block Phase 1 on them.

1. **Domain** — buying one before launch? Determines whether email works at all. *(Phase 8)*
2. **Club name and college** — needed for `pro_bono` copy and the privacy page. *(Phase 8)*
3. **Per-IP cap** — keep at 10, or raise to 50? *(Phase 3)*
4. **Publication intent** — is a paper, poster, or transfer-application write-up planned? If yes, say so at Phase 2 so `consent_research` wording and the retained fields are right the first time. This cannot be fixed later. *(Phase 2)*
5. **Cohort geography** — which city/ZIPs? Affects nothing in v1 but determines whether benchmarking is feasible in v2. *(Phase 10)*
