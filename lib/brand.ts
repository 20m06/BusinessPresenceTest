// Brand identity. Single source of truth for the company name and the
// site-wide navigation, so a rename never means hunting through components.

export const BRAND_NAME = "Arsenal Consulting";
export const BRAND_TAGLINE =
  "We find out why customers can't find you — then we fix it.";

export const NAV_CTA_LABEL = "Get your free visibility score";
export const NAV_CTA_HREF = "/";

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/insights", label: "Insights" },
  { href: "/about", label: "About Us" },
];
