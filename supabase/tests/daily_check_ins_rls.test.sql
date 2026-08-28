-- File: supabase/tests/daily_check_ins_rls.test.sql
-- Create: supabase test new daily_check_ins_rls.test
-- Run:    supabase test db
begin;
select plan(23);

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
    'checkin-owner@example.com',
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
    'checkin-partner@example.com',
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
    'checkin-stranger@example.com',
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
  'ABC234',
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
  not has_table_privilege('anon', 'public.daily_check_ins', 'select'),
  'anon holds no select grant on daily_check_ins'
);
select ok(
  not has_table_privilege('anon', 'public.daily_check_ins', 'insert'),
  'anon holds no insert grant on daily_check_ins'
);
select ok(
  not has_table_privilege('anon', 'public.daily_check_ins', 'update'),
  'anon holds no update grant on daily_check_ins'
);
select ok(
  not has_table_privilege('anon', 'public.daily_check_ins', 'delete'),
  'anon holds no delete grant on daily_check_ins'
);
select ok(
  has_table_privilege('authenticated', 'public.daily_check_ins', 'select'),
  'authenticated can select daily_check_ins'
);
select ok(
  has_table_privilege('authenticated', 'public.daily_check_ins', 'insert'),
  'authenticated can insert daily_check_ins'
);
select ok(
  has_table_privilege('authenticated', 'public.daily_check_ins', 'update'),
  'authenticated can update daily_check_ins'
);
select ok(
  not has_table_privilege('authenticated', 'public.daily_check_ins', 'delete'),
  'authenticated holds no delete grant on daily_check_ins'
);

set local role anon;
select throws_ok(
  $$select * from public.daily_check_ins$$,
  '42501',
  null,
  'anon cannot read daily_check_ins'
);
select throws_ok(
  $$update public.daily_check_ins set score = 1$$,
  '42501',
  null,
  'anon cannot update daily_check_ins'
);
select throws_ok(
  $$delete from public.daily_check_ins$$,
  '42501',
  null,
  'anon cannot delete daily_check_ins'
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
  $$insert into public.daily_check_ins (
      couple_id, user_id, check_in_date, score, note, activities
    )
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '11111111-1111-1111-1111-111111111111',
      current_date,
      4,
      'first take',
      '{}'::text[]
    )
    returning score$$,
  array[4::smallint],
  'the owner creates their own check-in'
);

select results_eq(
  $$update public.daily_check_ins
      set score = 2, note = 'corrected'
    where user_id = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date
    returning score$$,
  array[2::smallint],
  'the owner corrects their check-in while the partner has not submitted'
);

select ok(
  (
    select revised_at is not null
    from public.daily_check_ins
    where user_id = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date
  ),
  'revised_at is set after a correction'
);

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select is_empty(
  $$select score from public.daily_check_ins
    where check_in_date = current_date$$,
  'the partner does not see the owner row before submitting'
);
select is_empty(
  $$update public.daily_check_ins
      set score = 5
    where user_id = '11111111-1111-1111-1111-111111111111'
    returning score$$,
  'the partner cannot update the owner row'
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
  $$update public.daily_check_ins set score = 1 returning score$$,
  'a stranger updates no check-ins'
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
  $$select score from public.daily_check_ins
    where user_id = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date$$,
  array[2::smallint],
  'denied updates left the owner correction intact'
);

select throws_ok(
  $$update public.daily_check_ins
      set user_id = '22222222-2222-2222-2222-222222222222'
    where user_id = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date$$,
  'P0001',
  'Cannot reassign a check-in',
  'the owner cannot reassign the check-in'
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
  $$insert into public.daily_check_ins (
      couple_id, user_id, check_in_date, score, activities
    )
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '22222222-2222-2222-2222-222222222222',
      current_date,
      5,
      '{}'::text[]
    )
    returning score$$,
  array[5::smallint],
  'the partner submits and today opens'
);

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is_empty(
  $$update public.daily_check_ins
      set score = 1, note = 'too late'
    where user_id = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date
    returning score$$,
  'the owner cannot change a check-in after today opens'
);

select results_eq(
  $$select score, note from public.daily_check_ins
    where user_id = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date$$,
  $$values (2::smallint, 'corrected'::text)$$,
  'the original correction is preserved after today opens'
);

select throws_ok(
  $$delete from public.daily_check_ins
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'authenticated cannot delete daily_check_ins'
);

select * from finish();
rollback;
