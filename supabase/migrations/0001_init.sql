-- Migration 0001: full v1 schema.
-- All tables get Row Level Security enabled with NO public policies:
-- the browser can never touch these tables. All access is server-side
-- via the service role key, which bypasses RLS.

-- Businesses: one row per unique Google place
create table businesses (
  id                uuid primary key default gen_random_uuid(),
  google_place_id   text unique not null,
  name              text not null,
  formatted_address text,
  city              text,
  state             text,
  postal_code       text,
  latitude          double precision,
  longitude         double precision,
  primary_type      text,
  types             text[],
  website_url       text,
  phone             text,
  is_cohort_member  boolean not null default false,
  cohort_notes      text,
  created_at        timestamptz not null default now()
);

-- Contacts: who requested an audit
create table contacts (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references businesses(id),
  email                 text not null,
  role                  text,             -- 'owner' | 'staff' | 'other' | null
  consent_email_report  boolean not null default true,
  consent_followup      boolean not null default false,
  consent_research      boolean not null default false,
  ip_hash               text,
  created_at            timestamptz not null default now()
);
create index on contacts (business_id);
create index on contacts (email);

-- Audits: IMMUTABLE snapshots. One row per run. Never overwrite.
create table audits (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references businesses(id),
  contact_id              uuid references contacts(id),
  public_token            text unique not null,
  scoring_config_version  text not null,
  run_type                text not null,   -- 'initial'|'day_30'|'day_90'|'manual'
  status                  text not null default 'pending',
                                           -- 'pending'|'running'|'complete'|'failed'
  failure_reason          text,

  overall_score               numeric(5,2),
  discoverability_score       numeric(5,2),
  conversion_score            numeric(5,2),
  social_proof_score          numeric(5,2),
  technical_health_score      numeric(5,2),
  resilience_score            numeric(5,2),
  automated_coverage_pct      numeric(5,2), -- % of total weight scored automatically

  has_website             boolean,
  website_url_checked     text,

  -- Longitudinal tracking fields, denormalized on purpose for easy analysis
  review_count            integer,
  average_rating          numeric(2,1),
  photo_count             integer,
  newest_review_at        timestamptz,
  psi_mobile_performance  integer,

  raw_places              jsonb,
  raw_psi                 jsonb,
  raw_site                jsonb,

  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);
create index on audits (business_id, created_at desc);
create index on audits (status);
create index on audits (run_type);

-- Individual check results
create table audit_checks (
  id                uuid primary key default gen_random_uuid(),
  audit_id          uuid not null references audits(id) on delete cascade,
  dimension         text not null,
  check_key         text not null,
  label             text not null,
  raw_value         jsonb,
  normalized_score  numeric(5,2),      -- 0..100, null when unavailable
  weight_in_dim     numeric(5,4) not null,
  status            text not null,      -- 'pass'|'warn'|'fail'|'unavailable'|'manual_required'
  confidence        text not null,      -- 'verified'|'inferred'|'manual_required'
  fix_cost_bucket   text,               -- 'minutes'|'hours'|'days'|'money'
  impact_points     numeric(6,3),
  effort_score      numeric(6,3),
  priority_ratio    numeric(8,4),
  fix_title         text,
  fix_instruction   text,
  created_at        timestamptz not null default now()
);
create index on audit_checks (audit_id);
create index on audit_checks (check_key);

-- Owner-supplied answers that unlock manual-only checks
create table manual_responses (
  id            uuid primary key default gen_random_uuid(),
  audit_id      uuid not null references audits(id) on delete cascade,
  question_key  text not null,
  answer        jsonb not null,
  answered_at   timestamptz not null default now(),
  unique (audit_id, question_key)
);

-- Scheduled 30/90-day re-runs
create table scheduled_runs (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id),
  contact_id    uuid references contacts(id),
  run_type      text not null,           -- 'day_30' | 'day_90'
  due_on        date not null,
  status        text not null default 'pending',
                                          -- 'pending'|'complete'|'skipped'|'failed'
  audit_id      uuid references audits(id),
  attempts      integer not null default 0,
  last_error    text,
  created_at    timestamptz not null default now()
);
create index on scheduled_runs (due_on, status);

-- Cost + abuse tracking
create table usage_counters (
  day             date primary key,
  audits_started  integer not null default 0,
  places_calls    integer not null default 0,
  psi_calls       integer not null default 0
);

create table ip_counters (
  day       date not null,
  ip_hash   text not null,
  count     integer not null default 0,
  primary key (day, ip_hash)
);

-- Row Level Security: enabled everywhere, zero public policies.
alter table businesses       enable row level security;
alter table contacts         enable row level security;
alter table audits           enable row level security;
alter table audit_checks     enable row level security;
alter table manual_responses enable row level security;
alter table scheduled_runs   enable row level security;
alter table usage_counters   enable row level security;
alter table ip_counters      enable row level security;
