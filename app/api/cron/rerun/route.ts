import { NextRequest, NextResponse } from "next/server";
import { runDueReruns } from "@/lib/rerun";

// Daily at 14:00 UTC via vercel.json. Vercel sends
// Authorization: Bearer <CRON_SECRET> automatically when the env var exists.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runDueReruns();
  return NextResponse.json(summary);
}
