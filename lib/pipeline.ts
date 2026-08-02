import "server-only";
import { bumpUsage } from "./caps";
import { fetchSite } from "./clients/site";
import { runPagespeed } from "./clients/psi";
import { getServiceClient } from "./supabase";
import { evaluateAudit } from "./scoring/engine";
import {
  normalizePlace,
  normalizePsi,
  normalizeSite,
  type RawPlace,
  type RawPsi,
  type RawSiteFetch,
} from "./scoring/normalize";
import { analyzeSiteHtml, type SiteSignals } from "./site-analysis";
import { sendAuditNotification } from "./email";
import { getTopFixes } from "./top-fixes";
import { DIMENSION_LABELS, type Dimension } from "./scoring/config";

// The audit processing pipeline, shared by the public process route and
// the cron re-run system. Idempotent per audit row.

export async function processAuditById(auditId: string): Promise<"complete" | "running" | "failed"> {
  const db = getServiceClient();

  const { data: audit } = await db
    .from("audits")
    .select("id, status, business_id, contact_id, run_type, public_token, raw_places")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) throw new Error("audit not found");
  if (audit.status === "complete") return "complete";
  if (audit.status === "running") return "running";

  await db.from("audits").update({ status: "running" }).eq("id", audit.id);

  try {
    const rawPlace = (audit.raw_places ?? null) as RawPlace | null;
    const websiteUri =
      rawPlace && typeof rawPlace.websiteUri === "string" ? rawPlace.websiteUri : null;

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

    // Email notification — never fails the audit.
    await notifyForAudit(audit, scores.overall, site.hasWebsite, {
      discoverability: scores.dimensions.discoverability ?? null,
      conversion: scores.dimensions.conversion ?? null,
      social_proof: scores.dimensions.social_proof ?? null,
      technical_health: scores.dimensions.technical_health ?? null,
      resilience: scores.dimensions.resilience ?? null,
    });

    return "complete";
  } catch (err) {
    console.error("audit process failed:", err);
    await db
      .from("audits")
      .update({
        status: "failed",
        failure_reason: err instanceof Error ? err.message.slice(0, 500) : "unknown",
      })
      .eq("id", audit.id);
    return "failed";
  }
}

async function notifyForAudit(
  audit: {
    id: string;
    business_id: string;
    contact_id: string | null;
    run_type: string;
    public_token: string;
  },
  overall: number | null,
  hasWebsite: boolean,
  dims: Record<Dimension, number | null>
): Promise<void> {
  try {
    const db = getServiceClient();
    const [{ data: business }, { data: contact }, fixes, { data: prev }] =
      await Promise.all([
        db.from("businesses").select("name").eq("id", audit.business_id).single(),
        audit.contact_id
          ? db.from("contacts").select("email").eq("id", audit.contact_id).single()
          : Promise.resolve({ data: null }),
        getTopFixes(audit.id, hasWebsite),
        db
          .from("audits")
          .select("overall_score")
          .eq("business_id", audit.business_id)
          .eq("status", "complete")
          .neq("id", audit.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://business-presence-test.vercel.app";
    await sendAuditNotification({
      businessName: business?.name ?? "(unknown)",
      requesterEmail: (contact as { email?: string } | null)?.email ?? null,
      runType: audit.run_type,
      overall,
      previousOverall:
        audit.run_type === "initial" ? null : (prev?.overall_score ?? null),
      dimensions: (Object.keys(dims) as Dimension[]).map((d) => ({
        label: DIMENSION_LABELS[d],
        score: dims[d],
      })),
      topFixes: fixes.map((f) => ({ title: f.title, effort: f.effort })),
      reportUrl: `${siteUrl}/report/${audit.public_token}`,
    });
  } catch (err) {
    console.error("audit notification failed:", err);
  }
}
