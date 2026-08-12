"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getOffers } from "@/lib/offers";
import { Receipt } from "./receipt";

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
  llm: {
    recommended: boolean | null;
    knowsBusiness: boolean | null;
    phoneMatches: boolean | null;
  } | null;
  topFixes: Array<{ title: string; instruction: string; effort: string }>;
}

const STEPS = [
  "Reading your Google profile",
  "Checking your website",
  "Measuring load speed on mobile",
  "Asking an AI assistant about you",
  "Scoring",
];

// One sampled answer, not a rate — the copy has to say so (CLAUDE.md §6.8).
function llmVerdict(llm: NonNullable<StatusPayload["llm"]>): {
  headline: string;
  detail: string;
  tone: "pass" | "warn" | "fail";
} {
  if (!llm.knowsBusiness) {
    return {
      tone: "fail",
      headline: "An AI assistant could not find you",
      detail:
        "We asked Claude about your business by name, with web search on. It could not find you. More customers are asking an assistant where to go instead of opening Maps, and those customers are not hearing about you.",
    };
  }
  if (llm.phoneMatches === false) {
    return {
      tone: "fail",
      headline: "An AI assistant gave out the wrong phone number",
      detail:
        "Claude found your business but quoted a phone number that does not match your Google profile. Anyone acting on that answer is calling the wrong place.",
    };
  }
  if (!llm.recommended) {
    return {
      tone: "warn",
      headline: "An AI assistant knows you, but did not recommend you",
      detail:
        "Claude found your business when we asked by name, but did not mention you when we asked it to recommend businesses like yours nearby.",
    };
  }
  return {
    tone: "pass",
    headline: "An AI assistant recommended you",
    detail:
      "Claude named your business when we asked it to recommend places like yours nearby, and found your correct details when we asked by name.",
  };
}

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
          Visibility report
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

            <Receipt
              businessName={payload.business?.name ?? ""}
              cityState={[payload.business?.city, payload.business?.state]
                .filter(Boolean)
                .join(", ")}
              dateLabel={new Date(payload.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              lines={[
                { label: "found", score: payload.scores.discoverability },
                { label: "converts", score: payload.scores.conversion },
                { label: "reviews", score: payload.scores.socialProof },
                { label: "website", score: payload.scores.technicalHealth },
                { label: "control", score: payload.scores.resilience },
              ]}
              overall={payload.scores.overall}
              coveragePct={payload.scores.coveragePct}
            />

            <ul className="mt-6 text-sm text-muted space-y-1">
              <li>found — can customers find you on Google and ChatGPT/LLMs</li>
              <li>converts — can a visit turn into a sale</li>
              <li>reviews — your reputation on Google</li>
              <li>website — does your site load fast and work on phones</li>
              <li>control — do you hold your own keys</li>
            </ul>

            {payload.llm && (() => {
              const v = llmVerdict(payload.llm);
              return (
                <div className="mt-6 border border-rule bg-white p-4">
                  <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
                    Asked an AI
                  </p>
                  <p
                    className={`mt-2 font-medium ${
                      v.tone === "pass"
                        ? "text-pass"
                        : v.tone === "warn"
                          ? "text-warn"
                          : "text-fail"
                    }`}
                  >
                    {v.headline}
                  </p>
                  <p className="mt-1 text-sm text-muted">{v.detail}</p>
                  <p className="mt-3 font-mono text-xs text-muted">
                    inferred · we asked once, on{" "}
                    {new Date(payload.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    . Answers vary between people and change over time.
                  </p>
                </div>
              );
            })()}

            {payload.scores.resilience === null && (
              <div className="mt-6 border border-rule bg-white p-4">
                <p className="text-sm">
                  Your score is based on{" "}
                  {Math.round(payload.scores.coveragePct ?? 0)}% of checks. A
                  few questions only you can answer complete it.
                </p>
                <Link
                  href={`/report/${token}/complete-audit`}
                  className="mt-3 inline-block px-6 py-2.5 border border-ink font-medium hover:bg-ink hover:text-paper"
                >
                  Answer the questions
                </Link>
              </div>
            )}

            {/* Sits after the control questions and before the fixes, but
                outside the block above on purpose: that box disappears once
                Resilience is answered, and these two must not go with it. */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={`/report/${token}/details`}
                className="underline underline-offset-4"
              >
                See every check we ran →
              </Link>
              {/* Demo placeholder — deliberately does nothing yet. */}
              <button
                type="button"
                className="px-6 py-2.5 border border-ink font-medium cursor-pointer hover:bg-ink hover:text-paper"
              >
                Download the report
              </button>
            </div>

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
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium">{s.name}</p>
                      <span className="font-mono text-sm font-semibold text-offer-deep shrink-0">
                        {offers.servicePrice}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{s.description}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-5 border-t border-rule flex gap-4">
                <Image
                  src={offers.founder.photo}
                  alt={offers.founder.name}
                  width={864}
                  height={1184}
                  sizes="72px"
                  className="w-[72px] h-[96px] object-cover border border-rule shrink-0"
                />
                <div>
                  <p className="text-sm font-medium">{offers.founder.name}</p>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted">
                    {offers.founder.role}
                  </p>
                  <div className="mt-2 space-y-2">
                    {offers.founder.pitch.map((line, i) => (
                      <p key={i} className="text-sm text-muted leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

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
