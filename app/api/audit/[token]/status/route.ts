import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { EFFORT_LABELS, type FixCostBucket } from "@/lib/scoring/config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getServiceClient();

  const { data: audit } = await db
    .from("audits")
    .select(
      "id, status, failure_reason, overall_score, discoverability_score, conversion_score, social_proof_score, technical_health_score, resilience_score, automated_coverage_pct, has_website, created_at, business_id"
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

  let topFixes: Array<{
    title: string;
    instruction: string;
    effort: string;
    dimension: string;
  }> = [];
  if (audit.status === "complete") {
    const { data: checks } = await db
      .from("audit_checks")
      .select("fix_title, fix_instruction, fix_cost_bucket, dimension, priority_ratio, status")
      .eq("audit_id", audit.id)
      .in("status", ["warn", "fail"])
      .not("priority_ratio", "is", null)
      .order("priority_ratio", { ascending: false })
      .limit(3);
    topFixes = (checks ?? []).map((c) => ({
      title: c.fix_title,
      instruction: c.fix_instruction,
      effort: EFFORT_LABELS[c.fix_cost_bucket as FixCostBucket] ?? c.fix_cost_bucket,
      dimension: c.dimension,
    }));
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
    topFixes,
  });
}
