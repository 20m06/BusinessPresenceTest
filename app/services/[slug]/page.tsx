import Link from "next/link";
import { notFound } from "next/navigation";

import BookingCta from "@/components/booking-cta";
import { getService, getServiceSlugs, getOffers } from "@/lib/offers";

export function generateStaticParams() {
  return getServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return { title: service.name, description: service.description };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const others = getOffers().services.filter((s) => s.slug !== slug);

  return (
    <main className="flex-1">
      <div className="max-w-2xl mx-auto px-5 pt-14 pb-16">
        <Link
          href="/services"
          className="font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
        >
          ← All services
        </Link>

        <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          {service.name}
        </h1>
        <p className="mt-3 text-lg text-muted leading-relaxed">
          {service.description}
        </p>

        <div className="mt-8 space-y-5 leading-relaxed">
          {service.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <BookingCta />

        <div className="mt-12 pt-8 border-t border-rule">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            Other services
          </p>
          <ul className="mt-3 space-y-2">
            {others.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="text-accent hover:underline"
                >
                  {s.name}
                </Link>
                <span className="text-muted"> — {s.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
