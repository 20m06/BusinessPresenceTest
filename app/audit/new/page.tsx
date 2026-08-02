"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function AuditNewInner() {
  const params = useSearchParams();
  const router = useRouter();
  const placeId = params.get("placeId") ?? "";
  const name = params.get("name") ?? "your business";
  const address = params.get("address") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch("/api/audit/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId,
          email: String(form.get("email") ?? "").trim(),
          role: null,
          consentEmailReport: form.get("consentEmail") === "on",
          consentFollowup: form.get("consentFollowup") === "on",
          consentResearch: form.get("consentResearch") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/report/${data.token}`);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!placeId) {
    return (
      <div className="mt-4">
        <p className="text-muted">Something was missing. Start the search again.</p>
        <p className="mt-4">
          <Link href="/" className="underline underline-offset-4">
            Back to search
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
        Almost there
      </h1>
      <p className="mt-3 text-muted">
        Auditing <span className="text-ink font-medium">{name}</span>
        {address ? ` — ${address}` : ""}. Where should we send your copy of the
        report?
      </p>

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="border border-rule bg-white p-4">
          <label
            htmlFor="email"
            className="block font-mono text-xs uppercase tracking-wider text-muted"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1 w-full bg-transparent text-lg placeholder:text-muted/50 focus:outline-none"
          />
        </div>

        <fieldset className="mt-4 space-y-3">
          <legend className="sr-only">Consent choices</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="consentEmail" defaultChecked className="mt-1" />
            <span className="text-sm">Email me this report</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="consentFollowup" className="mt-1" />
            <span className="text-sm">
              Re-check my business in 30 and 90 days and email me what changed
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="consentResearch" className="mt-1" />
            <span className="text-sm">
              Include my anonymized results in aggregate research about small
              business web presence
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full sm:w-auto px-8 py-3 bg-ink text-paper font-medium hover:bg-ink/90 disabled:opacity-60"
        >
          {submitting ? "Starting…" : "Run my audit"}
        </button>

        {error && (
          <p role="status" className="mt-4 text-sm text-fail">
            {error}
          </p>
        )}

        <p className="mt-4 font-mono text-xs text-muted">
          We only read public information.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function AuditNewPage() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Business Visibility Test
        </p>
        <Suspense>
          <AuditNewInner />
        </Suspense>
      </div>
    </main>
  );
}
