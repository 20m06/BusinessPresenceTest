import "server-only";
import { getServiceClient } from "./supabase";
import { EFFORT_LABELS, type FixCostBucket } from "./scoring/config";
import { selectTopFixes } from "./scoring/select-fixes";

// Shared by the report page and the notification email so the two can
// never disagree about what a business's top fixes are. The choosing is
// in scoring/select-fixes.ts; this module only fetches and shapes.

export interface TopFix {
  checkKey: string;
  title: string;
  instruction: string;
  effort: string;
  dimension: string;
}

interface Candidate extends TopFix {
  impactPoints: number;
}

// Pull well past `limit` so the selection passes have room to work.
const CANDIDATE_POOL = 24;

export async function getTopFixes(
  auditId: string,
  hasWebsite: boolean | null,
  limit = 3
): Promise<TopFix[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("audit_checks")
    .select(
      "check_key, fix_title, fix_instruction, fix_cost_bucket, dimension, priority_ratio, impact_points"
    )
    .eq("audit_id", auditId)
    .in("status", ["warn", "fail"])
    .not("priority_ratio", "is", null)
    .order("priority_ratio", { ascending: false })
    .limit(CANDIDATE_POOL);

  const ranked: Candidate[] = (data ?? []).map((c) => ({
    checkKey: c.check_key as string,
    title: c.fix_title as string,
    instruction: c.fix_instruction as string,
    effort:
      EFFORT_LABELS[c.fix_cost_bucket as FixCostBucket] ??
      (c.fix_cost_bucket as string),
    dimension: c.dimension as string,
    impactPoints: Number(c.impact_points ?? 0),
  }));

  return selectTopFixes(ranked, limit, hasWebsite).map(
    ({ impactPoints: _impact, ...fix }) => fix
  );
}
