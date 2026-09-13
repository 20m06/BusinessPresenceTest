"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BRAND_SHORT,
  BRAND_SUFFIX,
  NAV_CTA_HREF,
  NAV_CTA_LABEL,
  NAV_LINKS,
} from "@/lib/brand";

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenus = () => setMobileOpen(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `text-sm transition-colors ${
      isActive(href) ? "text-ink font-medium" : "text-muted hover:text-ink"
    }`;

  return (
    <header className="border-b border-rule bg-white">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 min-w-0"
          onClick={closeMenus}
        >
          <Image
            src="/tsi-mark.png"
            alt=""
            width={458}
            height={409}
            priority
            className="h-7 w-auto"
          />
          <span className="font-semibold tracking-[-0.02em] whitespace-nowrap truncate">
            {BRAND_SHORT}
            <span className="hidden sm:inline font-normal text-muted">
              {" "}
              {BRAND_SUFFIX}
            </span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav
          aria-label="Main"
          className="hidden md:flex items-center gap-7 ml-auto"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={linkClass(l.href)}
              onClick={closeMenus}
            >
              {l.label}
            </Link>
          ))}

          <Link
            href={NAV_CTA_HREF}
            className="px-4 py-2.5 bg-accent text-white text-sm font-medium hover:bg-accent/90"
            onClick={closeMenus}
          >
            {NAV_CTA_LABEL}
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden ml-auto p-2 -mr-2 text-muted hover:text-ink"
        >
          <span className="sr-only">
            {mobileOpen ? "Close menu" : "Open menu"}
          </span>
          <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
            {mobileOpen ? (
              <path
                d="M2 1l16 12M18 1L2 13"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ) : (
              <path
                d="M0 1h20M0 7h20M0 13h20"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="md:hidden border-t border-rule"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-5 py-3.5 border-b border-rule text-sm"
              onClick={closeMenus}
            >
              {l.label}
            </Link>
          ))}
          <div className="p-5">
            <Link
              href={NAV_CTA_HREF}
              className="block px-4 py-3 bg-accent text-white text-sm font-medium text-center"
              onClick={closeMenus}
            >
              {NAV_CTA_LABEL}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
