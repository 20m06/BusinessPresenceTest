import { NextRequest, NextResponse } from "next/server";
import { bumpUsage } from "@/lib/caps";
import { fetchSite } from "@/lib/clients/site";
import { runPagespeed } from "@/lib/clients/psi";
import { getServiceClient } from "@/lib/supabase";
import { evaluateAudit } from "@/lib/scoring/engine";
import {
  normalizePlace,
  normalizePsi,
  normalizeSite,
  type RawPlace,
  type RawPsi,
  type RawSiteFetch,
} from "@/lib/scoring/normalize";
import { analyzeSiteHtml, type SiteSignals } from "@/lib/site-analysis";

// PSI can take 20-30s; keep this route fast-ish but allow for it.
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getServiceClient();

  const { data: audit } = await db
    .from("audits")
    .select("id, status, business_id, raw_places")
    .eq("public_token", token)
    .maybeSingle();
  if (!audit) {
    return NextResponse.json({ error: "not_found", message: "Audit not found." }, { status: 404 });
  }
  // Idempotent: no-op when already complete or currently running.
  if (audit.status === "complete" || audit.status === "running") {
    return NextResponse.json({ status: audit.status });
  }

  await db.from("audits").update({ status: "running" }).eq("id", audit.id);

  try {
    const rawPlace = (audit.raw_places ?? null) as RawPlace | null;
    const websiteUri =
      rawPlace && typeof rawPlace.websiteUri === "string" ? rawPlace.websiteUri : null;

    // Site fetch + PSI (skipped entirely when there is no website).
    let siteFetch: RawSiteFetch | null = null;
    let signals: SiteSignals | null = null;
    let rawPsi: RawPsi | null = null;
    let psiCalls = 0;
    if (websiteUri) {
      const psiPromise = runPagespeed(websiteUri);
      psiCalls = 1;
      siteFetch = await fetchSite(websiteUri);
      if (siteFetch.html) {
        signals = analyzeSiteHtml(siteFetch.html, rawPlace?.nationalPhoneNumber ?? null);
      }
      rawPsi = (await psiPromise) as RawPsi | null;
    }

    const place = normalizePlace(rawPlace);
    const site = normalizeSite(websiteUri, siteFetch, signals);
    const psi = normalizePsi(rawPsi);
    const scores = evaluateAudit({ place, site, psi, manual: {}, now: new Date() });

    const checkRows = scores.checks.map((c) => ({
      audit_id: audit.id,
      dimension: c.dimension,
      check_key: c.checkKey,
      label: c.label,
      raw_value: c.rawValue ?? null,
      normalized_score: c.normalizedScore,
      weight_in_dim: c.weightInDim,
      status: c.status,
      confidence: c.confidence,
      fix_cost_bucket: c.fixCostBucket,
      impact_points: c.impactPoints,
      effort_score: c.effortScore,
      priority_ratio: c.priorityRatio,
      fix_title: c.fixTitle,
      fix_instruction: c.fixInstruction,
    }));
    const { error: checksErr } = await db.from("audit_checks").insert(checkRows);
    if (checksErr) throw new Error(`audit_checks insert failed: ${checksErr.message}`);

    const round = (v: number | null | undefined) =>
      v === null || v === undefined ? null : Math.round(v * 100) / 100;

    const { error: updateErr } = await db
      .from("audits")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        overall_score: round(scores.overall),
        discoverability_score: round(scores.dimensions.discoverability),
        conversion_score: round(scores.dimensions.conversion),
        social_proof_score: round(scores.dimensions.social_proof),
        technical_health_score: round(scores.dimensions.technical_health),
        resilience_score: round(scores.dimensions.resilience),
        automated_coverage_pct: round(scores.automatedCoveragePct),
        has_website: site.hasWebsite,
        website_url_checked: siteFetch?.finalUrl ?? websiteUri,
        review_count: place.reviewCount,
        average_rating: place.rating,
        photo_count: place.photoCount,
        newest_review_at: place.newestReviewAt,
        psi_mobile_performance: psi.performance,
        raw_psi: rawPsi,
        raw_site: siteFetch
          ? {
              ...siteFetch,
              html: siteFetch.html ? siteFetch.html.slice(0, 100_000) : null,
              signals,
            }
          : null,
      })
      .eq("id", audit.id);
    if (updateErr) throw new Error(`audit update failed: ${updateErr.message}`);

    if (psiCalls > 0) await bumpUsage({ psi: psiCalls });

    return NextResponse.json({ status: "complete" });
  } catch (err) {
    console.error("audit process failed:", err);
    await db
      .from("audits")
      .update({
        status: "failed",
        failure_reason: err instanceof Error ? err.message.slice(0, 500) : "unknown",
      })
      .eq("id", audit.id);
    return NextResponse.json(
      { error: "process_failed", message: "The audit hit a problem. Try again in a minute." },
      { status: 500 }
    );
  }
}
