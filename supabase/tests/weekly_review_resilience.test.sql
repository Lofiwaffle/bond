-- File: supabase/tests/weekly_review_resilience.test.sql
-- Create: supabase test new weekly_review_resilience
-- Run:    supabase test db
begin;
select plan(18);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'weekly-owner@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Owner"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'weekly-partner@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Partner"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'weekly-stranger@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Stranger"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into public.couples (id, invite_code, created_by, paired_at)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'WKR234',
  '11111111-1111-1111-1111-111111111111',
  now()
);

update public.profiles
set couple_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

select ok(
  not has_table_privilege('anon', 'public.weekly_ai_summary_prefs', 'select'),
  'anon holds no select grant on weekly_ai_summary_prefs'
);
select ok(
  not has_table_privilege('anon', 'public.weekly_ai_summary_prefs', 'insert'),
  'anon holds no insert grant on weekly_ai_summary_prefs'
);
select ok(
  not has_table_privilege('anon', 'public.weekly_ai_summary_prefs', 'update'),
  'anon holds no update grant on weekly_ai_summary_prefs'
);
select ok(
  has_table_privilege('authenticated', 'public.weekly_ai_summary_prefs', 'select'),
  'authenticated can select weekly_ai_summary_prefs'
);
select ok(
  has_table_privilege('authenticated', 'public.weekly_ai_summary_prefs', 'insert'),
  'authenticated can insert weekly_ai_summary_prefs'
);
select ok(
  has_table_privilege('authenticated', 'public.weekly_ai_summary_prefs', 'update'),
  'authenticated can update weekly_ai_summary_prefs'
);
select ok(
  not has_table_privilege('authenticated', 'public.weekly_ai_summary_prefs', 'delete'),
  'authenticated holds no delete grant on weekly_ai_summary_prefs'
);
select ok(
  not has_table_privilege('authenticated', 'public.weekly_reviews', 'update'),
  'authenticated holds no update grant on weekly_reviews'
);
select ok(
  not has_table_privilege('authenticated', 'public.weekly_reviews', 'delete'),
  'authenticated holds no delete grant on weekly_reviews'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.weekly_ai_summary_prefs (
      user_id, couple_id, week_start, hidden, edited_summary
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '2026-08-16',
      true,
      'Personal overlay'
    )$$,
  'owner can insert personal weekly suggestion prefs'
);

select lives_ok(
  $$update public.weekly_ai_summary_prefs
    set hidden = false
    where user_id = '11111111-1111-1111-1111-111111111111'
      and week_start = '2026-08-16'$$,
  'owner can update personal weekly suggestion prefs'
);

select lives_ok(
  $$insert into public.weekly_reviews (
      couple_id, user_id, week_start, week_end, answers
    ) values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '11111111-1111-1111-1111-111111111111',
      '2026-08-16',
      '2026-08-22',
      '[{"prompt_id":"felt_good","prompt_text":"What felt good this week?","answer":"Walks","skipped":false}]'::jsonb
    )$$,
  'owner can insert a weekly review'
);

select throws_ok(
  $$update public.weekly_reviews set answers = '[]'::jsonb$$,
  '42501',
  null,
  'authenticated cannot update weekly_reviews'
);

reset role;
select throws_ok(
  $$update public.weekly_reviews
    set answers = '[]'::jsonb
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'P0001',
  'Weekly review answers cannot be changed',
  'a trigger rejects changes to weekly review answers'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select is_empty(
  $$select * from public.weekly_ai_summary_prefs$$,
  'partner cannot read the other person''s suggestion prefs'
);

select throws_ok(
  $$insert into public.weekly_ai_summary_prefs (
      user_id, couple_id, week_start, hidden
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '2026-08-09',
      true
    )$$,
  '42501',
  null,
  'partner cannot insert suggestion prefs as the other person'
);

reset role;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is_empty(
  $$select * from public.weekly_ai_summary_prefs$$,
  'stranger cannot read weekly suggestion prefs'
);

select throws_ok(
  $$insert into public.weekly_ai_summary_prefs (
      user_id, couple_id, week_start, hidden
    ) values (
      '33333333-3333-3333-3333-333333333333',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '2026-08-16',
      true
    )$$,
  '42501',
  null,
  'stranger cannot insert weekly suggestion prefs for this couple'
);

select * from finish();
rollback;
