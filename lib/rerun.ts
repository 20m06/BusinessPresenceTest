import "server-only";
import { auditsEnabled, bumpUsage } from "./caps";
import { getPlaceDetails } from "./clients/places";
import { getServiceClient } from "./supabase";
import { newPublicToken } from "./tokens";
import { processAuditById } from "./pipeline";
import { SCORING_CONFIG_VERSION } from "./scoring/config";

// Re-run system (CLAUDE.md §11): scheduled 30/90-day re-audits, at most
// 20 per day, oldest first, never consuming the whole daily budget.

const RERUN_BATCH_LIMIT = 20;
const CONCURRENCY = 4;

export interface RerunSummary {
  due: number;
  processed: number;
  failed: number;
  skippedReason: string | null;
}

async function remainingDailyBudget(): Promise<number> {
  const db = getServiceClient();
  const cap = Number(process.env.DAILY_AUDIT_CAP ?? "50");
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("usage_counters")
    .select("audits_started")
    .eq("day", today)
    .maybeSingle();
  return Math.max(0, cap - (data?.audits_started ?? 0));
}

async function runOne(run: {
  id: string;
  business_id: string;
  contact_id: string | null;
  run_type: string;
  attempts: number;
}): Promise<boolean> {
  const db = getServiceClient();
  try {
    const { data: biz } = await db
      .from("businesses")
      .select("google_place_id")
      .eq("id", run.business_id)
      .single();
    if (!biz) throw new Error("business not found");

    // Fresh Place Details — a re-audit must measure today, not a cache.
    const raw = await getPlaceDetails(biz.google_place_id);
    await bumpUsage({ audits: 1, places: 1 });

    const { data: audit, error: auditErr } = await db
      .from("audits")
      .insert({
        business_id: run.business_id,
        contact_id: run.contact_id,
        public_token: newPublicToken(),
        scoring_config_version: SCORING_CONFIG_VERSION,
        run_type: run.run_type,
        status: "pending",
        raw_places: raw,
      })
      .select("id")
      .single();
    if (auditErr || !audit) throw new Error(`audit insert failed: ${auditErr?.message}`);

    const status = await processAuditById(audit.id);
    if (status !== "complete") throw new Error(`processing ended as ${status}`);

    await db
      .from("scheduled_runs")
      .update({ status: "complete", audit_id: audit.id })
      .eq("id", run.id);
    return true;
  } catch (err) {
    const attempts = run.attempts + 1;
    await db
      .from("scheduled_runs")
      .update({
        attempts,
        last_error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
        status: attempts >= 3 ? "failed" : "pending",
      })
      .eq("id", run.id);
    return false;
  }
}

export async function runDueReruns(): Promise<RerunSummary> {
  if (!auditsEnabled()) {
    return { due: 0, processed: 0, failed: 0, skippedReason: "paused" };
  }
  const db = getServiceClient();
  const budget = await remainingDailyBudget();
  if (budget === 0) {
    return { due: 0, processed: 0, failed: 0, skippedReason: "daily_cap" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: due } = await db
    .from("scheduled_runs")
    .select("id, business_id, contact_id, run_type, attempts")
    .lte("due_on", today)
    .eq("status", "pending")
    .lt("attempts", 3)
    .order("due_on", { ascending: true })
    .limit(Math.min(RERUN_BATCH_LIMIT, budget));

  const runs = due ?? [];
  let processed = 0;
  let failed = 0;
  for (let i = 0; i < runs.length; i += CONCURRENCY) {
    const batch = runs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(runOne));
    for (const ok of results) ok ? processed++ : failed++;
  }
  return { due: runs.length, processed, failed, skippedReason: null };
}

// Manual re-run of one business right now (admin only). Creates a
// 'manual' audit row; never touches the scheduled 30/90 rows.
export async function forceRerun(placeId: string): Promise<{ token: string }> {
  const db = getServiceClient();
  const { data: biz } = await db
    .from("businesses")
    .select("id")
    .eq("google_place_id", placeId)
    .single();
  if (!biz) throw new Error("business not found — audit it normally first");

  const raw = await getPlaceDetails(placeId);
  await bumpUsage({ audits: 1, places: 1 });

  const token = newPublicToken();
  const { data: audit, error } = await db
    .from("audits")
    .insert({
      business_id: biz.id,
      contact_id: null,
      public_token: token,
      scoring_config_version: SCORING_CONFIG_VERSION,
      run_type: "manual",
      status: "pending",
      raw_places: raw,
    })
    .select("id")
    .single();
  if (error || !audit) throw new Error(`audit insert failed: ${error?.message}`);

  const status = await processAuditById(audit.id);
  if (status !== "complete") throw new Error(`processing ended as ${status}`);
  return { token };
}
