import "server-only";
import { getServiceClient } from "./supabase";
import { EFFORT_LABELS, type FixCostBucket } from "./scoring/config";

// Shared by the report page and the notification email so the two can
// never disagree about what a business's top fixes are.

export interface TopFix {
  checkKey: string;
  title: string;
  instruction: string;
  effort: string;
  dimension: string;
}

export async function getTopFixes(
  auditId: string,
  hasWebsite: boolean | null,
  limit = 3
): Promise<TopFix[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("audit_checks")
    .select("check_key, fix_title, fix_instruction, fix_cost_bucket, dimension, priority_ratio")
    .eq("audit_id", auditId)
    .in("status", ["warn", "fail"])
    .not("priority_ratio", "is", null)
    .order("priority_ratio", { ascending: false })
    .limit(limit);

  const rows = (data ?? []).map((c) => ({
    checkKey: c.check_key as string,
    title: c.fix_title as string,
    instruction: c.fix_instruction as string,
    effort: EFFORT_LABELS[c.fix_cost_bucket as FixCostBucket] ?? (c.fix_cost_bucket as string),
    dimension: c.dimension as string,
  }));

  // No website: that finding leads, whatever its impact-over-effort ratio.
  // Checks that can't emit advice without a site already have a null
  // priority_ratio, so they never reach this list at all.
  if (hasWebsite === false) {
    const lead = rows.find((r) => r.checkKey === "site_reachable");
    if (lead) {
      return [lead, ...rows.filter((r) => r.checkKey !== "site_reachable")].slice(0, limit);
    }
  }
  return rows;
}
