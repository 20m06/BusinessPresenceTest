"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BRAND_NAME, NAV_CTA_HREF, NAV_CTA_LABEL } from "@/lib/brand";
import { getOffers } from "@/lib/offers";

export default function SiteHeader() {
  const pathname = usePathname();
  const services = getOffers().services;

  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  // Any navigation closes everything.
  const closeMenus = () => {
    setServicesOpen(false);
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!servicesOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (!servicesRef.current?.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setServicesOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [servicesOpen]);

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
          className="flex items-center gap-2.5 shrink-0"
          onClick={closeMenus}
        >
          <Image
            src="/arsenal-logo.png"
            alt=""
            width={244}
            height={228}
            priority
            className="h-7 w-auto"
          />
          <span className="font-semibold tracking-[-0.02em] whitespace-nowrap">
            {BRAND_NAME}
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav
          aria-label="Main"
          className="hidden md:flex items-center gap-7 ml-auto"
        >
          <Link href="/" className={linkClass("/")} onClick={closeMenus}>
            Home
          </Link>

          <div ref={servicesRef} className="relative">
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => setServicesOpen((v) => !v)}
              className={`${linkClass("/services")} flex items-center gap-1.5`}
            >
              Services
              <svg
                width="9"
                height="6"
                viewBox="0 0 9 6"
                aria-hidden="true"
                className={servicesOpen ? "rotate-180" : ""}
              >
                <path
                  d="M1 1l3.5 3.5L8 1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>

            {servicesOpen && (
              <div className="absolute left-0 top-full mt-3 z-20 w-72 border border-rule bg-white shadow-[0_8px_24px_rgba(20,22,26,0.08)]">
                <Link
                  href="/services"
                  className="block px-4 py-3 border-b border-rule text-sm font-medium hover:bg-accent-tint"
                  onClick={closeMenus}
                >
                  All services
                </Link>
                {services.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    className="block px-4 py-3 border-b border-rule last:border-b-0 hover:bg-accent-tint"
                    onClick={closeMenus}
                  >
                    <span className="block text-sm font-medium">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-muted leading-snug">
                      {s.description}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/insights"
            className={linkClass("/insights")}
            onClick={closeMenus}
          >
            Insights
          </Link>
          <Link
            href="/about"
            className={linkClass("/about")}
            onClick={closeMenus}
          >
            About Us
          </Link>

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
          <Link
            href="/"
            className="block px-5 py-3.5 border-b border-rule text-sm"
            onClick={closeMenus}
          >
            Home
          </Link>
          <Link
            href="/services"
            className="block px-5 pt-3.5 pb-2 text-sm font-medium"
            onClick={closeMenus}
          >
            Services
          </Link>
          <ul className="border-b border-rule pb-2">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="block pl-8 pr-5 py-2 text-sm text-muted"
                  onClick={closeMenus}
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/insights"
            className="block px-5 py-3.5 border-b border-rule text-sm"
            onClick={closeMenus}
          >
            Insights
          </Link>
          <Link
            href="/about"
            className="block px-5 py-3.5 border-b border-rule text-sm"
            onClick={closeMenus}
          >
            About Us
          </Link>
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
