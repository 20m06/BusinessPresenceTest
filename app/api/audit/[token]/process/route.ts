import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { processAuditById, STALE_RUNNING_MS } from "@/lib/pipeline";

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
    .select("id, status, created_at")
    .eq("public_token", token)
    .maybeSingle();
  if (!audit) {
    return NextResponse.json({ error: "not_found", message: "Audit not found." }, { status: 404 });
  }
  if (audit.status === "complete") {
    return NextResponse.json({ status: audit.status });
  }
  // A 'running' row normally means another invocation has it. But if the
  // function was killed mid-run (see the PSI timeout budget), nothing is
  // left to finish it and the row would stay 'running' forever — the route
  // used to return early here, so retrying could never rescue it. Past the
  // route's own maxDuration no live invocation can still be working on it,
  // so it is safe to pick up.
  if (audit.status === "running") {
    const ageMs = Date.now() - new Date(audit.created_at).getTime();
    if (ageMs < STALE_RUNNING_MS) {
      return NextResponse.json({ status: audit.status });
    }
  }

  const status = await processAuditById(audit.id);
  if (status === "failed") {
    return NextResponse.json(
      { error: "process_failed", message: "The audit hit a problem. Try again in a minute." },
      { status: 500 }
    );
  }
  return NextResponse.json({ status });
}
