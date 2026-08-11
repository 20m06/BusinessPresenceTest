-- Migration 0004: AI assistant visibility (scoring config 3.0.0).
--
-- Denormalized onto audits for the same reason review_count and
-- psi_mobile_performance are: the 30/90-day analysis needs to plot these
-- without unpacking audit_checks row by row.
--
-- raw_llm keeps the full probe — both prompts, both answers, the cited
-- URLs, the model id. An LLM answer is not reproducible after the fact,
-- so if it isn't stored at the moment it was asked it is gone.

alter table audits
  add column if not exists llm_recommended     boolean,
  add column if not exists llm_knows_business  boolean,
  add column if not exists llm_phone_matches   boolean,
  add column if not exists llm_model           text,
  add column if not exists raw_llm             jsonb;

-- Web search bills per search on top of tokens, so it needs its own
-- counter and its own cap rather than riding on the audit count.
alter table usage_counters
  add column if not exists llm_probes   integer not null default 0,
  add column if not exists llm_searches integer not null default 0;

-- Replaces the 0002 version; same behaviour plus the two LLM columns.
create or replace function bump_usage_counter(
  p_day date,
  p_audits integer,
  p_places integer,
  p_psi integer,
  p_llm_probes integer default 0,
  p_llm_searches integer default 0
)
returns table (
  audits_started integer,
  places_calls integer,
  psi_calls integer,
  llm_probes integer,
  llm_searches integer
)
language sql
security definer
set search_path = public
as $$
  insert into usage_counters as u (
    day, audits_started, places_calls, psi_calls, llm_probes, llm_searches
  )
  values (p_day, p_audits, p_places, p_psi, p_llm_probes, p_llm_searches)
  on conflict (day) do update set
    audits_started = u.audits_started + excluded.audits_started,
    places_calls   = u.places_calls   + excluded.places_calls,
    psi_calls      = u.psi_calls      + excluded.psi_calls,
    llm_probes     = u.llm_probes     + excluded.llm_probes,
    llm_searches   = u.llm_searches   + excluded.llm_searches
  returning u.audits_started, u.places_calls, u.psi_calls, u.llm_probes, u.llm_searches;
$$;

revoke execute on function bump_usage_counter(date, integer, integer, integer, integer, integer)
  from public, anon, authenticated;

-- The 4-argument overload from 0002 would still resolve for calls that
-- omit the new defaults, leaving two functions that can both match.
drop function if exists bump_usage_counter(date, integer, integer, integer);
