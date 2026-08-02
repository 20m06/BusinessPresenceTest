-- Migration 0002: atomic counter helpers for cost + abuse control.
-- These make "check cap, then count this call" safe even when two
-- requests arrive at the same moment.

create or replace function bump_usage_counter(
  p_day date,
  p_audits integer,
  p_places integer,
  p_psi integer
)
returns table (audits_started integer, places_calls integer, psi_calls integer)
language sql
security definer
set search_path = public
as $$
  insert into usage_counters as u (day, audits_started, places_calls, psi_calls)
  values (p_day, p_audits, p_places, p_psi)
  on conflict (day) do update set
    audits_started = u.audits_started + excluded.audits_started,
    places_calls   = u.places_calls   + excluded.places_calls,
    psi_calls      = u.psi_calls      + excluded.psi_calls
  returning u.audits_started, u.places_calls, u.psi_calls;
$$;

create or replace function bump_ip_counter(
  p_day date,
  p_ip_hash text
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into ip_counters as i (day, ip_hash, count)
  values (p_day, p_ip_hash, 1)
  on conflict (day, ip_hash) do update set count = i.count + 1
  returning i.count;
$$;

-- Only the server (service role) may call these. Public/anon may not.
revoke execute on function bump_usage_counter(date, integer, integer, integer) from public, anon, authenticated;
revoke execute on function bump_ip_counter(date, text) from public, anon, authenticated;
