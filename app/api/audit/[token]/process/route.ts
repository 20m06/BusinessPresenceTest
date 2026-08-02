import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { processAuditById } from "@/lib/pipeline";

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
    .select("id, status")
    .eq("public_token", token)
    .maybeSingle();
  if (!audit) {
    return NextResponse.json({ error: "not_found", message: "Audit not found." }, { status: 404 });
  }
  if (audit.status === "complete" || audit.status === "running") {
    return NextResponse.json({ status: audit.status });
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
