-- File: supabase/tests/daily_actions_rls.test.sql
-- Create: supabase test new daily_actions_rls.test
-- Run:    supabase test db
begin;
select plan(25);

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
    'action-owner@example.com',
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
    'action-partner@example.com',
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
    'action-stranger@example.com',
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
  'ACT234',
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
  not has_table_privilege('anon', 'public.daily_actions', 'select'),
  'anon holds no select grant on daily_actions'
);
select ok(
  not has_table_privilege('anon', 'public.daily_actions', 'insert'),
  'anon holds no insert grant on daily_actions'
);
select ok(
  not has_table_privilege('anon', 'public.daily_actions', 'update'),
  'anon holds no update grant on daily_actions'
);
select ok(
  not has_table_privilege('anon', 'public.daily_actions', 'delete'),
  'anon holds no delete grant on daily_actions'
);
select ok(
  has_table_privilege('authenticated', 'public.daily_actions', 'select'),
  'authenticated can select daily_actions'
);
select ok(
  has_table_privilege('authenticated', 'public.daily_actions', 'insert'),
  'authenticated can insert daily_actions'
);
select ok(
  has_table_privilege('authenticated', 'public.daily_actions', 'update'),
  'authenticated can update daily_actions'
);
select ok(
  not has_table_privilege('authenticated', 'public.daily_actions', 'delete'),
  'authenticated holds no delete grant on daily_actions'
);

set local role anon;
select throws_ok(
  $$select * from public.daily_actions$$,
  '42501',
  null,
  'anon cannot read daily_actions'
);
select throws_ok(
  $$insert into public.daily_actions (
      couple_id, check_in_date, proposed_by, kind, text
    ) values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      current_date,
      '11111111-1111-1111-1111-111111111111',
      'plan',
      'anon offer'
    )$$,
  '42501',
  null,
  'anon cannot insert daily_actions'
);
select throws_ok(
  $$update public.daily_actions set text = 'anon'$$,
  '42501',
  null,
  'anon cannot update daily_actions'
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
  $$insert into public.daily_actions (
      couple_id, check_in_date, proposed_by, kind, text
    ) values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      current_date,
      '11111111-1111-1111-1111-111111111111',
      'appreciate',
      'Thank you for making tea'
    )
    returning text$$,
  array['Thank you for making tea'::text],
  'the owner offers a small action'
);

select results_eq(
  $$update public.daily_actions
      set text = 'Thank you for the quiet evening'
    where proposed_by = '11111111-1111-1111-1111-111111111111'
      and check_in_date = current_date
    returning text$$,
  array['Thank you for the quiet evening'::text],
  'the owner can edit the offer while it is still proposed'
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
  $$select text from public.daily_actions where check_in_date = current_date$$,
  array['Thank you for the quiet evening'::text],
  'the partner sees the offered action, not a private device note'
);

select throws_ok(
  $$update public.daily_actions
      set text = 'stolen'
    where check_in_date = current_date$$,
  'P0001',
  'Only the person who offered can edit it',
  'the partner cannot rewrite the offer'
);

select results_eq(
  $$update public.daily_actions
      set status = 'accepted'
    where check_in_date = current_date
    returning status$$,
  array['accepted'::text],
  'the partner accepts the small action'
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
  $$select * from public.daily_actions$$,
  'a stranger reads no daily_actions'
);
select is_empty(
  $$update public.daily_actions set status = 'completed' returning status$$,
  'a stranger updates no daily_actions'
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
  $$select text from public.daily_actions where check_in_date = current_date$$,
  array['Thank you for the quiet evening'::text],
  'denied rewrites left the accepted offer intact'
);

select results_eq(
  $$update public.daily_actions
      set status = 'completed'
    where check_in_date = current_date
    returning status$$,
  array['completed'::text],
  'either person can complete an accepted action'
);

select ok(
  (
    select completed_at is not null
    from public.daily_actions
    where check_in_date = current_date
  ),
  'completed_at is set when the action is done'
);

select throws_ok(
  $$delete from public.daily_actions where check_in_date = current_date$$,
  '42501',
  null,
  'authenticated cannot delete daily_actions'
);

select throws_ok(
  $$insert into public.daily_actions (
      couple_id, check_in_date, proposed_by, kind, text
    ) values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      current_date,
      '11111111-1111-1111-1111-111111111111',
      'plan',
      'A second offer today'
    )$$,
  '23505',
  null,
  'only one small action per couple per day'
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
  $$insert into public.daily_actions (
      couple_id, check_in_date, proposed_by, kind, text
    ) values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      current_date - 1,
      '22222222-2222-2222-2222-222222222222',
      'support',
      'Sit with me for ten minutes'
    )
    returning kind$$,
  array['support'::text],
  'the partner can offer on another day'
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
  $$update public.daily_actions
      set status = 'skipped'
    where check_in_date = current_date - 1
    returning status$$,
  array['skipped'::text],
  'the other person can gently skip'
);

select * from finish();
rollback;
