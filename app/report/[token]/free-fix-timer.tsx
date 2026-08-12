"use client";

import { useEffect, useState } from "react";

// DEMO ONLY. The countdown restarts at 24:00:00 on every page load, so
// the "next 24 hours" it promises is not a real deadline and the offer
// never actually expires. That is manufactured urgency, and it is here
// because the owner asked for it for a pitch (2026-08-11).
//
// Before this goes in front of real business owners it needs either a
// real deadline — a per-audit expiry stored on the row, so the clock
// means something — or removal. A countdown that resets when you
// refresh is the kind of thing an owner notices once and then distrusts
// the rest of the report over.

const TWENTY_FOUR_HOURS_S = 24 * 60 * 60;

function format(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function FreeFixTimer({ line }: { line: string }) {
  // Starts one second in so the first paint reads 23:59:59 rather than
  // a 24:00:00 that is immediately replaced.
  const [remaining, setRemaining] = useState(TWENTY_FOUR_HOURS_S - 1);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r <= 0 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8 border border-offer bg-offer/5 px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p className="text-sm font-medium text-offer-deep">{line}</p>
      {/* The digits change every second; announcing that to a screen
          reader would talk over everything else on the page. The sentence
          above already carries the meaning. */}
      <span
        aria-hidden="true"
        className="font-mono text-sm font-semibold text-offer-deep tabular-nums"
      >
        {format(remaining)}
      </span>
      <span className="sr-only">Offer runs for the next 24 hours.</span>
    </div>
  );
}
