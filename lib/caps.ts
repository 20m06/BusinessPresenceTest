import "server-only";
import { getServiceClient } from "./supabase";

// Cost + abuse control (CLAUDE.md §12). Checked before ANY paid API call:
// 1. kill switch  2. global daily cap  3. per-IP daily cap.

export type CapCheck =
  | { allowed: true }
  | { allowed: false; reason: "paused" | "daily_cap" | "ip_cap" };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function auditsEnabled(): boolean {
  return process.env.AUDITS_ENABLED === "true";
}

export async function checkCaps(ipHash: string): Promise<CapCheck> {
  if (!auditsEnabled()) return { allowed: false, reason: "paused" };

  const dailyCap = Number(process.env.DAILY_AUDIT_CAP ?? "50");
  const perIpCap = Number(process.env.PER_IP_DAILY_CAP ?? "10");
  const db = getServiceClient();
  const day = todayUtc();

  const [{ data: usage }, { data: ip }] = await Promise.all([
    db.from("usage_counters").select("audits_started").eq("day", day).maybeSingle(),
    db.from("ip_counters").select("count").eq("day", day).eq("ip_hash", ipHash).maybeSingle(),
  ]);

  if ((usage?.audits_started ?? 0) >= dailyCap) {
    return { allowed: false, reason: "daily_cap" };
  }
  if ((ip?.count ?? 0) >= perIpCap) {
    return { allowed: false, reason: "ip_cap" };
  }
  return { allowed: true };
}

// Count one request from this IP (searches count too — a script hammering
// search still burns real Places quota).
export async function bumpIpCounter(ipHash: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.rpc("bump_ip_counter", {
    p_day: todayUtc(),
    p_ip_hash: ipHash,
  });
  if (error) throw new Error(`bump_ip_counter failed: ${error.message}`);
}

export async function bumpUsage(counts: {
  audits?: number;
  places?: number;
  psi?: number;
}): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.rpc("bump_usage_counter", {
    p_day: todayUtc(),
    p_audits: counts.audits ?? 0,
    p_places: counts.places ?? 0,
    p_psi: counts.psi ?? 0,
  });
  if (error) throw new Error(`bump_usage_counter failed: ${error.message}`);
}
