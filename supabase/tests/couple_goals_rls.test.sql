-- File: supabase/tests/couple_goals_rls.test.sql
-- Create: supabase test new couple_goals_rls.test
-- Run:    supabase test db
begin;
select plan(28);

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
    'goal-owner@example.com',
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
    'goal-partner@example.com',
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
    'goal-stranger@example.com',
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
  'GOL234',
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
  not has_table_privilege('anon', 'public.couple_goals', 'select'),
  'anon holds no select grant on couple_goals'
);
select ok(
  not has_table_privilege('anon', 'public.couple_goals', 'insert'),
  'anon holds no insert grant on couple_goals'
);
select ok(
  not has_table_privilege('anon', 'public.couple_goals', 'update'),
  'anon holds no update grant on couple_goals'
);
select ok(
  not has_table_privilege('anon', 'public.couple_goals', 'delete'),
  'anon holds no delete grant on couple_goals'
);
select ok(
  has_table_privilege('authenticated', 'public.couple_goals', 'select'),
  'authenticated can select couple_goals'
);
select ok(
  has_table_privilege('authenticated', 'public.couple_goals', 'insert'),
  'authenticated can insert couple_goals'
);
select ok(
  has_table_privilege('authenticated', 'public.couple_goals', 'update'),
  'authenticated can update couple_goals'
);
select ok(
  not has_table_privilege('authenticated', 'public.couple_goals', 'delete'),
  'authenticated holds no delete grant on couple_goals'
);

set local role anon;
select throws_ok(
  $$select * from public.couple_goals$$,
  '42501',
  null,
  'anon cannot read couple_goals'
);
select throws_ok(
  $$insert into public.couple_goals (
      couple_id, created_by, outcome, status
    ) values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '11111111-1111-1111-1111-111111111111',
      'Book a weekend trip',
      'proposed'
    )$$,
  '42501',
  null,
  'anon cannot insert couple_goals'
);
select throws_ok(
  $$update public.couple_goals set status = 'active'$$,
  '42501',
  null,
  'anon cannot update couple_goals'
);

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$insert into public.couple_goals (
      id, couple_id, created_by, outcome, success_criteria,
      realistic_plan, why, deadline, status
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '11111111-1111-1111-1111-111111111111',
      'Book a weekend trip',
      'Dates booked and paid',
      'Two evenings and a budget',
      'More unhurried time together',
      (current_date + 30),
      'active'
    )
    returning status$$,
  array['proposed'::text],
  'an insert is stored as proposed even if the client sends active'
);

select throws_ok(
  $$update public.couple_goals
      set status = 'active'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'$$,
  'P0001',
  'The other person agrees to this goal',
  'the person who offered cannot accept their own goal'
);

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$select status from public.couple_goals
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'$$,
  array['proposed'::text],
  'the partner sees the offered goal'
);

select throws_ok(
  $$update public.couple_goals
      set outcome = 'Stolen weekend'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'$$,
  'P0001',
  'Only the person who offered can edit it',
  'the partner cannot rewrite a proposed goal'
);

select results_eq(
  $$update public.couple_goals
      set status = 'active'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    returning status, accepted_by$$,
  $$values ('active'::text, '22222222-2222-2222-2222-222222222222'::uuid)$$,
  'the partner accepts the offered goal'
);

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$update public.couple_goals
      set status = 'completed'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    returning status, completion_requested_by$$,
  $$values (
    'active'::text,
    '11111111-1111-1111-1111-111111111111'::uuid
  )$$,
  'the first complete tap stays active and records who asked'
);

select throws_ok(
  $$update public.couple_goals
      set status = 'completed'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'$$,
  'P0001',
  'Waiting for the other person to confirm',
  'the same person cannot confirm their own complete request'
);

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$update public.couple_goals
      set status = 'completed'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    returning status, completed_by$$,
  $$values (
    'completed'::text,
    '22222222-2222-2222-2222-222222222222'::uuid
  )$$,
  'the other person confirms the goal is complete'
);

select ok(
  (
    select completed_at is not null
    from public.couple_goals
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
  ),
  'completed_at is set when both people have confirmed'
);

select throws_ok(
  $$delete from public.couple_goals
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'$$,
  '42501',
  null,
  'authenticated cannot delete couple_goals'
);

select results_eq(
  $$insert into public.couple_goals (
      id, couple_id, created_by, outcome
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '22222222-2222-2222-2222-222222222222',
      'Cook together on Fridays'
    )
    returning status$$,
  array['proposed'::text],
  'the partner can offer a different goal'
);

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$update public.couple_goals
      set status = 'declined'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
    returning status, declined_by$$,
  $$values (
    'declined'::text,
    '11111111-1111-1111-1111-111111111111'::uuid
  )$$,
  'the other person can pass on a proposed goal'
);

select results_eq(
  $$insert into public.couple_goals (
      id, couple_id, created_by, outcome
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '11111111-1111-1111-1111-111111111111',
      'Walk after dinner this month'
    )
    returning created_by$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'the owner can offer another goal'
);

select results_eq(
  $$update public.couple_goals
      set status = 'archived'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'
    returning status, archived_by$$,
  $$values (
    'archived'::text,
    '11111111-1111-1111-1111-111111111111'::uuid
  )$$,
  'the person who offered can withdraw a proposed goal'
);

select results_eq(
  $$update public.couple_goals
      set status = 'archived'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    returning status, archived_by$$,
  $$values (
    'archived'::text,
    '11111111-1111-1111-1111-111111111111'::uuid
  )$$,
  'either person can archive a completed goal'
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
  $$select * from public.couple_goals$$,
  'a stranger reads no couple_goals'
);
select is_empty(
  $$update public.couple_goals set status = 'archived' returning status$$,
  'a stranger updates no couple_goals'
);

select * from finish();
rollback;
