import Link from "next/link";

export const metadata = { title: "Privacy — Business Visibility Test" };

export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Business Visibility Test
        </p>
        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
          Privacy
        </h1>
        <div className="mt-4 space-y-4 leading-relaxed">
          <p>
            <strong>What we collect.</strong> The email address you give us, and
            public information about the business you audit: its Google listing
            and its public website. We never ask for passwords. We do not store
            your IP address — only an anonymized code derived from it, used to
            prevent abuse.
          </p>
          <p>
            <strong>Why.</strong> To show you your report, email you a copy if
            you asked for one, and — only if you checked the box — re-check your
            business at 30 and 90 days and email you what changed.
          </p>
          <p>
            <strong>Research.</strong> If you checked the research box, your
            results may be included in aggregate statistics (for example,
            "businesses that added photos saw X"). Never your name, never your
            email, never anything identifying your business.
          </p>
          <p>
            <strong>Deletion.</strong> Email us and we'll delete your data —
            address below. We don't sell or share your information with anyone.
          </p>
          <p className="font-mono text-sm text-muted">
            Contact: michaelkosenko456@gmail.com
          </p>
        </div>
        <p className="mt-8">
          <Link href="/" className="underline underline-offset-4">
            Back to search
          </Link>
        </p>
      </div>
    </main>
  );
}
