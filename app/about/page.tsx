import ContactCta from "@/components/contact-cta";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: "About",
  description: `What ${BRAND_NAME} studies, and why.`,
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-5 pt-14 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          About
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          A student club measuring how small businesses appear online
        </h1>

        <div className="mt-8 space-y-5 leading-relaxed">
          <p>
            {BRAND_NAME} is a student club at Diablo Valley College. We study
            how small businesses across the San Francisco Bay Area appear in
            public digital infrastructure — search visibility, listing
            accuracy, and whether their websites function — using only
            publicly available information. Our initial research focus is
            Contra Costa County, and the scope expands as membership allows.
          </p>

          <p>
            Each semester the club publishes a regional report so city
            governments, chambers of commerce, and economic development offices
            can see where the gaps are. The report is the point. It is a
            measurement of something that is rarely measured at all: walk down
            any commercial street and you will find businesses that are good at
            what they do and nearly invisible online — hours that were never
            filled in, a listing somebody else set up years ago, a website that
            no longer loads on a phone.
          </p>

          <p>
            The work is closer to civic research than to commerce. Members
            learn how public data is collected and verified, how research
            findings are written for a government audience, and how local
            economic development functions.
          </p>
        </div>

        <div className="mt-12 border-t border-rule pt-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">
            How we work
          </h2>
          <ul className="mt-4 space-y-3 leading-relaxed">
            <li>
              <strong>Public information only.</strong> We read what anyone can
              read: a business&apos;s public listing and its public website. We
              never ask for passwords, never sign in to anything, and never take
              ownership of a listing, a domain, or a site.
            </li>
            <li>
              <strong>Nothing is sold.</strong> No business is charged, nothing
              is pitched, and the club recommends no vendor or service
              provider.
            </li>
            <li>
              <strong>Businesses opt in.</strong> Cities and business groups
              receive aggregate findings. An individual business gets its own
              results only if it asks for them.
            </li>
            <li>
              <strong>Honest measurement.</strong> When a check is a guess
              rather than a measurement, the report marks it as a guess. When
              something cannot be measured, it is left out of the score instead
              of counted against the business.
            </li>
          </ul>
        </div>

        <ContactCta line="Run a business and want to see your own results, or have them removed from our records? Email the club." />
      </div>
    </main>
  );
}
