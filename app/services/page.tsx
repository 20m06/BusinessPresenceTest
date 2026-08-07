import Link from "next/link";

import BookingCta from "@/components/booking-cta";
import { getOffers } from "@/lib/offers";

export const metadata = {
  title: "Services",
  description:
    "What we set up for small businesses: done-for-you fixes, review replies, an AI phone agent, and competitor benchmarking.",
};

export default function ServicesPage() {
  const { services, servicesHeadline, servicesLead } = getOffers();

  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-5 pt-14 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Services
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          {servicesHeadline}
        </h1>
        <p className="mt-3 text-muted leading-relaxed max-w-xl">
          {servicesLead}
        </p>

        <ul className="mt-10 border-t border-rule">
          {services.map((s) => (
            <li key={s.slug} className="border-b border-rule">
              <Link
                href={`/services/${s.slug}`}
                className="group flex items-start gap-4 py-6 hover:bg-accent-tint px-4 -mx-4"
              >
                <span className="flex-1">
                  <span className="block text-lg font-medium tracking-[-0.01em]">
                    {s.name}
                  </span>
                  <span className="mt-1 block text-muted leading-relaxed">
                    {s.description}
                  </span>
                  <span className="mt-2 inline-block text-sm text-accent">
                    How it works
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1.5 text-muted group-hover:text-accent"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <BookingCta />
      </div>
    </main>
  );
}
