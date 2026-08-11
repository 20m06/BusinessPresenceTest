import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// Full findings for report page two: every check with status, confidence,
// and raw value. Grouped client-side; this just serves the rows.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getServiceClient();

  const { data: audit } = await db
    .from("audits")
    .select("id, status, business_id, created_at")
    .eq("public_token", token)
    .maybeSingle();
  if (!audit) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (audit.status !== "complete") {
    return NextResponse.json({ status: audit.status, checks: [] });
  }

  const [{ data: business }, { data: checks }] = await Promise.all([
    db.from("businesses").select("name, city, state").eq("id", audit.business_id).single(),
    db
      .from("audit_checks")
      .select(
        "dimension, check_key, label, status, confidence, normalized_score, raw_value, weight_in_dim, fix_cost_bucket"
      )
      .eq("audit_id", audit.id)
      .order("weight_in_dim", { ascending: false }),
  ]);

  return NextResponse.json({
    status: "complete",
    business: business ?? null,
    createdAt: audit.created_at,
    checks: checks ?? [],
  });
}
