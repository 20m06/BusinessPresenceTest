import { getOffers } from "@/lib/offers";

/**
 * Contact block for the marketing pages. Replaces the old booking CTA: there
 * is no call to book and nothing to buy, so the only route offered is an email
 * address a business can use if it wants its own results. Wording comes from
 * lib/offers.ts.
 */
export default function ContactCta({ line }: { line?: string }) {
  const { contactEmail, contactLine, clubLine } = getOffers();

  return (
    <div className="mt-12 border border-rule bg-white p-6">
      <p className="text-muted leading-relaxed">{line ?? contactLine}</p>
      <a
        href={`mailto:${contactEmail}`}
        className="mt-4 inline-block px-5 py-3 bg-accent text-white text-sm font-medium hover:bg-accent/90 break-all"
      >
        {contactEmail}
      </a>
      {clubLine && (
        <p className="mt-3 font-mono text-xs text-muted">{clubLine}</p>
      )}
    </div>
  );
}
