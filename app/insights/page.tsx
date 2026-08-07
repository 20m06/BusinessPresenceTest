import Link from "next/link";

import { ARTICLES, formatArticleDate } from "@/lib/insights";

export const metadata = {
  title: "Insights",
  description:
    "Plain-language guides to being found online: Google Business Profile, holiday hours, and how local search actually works.",
};

export default function InsightsPage() {
  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-5 pt-14 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Insights
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          How to be found online
        </h1>
        <p className="mt-3 text-muted leading-relaxed max-w-xl">
          Short, practical guides. No jargon, no theory — the things we end up
          explaining to owners over and over.
        </p>

        <ul className="mt-10 border-t border-rule">
          {ARTICLES.map((a) => (
            <li key={a.slug} className="border-b border-rule">
              <Link
                href={`/insights/${a.slug}`}
                className="group block py-6 px-4 -mx-4 hover:bg-accent-tint"
              >
                <p className="font-mono text-xs text-muted">
                  {formatArticleDate(a.updated)} · {a.readingMinutes} min read
                </p>
                <h2 className="mt-2 text-lg font-medium tracking-[-0.01em] group-hover:text-accent">
                  {a.title}
                </h2>
                <p className="mt-1 text-muted leading-relaxed">{a.dek}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
