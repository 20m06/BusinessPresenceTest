import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import { ARTICLES } from "@/lib/insights";
import { getOffers } from "@/lib/offers";

export default function SiteFooter() {
  const { services, clubLine } = getOffers();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-rule">
      <div className="max-w-5xl mx-auto px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              Services
            </p>
            <ul className="mt-3 space-y-2">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-sm text-muted hover:text-ink"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              Insights
            </p>
            <ul className="mt-3 space-y-2">
              {ARTICLES.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/insights/${a.slug}`}
                    className="text-sm text-muted hover:text-ink"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              {BRAND_NAME}
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted hover:text-ink">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-muted hover:text-ink">
                  Free visibility score
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted hover:text-ink"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-rule">
          <p className="font-mono text-xs text-muted leading-relaxed">
            We only read public information — your Google listing and your
            website. Nothing is changed or posted.
          </p>
          {clubLine && (
            <p className="mt-2 font-mono text-xs text-muted">{clubLine}</p>
          )}
          <p className="mt-2 font-mono text-xs text-muted">
            © {year} {BRAND_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
