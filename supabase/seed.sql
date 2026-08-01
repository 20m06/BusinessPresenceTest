-- Seed: one test business row so we can verify the tables work.
-- Safe to delete later: delete from businesses where google_place_id = 'TEST_PLACE_001';

insert into businesses (
  google_place_id, name, formatted_address, city, state, postal_code,
  primary_type, types, website_url, phone, is_cohort_member, cohort_notes
) values (
  'TEST_PLACE_001',
  'Test Bakery (not real)',
  '123 Main St, Rochester, NY 14604',
  'Rochester',
  'NY',
  '14604',
  'bakery',
  array['bakery', 'food'],
  'https://example.com',
  '(585) 555-0100',
  false,
  'Seed row created during Phase 2 setup. Delete anytime.'
)
on conflict (google_place_id) do nothing;
