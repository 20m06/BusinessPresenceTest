"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Candidate {
  placeId: string;
  name: string;
  address: string;
  primaryType: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string; calendly: boolean }
  | { kind: "empty" }
  | { kind: "results"; candidates: Candidate[] };

function SearchingInner() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get("name") ?? "";
  const city = params.get("city") ?? "";
  const stateAbbr = params.get("state") ?? "";

  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<string | null>(null);

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  useEffect(() => {
    if (!name || !city || !stateAbbr) {
      setState({ kind: "error", message: "Something was missing. Start the search again.", calendly: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, city, state: stateAbbr }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            kind: "error",
            message: data.message ?? "Something went wrong. Try again in a minute.",
            calendly: data.error === "capped",
          });
          return;
        }
        if (!data.candidates || data.candidates.length === 0) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "results", candidates: data.candidates });
        }
      } catch {
        if (!cancelled) {
          setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again.", calendly: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, city, stateAbbr]);

  return (
    <main className="flex-1 flex flex-col">
      <div className="w-full max-w-xl mx-auto px-5 pt-14 sm:pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          Business Visibility Test
        </p>

        {state.kind === "loading" && (
          <div role="status">
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              Looking for your business…
            </h1>
            <p className="mt-3 text-muted">
              Searching Google for “{name}” in {city}, {stateAbbr.toUpperCase()}.
            </p>
          </div>
        )}

        {state.kind === "error" && (
          <div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              That didn't work
            </h1>
            <p className="mt-3 text-muted">{state.message}</p>
            {state.calendly && calendlyUrl && (
              <a
                href={calendlyUrl}
                className="mt-4 inline-block px-6 py-3 bg-ink text-paper font-medium hover:bg-ink/90"
              >
                Book a call
              </a>
            )}
            <p className="mt-6">
              <Link href="/" className="underline underline-offset-4">
                Back to search
              </Link>
            </p>
          </div>
        )}

        {state.kind === "empty" && (
          <div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              We couldn't find it
            </h1>
            <p className="mt-3 text-muted leading-relaxed">
              No Google listing matched “{name}” in {city},{" "}
              {stateAbbr.toUpperCase()}. Check the spelling, or try the name as
              it appears on Google Maps. If your business has no Google listing
              at all, that is itself the first thing to fix.
            </p>
            <p className="mt-6">
              <Link href="/" className="underline underline-offset-4">
                Try again
              </Link>
            </p>
          </div>
        )}

        {state.kind === "results" && (
          <div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              Which one is yours?
            </h1>
            <p className="mt-3 text-muted">Pick your business from the list.</p>

            <ul className="mt-6 border border-rule bg-white divide-y divide-rule">
              {state.candidates.map((c) => (
                <li key={c.placeId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c.placeId);
                      const q = new URLSearchParams({
                        placeId: c.placeId,
                        name: c.name,
                        address: c.address,
                      });
                      router.push(`/audit/new?${q.toString()}`);
                    }}
                    aria-pressed={selected === c.placeId}
                    className={`w-full text-left p-4 hover:bg-paper ${
                      selected === c.placeId ? "bg-paper" : ""
                    }`}
                  >
                    <span className="block font-medium">{c.name}</span>
                    <span className="block mt-1 text-sm text-muted">{c.address}</span>
                    {c.primaryType && (
                      <span className="block mt-1 font-mono text-xs text-muted">
                        {c.primaryType.replaceAll("_", " ")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {selected && (
              <p role="status" className="mt-4 text-sm text-pass">
                Got it — one more step.
              </p>
            )}

            <p className="mt-6 text-sm text-muted">
              Not in the list?{" "}
              <Link href="/" className="underline underline-offset-4">
                Search again
              </Link>{" "}
              with the name exactly as it appears on Google Maps.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchingPage() {
  return (
    <Suspense>
      <SearchingInner />
    </Suspense>
  );
}
