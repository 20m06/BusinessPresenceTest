import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bumpIpCounter, bumpUsage, checkCaps } from "@/lib/caps";
import { clientIpFromHeaders, hashIp } from "@/lib/hash";
import { getPlaceDetails } from "@/lib/clients/places";
import { getServiceClient } from "@/lib/supabase";
import { newPublicToken } from "@/lib/tokens";
import { SCORING_CONFIG_VERSION } from "@/lib/scoring/config";

const startSchema = z.object({
  placeId: z.string().min(1).max(300),
  email: z.string().email().max(200),
  role: z.enum(["owner", "staff", "other"]).nullable().optional(),
  consentEmailReport: z.boolean(),
  consentFollowup: z.boolean(),
  consentResearch: z.boolean(),
});

const CAP_MESSAGE =
  "We've hit today's audit limit. Check back tomorrow, or book a call and we'll run yours manually.";

interface RawPlaceDetails {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: Array<{ types?: string[]; shortText?: string; longText?: string }>;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

function addressPart(raw: RawPlaceDetails, type: string): string | null {
  const c = (raw.addressComponents ?? []).find((c) => (c.types ?? []).includes(type));
  return c?.shortText ?? c?.longText ?? null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid", message: "Bad request." }, { status: 400 });
  }
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", message: "Check your email address and try again." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  try {
    const ipHash = hashIp(clientIpFromHeaders(request.headers));
    const cap = await checkCaps(ipHash);
    if (!cap.allowed) {
      const message =
        cap.reason === "paused"
          ? "Audits are paused right now. Please check back later."
          : CAP_MESSAGE;
      return NextResponse.json(
        { error: cap.reason === "paused" ? "paused" : "capped", message },
        { status: cap.reason === "paused" ? 503 : 429 }
      );
    }

    const db = getServiceClient();

    // 24h Place Details cache keyed by place_id (CLAUDE.md §12): reuse the
    // raw payload from a recent audit of the same business.
    let raw: RawPlaceDetails | null = null;
    let placesCalls = 0;
    const { data: existingBiz } = await db
      .from("businesses")
      .select("id")
      .eq("google_place_id", input.placeId)
      .maybeSingle();
    if (existingBiz) {
      const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: recent } = await db
        .from("audits")
        .select("raw_places")
        .eq("business_id", existingBiz.id)
        .gte("created_at", dayAgo)
        .not("raw_places", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.raw_places) raw = recent.raw_places as RawPlaceDetails;
    }
    if (!raw) {
      raw = (await getPlaceDetails(input.placeId)) as RawPlaceDetails;
      placesCalls = 1;
    }

    // Upsert the business.
    const bizRow = {
      google_place_id: input.placeId,
      name: raw.displayName?.text ?? "(unnamed)",
      formatted_address: raw.formattedAddress ?? null,
      city: addressPart(raw, "locality") ?? addressPart(raw, "sublocality") ?? null,
      state: addressPart(raw, "administrative_area_level_1"),
      postal_code: addressPart(raw, "postal_code"),
      latitude: raw.location?.latitude ?? null,
      longitude: raw.location?.longitude ?? null,
      primary_type: raw.primaryType ?? null,
      types: raw.types ?? null,
      website_url: raw.websiteUri ?? null,
      phone: raw.nationalPhoneNumber ?? null,
    };
    const { data: biz, error: bizErr } = await db
      .from("businesses")
      .upsert(bizRow, { onConflict: "google_place_id" })
      .select("id")
      .single();
    if (bizErr || !biz) throw new Error(`business upsert failed: ${bizErr?.message}`);

    const { data: contact, error: contactErr } = await db
      .from("contacts")
      .insert({
        business_id: biz.id,
        email: input.email,
        role: input.role ?? null,
        consent_email_report: input.consentEmailReport,
        consent_followup: input.consentFollowup,
        consent_research: input.consentResearch,
        ip_hash: ipHash,
      })
      .select("id")
      .single();
    if (contactErr || !contact) throw new Error(`contact insert failed: ${contactErr?.message}`);

    const token = newPublicToken();
    const { data: audit, error: auditErr } = await db
      .from("audits")
      .insert({
        business_id: biz.id,
        contact_id: contact.id,
        public_token: token,
        scoring_config_version: SCORING_CONFIG_VERSION,
        run_type: "initial",
        status: "pending",
        raw_places: raw,
      })
      .select("id")
      .single();
    if (auditErr || !audit) throw new Error(`audit insert failed: ${auditErr?.message}`);

    // Schedule day-30 / day-90 re-runs.
    const due = (days: number) =>
      new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
    await db.from("scheduled_runs").insert([
      { business_id: biz.id, contact_id: contact.id, run_type: "day_30", due_on: due(30) },
      { business_id: biz.id, contact_id: contact.id, run_type: "day_90", due_on: due(90) },
    ]);

    await Promise.all([
      bumpIpCounter(ipHash),
      bumpUsage({ audits: 1, places: placesCalls }),
    ]);

    return NextResponse.json({ token });
  } catch (err) {
    console.error("audit start failed:", err);
    return NextResponse.json(
      { error: "start_failed", message: "Something went wrong starting the audit. Try again." },
      { status: 500 }
    );
  }
}
