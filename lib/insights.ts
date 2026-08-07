// Article content for /insights. Plain data — edit the strings here and the
// pages update. No CMS, no markdown pipeline, nothing to redeploy but this file.

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "note"; text: string };

export interface Article {
  slug: string;
  title: string;
  /** One line, shown on the index and under the title. */
  dek: string;
  /** ISO date. Shown as "Updated {date}". */
  updated: string;
  readingMinutes: number;
  body: Block[];
}

export const ARTICLES: Article[] = [
  {
    slug: "google-holiday-hours",
    title: "How to set holiday hours on Google Maps",
    dek: "Regular hours are not enough. If you close for a holiday and Google does not know, customers arrive at a locked door and leave a one-star review.",
    updated: "2026-08-07",
    readingMinutes: 3,
    body: [
      {
        kind: "p",
        text: "Google keeps two sets of hours for your business. Regular hours are your normal week. Special hours are the exceptions — the days you close early, open late, or do not open at all. Most businesses fill in the first set and never touch the second.",
      },
      {
        kind: "p",
        text: "This matters more than it sounds. When your special hours are blank, Google shows your regular hours on the holiday anyway. Someone drives over on Thanksgiving, finds you closed, and leaves. Worse, Google notices when customers report that your listed hours are wrong, and a profile with disputed hours gets shown less.",
      },
      { kind: "h", text: "Setting them" },
      {
        kind: "steps",
        items: [
          "Search your business name on Google while signed in to the account that manages it. Your profile appears at the top with an edit panel.",
          "Open Edit profile, then Hours.",
          "Under your regular hours, find Special hours or Holiday hours.",
          "Google pre-lists upcoming holidays. For each one, set the hours or mark the day Closed.",
          "Add any date Google did not list — a family event, a remodel week, the day after a long weekend.",
          "Save. The change usually shows within a few minutes.",
        ],
      },
      {
        kind: "note",
        text: "You can also do this in the Google Maps app: your profile picture, then Your Business Profile, then Edit profile, then Hours.",
      },
      { kind: "h", text: "How far ahead to go" },
      {
        kind: "p",
        text: "Set them the moment you know them, and at minimum cover the next three months. Google starts showing a holiday-hours prompt on your listing about a week out, and until you answer it your profile carries a visible \"Hours might differ\" note. That note makes people call to check, and a fair number of them do not call — they pick a business that looks certain.",
      },
      {
        kind: "p",
        text: "The practical version: once a year, sit down with a calendar and enter every closure you already know about. New Year's Day, Easter, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas Eve, Christmas Day. Add the ones specific to you — the week you visit family, the Monday you always take off in summer. Ten minutes once beats fixing it in a panic on the day.",
      },
      { kind: "h", text: "If your hours are wrong right now" },
      {
        kind: "p",
        text: "Check what Google actually shows, not what you remember entering. Search your business on a phone, logged out, and read the hours the way a customer would. If they are wrong, fix them first — no other improvement to your listing matters if people cannot tell when you are open.",
      },
    ],
  },
  {
    slug: "claim-your-google-business-profile",
    title: "Claim your business on Google Maps",
    dek: "Google may have created a listing for you without asking. Until you claim it, you cannot correct anything on it — and someone else can.",
    updated: "2026-08-07",
    readingMinutes: 4,
    body: [
      {
        kind: "p",
        text: "Google builds business listings from public information: phone directories, other websites, customer submissions. So a listing for your business probably already exists, whether or not you made it. If nobody has claimed it, the hours, phone number, and category on it are whatever Google guessed or a stranger suggested.",
      },
      {
        kind: "p",
        text: "Claiming is how you prove the business is yours. It costs nothing. Until you do it, you cannot edit your own hours, reply to reviews, add photos, or stop someone else from suggesting changes that get accepted automatically.",
      },
      { kind: "h", text: "Check whether it is claimed" },
      {
        kind: "p",
        text: "Search your business name and city on Google. If the listing shows a link reading \"Own this business?\" or \"Claim this business,\" it is unclaimed. If you see an edit panel instead, someone has claimed it — hopefully you.",
      },
      { kind: "h", text: "Claiming it" },
      {
        kind: "steps",
        items: [
          "Use a Google account you will keep and control. Not an employee's personal account, not one shared with a former partner, not an address you cannot get into.",
          "Click Claim this business on the listing, or go to google.com/business and search for it there.",
          "If your business is not listed at all, choose to add it and enter the name, category, address, and phone number exactly as they appear on your storefront and receipts.",
          "Pick a verification method. Google may offer a video recording, a phone call, a text, an email, or a mailed postcard. You do not always get a choice.",
          "Complete verification. Postcards take up to two weeks. Video verification is usually faster: you record one continuous clip showing your storefront and sign, the inside, and something proving you are the manager — keys, a supply room, the point-of-sale terminal.",
          "Once verified, fill in hours, photos, website, and services immediately.",
        ],
      },
      { kind: "h", text: "If someone else already claimed it" },
      {
        kind: "p",
        text: "This happens more than you would think — a marketing company you hired years ago, a former business partner, a landlord, a relative who set it up as a favor. Google has a request-access process. Click the claim link, and Google emails the current owner. If they do not respond within a few days, you can appeal and prove ownership with a utility bill, a lease, or a business licence.",
      },
      {
        kind: "note",
        text: "Whoever holds the account holds the reviews. If you cannot personally sign in and edit your profile today, treat that as urgent — it is the single most common serious problem we find.",
      },
      {
        kind: "p",
        text: "Once you have it, add yourself as the Primary owner and add one trusted second person as a Manager. If you lose access to your own account, that second person can restore you without a two-week appeal.",
      },
    ],
  },
  {
    slug: "how-search-optimization-works",
    title: "How search optimization works: a plain guide",
    dek: "SEO for a local business is not a trick. It is four things, and three of them have nothing to do with your website.",
    updated: "2026-08-07",
    readingMinutes: 4,
    body: [
      {
        kind: "p",
        text: "Search optimization has a reputation for being mysterious, mostly because people sell it that way. For a business with a physical location, it is not mysterious. Google is trying to answer one question — which nearby business best matches what this person just typed — and it uses a short list of signals to decide.",
      },
      { kind: "h", text: "1. Relevance: does your listing say what you do" },
      {
        kind: "p",
        text: "Google matches searches against your business category, your name, and the services you list. A category of \"Restaurant\" competes with every restaurant. A category of \"Salvadoran restaurant\" wins the searches that actually convert. Pick the most specific primary category that is true, add secondary ones, and list your services and menu items in plain words customers use.",
      },
      { kind: "h", text: "2. Distance: how close you are" },
      {
        kind: "p",
        text: "You cannot change this one, and you should be suspicious of anyone who says they can. What you can change is whether your address and service area are correct, so Google places you where you actually are.",
      },
      { kind: "h", text: "3. Prominence: how established you look" },
      {
        kind: "p",
        text: "This is where most of the movement is. Prominence is built from review count, review recency, rating, photos, how complete your profile is, and how often your name and address appear consistently on other websites. Fifty reviews with the newest from last week beats two hundred reviews that stopped three years ago. A profile with thirty photos beats one with two.",
      },
      {
        kind: "p",
        text: "Consistency matters here in a way that feels petty but is not. If your address is written \"Suite 4\" in one place and \"#4\" in another, and your old phone number is still on three directory sites, Google is less confident these are all the same business — and less confidence means less prominence.",
      },
      { kind: "h", text: "4. The website, last" },
      {
        kind: "p",
        text: "Your site should load fast on a phone, have your name, address, and phone number in text rather than inside an image, use a page title that says what you do and where, and be reachable over HTTPS. That is most of it. For a corner business, the website is a supporting document — the listing does the work.",
      },
      { kind: "h", text: "What this means in practice" },
      {
        kind: "p",
        text: "Do the cheap things first: fix your category, fill in every field, add photos, ask recent customers for reviews, reply to the reviews you have. Those move prominence within weeks. Rebuilding your website is expensive, slow, and further down the list than almost anyone selling it will admit.",
      },
      {
        kind: "note",
        text: "Nobody can guarantee a first-place ranking, and any company that guarantees one is either lying or planning to rank you for a search term nobody types.",
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function formatArticleDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
