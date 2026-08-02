// Extract conversion/technical signals from raw HTML with cheerio.
// Pure: string in, signals out. Never executes page JavaScript.

import * as cheerio from "cheerio";
import {
  CTA_KEYWORDS,
  TRANSACTION_FORM_KEYWORDS,
  TRANSACTION_HOSTS,
} from "./scoring/config";

export interface SiteSignals {
  htmlAvailable: boolean;
  jsRendered: boolean;
  telLinkPresent: boolean;
  phonePlainTextPresent: boolean;
  ctaPresent: boolean;
  transactionPath: {
    found: boolean;
    kind: "aggregator" | "direct" | "form" | null;
    host: string | null;
  };
  contactFormPresent: boolean;
  viewportMetaPresent: boolean;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function analyzeSiteHtml(html: string, placePhone: string | null): SiteSignals {
  const $ = cheerio.load(html);
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const jsRendered = bodyText.length < 200;

  // tel: link anywhere on the page
  const telLinkPresent = $('a[href^="tel:"]').length > 0;

  // Plain-text phone: the profile's number (last 7+ digits) appears in text
  let phonePlainTextPresent = false;
  if (placePhone) {
    const wanted = digitsOnly(placePhone);
    if (wanted.length >= 7) {
      const textDigits = digitsOnly(bodyText);
      phonePlainTextPresent = textDigits.includes(wanted.slice(-10)) ||
        textDigits.includes(wanted.slice(-7));
    }
  }

  // CTA intent in header + first 2000 chars of body (CLAUDE.md §6.4)
  const headerText = $("header").first().text().toLowerCase();
  const headerHrefs = $("header a")
    .map((_, el) => ($(el).attr("href") ?? "").toLowerCase())
    .get()
    .join(" ");
  const earlyBody = bodyText.slice(0, 2000).toLowerCase();
  const earlyAnchors = $("a")
    .slice(0, 40)
    .map((_, el) => (($(el).text() ?? "") + " " + ($(el).attr("href") ?? "")).toLowerCase())
    .get()
    .join(" ");
  const ctaHaystack = `${headerText} ${headerHrefs} ${earlyBody} ${earlyAnchors}`;
  const ctaPresent = CTA_KEYWORDS.some((kw) => ctaHaystack.includes(kw));

  // Transaction path: known ordering/booking host, or a form with intent
  let transactionPath: SiteSignals["transactionPath"] = {
    found: false,
    kind: null,
    host: null,
  };
  const hrefs = $("a[href]")
    .map((_, el) => ($(el).attr("href") ?? "").toLowerCase())
    .get();
  outer: for (const href of hrefs) {
    for (const { host, kind } of TRANSACTION_HOSTS) {
      if (href.includes(host)) {
        transactionPath = { found: true, kind, host };
        break outer;
      }
    }
  }
  if (!transactionPath.found) {
    $("form").each((_, form) => {
      const formText = $(form).text().toLowerCase();
      if (TRANSACTION_FORM_KEYWORDS.some((kw) => formText.includes(kw))) {
        transactionPath = { found: true, kind: "form", host: null };
      }
    });
  }

  // Contact form: a <form> with an email or message-ish field
  let contactFormPresent = false;
  $("form").each((_, form) => {
    const $form = $(form);
    const hasEmail =
      $form.find('input[type="email"]').length > 0 ||
      $form.find('input[name*="email" i], input[id*="email" i]').length > 0;
    const hasMessage =
      $form.find("textarea").length > 0 ||
      $form.find('[name*="message" i], [id*="message" i]').length > 0;
    if (hasEmail || hasMessage) contactFormPresent = true;
  });

  const viewportMetaPresent =
    ($('meta[name="viewport"]').attr("content") ?? "").includes("width=device-width");

  return {
    htmlAvailable: html.trim().length > 0,
    jsRendered,
    telLinkPresent,
    phonePlainTextPresent,
    ctaPresent,
    transactionPath,
    contactFormPresent,
    viewportMetaPresent,
  };
}
