// All CTA copy lives here — no CTA text hardcoded in components
// (CLAUDE.md §13). NEXT_PUBLIC_OFFER_MODE flips commercial ↔ pro_bono.
//
// The same SERVICES array feeds both the report CTA block and the public
// /services pages, so the two can never drift apart. Service bodies are
// written mode-neutrally ("we"); everything that frames them as paid or
// free — headline, lead, button label, club line — flips below.

export interface OfferService {
  slug: string;
  name: string;
  /** One line. Used on the report CTA and the services index cards. */
  description: string;
  /** ~200 words for /services/[slug]. Each string is a paragraph. */
  body: string[];
}

/**
 * The person on the other end of the booking link. Shown on the report CTA
 * so the button is attached to a face rather than to a company noun.
 * Deliberately says nothing about credentials — only what happens on the call.
 */
export interface OfferFounder {
  name: string;
  role: string;
  photo: string;
  pitch: string[];
}

export interface OfferCopy {
  // Shown when the report has fixes to recommend.
  headline: string;
  lead: string;
  // Shown when everything passes.
  perfectHeadline: string;
  perfectLead: string;
  // Standalone /services pages.
  servicesHeadline: string;
  servicesLead: string;
  serviceCtaLine: string;
  founder: OfferFounder;
  services: OfferService[];
  buttonLabel: string;
  clubLine: string | null;
  calendlyUrl: string;
}

const SERVICES: OfferService[] = [
  {
    slug: "done-for-you-fixes",
    name: "Done-for-you fixes",
    description:
      "We implement your top fixes for you — you approve, we do the clicking.",
    body: [
      "Your report tells you what to fix and roughly how long each fix takes. Most owners agree with the list and then never get to it, because the list competes with running the business. This service closes that gap.",
      "You send us the report. We go through the top fixes together on a short call, and you tell us which ones to handle. Then we do the work: hours added for all seven days, holiday hours set, the business category corrected, photos uploaded and captioned, the website link and phone number put back on your Google profile, a tappable phone link added to your site.",
      "You keep control the whole way. We never change anything you have not approved, and we do not take ownership of your accounts — you stay the owner of your Google Business Profile, your domain, and your website login. If you cannot get into one of them, sorting that out is usually the first thing we do, because an account you cannot reach is a bigger problem than any single missing field.",
      "When we are done we re-run the audit so you can see exactly what moved.",
    ],
  },
  {
    slug: "review-reply-drafter",
    name: "Review reply drafter",
    description: "Drafted responses to every review, in your business's voice.",
    body: [
      "Replying to reviews is one of the few things that helps on Google and also changes what a customer thinks when they read your page. A public reply to a bad review is not written for the person who left it. It is written for the next twenty people who read it.",
      "Most owners know this and still do not reply, because writing a calm response to an unfair review at the end of a long day is hard, and because it has to be done again next week.",
      "We draft the replies. First we read through your existing reviews to learn how you actually talk — short or warm, formal or familiar, English only or not. Then you get drafted responses for your backlog, and new drafts as new reviews come in.",
      "Nothing is posted without you. Every draft comes to you to approve, edit, or throw out. You can change a draft and we will remember the change for next time.",
      "We do not write fake reviews and we will not help you get any. That is against Google's rules and it is the fastest way to lose the profile you are trying to build.",
    ],
  },
  {
    slug: "ai-phone-agent",
    name: "AI phone agent",
    description:
      "Answers calls when nobody can reach the phone — takes orders and bookings.",
    body: [
      "For a small shop, the phone rings at the worst possible time. You are with a customer, the line is out the door, the machine is running. The call goes unanswered, and most people who reach a busy signal do not call back — they call the next business on the list.",
      "We set up a phone agent that picks up when you cannot. It answers in a voice you choose, in the languages your customers use. It knows your hours, your address, your parking situation, your prices, and the questions you get asked twenty times a week.",
      "It can take an order or a booking, put it in your existing system, and text the customer a confirmation. When a call needs a real person, it says so and takes a message with a callback number instead of guessing.",
      "You get a written record of every call, so you can see what people are actually asking for. Owners are often surprised by this part — the transcripts tend to show a question the business could answer once on its website and stop fielding forever.",
      "You can turn it off for any hour of the day.",
    ],
  },
  {
    slug: "competitor-benchmark",
    name: "Competitor benchmark",
    description: "How you rank against similar businesses in your area.",
    body: [
      "Your free report scores you against a fixed standard. That answers whether your listing is complete. It does not answer the question owners actually ask, which is whether you are ahead of or behind the shop four blocks away.",
      "This is a different measurement. We pull the businesses in your category and your area that a customer would see next to you in search results, and we compare the numbers that decide who gets chosen: review count, star rating, how recently someone reviewed, photo count, how complete the profile is, and how fast the website loads on a phone.",
      "You get a short document showing where you sit in that group, which specific gaps are costing you the most, and what the realistic target is. If the top business near you has ninety reviews and you have eleven, the useful number is not ninety — it is the number that gets you into consideration, and that is usually much lower than owners expect.",
      "We rerun the benchmark later so you can see whether the gap actually closed. This is deliberately not part of the free report, because a one-time snapshot of your competitors is worth less than watching the distance change.",
    ],
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
      servicesHeadline: "What our student advisors can do for you",
      servicesLead:
        "Everything below is free. Start with the visibility score — it tells us where to begin.",
      serviceCtaLine:
        "Not sure if this is what your business needs? Book a free session and we will look at your score together.",
      founder: {
        name: "Michael Kosenko",
        role: "Founder, Arsenal Consulting",
        photo: "/michael.png",
        pitch: [
          "Hi — I am Michael. I study business at Diablo Valley College and UC Berkeley Haas, and I built this tool. A student advisor reads every report it produces, including yours.",
          "Twenty minutes, over coffee or over video, whichever you prefer. We go through your score together, I tell you which fixes actually matter for a business like yours, and you leave with a short plan you can do yourself.",
          "It is free, and it stays free. Bring your questions about anything on the report.",
        ],
      },
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
    servicesHeadline: "What we do",
    servicesLead:
      "Start with the free visibility score. It tells us — and you — where the real problems are before anyone spends money.",
    serviceCtaLine:
      "Not sure if this is what your business needs? Book a free 20-minute coffee chat and we will look at your score together.",
    founder: {
      name: "Michael Kosenko",
      role: "Founder, Arsenal Consulting",
      photo: "/michael.png",
      pitch: [
        "Hi — I am Michael. I study business at Diablo Valley College and UC Berkeley Haas, and I interned at the Dublin Chamber of Commerce. I built this tool, and I read every report that comes out of it, including yours.",
        "Twenty minutes, over coffee or over video, whichever you prefer. We go through your score together, I tell you which fixes are worth paying anyone to do and which ones you should just do yourself, and you leave with a plan either way.",
        "No slides, no pressure. If the answer is that you do not need us, I will say so.",
      ],
    },
    services: SERVICES,
    buttonLabel: "Book a free 20-minute coffee chat",
    clubLine: null,
    calendlyUrl,
  };
}

export function getService(slug: string): OfferService | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServiceSlugs(): string[] {
  return SERVICES.map((s) => s.slug);
}
