"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

// Report page two (CLAUDE.md §9.2): every check grouped by dimension,
// with status, confidence badge, and raw value. Inferred checks visibly
// marked. Unavailable checks shown with a reason — not hidden.

interface CheckRow {
  dimension: string;
  check_key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "unavailable" | "manual_required";
  confidence: "verified" | "inferred" | "manual_required";
  normalized_score: number | null;
  raw_value: Record<string, unknown> | null;
  weight_in_dim: number;
}

interface Payload {
  status: string;
  business: { name: string; city: string | null; state: string | null } | null;
  createdAt: string;
  checks: CheckRow[];
}

const DIMENSION_ORDER = [
  "discoverability",
  "conversion",
  "social_proof",
  "technical_health",
  "resilience",
];

const DIMENSION_TITLES: Record<string, string> = {
  discoverability: "Being found",
  conversion: "Turning visits into customers",
  social_proof: "Reviews and reputation",
  technical_health: "Website health",
  resilience: "Control of your accounts",
};

const STATUS_LABELS: Record<CheckRow["status"], { text: string; cls: string }> = {
  pass: { text: "OK", cls: "text-pass" },
  warn: { text: "needs work", cls: "text-warn" },
  fail: { text: "fix this", cls: "text-fail" },
  unavailable: { text: "couldn't check", cls: "text-muted" },
  manual_required: { text: "needs your answer", cls: "text-muted" },
};

const UNAVAILABLE_REASONS: Record<string, string> = {
  no_google_profile: "no Google profile to read",
  no_website: "no website to read",
  site_unreadable: "we couldn't read the site",
};

function describeRaw(row: CheckRow): string | null {
  const r = row.raw_value ?? {};
  switch (row.check_key) {
    case "photos_count":
      return r.photoCount === null || r.photoCount === undefined
        ? "Google doesn't share the photo count here"
        : `${r.photoCount} photos`;
    case "review_count":
      return r.reviewCount != null ? `${r.reviewCount} reviews` : null;
    case "average_rating":
      return r.rating != null ? `${r.rating} stars` : null;
    case "review_recency":
      return r.newestReviewAt
        ? `newest: ${new Date(String(r.newestReviewAt)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "no reviews found";
    case "owner_responds":
      return "Google doesn't share reply data — answer this yourself later";
    case "hours_present":
      return r.daysWithHours != null ? `${r.daysWithHours}/7 days have hours` : null;
    case "hours_special":
      return r.holidayNear
        ? r.hasSpecialHoursSoon
          ? "special hours found"
          : "a holiday is coming and no special hours are set"
        : "no holiday in the next 60 days";
    case "gbp_claimed":
      return r.signalCount != null ? `${r.signalCount}/5 signals of an active owner` : null;
    case "phone_present":
      return r.phone ? String(r.phone) : "no phone on the profile";
    case "gbp_website_link":
      return r.websiteUri ? String(r.websiteUri) : "no website on the profile";
    case "tel_link_clickable":
      return r.telLink
        ? "tap-to-call link found"
        : r.plainText
          ? "number shown as text only"
          : "no phone number on the page";
    case "transaction_path":
      return r.found
        ? r.host
          ? `via ${r.host}`
          : "on-page form"
        : "no ordering or booking path found";
    case "psi_performance":
      return r.performance != null
        ? `${r.performance}/100${r.lcpMs != null ? ` · main content in ${(Number(r.lcpMs) / 1000).toFixed(1)}s` : ""}`
        : null;
    case "psi_accessibility":
      return r.accessibility != null ? `${r.accessibility}/100` : null;
    case "psi_seo":
      return r.seo != null ? `${r.seo}/100` : null;
    case "category_specific":
      return r.primaryType ? String(r.primaryType).replaceAll("_", " ") : "no category set";
    default: {
      if (typeof r.reason === "string") return UNAVAILABLE_REASONS[r.reason] ?? null;
      return null;
    }
  }
}

export default function DetailsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/audit/${token}/checks`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPayload)
      .catch(() => setError(true));
  }, [token]);

  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Business Visibility Test
        </p>

        <p className="mt-4">
          <Link href={`/report/${token}`} className="underline underline-offset-4">
            ← Back to the report
          </Link>
        </p>

        {error && (
          <p className="mt-6 text-muted">
            We couldn't load the details. Refresh to try again.
          </p>
        )}

        {payload && payload.status !== "complete" && (
          <p className="mt-6 text-muted">
            The audit isn't finished yet — go back to the report to watch it run.
          </p>
        )}

        {payload && payload.status === "complete" && (
          <div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              Every check we ran
            </h1>
            <p className="mt-2 text-muted text-sm">
              {payload.business?.name} ·{" "}
              {new Date(payload.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Checks marked <span className="font-mono text-xs border border-rule px-1">inferred</span>{" "}
              are honest estimates from public signals, not direct measurements.
              Checks we couldn't run are shown with the reason — they don't
              count against the score.
            </p>

            {DIMENSION_ORDER.map((dim) => {
              const rows = payload.checks.filter((c) => c.dimension === dim);
              if (rows.length === 0) return null;
              return (
                <section key={dim} className="mt-8">
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    {DIMENSION_TITLES[dim] ?? dim}
                  </h2>
                  <ul className="mt-3 border border-rule bg-white divide-y divide-rule">
                    {rows.map((row) => {
                      const s = STATUS_LABELS[row.status];
                      const desc = describeRaw(row);
                      return (
                        <li key={row.check_key} className="p-4">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-medium">{row.label}</span>
                            <span className={`font-mono text-xs ${s.cls}`}>{s.text}</span>
                            {row.confidence === "inferred" && (
                              <span className="font-mono text-[10px] uppercase tracking-wider border border-rule px-1 text-muted">
                                inferred
                              </span>
                            )}
                            {row.normalized_score !== null && (
                              <span className="ml-auto font-mono text-sm">
                                {Math.round(row.normalized_score)}
                              </span>
                            )}
                          </div>
                          {desc && (
                            <p className="mt-1 font-mono text-xs text-muted">{desc}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
