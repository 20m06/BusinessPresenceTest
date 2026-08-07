import Link from "next/link";
import { notFound } from "next/navigation";

import BookingCta from "@/components/booking-cta";
import { ARTICLES, formatArticleDate, getArticle } from "@/lib/insights";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return { title: article.title, description: article.dek };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const others = ARTICLES.filter((a) => a.slug !== slug);

  return (
    <main className="flex-1">
      <article className="max-w-2xl mx-auto px-5 pt-14 pb-16">
        <Link
          href="/insights"
          className="font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
        >
          ← All insights
        </Link>

        <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          {article.title}
        </h1>
        <p className="mt-3 text-lg text-muted leading-relaxed">{article.dek}</p>
        <p className="mt-4 font-mono text-xs text-muted">
          Updated {formatArticleDate(article.updated)} ·{" "}
          {article.readingMinutes} min read
        </p>

        <div className="mt-8">
          {article.body.map((block, i) => {
            switch (block.kind) {
              case "h":
                return (
                  <h2
                    key={i}
                    className="mt-9 mb-3 text-xl font-semibold tracking-[-0.01em]"
                  >
                    {block.text}
                  </h2>
                );
              case "p":
                return (
                  <p key={i} className="mt-4 leading-relaxed">
                    {block.text}
                  </p>
                );
              case "steps":
                return (
                  <ol key={i} className="mt-5 space-y-3">
                    {block.items.map((item, n) => (
                      <li key={n} className="flex gap-3 leading-relaxed">
                        <span className="font-mono text-sm text-accent shrink-0 pt-0.5">
                          {String(n + 1).padStart(2, "0")}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                );
              case "list":
                return (
                  <ul key={i} className="mt-5 space-y-2">
                    {block.items.map((item, n) => (
                      <li key={n} className="flex gap-3 leading-relaxed">
                        <span aria-hidden="true" className="text-muted">
                          —
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              case "note":
                return (
                  <p
                    key={i}
                    className="mt-6 border-l-2 border-accent bg-accent-tint px-4 py-3 leading-relaxed"
                  >
                    {block.text}
                  </p>
                );
            }
          })}
        </div>

        <BookingCta line="Want to know how your own business scores on all of this? The check is free and takes about a minute." />

        <div className="mt-12 pt-8 border-t border-rule">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            Keep reading
          </p>
          <ul className="mt-3 space-y-2">
            {others.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/insights/${a.slug}`}
                  className="text-accent hover:underline"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </main>
  );
}
