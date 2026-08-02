import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { forceRerun, runDueReruns } from "@/lib/rerun";

// Manual trigger, ADMIN_TOKEN auth. Body {} runs all due re-runs;
// body {placeId} forces an immediate 'manual' re-audit of one business.
export const maxDuration = 300;

const bodySchema = z.object({ placeId: z.string().min(1).max(300).optional() });

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_TOKEN;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    if (parsed.data.placeId) {
      const result = await forceRerun(parsed.data.placeId);
      return NextResponse.json(result);
    }
    const summary = await runDueReruns();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: "rerun_failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
