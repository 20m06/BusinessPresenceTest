import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getTopFixes, type TopFix } from "@/lib/top-fixes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getServiceClient();

  const { data: audit } = await db
    .from("audits")
    .select(
      "id, status, failure_reason, overall_score, discoverability_score, conversion_score, social_proof_score, technical_health_score, resilience_score, automated_coverage_pct, has_website, created_at, business_id, llm_recommended, llm_knows_business, llm_phone_matches"
    )
    .eq("public_token", token)
    .maybeSingle();
  if (!audit) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: business } = await db
    .from("businesses")
    .select("name, city, state")
    .eq("id", audit.business_id)
    .single();

  let topFixes: TopFix[] = [];
  if (audit.status === "complete") {
    topFixes = await getTopFixes(audit.id, audit.has_website);
  }

  return NextResponse.json({
    status: audit.status,
    failureReason: audit.failure_reason,
    business: business ?? null,
    createdAt: audit.created_at,
    scores:
      audit.status === "complete"
        ? {
            overall: audit.overall_score,
            discoverability: audit.discoverability_score,
            conversion: audit.conversion_score,
            socialProof: audit.social_proof_score,
            technicalHealth: audit.technical_health_score,
            resilience: audit.resilience_score,
            coveragePct: audit.automated_coverage_pct,
            hasWebsite: audit.has_website,
          }
        : null,
    // Kept out of topFixes on purpose (HEADLINE_EXCLUDED_CHECKS) — the
    // report gives it its own callout instead. null means we didn't ask.
    llm:
      audit.status === "complete" && audit.llm_knows_business !== null
        ? {
            recommended: audit.llm_recommended,
            knowsBusiness: audit.llm_knows_business,
            phoneMatches: audit.llm_phone_matches,
          }
        : null,
    topFixes,
  });
}
