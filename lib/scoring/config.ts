// Scoring configuration — CLAUDE.md §6. Every weight and threshold lives
// HERE and nowhere else. Never change values without bumping the version.

export const SCORING_CONFIG_VERSION = "1.0.1";

// When a business has no website at all, the six Technical Health checks
// are not six separate problems — they are one. This finding replaces them
// at the top of the report; the individual checks still score 0 so the
// dimension math is unchanged (§6.6), but they stop emitting advice that
// is impossible to follow ("turn on HTTPS" for a site that doesn't exist).
export const NO_WEBSITE_FIX = {
  title: "Create your website",
  instruction:
    "Customers who find you on Google have nowhere to go to learn more. Even one page with your services, hours, and phone number would fix this.",
};

export type Dimension =
  | "discoverability"
  | "conversion"
  | "social_proof"
  | "technical_health"
  | "resilience";

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  discoverability: 0.35,
  conversion: 0.25,
  social_proof: 0.2,
  technical_health: 0.15,
  resilience: 0.05,
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  discoverability: "Being found",
  conversion: "Turning visits into customers",
  social_proof: "Reviews and reputation",
  technical_health: "Website health",
  resilience: "Control of your accounts",
};

export type FixCostBucket = "minutes" | "hours" | "days" | "money";

export const EFFORT_SCORES: Record<FixCostBucket, number> = {
  minutes: 1,
  hours: 3,
  days: 8,
  money: 15,
};

export const EFFORT_LABELS: Record<FixCostBucket, string> = {
  minutes: "a few minutes",
  hours: "an afternoon",
  days: "a few days",
  money: "costs money",
};

// Status from score: >= passMin is pass, >= warnMin is warn, below is fail.
export const STATUS_THRESHOLDS = { passMin: 80, warnMin: 40 };

export interface CheckDef {
  dimension: Dimension;
  weight: number; // within dimension; each dimension's weights sum to 1.0
  label: string;
  fixCostBucket: FixCostBucket;
  fixTitle: string;
  fixInstruction: string;
}

export const CHECKS: Record<string, CheckDef> = {
  // ── Discoverability (35%) ──────────────────────────────────────────
  gbp_exists: {
    dimension: "discoverability",
    weight: 0.25,
    label: "Google profile found",
    fixCostBucket: "hours",
    fixTitle: "Create your Google Business Profile",
    fixInstruction:
      "Go to google.com/business and claim your free profile. This is how customers find you on Google Maps.",
  },
  gbp_claimed: {
    dimension: "discoverability",
    weight: 0.15,
    label: "Profile appears claimed",
    fixCostBucket: "hours",
    fixTitle: "Claim your Google Business Profile",
    fixInstruction:
      "Go to google.com/business, search your business, and click Claim. Only the owner can edit hours, photos, and replies.",
  },
  category_specific: {
    dimension: "discoverability",
    weight: 0.15,
    label: "Category is specific",
    fixCostBucket: "minutes",
    fixTitle: "Pick a more specific category",
    fixInstruction:
      "In your Google Business Profile, change your category from a generic one to the most specific match, like \"Dominican restaurant\" instead of \"Restaurant\".",
  },
  hours_present: {
    dimension: "discoverability",
    weight: 0.2,
    label: "Hours listed",
    fixCostBucket: "minutes",
    fixTitle: "Add your opening hours",
    fixInstruction:
      "Add hours for all seven days in your Google Business Profile, including days you're closed.",
  },
  hours_special: {
    dimension: "discoverability",
    weight: 0.05,
    label: "Holiday hours set",
    fixCostBucket: "minutes",
    fixTitle: "Set holiday hours",
    fixInstruction:
      "Add special hours for the next holiday in your Google Business Profile so customers don't show up to a closed door.",
  },
  phone_present: {
    dimension: "discoverability",
    weight: 0.08,
    label: "Phone number listed",
    fixCostBucket: "minutes",
    fixTitle: "Add your phone number",
    fixInstruction: "Add your business phone number to your Google Business Profile.",
  },
  photos_count: {
    dimension: "discoverability",
    weight: 0.12,
    label: "Photos on profile",
    fixCostBucket: "hours",
    fixTitle: "Add photos to your profile",
    fixInstruction:
      "Add photos of your storefront, interior, and what you sell to your Google Business Profile. Aim for 20.",
  },

  // ── Conversion (25%) ───────────────────────────────────────────────
  gbp_website_link: {
    dimension: "conversion",
    weight: 0.15,
    label: "Website linked on profile",
    fixCostBucket: "minutes",
    fixTitle: "Link your website on Google",
    fixInstruction: "Add your website address to your Google Business Profile.",
  },
  tel_link_clickable: {
    dimension: "conversion",
    weight: 0.22,
    label: "Tappable phone number",
    fixCostBucket: "minutes",
    fixTitle: "Make your phone number tappable",
    fixInstruction:
      "Make the phone number on your website a link that starts a call when tapped on a phone.",
  },
  primary_cta_present: {
    dimension: "conversion",
    weight: 0.2,
    label: "Clear next step",
    fixCostBucket: "hours",
    fixTitle: "Add a clear next step",
    fixInstruction:
      "Put one obvious button near the top of your site: order, book, call, or get directions.",
  },
  transaction_path: {
    dimension: "conversion",
    weight: 0.23,
    label: "Way to order or book",
    fixCostBucket: "days",
    fixTitle: "Give customers a way to order or book",
    fixInstruction:
      "Add online ordering or booking — even a link to a service you already use counts.",
  },
  contact_form_present: {
    dimension: "conversion",
    weight: 0.1,
    label: "Contact form exists",
    fixCostBucket: "hours",
    fixTitle: "Add a contact form",
    fixInstruction: "Add a simple form so customers can message you from your website.",
  },
  contact_form_delivers: {
    dimension: "conversion",
    weight: 0.1,
    label: "Form actually delivers",
    fixCostBucket: "minutes",
    fixTitle: "Test your contact form",
    fixInstruction:
      "Send yourself a test message through your own contact form and confirm it arrives.",
  },

  // ── Social Proof (20%) ─────────────────────────────────────────────
  review_count: {
    dimension: "social_proof",
    weight: 0.28,
    label: "Number of reviews",
    fixCostBucket: "hours",
    fixTitle: "Ask happy customers for reviews",
    fixInstruction:
      "Ask your regulars to leave a Google review. A card or QR code by the register works.",
  },
  average_rating: {
    dimension: "social_proof",
    weight: 0.18,
    label: "Star rating",
    fixCostBucket: "days",
    fixTitle: "Work on your rating",
    fixInstruction:
      "Reply to unhappy reviews politely and fix the repeated complaints — the rating follows.",
  },
  review_recency: {
    dimension: "social_proof",
    weight: 0.27,
    label: "Newest review age",
    fixCostBucket: "hours",
    fixTitle: "Get a recent review",
    fixInstruction:
      "Ask a customer this week for a review. Google trusts businesses with fresh reviews.",
  },
  owner_responds: {
    dimension: "social_proof",
    weight: 0.27,
    label: "Owner replies to reviews",
    fixCostBucket: "minutes",
    fixTitle: "Reply to your reviews",
    fixInstruction:
      "Reply to your recent reviews — a short thank-you counts. Customers read the replies.",
  },

  // ── Technical Health (15%) ─────────────────────────────────────────
  site_reachable: {
    dimension: "technical_health",
    weight: 0.18,
    label: "Site loads",
    fixCostBucket: "money",
    fixTitle: "Get your website working",
    fixInstruction:
      "Your website doesn't load. Contact whoever manages it, or your hosting company.",
  },
  https_valid: {
    dimension: "technical_health",
    weight: 0.17,
    label: "Secure connection",
    fixCostBucket: "hours",
    fixTitle: "Turn on the secure padlock",
    fixInstruction:
      "Ask your website host to enable HTTPS. Browsers warn customers away from sites without it. Most hosts do this free.",
  },
  mobile_viewport: {
    dimension: "technical_health",
    weight: 0.15,
    label: "Built for phones",
    fixCostBucket: "days",
    fixTitle: "Make your site work on phones",
    fixInstruction:
      "Your site isn't built for phone screens. Ask whoever manages it to make it mobile-friendly — most of your visitors are on phones.",
  },
  psi_performance: {
    dimension: "technical_health",
    weight: 0.32,
    label: "Mobile load speed",
    fixCostBucket: "days",
    fixTitle: "Speed up your site on phones",
    fixInstruction:
      "Your site loads slowly on phones. Shrinking large photos is the usual quick win.",
  },
  psi_accessibility: {
    dimension: "technical_health",
    weight: 0.1,
    label: "Basic accessibility",
    fixCostBucket: "days",
    fixTitle: "Fix basic accessibility",
    fixInstruction:
      "Fix basic accessibility issues — readable text sizes, labels on buttons, contrast.",
  },
  psi_seo: {
    dimension: "technical_health",
    weight: 0.08,
    label: "Basic on-page SEO",
    fixCostBucket: "hours",
    fixTitle: "Fix basic search settings",
    fixInstruction:
      "Add a page title and description so Google shows your site properly in results.",
  },

  // ── Resilience (5%) — manual only ──────────────────────────────────
  owner_has_gbp_access: {
    dimension: "resilience",
    weight: 0.25,
    label: "You control your Google profile",
    fixCostBucket: "hours",
    fixTitle: "Get access to your Google profile",
    fixInstruction:
      "Recover access to your Google Business Profile — if someone else set it up, request ownership at google.com/business.",
  },
  owner_owns_domain: {
    dimension: "resilience",
    weight: 0.25,
    label: "Your domain is in your name",
    fixCostBucket: "hours",
    fixTitle: "Put your domain in your name",
    fixInstruction:
      "Find out who registered your website address. It should be registered to you or your business — not a designer or an old vendor.",
  },
  owner_has_site_access: {
    dimension: "resilience",
    weight: 0.25,
    label: "You can edit your website",
    fixCostBucket: "hours",
    fixTitle: "Get login access to your website",
    fixInstruction:
      "Get a working login for your website. If only a past developer can edit it, that's a risk to fix now.",
  },
  owner_has_social_access: {
    dimension: "resilience",
    weight: 0.25,
    label: "You control your social accounts",
    fixCostBucket: "minutes",
    fixTitle: "Collect your social passwords",
    fixInstruction:
      "Make sure you personally have the passwords to your business's social accounts, stored somewhere safe.",
  },
};

// Manual questions (Resilience + confirmations) — CLAUDE.md §6.7
export const MANUAL_QUESTIONS: Record<string, string> = {
  owner_has_gbp_access:
    "Can you personally sign in and edit your Google Business Profile?",
  owner_owns_domain:
    "Is your website domain registered in your name or your business's name?",
  owner_has_site_access: "Can you log in to change your website?",
  owner_has_social_access:
    "Do you have the passwords to your business's social accounts?",
};

// Generic primary types that score low on category_specific.
export const GENERIC_TYPES = new Set([
  "establishment",
  "point_of_interest",
  "store",
  "food",
  "restaurant",
  "business",
]);

// Tiered thresholds. Each entry: [minimum value, score].
export const PHOTO_TIERS: Array<[number, number]> = [
  [20, 100],
  [10, 85],
  [5, 60],
  [1, 30],
  [0, 0],
];

export const REVIEW_COUNT_TIERS: Array<[number, number]> = [
  [100, 100],
  [50, 85],
  [25, 70],
  [10, 50],
  [1, 25],
  [0, 0],
];

export const RATING_TIERS: Array<[number, number]> = [
  [4.5, 100],
  [4.0, 80],
  [3.0, 50],
  [0, 20],
];

// [max age in days, score]; anything older (or no reviews) scores 0.
export const RECENCY_TIERS: Array<[number, number]> = [
  [30, 100],
  [90, 80],
  [180, 50],
  [365, 25],
];

// gbp_claimed heuristic (CLAUDE.md §6.8): count of positive signals.
export const CLAIMED_SIGNALS = { likelyClaimedMin: 4, likelyUnclaimedMax: 2 };
export const CLAIMED_SCORES = { likely: 100, indeterminate: 60, unlikely: 15 };

// tel_link_clickable partial credit when the number is plain text only.
export const TEL_PLAIN_TEXT_SCORE = 40;

// hours_present partial credit.
export const HOURS_PARTIAL_SCORE = 50;

// hours_special warn score when a holiday is near and no special hours set.
export const HOURS_SPECIAL_WARN_SCORE = 50;
export const HOLIDAY_WINDOW_DAYS = 60;

// category_specific generic score.
export const CATEGORY_GENERIC_SCORE = 30;

// CTA intent words searched in anchor text and hrefs (CLAUDE.md §6.4).
export const CTA_KEYWORDS = [
  "order",
  "book",
  "reserve",
  "reservation",
  "call",
  "directions",
  "menu",
  "appointment",
  "schedule",
  "get a quote",
  "contact",
];

// Known ordering/booking hosts. kind: aggregator or direct-ish tool.
export const TRANSACTION_HOSTS: Array<{ host: string; kind: "aggregator" | "direct" }> = [
  { host: "doordash.com", kind: "aggregator" },
  { host: "ubereats.com", kind: "aggregator" },
  { host: "grubhub.com", kind: "aggregator" },
  { host: "seamless.com", kind: "aggregator" },
  { host: "postmates.com", kind: "aggregator" },
  { host: "slicelife.com", kind: "aggregator" },
  { host: "chownow.com", kind: "direct" },
  { host: "toasttab.com", kind: "direct" },
  { host: "square.site", kind: "direct" },
  { host: "squareup.com", kind: "direct" },
  { host: "clover.com", kind: "direct" },
  { host: "opentable.com", kind: "aggregator" },
  { host: "resy.com", kind: "aggregator" },
  { host: "calendly.com", kind: "direct" },
  { host: "booksy.com", kind: "direct" },
  { host: "vagaro.com", kind: "direct" },
  { host: "styleseat.com", kind: "direct" },
  { host: "fresha.com", kind: "direct" },
  { host: "schedulicity.com", kind: "direct" },
  { host: "acuityscheduling.com", kind: "direct" },
  { host: "setmore.com", kind: "direct" },
  { host: "shopify.com", kind: "direct" },
];

// Transaction keywords for on-page forms.
export const TRANSACTION_FORM_KEYWORDS = ["order", "book", "reserve", "appointment"];

// Fixed-date US holidays (month is 1-based). Floating ones are computed in code.
export const FIXED_HOLIDAYS: Array<[number, number]> = [
  [1, 1], // New Year's Day
  [7, 4], // Independence Day
  [12, 25], // Christmas
];
