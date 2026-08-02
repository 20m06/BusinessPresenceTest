// All CTA copy lives here — no CTA text hardcoded in components
// (CLAUDE.md §13). NEXT_PUBLIC_OFFER_MODE flips commercial ↔ pro_bono.

export interface OfferService {
  name: string;
  description: string;
}

export interface OfferCopy {
  // Shown when the report has fixes to recommend.
  headline: string;
  lead: string;
  // Shown when everything passes.
  perfectHeadline: string;
  perfectLead: string;
  services: OfferService[];
  buttonLabel: string;
  clubLine: string | null;
  calendlyUrl: string;
}

const SERVICES: OfferService[] = [
  {
    name: "Done-for-you fixes",
    description: "We implement your top fixes for you — you approve, we do the clicking.",
  },
  {
    name: "Review reply drafter",
    description: "Drafted responses to every review, in your business's voice.",
  },
  {
    name: "AI phone agent",
    description:
      "Answers calls when nobody can reach the phone — takes orders and bookings.",
  },
  {
    name: "Competitor benchmark",
    description: "How you rank against similar businesses in your area.",
  },
];

export function getOffers(): OfferCopy {
  const mode = process.env.NEXT_PUBLIC_OFFER_MODE ?? "commercial";
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ??
    "https://calendly.com/michaelkosenko456/30min";

  if (mode === "pro_bono") {
    return {
      headline: "We'll help you fix these — free.",
      lead: "Some improvements are bigger than a checklist. Our student advisors set these up with you:",
      perfectHeadline: "Everything we check looks great.",
      perfectLead:
        "If you want to go further, we can set up automations that take work off your plate:",
      services: SERVICES,
      buttonLabel: "Book time with a student advisor",
      clubLine: "A free service of the student club at Diablo Valley College.",
      calendlyUrl,
    };
  }

  return {
    headline: "Want these fixed for you?",
    lead: "Some improvements are bigger than a checklist. We set these up for businesses like yours:",
    perfectHeadline: "Everything we check looks great.",
    perfectLead:
      "If you want to go further, automations can take work off your plate:",
    services: SERVICES,
    buttonLabel: "Book a free 20-minute review",
    clubLine: null,
    calendlyUrl,
  };
}
