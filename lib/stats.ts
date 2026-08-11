import "server-only";
import { getServiceClient } from "./supabase";

/**
 * Shown on the landing page when the live count can't be read (Supabase
 * down, misconfigured env, network failure). The line always renders a
 * number rather than disappearing or surfacing an error — owner's call.
 *
 * This is a hardcoded stand-in, not a measurement. Anything rendered from
 * it is cached for `revalidate` seconds like any other render, so a brief
 * outage can leave it on screen for a few minutes after Supabase recovers.
 */
export const FALLBACK_AUDIT_COUNT = 36;

/**
 * Count of audits that actually finished and produced a report.
 *
 * Only `status = 'complete'` rows count. Pending, running and failed runs
 * are excluded — an audit that never produced a report is not something to
 * advertise. Repeat audits of the same business each count separately;
 * this is a count of runs, not of businesses.
 *
 * Never throws and never returns null: on any failure it falls back to
 * FALLBACK_AUDIT_COUNT and logs the cause. A broken stats query must not
 * take the landing page down or blank the line.
 */
export async function getCompletedAuditCount(): Promise<number> {
  try {
    const db = getServiceClient();
    const res = await db
      .from("audits")
      .select("id", { count: "exact", head: true })
      .eq("status", "complete");

    // A null count is the failure signal, NOT `error`. With head:true a
    // failing count query doesn't reliably populate error: a missing table
    // returns {count:null, error:null, status:204} and a bad column returns
    // an error whose .message is empty. Log `status` — with head:true there
    // is no response body, so the HTTP status is the only real diagnostic.
    if (res.count === null) {
      console.error(
        `completed audit count lookup failed (HTTP ${res.status}), showing fallback:`,
        res.error ?? "no error body"
      );
      return FALLBACK_AUDIT_COUNT;
    }
    return res.count;
  } catch (err) {
    console.error("completed audit count lookup threw:", err);
    return FALLBACK_AUDIT_COUNT;
  }
}
