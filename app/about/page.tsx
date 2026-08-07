import Image from "next/image";

import BookingCta from "@/components/booking-cta";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: "About us",
  description: `Who runs ${BRAND_NAME} and why it exists.`,
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-5 pt-14 pb-16">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted">
          About us
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
          Small businesses lose customers to problems nobody told them about
        </h1>

        <div className="mt-10 grid gap-8 sm:grid-cols-[200px_1fr] sm:gap-10 items-start">
          <div>
            <Image
              src="/michael.png"
              alt="Michael Kosenko"
              width={864}
              height={1184}
              className="w-full max-w-[200px] border border-rule"
            />
            <p className="mt-3 font-medium">Michael Kosenko</p>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              Founder, {BRAND_NAME}
            </p>
          </div>

          <div className="space-y-5 leading-relaxed">
            <p>
              Michael Kosenko is a Business Administration student at Diablo
              Valley College and a visiting student at the Haas School of
              Business at UC Berkeley. He previously worked as an analyst
              intern at the Dublin Chamber of Commerce, whose members are
              exactly the businesses this tool was built for: small, local,
              and competing for attention against companies with real
              marketing budgets.
            </p>

            <p>
              {BRAND_NAME} started from a simple observation. Walk down any
              commercial street and you will find businesses that are good at
              what they do and nearly invisible online — hours that were never
              filled in, a Google listing somebody else set up years ago, a
              phone number that goes to a line nobody answers. None of it is
              carelessness. It is that no one ever told the owner these things
              were costing them customers, and the people who do tell them are
              usually selling something expensive.
            </p>

            <p>
              So the first thing we built is free and gives you the answer
              whether or not you ever talk to us. You type in your business
              name, we read your Google listing and your website — public
              information only, nothing is changed or posted — and you get a
              score with the three fixes that would help most this week,
              ranked so the cheap ones come first. Most of them you can do
              yourself in ten minutes. We say so.
            </p>

            <p>
              When a check is a guess rather than a measurement, the report
              marks it as a guess. When something cannot be measured, it is
              left out of your score instead of counted against you. That is
              unusual for this kind of tool, and it is deliberate: a report you
              cannot trust is worse than no report.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-rule pt-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">
            What we are actually doing
          </h2>
          <p className="mt-3 leading-relaxed">
            We re-check every business that asks us to, at 30 days and 90 days,
            and we record what moved. Over time that turns into something few
            people in this industry have: real evidence about which fixes
            change real numbers for a corner business, and which ones just
            sound good. If you let us include your results, they stay
            anonymous, and they help the next owner get better advice than you
            did.
          </p>
        </div>

        <BookingCta line="Want to talk it through with a person? Book a time — there is nothing to buy on the call." />
      </div>
    </main>
  );
}
