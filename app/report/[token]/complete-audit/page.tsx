"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Phase 2 of scoring: the owner answers what no API can know.
// "Not sure" is itself a finding (CLAUDE.md §6.7).

interface Question {
  key: string;
  text: string;
  onlyWithWebsite?: boolean;
}

const QUESTIONS: Question[] = [
  {
    key: "owner_has_gbp_access",
    text: "Can you personally sign in and edit your Google Business Profile?",
  },
  {
    key: "owner_owns_domain",
    text: "Is your website domain registered in your name or your business's name?",
    onlyWithWebsite: true,
  },
  {
    key: "owner_has_site_access",
    text: "Can you log in to change your website?",
    onlyWithWebsite: true,
  },
  {
    key: "owner_has_social_access",
    text: "Do you have the passwords to your business's social accounts?",
  },
  {
    key: "contact_form_delivers",
    text: "Have you tested your contact form — does it actually reach you?",
    onlyWithWebsite: true,
  },
];

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];

export default function CompleteAuditPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/audit/${token}/status`)
      .then((r) => r.json())
      .then((d) => setHasWebsite(d?.scores?.hasWebsite ?? true))
      .catch(() => setHasWebsite(true));
  }, [token]);

  const visible = QUESTIONS.filter((q) => !q.onlyWithWebsite || hasWebsite !== false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const provided = Object.fromEntries(
      Object.entries(answers).filter(([k]) => visible.some((q) => q.key === k))
    );
    if (Object.keys(provided).length === 0) {
      setError("Answer at least one question.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/audit/${token}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: provided }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/report/${token}`);
    } catch {
      setError("We couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Visibility report
        </p>

        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
          A few questions only you can answer
        </h1>
        <p className="mt-3 text-muted leading-relaxed">
          These complete your score. "Not sure" is a real answer — for many
          owners it's the most useful thing this audit finds.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <ol className="space-y-6">
            {visible.map((q, i) => (
              <li key={q.key} className="border border-rule bg-white p-4">
                <fieldset>
                  <legend className="font-medium">
                    {i + 1}. {q.text}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={q.key}
                          value={opt.value}
                          checked={answers[q.key] === opt.value}
                          onChange={() =>
                            setAnswers((a) => ({ ...a, [q.key]: opt.value }))
                          }
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full sm:w-auto px-8 py-3 bg-ink text-paper font-medium hover:bg-ink/90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Complete my score"}
          </button>

          {error && (
            <p role="status" className="mt-4 text-sm text-fail">
              {error}
            </p>
          )}
        </form>

        <p className="mt-8">
          <Link href={`/report/${token}`} className="underline underline-offset-4">
            ← Back to the report
          </Link>
        </p>
      </div>
    </main>
  );
}
