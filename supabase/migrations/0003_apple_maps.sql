-- Migration 0003: Apple Maps presence (scoring config 2.0.0).
--
-- Only the verdict is stored, never Apple's raw response: Apple's license
-- terms govern retention of returned map data, and a boolean plus the
-- matched name is all the scoring and the longitudinal analysis need.

alter table audits
  add column if not exists apple_listing_found boolean,
  add column if not exists apple_matched_name  text;
