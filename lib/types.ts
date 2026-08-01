// Row types mirroring supabase/migrations/0001_init.sql.
// Keep these in sync with the SQL — they are the contract the rest of
// the app codes against.

export type RunType = "initial" | "day_30" | "day_90" | "manual";
export type AuditStatus = "pending" | "running" | "complete" | "failed";
export type CheckStatus =
  | "pass"
  | "warn"
  | "fail"
  | "unavailable"
  | "manual_required";
export type Confidence = "verified" | "inferred" | "manual_required";
export type FixCostBucket = "minutes" | "hours" | "days" | "money";
export type ScheduledRunStatus = "pending" | "complete" | "skipped" | "failed";

export interface Business {
  id: string;
  google_place_id: string;
  name: string;
  formatted_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_type: string | null;
  types: string[] | null;
  website_url: string | null;
  phone: string | null;
  is_cohort_member: boolean;
  cohort_notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  email: string;
  role: "owner" | "staff" | "other" | null;
  consent_email_report: boolean;
  consent_followup: boolean;
  consent_research: boolean;
  ip_hash: string | null;
  created_at: string;
}

export interface Audit {
  id: string;
  business_id: string;
  contact_id: string | null;
  public_token: string;
  scoring_config_version: string;
  run_type: RunType;
  status: AuditStatus;
  failure_reason: string | null;

  overall_score: number | null;
  discoverability_score: number | null;
  conversion_score: number | null;
  social_proof_score: number | null;
  technical_health_score: number | null;
  resilience_score: number | null;
  automated_coverage_pct: number | null;

  has_website: boolean | null;
  website_url_checked: string | null;

  review_count: number | null;
  average_rating: number | null;
  photo_count: number | null;
  newest_review_at: string | null;
  psi_mobile_performance: number | null;

  raw_places: unknown;
  raw_psi: unknown;
  raw_site: unknown;

  created_at: string;
  completed_at: string | null;
}

export interface AuditCheck {
  id: string;
  audit_id: string;
  dimension: string;
  check_key: string;
  label: string;
  raw_value: unknown;
  normalized_score: number | null;
  weight_in_dim: number;
  status: CheckStatus;
  confidence: Confidence;
  fix_cost_bucket: FixCostBucket | null;
  impact_points: number | null;
  effort_score: number | null;
  priority_ratio: number | null;
  fix_title: string | null;
  fix_instruction: string | null;
  created_at: string;
}

export interface ManualResponse {
  id: string;
  audit_id: string;
  question_key: string;
  answer: unknown;
  answered_at: string;
}

export interface ScheduledRun {
  id: string;
  business_id: string;
  contact_id: string | null;
  run_type: "day_30" | "day_90";
  due_on: string;
  status: ScheduledRunStatus;
  audit_id: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface UsageCounter {
  day: string;
  audits_started: number;
  places_calls: number;
  psi_calls: number;
}

export interface IpCounter {
  day: string;
  ip_hash: string;
  count: number;
}
