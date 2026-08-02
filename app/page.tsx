"use client";

import { useRouter } from "next/navigation";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

export default function Home() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("businessName") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const state = String(form.get("state") ?? "").trim();
    if (!name || !city || !state) return;
    const params = new URLSearchParams({ name, city, state });
    router.push(`/searching?${params.toString()}`);
  }

  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-24 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Business Visibility Test
        </p>

        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          Can customers find your business online?
        </h1>

        <p className="mt-3 text-muted leading-relaxed">
          We check your Google profile and your website. You get a score and
          the three fixes that matter most. Free.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="border border-rule bg-white">
            <div className="p-4 border-b border-rule">
              <label
                htmlFor="business-name"
                className="block font-mono text-xs uppercase tracking-wider text-muted"
              >
                Business name
              </label>
              <input
                id="business-name"
                name="businessName"
                type="text"
                required
                autoComplete="organization"
                placeholder="Sunrise Bakery"
                className="mt-1 w-full bg-transparent text-lg placeholder:text-muted/50 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto]">
              <div className="p-4 border-r border-rule">
                <label
                  htmlFor="city"
                  className="block font-mono text-xs uppercase tracking-wider text-muted"
                >
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  autoComplete="address-level2"
                  placeholder="Rochester"
                  className="mt-1 w-full bg-transparent text-lg placeholder:text-muted/50 focus:outline-none"
                />
              </div>

              <div className="p-4 w-28">
                <label
                  htmlFor="state"
                  className="block font-mono text-xs uppercase tracking-wider text-muted"
                >
                  State
                </label>
                <select
                  id="state"
                  name="state"
                  required
                  defaultValue=""
                  className="mt-1 w-full bg-transparent text-lg focus:outline-none"
                >
                  <option value="" disabled>
                    —
                  </option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 w-full sm:w-auto px-8 py-3 bg-ink text-paper font-medium hover:bg-ink/90"
          >
            Check my business
          </button>

          <p className="mt-3 font-mono text-xs text-muted">
            Takes about a minute. No sign-up.
          </p>
        </form>
      </div>

      <footer className="mt-auto border-t border-rule">
        <div className="max-w-xl mx-auto px-5 py-6">
          <p className="font-mono text-xs text-muted">
            We only read public information — your Google listing and your
            website. Nothing is changed or posted.
          </p>
        </div>
      </footer>
    </main>
  );
}
