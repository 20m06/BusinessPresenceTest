"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getOffers } from "@/lib/offers";

// Minimal report view (Phase 5). The full receipt-style report with the
// complete findings page arrives in Phase 6.

interface StatusPayload {
  status: "pending" | "running" | "complete" | "failed";
  failureReason: string | null;
  business: { name: string; city: string | null; state: string | null } | null;
  createdAt: string;
  scores: {
    overall: number | null;
    discoverability: number | null;
    conversion: number | null;
    socialProof: number | null;
    technicalHealth: number | null;
    resilience: number | null;
    coveragePct: number | null;
    hasWebsite: boolean | null;
  } | null;
  topFixes: Array<{ title: string; instruction: string; effort: string }>;
}

const STEPS = [
  "Reading your Google profile",
  "Checking your website",
  "Measuring load speed on mobile",
  "Scoring",
];

export default function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const kicked = useRef(false);

  useEffect(() => {
    // Kick processing exactly once; it's idempotent server-side anyway.
    if (!kicked.current) {
      kicked.current = true;
      fetch(`/api/audit/${token}/process`, { method: "POST" }).catch(() => {});
    }

    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/audit/${token}/status`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as StatusPayload;
        if (stopped) return;
        setPayload(data);
        if (data.status === "pending" || data.status === "running") {
          setTimeout(poll, 2500);
        }
      } catch {
        if (!stopped) setTimeout(poll, 4000);
      }
    };
    poll();

    const stepTimer = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      6000
    );
    return () => {
      stopped = true;
      clearInterval(stepTimer);
    };
  }, [token]);

  const offers = getOffers();

  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Business Visibility Test
        </p>

        {notFound && (
          <div>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
              Report not found
            </h1>
            <p className="mt-3 text-muted">
              This link doesn't match any audit. Check the link, or run a new one.
            </p>
            <p className="mt-4">
              <Link href="/" className="underline underline-offset-4">
                Back to search
              </Link>
            </p>
          </div>
        )}

        {!notFound && (!payload || payload.status === "pending" || payload.status === "running") && (
          <div role="status">
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              Running your audit…
            </h1>
            <ul className="mt-6 space-y-2 font-mono text-sm">
              {STEPS.map((label, i) => (
                <li key={label} className={i <= step ? "text-ink" : "text-muted/50"}>
                  {i < step ? "✓" : i === step ? "›" : "·"} {label}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">
              This takes 15–45 seconds. Don't close the page.
            </p>
          </div>
        )}

        {!notFound && payload?.status === "failed" && (
          <div>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
              The audit hit a problem
            </h1>
            <p className="mt-3 text-muted">
              Something went wrong on our end. Try again in a few minutes — your
              link stays valid.
            </p>
          </div>
        )}

        {!notFound && payload?.status === "complete" && payload.scores && (
          <div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              {payload.business?.name}
            </h1>
            <p className="mt-1 text-muted text-sm">
              {[payload.business?.city, payload.business?.state].filter(Boolean).join(", ")}
              {" · "}
              {new Date(payload.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <div className="mt-8 border border-rule bg-white p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                Overall score
              </p>
              <p className="font-mono text-6xl font-semibold mt-1">
                {payload.scores.overall !== null ? Math.round(payload.scores.overall * 10) / 10 : "—"}
                <span className="text-2xl text-muted">/100</span>
              </p>
              {payload.scores.coveragePct !== null && payload.scores.coveragePct < 100 && (
                <p className="mt-2 text-sm text-muted">
                  Scored on {Math.round(payload.scores.coveragePct)}% of checks.
                  Answering a few questions completes it — coming in the next
                  update.
                </p>
              )}
            </div>

            <ul className="mt-6 border border-rule bg-white divide-y divide-rule font-mono text-sm">
              {(
                [
                  ["Being found", payload.scores.discoverability],
                  ["Turning visits into customers", payload.scores.conversion],
                  ["Reviews and reputation", payload.scores.socialProof],
                  ["Website health", payload.scores.technicalHealth],
                  ["Control of your accounts", payload.scores.resilience],
                ] as Array<[string, number | null]>
              ).map(([label, score]) => (
                <li key={label} className="flex justify-between p-3">
                  <span>{label}</span>
                  <span className={score === null ? "text-muted" : ""}>
                    {score === null ? "not yet scored" : Math.round(score)}
                  </span>
                </li>
              ))}
            </ul>

            {payload.topFixes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Your highest-impact fixes this week
                </h2>
                <ol className="mt-4 space-y-4">
                  {payload.topFixes.map((fix, i) => (
                    <li key={fix.title} className="border border-rule bg-white p-4">
                      <p className="font-medium">
                        {i + 1}. {fix.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">{fix.instruction}</p>
                      <p className="mt-2 font-mono text-xs text-muted">
                        effort: {fix.effort}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-8 border border-rule bg-white p-5">
              <p className="font-medium">
                {payload.topFixes.length > 0 ? offers.headline : offers.perfectHeadline}
              </p>
              <p className="mt-1 text-sm text-muted">
                {payload.topFixes.length > 0 ? offers.lead : offers.perfectLead}
              </p>
              <ul className="mt-4 space-y-3">
                {offers.services.map((s) => (
                  <li key={s.name}>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-sm text-muted">{s.description}</p>
                  </li>
                ))}
              </ul>
              <a
                href={offers.calendlyUrl}
                className="mt-5 inline-block px-6 py-3 bg-ink text-paper font-medium hover:bg-ink/90"
              >
                {offers.buttonLabel}
              </a>
              {offers.clubLine && (
                <p className="mt-3 font-mono text-xs text-muted">{offers.clubLine}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
