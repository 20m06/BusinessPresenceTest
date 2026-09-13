// Brand identity. Single source of truth for the club name and the site-wide
// navigation, so a rename never means hunting through components.

export const BRAND_NAME = "The Storefront Index at DVC";
/** Header lockup: the suffix is rendered smaller and drops on narrow screens. */
export const BRAND_SHORT = "The Storefront Index";
export const BRAND_SUFFIX = "at DVC";

export const BRAND_TAGLINE =
  "How small businesses in the Bay Area appear online.";

export const NAV_CTA_LABEL = "Check a business";
export const NAV_CTA_HREF = "/";

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/insights", label: "Insights" },
  { href: "/about", label: "About" },
];
