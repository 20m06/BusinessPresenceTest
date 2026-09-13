import HomeSearchForm from "@/components/home-search-form";
import { getCompletedAuditCount } from "@/lib/stats";

// Re-render at most every 5 minutes. The count moves slowly, so serving a
// cached page keeps this off the database on every visit — and stops the
// number from being frozen at build time the way a fully static page would.
export const revalidate = 300;

export default async function Home() {
  const auditCount = await getCompletedAuditCount();

  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-24 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Public data check
        </p>

        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          Can customers find this business online?
        </h1>

        <p className="mt-3 font-mono text-sm font-semibold text-accent">
          {auditCount.toLocaleString("en-US")}{" "}
          {auditCount === 1 ? "business" : "businesses"} checked so far
        </p>

        <p className="mt-3 text-muted leading-relaxed">
          We read a business&apos;s public Google listing and its website, and
          return a visibility score with the findings that matter most. Public
          information only — nothing is changed, posted, or sold.
        </p>

        <HomeSearchForm />
      </div>
    </main>
  );
}
