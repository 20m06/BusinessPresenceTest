import { getOffers } from "@/lib/offers";

/**
 * Booking block for the marketing pages. All wording comes from
 * lib/offers.ts so NEXT_PUBLIC_OFFER_MODE converts it with the rest of
 * the site (CLAUDE.md §13). No prices, here or anywhere else.
 */
export default function BookingCta({ line }: { line?: string }) {
  const { buttonLabel, calendlyUrl, clubLine, serviceCtaLine } = getOffers();

  return (
    <div className="mt-12 border border-rule bg-white p-6">
      <p className="text-muted leading-relaxed">{line ?? serviceCtaLine}</p>
      <a
        href={calendlyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block px-5 py-3 bg-accent text-white text-sm font-medium hover:bg-accent/90"
      >
        {buttonLabel}
      </a>
      {clubLine && (
        <p className="mt-3 font-mono text-xs text-muted">{clubLine}</p>
      )}
    </div>
  );
}
