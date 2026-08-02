import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import type { ManualAnswer } from "@/lib/scoring/inputs";
import type { SiteSignals } from "@/lib/site-analysis";

const MANUAL_KEYS = [
  "owner_has_gbp_access",
  "owner_owns_domain",
  "owner_has_site_access",
  "owner_has_social_access",
  "contact_form_delivers",
] as const;

const manualSchema = z.object({
  answers: z.record(
    z.enum(MANUAL_KEYS),
    z.enum(["yes", "no", "not_sure"])
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid", message: "Bad request." }, { status: 400 });
  }
  const parsed = manualSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data.answers).length === 0) {
    return NextResponse.json(
      { error: "invalid", message: "Answer at least one question." },
      { status: 400 }
    );
  }

  const db = getServiceClient();
  const { data: audit } = await db
    .from("audits")
    .select("id, status, raw_places, raw_psi, raw_site")
    .eq("public_token", token)
    .maybeSingle();
  if (!audit) {
    return NextResponse.json({ error: "not_found", message: "Audit not found." }, { status: 404 });
  }
  if (audit.status !== "complete") {
    return NextResponse.json(
      { error: "not_ready", message: "The audit hasn't finished yet." },
      { status: 409 }
    );
  }

  try {
    // Store the answers (upsert: re-answering overwrites the old answer).
    const rows = Object.entries(parsed.data.answers).map(([key, answer]) => ({
      audit_id: audit.id,
      question_key: key,
      answer: { value: answer },
    }));
    const { error: upsertErr } = await db
      .from("manual_responses")
      .upsert(rows, { onConflict: "audit_id,question_key" });
    if (upsertErr) throw new Error(`manual_responses upsert failed: ${upsertErr.message}`);

    // Load ALL answers for this audit (this call may only add some).
    const { data: allAnswers } = await db
      .from("manual_responses")
      .select("question_key, answer")
      .eq("audit_id", audit.id);
    const manual: Partial<Record<string, ManualAnswer>> = {};
    for (const r of allAnswers ?? []) {
      const v = (r.answer as { value?: string })?.value;
      if (v === "yes" || v === "no" || v === "not_sure") manual[r.question_key] = v;
    }

    // Recompute the full score from the stored raw snapshots.
    const rawPlace = (audit.raw_places ?? null) as RawPlace | null;
    const rawSite = (audit.raw_site ?? null) as
      | (RawSiteFetch & { signals?: SiteSignals | null })
      | null;
    const rawPsi = (audit.raw_psi ?? null) as RawPsi | null;
    const websiteUri =
      rawPlace && typeof rawPlace.websiteUri === "string" ? rawPlace.websiteUri : null;

    const scores = evaluateAudit({
      place: normalizePlace(rawPlace),
      site: normalizeSite(websiteUri, rawSite, rawSite?.signals ?? null),
      psi: normalizePsi(rawPsi),
      manual,
      now: new Date(),
    });

    // Update only the manual checks' rows with their now-known results.
    for (const c of scores.checks) {
      if (!(MANUAL_KEYS as readonly string[]).includes(c.checkKey)) continue;
      if (manual[c.checkKey] === undefined) continue;
      const { error: updErr } = await db
        .from("audit_checks")
        .update({
          raw_value: c.rawValue ?? null,
          normalized_score: c.normalizedScore,
          status: c.status,
          confidence: c.confidence,
          impact_points: c.impactPoints,
          effort_score: c.effortScore,
          priority_ratio: c.priorityRatio,
        })
        .eq("audit_id", audit.id)
        .eq("check_key", c.checkKey);
      if (updErr) throw new Error(`check update failed: ${updErr.message}`);
    }

    const round = (v: number | null | undefined) =>
      v === null || v === undefined ? null : Math.round(v * 100) / 100;
    const { error: auditErr } = await db
      .from("audits")
      .update({
        overall_score: round(scores.overall),
        discoverability_score: round(scores.dimensions.discoverability),
        conversion_score: round(scores.dimensions.conversion),
        social_proof_score: round(scores.dimensions.social_proof),
        technical_health_score: round(scores.dimensions.technical_health),
        resilience_score: round(scores.dimensions.resilience),
        automated_coverage_pct: round(scores.automatedCoveragePct),
      })
      .eq("id", audit.id);
    if (auditErr) throw new Error(`audit score update failed: ${auditErr.message}`);

    return NextResponse.json({
      ok: true,
      overall: round(scores.overall),
      resilience: round(scores.dimensions.resilience),
      coveragePct: round(scores.automatedCoveragePct),
    });
  } catch (err) {
    console.error("manual answers failed:", err);
    return NextResponse.json(
      { error: "manual_failed", message: "Something went wrong saving your answers. Try again." },
      { status: 500 }
    );
  }
}
