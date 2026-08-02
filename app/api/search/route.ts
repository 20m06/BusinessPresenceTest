import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkCaps, bumpIpCounter, bumpUsage } from "@/lib/caps";
import { clientIpFromHeaders, hashIp } from "@/lib/hash";
import { searchPlacesText } from "@/lib/clients/places";

const searchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().length(2),
});

const CAP_MESSAGE =
  "We've hit today's audit limit. Check back tomorrow, or book a call and we'll run yours manually.";
const PAUSED_MESSAGE = "Audits are paused right now. Please check back later.";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid", message: "Bad request." }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", message: "Enter a business name, city, and state." },
      { status: 400 }
    );
  }

  let ipHash: string;
  let cap: Awaited<ReturnType<typeof checkCaps>>;
  try {
    ipHash = hashIp(clientIpFromHeaders(request.headers));
    cap = await checkCaps(ipHash);
  } catch (err) {
    console.error("search config/caps error:", err);
    return NextResponse.json(
      {
        error: "server_config",
        message: "The search service isn't set up yet. Try again later.",
      },
      { status: 503 }
    );
  }
  if (!cap.allowed) {
    if (cap.reason === "paused") {
      return NextResponse.json({ error: "paused", message: PAUSED_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "capped", message: CAP_MESSAGE }, { status: 429 });
  }

  const { name, city, state } = parsed.data;

  try {
    const candidates = await searchPlacesText(`${name} ${city} ${state.toUpperCase()}`);
    await Promise.all([bumpIpCounter(ipHash), bumpUsage({ places: 1 })]);
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("search failed:", err);
    return NextResponse.json(
      {
        error: "search_failed",
        message: "Something went wrong on our end. Try again in a minute.",
      },
      { status: 502 }
    );
  }
}
