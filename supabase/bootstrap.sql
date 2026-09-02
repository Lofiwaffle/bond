-- 20260730120000_phase1_foundation.sql
-- Bond Phase 1: profiles, couples, pairing RPCs, RLS

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  constraint couples_invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$')
);

create unique index if not exists couples_invite_code_uidx on public.couples (invite_code);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_couple_id_idx on public.profiles (couple_id);

-- ---------------------------------------------------------------------------
-- Profile bootstrap on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'given_name'), ''),
      split_part(new.email, '@', 1),
      'Partner'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_couple_id() from public;
grant execute on function public.current_couple_id() to authenticated;

create or replace function private.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';
    for idx in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.couples where invite_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pairing RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_couple()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_couple_id uuid;
  new_couple public.couples;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into existing_couple_id
  from public.profiles
  where id = uid;

  if existing_couple_id is not null then
    raise exception 'Already paired';
  end if;

  insert into public.couples (invite_code, created_by)
  values (private.generate_invite_code(), uid)
  returning * into new_couple;

  update public.profiles
  set couple_id = new_couple.id
  where id = uid;

  return new_couple;
end;
$$;

revoke all on function public.create_couple() from public;
grant execute on function public.create_couple() to authenticated;

create or replace function public.join_couple(invite text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_couple_id uuid;
  target public.couples;
  member_count int;
  normalized text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  normalized := upper(trim(invite));

  if normalized !~ '^[A-Z0-9]{6}$' then
    raise exception 'Invalid invite code';
  end if;

  select couple_id into existing_couple_id
  from public.profiles
  where id = uid;

  if existing_couple_id is not null then
    raise exception 'Already paired';
  end if;

  select * into target
  from public.couples
  where invite_code = normalized;

  if target.id is null then
    raise exception 'Invalid invite code';
  end if;

  if target.created_by = uid then
    raise exception 'Cannot join your own invite';
  end if;

  select count(*)::int into member_count
  from public.profiles
  where couple_id = target.id;

  if member_count >= 2 then
    raise exception 'Couple is full';
  end if;

  update public.profiles
  set couple_id = target.id
  where id = uid;

  update public.couples
  set paired_at = coalesce(paired_at, now())
  where id = target.id;

  select * into target from public.couples where id = target.id;
  return target;
end;
$$;

revoke all on function public.join_couple(text) from public;
grant execute on function public.join_couple(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (Data API)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.couples to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;

create policy "profiles_select_own_or_partner"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (
      couple_id is not null
      and couple_id = public.current_couple_id()
    )
  );

create policy "profiles_update_own_display_name"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "couples_select_own"
  on public.couples
  for select
  to authenticated
  using (id = public.current_couple_id());

-- 20260730140000_phase2_daily_check_ins.sql
-- Bond Phase 2: daily check-ins with blind-then-reveal RLS

create table public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  check_in_date date not null,
  score smallint not null,
  note text,
  created_at timestamptz not null default now(),
  constraint daily_check_ins_score_range check (score between 1 and 5),
  constraint daily_check_ins_note_length check (note is null or char_length(note) <= 500),
  constraint daily_check_ins_user_date_unique unique (user_id, check_in_date)
);

create index daily_check_ins_couple_date_idx
  on public.daily_check_ins (couple_id, check_in_date desc);

-- Ensure couple_id always matches the submitting user's profile couple
create or replace function private.enforce_check_in_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Can only create your own check-in';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to check in';
  end if;

  new.couple_id := profile_couple;
  return new;
end;
$$;

create trigger daily_check_ins_set_couple
  before insert on public.daily_check_ins
  for each row
  execute function private.enforce_check_in_couple();

-- Helper avoids RLS recursion when checking whether the caller submitted today
create or replace function public.has_own_check_in(
  p_couple_id uuid,
  p_date date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_check_ins
    where user_id = auth.uid()
      and couple_id = p_couple_id
      and check_in_date = p_date
  );
$$;

revoke all on function public.has_own_check_in(uuid, date) from public;
grant execute on function public.has_own_check_in(uuid, date) to authenticated;

grant select, insert on public.daily_check_ins to authenticated;

alter table public.daily_check_ins enable row level security;

create policy "daily_check_ins_select_blind_reveal"
  on public.daily_check_ins
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
      and (select public.has_own_check_in(couple_id, check_in_date))
    )
  );

create policy "daily_check_ins_insert_own"
  on public.daily_check_ins
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-- 20260730143000_phase2_fix_checkin_rls.sql
-- Fix Phase 2 RLS recursion on daily_check_ins SELECT policy

create or replace function public.has_own_check_in(
  p_couple_id uuid,
  p_date date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_check_ins
    where user_id = auth.uid()
      and couple_id = p_couple_id
      and check_in_date = p_date
  );
$$;

revoke all on function public.has_own_check_in(uuid, date) from public;
grant execute on function public.has_own_check_in(uuid, date) to authenticated;

drop policy if exists "daily_check_ins_select_blind_reveal" on public.daily_check_ins;

create policy "daily_check_ins_select_blind_reveal"
  on public.daily_check_ins
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
      and (select public.has_own_check_in(couple_id, check_in_date))
    )
  );

-- 20260730160000_phase5_weekly_reviews.sql
-- Phase 5 (partial): weekly reviews with blind-then-reveal

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint weekly_reviews_range check (week_end >= week_start),
  constraint weekly_reviews_user_week_unique unique (user_id, week_start)
);

create index weekly_reviews_couple_week_idx
  on public.weekly_reviews (couple_id, week_start desc);

create or replace function private.enforce_weekly_review_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Can only create your own weekly review';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to submit a weekly review';
  end if;

  new.couple_id := profile_couple;
  return new;
end;
$$;

create trigger weekly_reviews_set_couple
  before insert on public.weekly_reviews
  for each row
  execute function private.enforce_weekly_review_couple();

create or replace function public.has_own_weekly_review(
  p_couple_id uuid,
  p_week_start date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.weekly_reviews
    where user_id = auth.uid()
      and couple_id = p_couple_id
      and week_start = p_week_start
  );
$$;

revoke all on function public.has_own_weekly_review(uuid, date) from public;
grant execute on function public.has_own_weekly_review(uuid, date) to authenticated;

grant select, insert on public.weekly_reviews to authenticated;

alter table public.weekly_reviews enable row level security;

create policy "weekly_reviews_select_blind_reveal"
  on public.weekly_reviews
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
      and (select public.has_own_weekly_review(couple_id, week_start))
    )
  );

create policy "weekly_reviews_insert_own"
  on public.weekly_reviews
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-- 20260812010000_phase6_p0_trio.sql
-- Phase 6 (partial): P0 trio — bid logs, appreciations, rituals, repair cards

create table public.bid_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  turned_toward boolean not null default true,
  note text null default null,
  created_at timestamptz not null default now()
);

create index bid_logs_couple_date_idx
  on public.bid_logs (couple_id, date desc);

alter table public.bid_logs enable row level security;

create policy "bid_logs_select_own_and_partner"
  on public.bid_logs
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
    )
  );

create policy "bid_logs_insert_own"
  on public.bid_logs
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-------------------------------------------------------------------

create table public.appreciations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('support','humor','effort','presence','other')),
  message text null default null,
  timestamp timestamptz not null default now()
);

create unique index appreciations_unique
  on public.appreciations (from_user_id, to_user_id, ((timestamp at time zone 'utc')::date));

create index appreciations_couple_idx
  on public.appreciations (couple_id, timestamp desc);

alter table public.appreciations enable row level security;

create policy "appreciations_select_own_and_partner"
  on public.appreciations
  for select
  to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
    )
  );

create policy "appreciations_insert_own"
  on public.appreciations
  for insert
  to authenticated
  with check (
    from_user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-------------------------------------------------------------------

create table public.rituals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  frequency text not null check (frequency in ('daily','weekly','monthly','custom')),
  streak integer not null default 0,
  last_completed timestamptz null default null,
  co_owners text[] not null default '{}',
  description text null default null,
  created_at timestamptz not null default now()
);

create index rituals_couple_idx
  on public.rituals (couple_id);

alter table public.rituals enable row level security;

create policy "rituals_select_own_and_partner"
  on public.rituals
  for select
  to authenticated
  using (
    couple_id = public.current_couple_id()
  );

create policy "rituals_insert_own"
  on public.rituals
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
  );

create policy "rituals_update_own_streak"
  on public.rituals
  for update
  to authenticated
  using (
    couple_id = public.current_couple_id()
  )
  with check (
    couple_id = public.current_couple_id()
  );

-------------------------------------------------------------------

create table public.repair_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  category text not null check (category in ('humor','apology','validation','deescalation','affection')),
  created_at timestamptz not null default now()
);

alter table public.repair_cards enable row level security;

create policy "repair_cards_select_all"
  on public.repair_cards
  for select
  to authenticated
  using (true);

-- Pre-populate with core repair card types
insert into public.repair_cards (title, prompt, category) values
  ('Humor', 'Can we do the "ridiculous accent" thing to lighten the mood?', 'humor'),
  ('Apology', 'I snapped. I am sorry for raising my voice.', 'apology'),
  ('Validation', 'You are right that I did not listen. Tell me more.', 'validation'),
  ('De-escalation', 'I''m flooding. Can we take a 20-min break?', 'deescalation'),
  ('Affection', '*reaches for hand*', 'affection');

-- 20260819120000_checkin_activities.sql
-- Add optional activity tags to daily check-ins (tap-to-select categories)

alter table public.daily_check_ins
  add column if not exists activities text[] not null default '{}';

alter table public.daily_check_ins
  drop constraint if exists daily_check_ins_activities_valid;

alter table public.daily_check_ins
  add constraint daily_check_ins_activities_valid check (
    cardinality(activities) <= 5
    and activities <@ array[
      'sports',
      'work',
      'food',
      'home',
      'social',
      'rest',
      'travel',
      'other'
    ]::text[]
  );

-- 20260819140000_weekly_ai_summaries.sql
-- Couple-shared AI weekly summaries (check-in narrative)

create table public.weekly_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text not null,
  source text not null default 'ai'
    check (source in ('ai', 'fallback')),
  model text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_ai_summaries_range check (week_end >= week_start),
  constraint weekly_ai_summaries_couple_week_unique unique (couple_id, week_start)
);

create index weekly_ai_summaries_couple_week_idx
  on public.weekly_ai_summaries (couple_id, week_start desc);

create or replace function private.touch_weekly_ai_summary_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger weekly_ai_summaries_updated_at
  before update on public.weekly_ai_summaries
  for each row
  execute function private.touch_weekly_ai_summary_updated_at();

grant select, insert, update on public.weekly_ai_summaries to authenticated;

alter table public.weekly_ai_summaries enable row level security;

create policy "weekly_ai_summaries_select_couple"
  on public.weekly_ai_summaries
  for select
  to authenticated
  using (
    couple_id = public.current_couple_id()
  );

create policy "weekly_ai_summaries_insert_couple"
  on public.weekly_ai_summaries
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
  );

create policy "weekly_ai_summaries_update_couple"
  on public.weekly_ai_summaries
  for update
  to authenticated
  using (
    couple_id = public.current_couple_id()
  )
  with check (
    couple_id = public.current_couple_id()
  );

-- Edge function may also write with the service role.

-- 20260819141000_weekly_ai_summaries_write.sql
-- Allow couple members to cache weekly AI / fallback summaries from the app

grant insert, update on public.weekly_ai_summaries to authenticated;

drop policy if exists "weekly_ai_summaries_insert_couple" on public.weekly_ai_summaries;
create policy "weekly_ai_summaries_insert_couple"
  on public.weekly_ai_summaries
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
  );

drop policy if exists "weekly_ai_summaries_update_couple" on public.weekly_ai_summaries;
create policy "weekly_ai_summaries_update_couple"
  on public.weekly_ai_summaries
  for update
  to authenticated
  using (
    couple_id = public.current_couple_id()
  )
  with check (
    couple_id = public.current_couple_id()
  );

-- 20260819150000_habit_completions.sql
-- Habit badges: couples log real-world completions of the 5 badge habits
-- (spark/glow/forge/bond/sync), independent of the daily check-in streak.

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id text not null check (habit_id in ('spark', 'glow', 'forge', 'bond', 'sync')),
  note text null default null,
  created_at timestamptz not null default now()
);

create index habit_completions_couple_habit_idx
  on public.habit_completions (couple_id, habit_id, created_at desc);

grant select, insert on public.habit_completions to authenticated;

alter table public.habit_completions enable row level security;

create policy "habit_completions_select_couple"
  on public.habit_completions
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "habit_completions_insert_own"
  on public.habit_completions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-- 20260820120000_goals_and_daily_prompts.sql
-- Shared couple goal (one active outcome) + daily check-in prompt answers

alter table public.daily_check_ins
  add column prompt_id text,
  add column prompt_text text,
  add column prompt_answer text;

alter table public.daily_check_ins
  add constraint daily_check_ins_prompt_text_length
  check (prompt_text is null or char_length(prompt_text) <= 280);

alter table public.daily_check_ins
  add constraint daily_check_ins_prompt_answer_length
  check (prompt_answer is null or char_length(prompt_answer) <= 500);

create table public.couple_goals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  outcome text not null,
  why text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint couple_goals_status_check check (status in ('active', 'completed')),
  constraint couple_goals_outcome_length check (
    char_length(trim(outcome)) between 8 and 140
  ),
  constraint couple_goals_why_length check (
    why is null or char_length(why) <= 280
  ),
  constraint couple_goals_completed_at_check check (
    (status = 'active' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create unique index couple_goals_one_active
  on public.couple_goals (couple_id)
  where status = 'active';

create index couple_goals_couple_created_idx
  on public.couple_goals (couple_id, created_at desc);

create table public.couple_goal_reviews (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.couple_goals (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  constraint couple_goal_reviews_note_length check (
    char_length(trim(note)) between 1 and 500
  )
);

create index couple_goal_reviews_goal_idx
  on public.couple_goal_reviews (goal_id, created_at desc);

grant select, insert, update on public.couple_goals to authenticated;
grant select, insert on public.couple_goal_reviews to authenticated;

alter table public.couple_goals enable row level security;
alter table public.couple_goal_reviews enable row level security;

create policy "couple_goals_select_couple"
  on public.couple_goals
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "couple_goals_insert_couple"
  on public.couple_goals
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
    and created_by = (select auth.uid())
    and status = 'active'
  );

create policy "couple_goals_update_couple"
  on public.couple_goals
  for update
  to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

create policy "couple_goal_reviews_select_couple"
  on public.couple_goal_reviews
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "couple_goal_reviews_insert_own"
  on public.couple_goal_reviews
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
    and user_id = (select auth.uid())
  );

-- 20260820130000_smart_goals.sql
-- SMART fields on the shared couple goal

alter table public.couple_goals
  add column if not exists success_criteria text,
  add column if not exists realistic_plan text,
  add column if not exists deadline date;

do $$ begin
  alter table public.couple_goals
    add constraint couple_goals_success_criteria_length
    check (
      success_criteria is null
      or char_length(trim(success_criteria)) between 8 and 200
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.couple_goals
    add constraint couple_goals_realistic_plan_length
    check (
      realistic_plan is null
      or char_length(trim(realistic_plan)) between 8 and 200
    );
exception when duplicate_object then null;
end $$;

-- 20260820140000_multiple_couple_goals.sql
-- Couples can keep more than one active SMART goal at a time.

drop index if exists public.couple_goals_one_active;

-- 20260820150000_checkin_realtime.sql
-- Let partners hear new daily check-ins so Entries can reveal both sides.

alter table public.daily_check_ins replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_check_ins'
  ) then
    execute 'alter publication supabase_realtime add table public.daily_check_ins';
  end if;
end $$;

-- 20260820160000_delete_own_account.sql
-- Play Store: users who can create an account must be able to delete it.

alter table public.couples
  alter column created_by drop not null;

alter table public.couples
  drop constraint if exists couples_created_by_fkey;

alter table public.couples
  add constraint couples_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

drop function if exists public.delete_own_account();

create function public.delete_own_account()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
    set couple_id = null
    where id = uid;

  delete from public.couples c
    where not exists (
      select 1 from public.profiles p where p.couple_id = c.id
    );

  delete from auth.users where id = uid;

  return json_build_object('ok', true);
end;
$$;

alter function public.delete_own_account() owner to postgres;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

notify pgrst, 'reload schema';

-- 20260821120000_partner_signals.sql
alter table public.profiles
  add column if not exists expo_push_token text;

grant update (expo_push_token) on public.profiles to authenticated;

create table if not exists public.partner_signals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists partner_signals_couple_created_idx
  on public.partner_signals (couple_id, created_at desc);

grant select on public.partner_signals to authenticated;

alter table public.partner_signals enable row level security;

drop policy if exists partner_signals_select_couple on public.partner_signals;
create policy partner_signals_select_couple
  on public.partner_signals
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create or replace function private.emit_partner_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event text;
  summary text;
  actor uuid;
  cid uuid;
begin
  if TG_TABLE_NAME = 'daily_check_ins' then
    event := 'partner_checked_in';
    summary := 'checked in';
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'habit_completions' then
    event := 'partner_logged_achievement';
    summary := 'logged ' || initcap(new.habit_id);
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'couple_goals' then
    actor := new.created_by;
    cid := new.couple_id;
    if TG_OP = 'UPDATE' and new.status = 'completed' and old.status is distinct from 'completed' then
      event := 'partner_completed_goal';
      summary := 'completed a goal';
    elsif TG_OP = 'INSERT' then
      event := 'partner_set_goal';
      summary := 'set a goal';
    else
      return new;
    end if;
  elsif TG_TABLE_NAME = 'weekly_reviews' then
    event := 'partner_weekly_review';
    summary := 'finished a weekly review';
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'profiles' then
    if new.couple_id is null then
      return new;
    end if;
    event := 'partner_joined';
    summary := 'joined your Bond';
    actor := new.id;
    cid := new.couple_id;
  else
    return new;
  end if;

  insert into public.partner_signals (couple_id, actor_id, event_type, summary)
  values (cid, actor, event, summary);

  return new;
end;
$$;

drop trigger if exists partner_signal_check_ins on public.daily_check_ins;
create trigger partner_signal_check_ins
  after insert on public.daily_check_ins
  for each row execute function private.emit_partner_signal();

drop trigger if exists partner_signal_habits on public.habit_completions;
create trigger partner_signal_habits
  after insert on public.habit_completions
  for each row execute function private.emit_partner_signal();

drop trigger if exists partner_signal_goals_ins on public.couple_goals;
create trigger partner_signal_goals_ins
  after insert on public.couple_goals
  for each row execute function private.emit_partner_signal();

drop trigger if exists partner_signal_goals_upd on public.couple_goals;
create trigger partner_signal_goals_upd
  after update of status on public.couple_goals
  for each row execute function private.emit_partner_signal();

drop trigger if exists partner_signal_reviews on public.weekly_reviews;
create trigger partner_signal_reviews
  after insert on public.weekly_reviews
  for each row execute function private.emit_partner_signal();

drop trigger if exists partner_signal_profiles on public.profiles;
create trigger partner_signal_profiles
  after update of couple_id on public.profiles
  for each row
  when (old.couple_id is null and new.couple_id is not null)
  execute function private.emit_partner_signal();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partner_signals'
  ) then
    execute 'alter publication supabase_realtime add table public.partner_signals';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'habit_completions'
  ) then
    execute 'alter publication supabase_realtime add table public.habit_completions';
  end if;
end $$;

-- 20260821140000_habit_completions_update.sql
grant update on public.habit_completions to authenticated;

create policy "habit_completions_update_own"
  on public.habit_completions
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  )
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-- 20260825120000_checkin_waiting_nudge.sql
grant insert on public.partner_signals to authenticated;

drop policy if exists "partner_signals_insert_nudge" on public.partner_signals;
create policy "partner_signals_insert_nudge"
  on public.partner_signals
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and couple_id = public.current_couple_id()
    and event_type = 'check_in_nudge'
  );

-- 20260826120000_weekly_summary_dismiss.sql
alter table public.weekly_ai_summaries
  add column if not exists original_summary text,
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_by uuid references public.profiles (id) on delete set null;


-- 20260826140000_leave_couple.sql
-- Unpairing and account deletion: explicit data semantics.
--
-- leave_couple():
--   1. Delete the caller's couple-scoped answers so a remaining partner cannot
--      keep reading them: daily_check_ins, weekly_reviews, habit_completions,
--      couple_goal_reviews, bid_logs, appreciations they sent or received.
--   2. Delete weekly_ai_summaries for the couple (they quote both people).
--   3. Delete partner_signals for the couple.
--   4. Detach the caller (couple_id = null, clear push token).
--   5. If no members remain, delete the couple (cascade leftover couple rows).
--   6. If a partner remains: keep the couple, rotate invite_code, clear
--      paired_at. Remaining partner keeps THEIR rows, couple_goals, and rituals.
--
-- delete_own_account(): leave_couple(), then delete auth.users (cascades profile).

create or replace function public.leave_couple()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  remaining int;
  couple_deleted boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid
  from public.profiles
  where id = uid;

  if cid is null then
    return json_build_object('ok', true, 'left', false, 'couple_deleted', false);
  end if;

  delete from public.daily_check_ins where user_id = uid;
  delete from public.weekly_reviews where user_id = uid;

  begin
    delete from public.weekly_ai_summaries where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.partner_signals where couple_id = cid;
  exception
    when undefined_table then null;
  end;

  -- Optional tables from later phases; ignore if a host has not applied them.
  begin
    delete from public.habit_completions where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.couple_goal_reviews where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.bid_logs where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.appreciations
      where from_user_id = uid or to_user_id = uid;
  exception
    when undefined_table then null;
  end;

  update public.profiles
    set couple_id = null
    where id = uid;

  begin
    update public.profiles
      set expo_push_token = null
      where id = uid;
  exception
    when undefined_column then null;
  end;

  select count(*)::int into remaining
  from public.profiles
  where couple_id = cid;

  if remaining = 0 then
    delete from public.couples where id = cid;
    couple_deleted := true;
  else
    update public.couples
      set invite_code = private.generate_invite_code(),
          paired_at = null
      where id = cid;
  end if;

  return json_build_object(
    'ok', true,
    'left', true,
    'couple_deleted', couple_deleted
  );
end;
$$;

alter function public.leave_couple() owner to postgres;

revoke all on function public.leave_couple() from public;
grant execute on function public.leave_couple() to authenticated;

create or replace function public.delete_own_account()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.leave_couple();

  delete from auth.users where id = uid;

  return json_build_object('ok', true);
end;
$$;

alter function public.delete_own_account() owner to postgres;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Owner-only reminder preferences. Off by default.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_enabled boolean not null default false,
  daily_time time not null default '20:00:00',
  reveal_enabled boolean not null default false,
  timezone text not null default 'UTC',
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start smallint not null default 22
    check (quiet_hours_start >= 0 and quiet_hours_start <= 23),
  quiet_hours_end smallint not null default 8
    check (quiet_hours_end >= 0 and quiet_hours_end <= 23),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notification_preferences to service_role;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

alter function public.ensure_notification_preferences() owner to postgres;
revoke all on function public.ensure_notification_preferences() from public;

drop trigger if exists on_profile_notification_prefs on public.profiles;
create trigger on_profile_notification_prefs
  after insert on public.profiles
  for each row
  execute function public.ensure_notification_preferences();

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- 20260826190000_checkin_revise_before_open.sql
-- Owner may correct a check-in until the partner submits that day.

alter table public.daily_check_ins
  add column if not exists revised_at timestamptz;

create or replace function public.partner_has_check_in(
  p_couple_id uuid,
  p_date date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_check_ins
    where couple_id = p_couple_id
      and check_in_date = p_date
      and user_id is distinct from auth.uid()
  );
$$;

revoke all on function public.partner_has_check_in(uuid, date) from public;
grant execute on function public.partner_has_check_in(uuid, date) to authenticated;

create or replace function private.enforce_check_in_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.couple_id is distinct from old.couple_id
     or new.check_in_date is distinct from old.check_in_date then
    raise exception 'Cannot reassign a check-in';
  end if;

  if exists (
    select 1
    from public.daily_check_ins
    where couple_id = old.couple_id
      and check_in_date = old.check_in_date
      and user_id is distinct from old.user_id
  ) then
    raise exception 'Today already opened';
  end if;

  new.created_at := old.created_at;
  new.revised_at := now();
  return new;
end;
$$;

drop trigger if exists daily_check_ins_enforce_revision on public.daily_check_ins;
create trigger daily_check_ins_enforce_revision
  before update on public.daily_check_ins
  for each row
  execute function private.enforce_check_in_revision();

revoke all on table public.daily_check_ins from anon, authenticated;
grant select, insert, update on table public.daily_check_ins to authenticated;

drop policy if exists "daily_check_ins_update_own_while_waiting" on public.daily_check_ins;
create policy "daily_check_ins_update_own_while_waiting"
  on public.daily_check_ins
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
    and not (select public.partner_has_check_in(couple_id, check_in_date))
  )
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
    and not (select public.partner_has_check_in(couple_id, check_in_date))
  );

notify pgrst, 'reload schema';

-- 20260826200000_daily_actions_shared.sql
-- One small shared action per couple per day. Not a thread: propose, accept or
-- skip, then complete. Private device notes never live here.

create table public.daily_actions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  check_in_date date not null,
  proposed_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  text text not null,
  status text not null default 'proposed',
  responded_by uuid references public.profiles (id) on delete set null,
  proposed_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  constraint daily_actions_kind_check
    check (kind in ('appreciate', 'support', 'plan')),
  constraint daily_actions_status_check
    check (status in ('proposed', 'accepted', 'completed', 'skipped')),
  constraint daily_actions_text_length
    check (char_length(trim(text)) between 1 and 280),
  constraint daily_actions_couple_date_unique unique (couple_id, check_in_date)
);

create index daily_actions_couple_status_idx
  on public.daily_actions (couple_id, status, check_in_date desc);

alter table public.daily_actions replica identity full;

create or replace function private.enforce_daily_action_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.proposed_by is distinct from auth.uid() then
    raise exception 'Can only offer your own small action';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to offer a small action';
  end if;

  new.couple_id := profile_couple;
  new.status := 'proposed';
  new.responded_by := null;
  new.responded_at := null;
  new.completed_at := null;
  new.proposed_at := coalesce(new.proposed_at, now());
  new.text := trim(new.text);
  return new;
end;
$$;

drop trigger if exists daily_actions_enforce_insert on public.daily_actions;
create trigger daily_actions_enforce_insert
  before insert on public.daily_actions
  for each row
  execute function private.enforce_daily_action_insert();

create or replace function private.enforce_daily_action_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if new.id is distinct from old.id
     or new.couple_id is distinct from old.couple_id
     or new.check_in_date is distinct from old.check_in_date
     or new.proposed_by is distinct from old.proposed_by
     or new.proposed_at is distinct from old.proposed_at then
    raise exception 'Cannot reassign a small action';
  end if;

  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if old.status = 'proposed' and new.status = 'proposed' then
    if uid is distinct from old.proposed_by then
      raise exception 'Only the person who offered can edit it';
    end if;
    new.responded_by := null;
    new.responded_at := null;
    new.completed_at := null;
    new.text := trim(new.text);
    return new;
  end if;

  if old.status = 'proposed' and new.status in ('accepted', 'skipped') then
    if uid is not distinct from old.proposed_by then
      raise exception 'The other person responds to this action';
    end if;
    new.kind := old.kind;
    new.text := old.text;
    new.responded_by := uid;
    new.responded_at := now();
    new.completed_at := null;
    return new;
  end if;

  if old.status = 'accepted' and new.status = 'completed' then
    new.kind := old.kind;
    new.text := old.text;
    new.responded_by := old.responded_by;
    new.responded_at := old.responded_at;
    new.completed_at := now();
    return new;
  end if;

  raise exception 'That small action cannot change that way';
end;
$$;

drop trigger if exists daily_actions_enforce_update on public.daily_actions;
create trigger daily_actions_enforce_update
  before update on public.daily_actions
  for each row
  execute function private.enforce_daily_action_update();

revoke all on table public.daily_actions from anon, authenticated;
grant select, insert, update on table public.daily_actions to authenticated;

alter table public.daily_actions enable row level security;

create policy "daily_actions_select_couple"
  on public.daily_actions
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "daily_actions_insert_own"
  on public.daily_actions
  for insert
  to authenticated
  with check (
    proposed_by = (select auth.uid())
    and couple_id = public.current_couple_id()
    and status = 'proposed'
  );

create policy "daily_actions_update_couple"
  on public.daily_actions
  for update
  to authenticated
  using (couple_id = public.current_couple_id())
  with check (
    couple_id = public.current_couple_id()
    and (
      (
        status = 'proposed'
        and proposed_by = (select auth.uid())
      )
      or (
        status in ('accepted', 'skipped')
        and responded_by = (select auth.uid())
        and proposed_by is distinct from (select auth.uid())
      )
      or status = 'completed'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_actions'
  ) then
    execute 'alter publication supabase_realtime add table public.daily_actions';
  end if;
end $$;

create or replace function private.emit_partner_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event text;
  summary text;
  actor uuid;
  cid uuid;
begin
  if TG_TABLE_NAME = 'daily_check_ins' then
    event := 'partner_checked_in';
    summary := 'checked in';
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'habit_completions' then
    event := 'partner_logged_achievement';
    summary := 'logged ' || initcap(new.habit_id);
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'couple_goals' then
    actor := new.created_by;
    cid := new.couple_id;
    if TG_OP = 'UPDATE' and new.status = 'completed' and old.status is distinct from 'completed' then
      event := 'partner_completed_goal';
      summary := 'completed a goal';
    elsif TG_OP = 'INSERT' then
      event := 'partner_set_goal';
      summary := 'set a goal';
    else
      return new;
    end if;
  elsif TG_TABLE_NAME = 'weekly_reviews' then
    event := 'partner_weekly_review';
    summary := 'finished a weekly review';
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'daily_actions' then
    cid := new.couple_id;
    if TG_OP = 'INSERT' then
      event := 'daily_action_proposed';
      summary := 'offered a small action';
      actor := new.proposed_by;
    elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'accepted' then
        event := 'daily_action_accepted';
        summary := 'accepted a small action';
        actor := new.responded_by;
      elsif new.status = 'skipped' then
        event := 'daily_action_skipped';
        summary := 'passed on a small action';
        actor := new.responded_by;
      elsif new.status = 'completed' then
        event := 'daily_action_completed';
        summary := 'completed a small action';
        actor := coalesce(auth.uid(), new.proposed_by);
      else
        return new;
      end if;
    else
      return new;
    end if;
  elsif TG_TABLE_NAME = 'profiles' then
    if new.couple_id is null then
      return new;
    end if;
    event := 'partner_joined';
    summary := 'joined your Bond';
    actor := new.id;
    cid := new.couple_id;
  else
    return new;
  end if;

  begin
    insert into public.partner_signals (couple_id, actor_id, event_type, summary)
    values (cid, actor, event, summary);
  exception
    when undefined_table then null;
  end;

  return new;
end;
$$;

drop trigger if exists partner_signal_daily_actions_ins on public.daily_actions;
create trigger partner_signal_daily_actions_ins
  after insert on public.daily_actions
  for each row
  execute function private.emit_partner_signal();

drop trigger if exists partner_signal_daily_actions_upd on public.daily_actions;
create trigger partner_signal_daily_actions_upd
  after update of status on public.daily_actions
  for each row
  execute function private.emit_partner_signal();

create or replace function public.leave_couple()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  remaining int;
  couple_deleted boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid
  from public.profiles
  where id = uid;

  if cid is null then
    return json_build_object('ok', true, 'left', false, 'couple_deleted', false);
  end if;

  delete from public.daily_check_ins where user_id = uid;
  delete from public.weekly_reviews where user_id = uid;

  begin
    delete from public.weekly_ai_summaries where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.partner_signals where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.habit_completions where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.couple_goal_reviews where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.bid_logs where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.appreciations
      where from_user_id = uid or to_user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.daily_actions where proposed_by = uid;
  exception
    when undefined_table then null;
  end;

  update public.profiles
    set couple_id = null
    where id = uid;

  begin
    update public.profiles
      set expo_push_token = null
      where id = uid;
  exception
    when undefined_column then null;
  end;

  select count(*)::int into remaining
  from public.profiles
  where couple_id = cid;

  if remaining = 0 then
    delete from public.couples where id = cid;
    couple_deleted := true;
  else
    update public.couples
      set invite_code = private.generate_invite_code(),
          paired_at = null
      where id = cid;
  end if;

  return json_build_object(
    'ok', true,
    'left', true,
    'couple_deleted', couple_deleted
  );
end;
$$;

alter function public.leave_couple() owner to postgres;

notify pgrst, 'reload schema';


-- 20260826210000_couple_goals_agreement.sql
-- Shared goals require the other person's agreement.
-- proposed → active → completed, plus declined and archived.
-- Completing takes two confirmations; we record who asked and who confirmed.

alter table public.couple_goals
  add column if not exists accepted_by uuid references public.profiles (id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_by uuid references public.profiles (id) on delete set null,
  add column if not exists declined_at timestamptz,
  add column if not exists completion_requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists completion_requested_at timestamptz,
  add column if not exists completed_by uuid references public.profiles (id) on delete set null,
  add column if not exists archived_by uuid references public.profiles (id) on delete set null,
  add column if not exists archived_at timestamptz;

alter table public.couple_goals
  drop constraint if exists couple_goals_status_check;

alter table public.couple_goals
  add constraint couple_goals_status_check
  check (status in ('proposed', 'active', 'completed', 'declined', 'archived'));

alter table public.couple_goals
  drop constraint if exists couple_goals_completed_at_check;

alter table public.couple_goals
  add constraint couple_goals_completed_at_check
  check (
    (
      status = 'completed'
      and completed_at is not null
      and completed_by is not null
    )
    or (
      status in ('proposed', 'active', 'declined')
      and completed_at is null
    )
    or status = 'archived'
  );

alter table public.couple_goals
  alter column status set default 'proposed';

-- Goals created before agreement stay active so in-flight work is not rewound.
update public.couple_goals
set
  accepted_by = coalesce(accepted_by, created_by),
  accepted_at = coalesce(accepted_at, created_at)
where status = 'active';

update public.couple_goals
set completed_by = coalesce(completed_by, created_by)
where status = 'completed';

create or replace function private.enforce_couple_goal_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.created_by is distinct from auth.uid() then
    raise exception 'Can only offer your own goal';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to offer a goal';
  end if;

  new.couple_id := profile_couple;
  new.status := 'proposed';
  new.accepted_by := null;
  new.accepted_at := null;
  new.declined_by := null;
  new.declined_at := null;
  new.completion_requested_by := null;
  new.completion_requested_at := null;
  new.completed_by := null;
  new.completed_at := null;
  new.archived_by := null;
  new.archived_at := null;
  return new;
end;
$$;

drop trigger if exists couple_goals_enforce_insert on public.couple_goals;
create trigger couple_goals_enforce_insert
  before insert on public.couple_goals
  for each row
  execute function private.enforce_couple_goal_insert();

create or replace function private.enforce_couple_goal_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if new.id is distinct from old.id
     or new.couple_id is distinct from old.couple_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Cannot reassign a goal';
  end if;

  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if old.status = 'proposed' and new.status = 'proposed' then
    if uid is distinct from old.created_by then
      raise exception 'Only the person who offered can edit it';
    end if;
    new.accepted_by := null;
    new.accepted_at := null;
    new.declined_by := null;
    new.declined_at := null;
    new.completion_requested_by := null;
    new.completion_requested_at := null;
    new.completed_by := null;
    new.completed_at := null;
    new.archived_by := null;
    new.archived_at := null;
    return new;
  end if;

  if old.status = 'proposed' and new.status = 'active' then
    if uid is not distinct from old.created_by then
      raise exception 'The other person agrees to this goal';
    end if;
    new.outcome := old.outcome;
    new.success_criteria := old.success_criteria;
    new.realistic_plan := old.realistic_plan;
    new.why := old.why;
    new.deadline := old.deadline;
    new.accepted_by := uid;
    new.accepted_at := now();
    new.declined_by := null;
    new.declined_at := null;
    new.completion_requested_by := null;
    new.completion_requested_at := null;
    new.completed_by := null;
    new.completed_at := null;
    new.archived_by := null;
    new.archived_at := null;
    return new;
  end if;

  if old.status = 'proposed' and new.status = 'declined' then
    if uid is not distinct from old.created_by then
      raise exception 'The other person responds to this goal';
    end if;
    new.outcome := old.outcome;
    new.success_criteria := old.success_criteria;
    new.realistic_plan := old.realistic_plan;
    new.why := old.why;
    new.deadline := old.deadline;
    new.declined_by := uid;
    new.declined_at := now();
    new.accepted_by := null;
    new.accepted_at := null;
    new.completed_by := null;
    new.completed_at := null;
    return new;
  end if;

  if old.status = 'proposed' and new.status = 'archived' then
    if uid is distinct from old.created_by then
      raise exception 'Only the person who offered can withdraw it';
    end if;
    new.archived_by := uid;
    new.archived_at := now();
    return new;
  end if;

  if old.status = 'active' and new.status = 'active' then
    if old.completion_requested_by is null and new.completion_requested_by = uid then
      new.completion_requested_at := now();
      new.outcome := old.outcome;
      new.success_criteria := old.success_criteria;
      new.realistic_plan := old.realistic_plan;
      new.why := old.why;
      new.deadline := old.deadline;
      new.accepted_by := old.accepted_by;
      new.accepted_at := old.accepted_at;
      new.completed_by := null;
      new.completed_at := null;
      return new;
    end if;
    raise exception 'An agreed goal cannot be rewritten';
  end if;

  if old.status = 'active' and new.status = 'completed' then
    new.outcome := old.outcome;
    new.success_criteria := old.success_criteria;
    new.realistic_plan := old.realistic_plan;
    new.why := old.why;
    new.deadline := old.deadline;
    new.accepted_by := old.accepted_by;
    new.accepted_at := old.accepted_at;
    if old.completion_requested_by is null then
      new.status := 'active';
      new.completion_requested_by := uid;
      new.completion_requested_at := now();
      new.completed_by := null;
      new.completed_at := null;
      return new;
    end if;
    if old.completion_requested_by = uid then
      raise exception 'Waiting for the other person to confirm';
    end if;
    new.completion_requested_by := old.completion_requested_by;
    new.completion_requested_at := old.completion_requested_at;
    new.completed_by := uid;
    new.completed_at := now();
    return new;
  end if;

  if old.status in ('active', 'declined', 'completed') and new.status = 'archived' then
    new.outcome := old.outcome;
    new.success_criteria := old.success_criteria;
    new.realistic_plan := old.realistic_plan;
    new.why := old.why;
    new.deadline := old.deadline;
    new.accepted_by := old.accepted_by;
    new.accepted_at := old.accepted_at;
    new.declined_by := old.declined_by;
    new.declined_at := old.declined_at;
    new.completion_requested_by := old.completion_requested_by;
    new.completion_requested_at := old.completion_requested_at;
    new.completed_by := old.completed_by;
    new.completed_at := old.completed_at;
    new.archived_by := uid;
    new.archived_at := now();
    return new;
  end if;

  raise exception 'That goal cannot change that way';
end;
$$;

drop trigger if exists couple_goals_enforce_update on public.couple_goals;
create trigger couple_goals_enforce_update
  before update on public.couple_goals
  for each row
  execute function private.enforce_couple_goal_update();

revoke all on table public.couple_goals from anon, authenticated;
grant select, insert, update on table public.couple_goals to authenticated;

drop policy if exists "couple_goals_insert_couple" on public.couple_goals;
create policy "couple_goals_insert_couple"
  on public.couple_goals
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
    and created_by = (select auth.uid())
    and status = 'proposed'
  );

drop policy if exists "couple_goals_update_couple" on public.couple_goals;
create policy "couple_goals_update_couple"
  on public.couple_goals
  for update
  to authenticated
  using (couple_id = public.current_couple_id())
  with check (
    couple_id = public.current_couple_id()
    and (
      (
        status = 'proposed'
        and created_by = (select auth.uid())
      )
      or (
        status = 'active'
        and (
          accepted_by = (select auth.uid())
          or completion_requested_by = (select auth.uid())
        )
      )
      or (
        status = 'declined'
        and declined_by = (select auth.uid())
      )
      or (
        status = 'completed'
        and completed_by = (select auth.uid())
      )
      or (
        status = 'archived'
        and archived_by = (select auth.uid())
      )
    )
  );

create or replace function private.emit_partner_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event text;
  summary text;
  actor uuid;
  cid uuid;
begin
  if TG_TABLE_NAME = 'daily_check_ins' then
    event := 'partner_checked_in';
    summary := 'checked in';
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'habit_completions' then
    event := 'partner_logged_achievement';
    summary := 'logged ' || initcap(new.habit_id);
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'couple_goals' then
    cid := new.couple_id;
    if TG_OP = 'INSERT' then
      event := 'partner_set_goal';
      summary := 'proposed a goal';
      actor := new.created_by;
    elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'active' then
        event := 'partner_accepted_goal';
        summary := 'accepted a goal';
        actor := new.accepted_by;
      elsif new.status = 'declined' then
        event := 'partner_declined_goal';
        summary := 'passed on a goal';
        actor := new.declined_by;
      elsif new.status = 'completed' then
        event := 'partner_completed_goal';
        summary := 'confirmed a goal complete';
        actor := new.completed_by;
      elsif new.status = 'archived' then
        event := 'partner_archived_goal';
        summary := 'archived a goal';
        actor := new.archived_by;
      else
        return new;
      end if;
    elsif TG_OP = 'UPDATE'
      and new.completion_requested_by is distinct from old.completion_requested_by then
      event := 'partner_goal_complete_requested';
      summary := 'marked a goal done, waiting';
      actor := new.completion_requested_by;
    else
      return new;
    end if;
  elsif TG_TABLE_NAME = 'weekly_reviews' then
    event := 'partner_weekly_review';
    summary := 'finished a weekly review';
    actor := new.user_id;
    cid := new.couple_id;
  elsif TG_TABLE_NAME = 'daily_actions' then
    cid := new.couple_id;
    if TG_OP = 'INSERT' then
      event := 'daily_action_proposed';
      summary := 'offered a small action';
      actor := new.proposed_by;
    elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'accepted' then
        event := 'daily_action_accepted';
        summary := 'accepted a small action';
        actor := new.responded_by;
      elsif new.status = 'skipped' then
        event := 'daily_action_skipped';
        summary := 'passed on a small action';
        actor := new.responded_by;
      elsif new.status = 'completed' then
        event := 'daily_action_completed';
        summary := 'completed a small action';
        actor := coalesce(auth.uid(), new.proposed_by);
      else
        return new;
      end if;
    else
      return new;
    end if;
  elsif TG_TABLE_NAME = 'profiles' then
    if new.couple_id is null then
      return new;
    end if;
    event := 'partner_joined';
    summary := 'joined your Bond';
    actor := new.id;
    cid := new.couple_id;
  else
    return new;
  end if;

  begin
    insert into public.partner_signals (couple_id, actor_id, event_type, summary)
    values (cid, actor, event, summary);
  exception
    when undefined_table then null;
  end;

  return new;
end;
$$;

drop trigger if exists partner_signal_goals_upd on public.couple_goals;
create trigger partner_signal_goals_upd
  after update on public.couple_goals
  for each row
  execute function private.emit_partner_signal();

alter table public.couple_goals replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_goals'
  ) then
    execute 'alter publication supabase_realtime add table public.couple_goals';
  end if;
exception
  when undefined_object then null;
end $$;

-- Last week's review stays a look back. Answers cannot be rewritten.
-- AI suggestion hide/edit is personal, not couple-wide.

create or replace function private.enforce_weekly_review_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Weekly review answers cannot be changed';
end;
$$;

drop trigger if exists weekly_reviews_immutable on public.weekly_reviews;
create trigger weekly_reviews_immutable
  before update on public.weekly_reviews
  for each row
  execute function private.enforce_weekly_review_immutable();

revoke update, delete on table public.weekly_reviews from anon, authenticated;
grant select, insert on table public.weekly_reviews to authenticated;

create table if not exists public.weekly_ai_summary_prefs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  week_start date not null,
  hidden boolean not null default false,
  edited_summary text,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists weekly_ai_summary_prefs_couple_week_idx
  on public.weekly_ai_summary_prefs (couple_id, week_start desc);

alter table public.weekly_ai_summary_prefs replica identity full;

revoke all on table public.weekly_ai_summary_prefs from anon, authenticated;
grant select, insert, update on table public.weekly_ai_summary_prefs to authenticated;

alter table public.weekly_ai_summary_prefs enable row level security;

drop policy if exists "weekly_ai_summary_prefs_select_own" on public.weekly_ai_summary_prefs;
create policy "weekly_ai_summary_prefs_select_own"
  on public.weekly_ai_summary_prefs
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "weekly_ai_summary_prefs_insert_own" on public.weekly_ai_summary_prefs;
create policy "weekly_ai_summary_prefs_insert_own"
  on public.weekly_ai_summary_prefs
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

drop policy if exists "weekly_ai_summary_prefs_update_own" on public.weekly_ai_summary_prefs;
create policy "weekly_ai_summary_prefs_update_own"
  on public.weekly_ai_summary_prefs
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

insert into public.weekly_ai_summary_prefs (
  user_id, couple_id, week_start, hidden
)
select dismissed_by, couple_id, week_start, true
from public.weekly_ai_summaries
where dismissed_by is not null
on conflict (user_id, week_start) do nothing;

create or replace function public.leave_couple()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  remaining int;
  couple_deleted boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid
  from public.profiles
  where id = uid;

  if cid is null then
    return json_build_object('ok', true, 'left', false, 'couple_deleted', false);
  end if;

  delete from public.daily_check_ins where user_id = uid;
  delete from public.weekly_reviews where user_id = uid;

  begin
    delete from public.weekly_ai_summary_prefs where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.weekly_ai_summaries where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.partner_signals where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.habit_completions where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.couple_goal_reviews where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.bid_logs where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.appreciations
      where from_user_id = uid or to_user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.daily_actions where proposed_by = uid;
  exception
    when undefined_table then null;
  end;

  update public.profiles
    set couple_id = null
    where id = uid;

  begin
    update public.profiles
      set expo_push_token = null
      where id = uid;
  exception
    when undefined_column then null;
  end;

  select count(*)::int into remaining
  from public.profiles
  where couple_id = cid;

  if remaining = 0 then
    delete from public.couples where id = cid;
    couple_deleted := true;
  else
    update public.couples
      set invite_code = private.generate_invite_code(),
          paired_at = null
      where id = cid;
  end if;

  return json_build_object(
    'ok', true,
    'left', true,
    'couple_deleted', couple_deleted
  );
end;
$$;

alter function public.leave_couple() owner to postgres;

create or replace function public.peek_invite(invite text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  target_id uuid;
  member_count int;
begin
  normalized := upper(trim(invite));
  if normalized !~ '^[A-Z0-9]{6}$' then
    return 'invalid';
  end if;

  select id into target_id
  from public.couples
  where invite_code = normalized;

  if target_id is null then
    return 'expired';
  end if;

  select count(*)::int into member_count
  from public.profiles
  where couple_id = target_id;

  if member_count >= 2 then
    return 'full';
  end if;

  return 'open';
end;
$$;

revoke all on function public.peek_invite(text) from public;
grant execute on function public.peek_invite(text) to anon, authenticated;

create or replace function public.join_couple(invite text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_couple_id uuid;
  target public.couples;
  member_count int;
  normalized text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  normalized := upper(trim(invite));

  if normalized !~ '^[A-Z0-9]{6}$' then
    raise exception 'Invalid invite code';
  end if;

  select couple_id into existing_couple_id
  from public.profiles
  where id = uid;

  if existing_couple_id is not null then
    raise exception 'Already paired';
  end if;

  select * into target
  from public.couples
  where invite_code = normalized;

  if target.id is null then
    raise exception 'Invite expired';
  end if;

  if target.created_by = uid then
    raise exception 'Cannot join your own invite';
  end if;

  select count(*)::int into member_count
  from public.profiles
  where couple_id = target.id;

  if member_count >= 2 then
    raise exception 'Couple is full';
  end if;

  update public.profiles
  set couple_id = target.id
  where id = uid;

  update public.couples
  set paired_at = coalesce(paired_at, now())
  where id = target.id;

  select * into target from public.couples where id = target.id;
  return target;
end;
$$;

revoke all on function public.join_couple(text) from public;
grant execute on function public.join_couple(text) to authenticated;

notify pgrst, 'reload schema';

-- Bond Plus (keep in sync with supabase/migrations/20260827120000_bond_plus.sql)
-- Bond Plus: couple-level entitlement, purchaser-held receipts, funnel.

create table public.couple_entitlements (
  couple_id uuid primary key references public.couples (id) on delete cascade,
  entitlement text not null default 'bond_plus',
  status text not null default 'none',
  plan text,
  purchaser_id uuid references auth.users (id) on delete set null,
  store text,
  store_product_id text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  offer_shown_at timestamptz,
  offer_snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_entitlements_entitlement_check
    check (entitlement = 'bond_plus'),
  constraint couple_entitlements_status_check
    check (status in ('none', 'trialing', 'active', 'grace', 'expired', 'paused')),
  constraint couple_entitlements_plan_check
    check (plan is null or plan in ('trial', 'monthly', 'annual', 'founding_annual')),
  constraint couple_entitlements_store_check
    check (store is null or store in ('apple', 'google', 'stripe', 'founding'))
);

create table public.store_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  couple_id uuid references public.couples (id) on delete set null,
  entitlement text not null default 'bond_plus',
  plan text not null,
  store text not null,
  store_product_id text not null,
  original_transaction_id text not null,
  latest_transaction_id text,
  expires_at timestamptz,
  grace_period_ends_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_receipts_original_uidx unique (store, original_transaction_id),
  constraint store_receipts_plan_check
    check (plan in ('monthly', 'annual', 'founding_annual')),
  constraint store_receipts_status_check
    check (status in ('active', 'grace', 'expired', 'refunded', 'paused'))
);

create index store_receipts_user_id_idx on public.store_receipts (user_id);

create table public.plus_funnel_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint plus_funnel_events_event_check
    check (event in (
      'invite_sent',
      'partner_paired',
      'first_mutual_reveal',
      'third_mutual_reveal',
      'plus_preview_viewed',
      'trial_started',
      'subscription_purchased',
      'four_week_retained',
      'renewal',
      'cancellation'
    ))
);

create unique index plus_funnel_once_per_couple_uidx
  on public.plus_funnel_events (couple_id, event)
  where event in (
    'invite_sent',
    'partner_paired',
    'first_mutual_reveal',
    'third_mutual_reveal',
    'plus_preview_viewed',
    'trial_started',
    'subscription_purchased',
    'four_week_retained'
  );

create table public.couple_prompt_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  prompt_text text not null,
  created_at timestamptz not null default now(),
  constraint couple_prompt_items_text_len check (char_length(trim(prompt_text)) between 1 and 280)
);

create index couple_prompt_items_couple_id_idx on public.couple_prompt_items (couple_id);

alter table public.couple_entitlements enable row level security;
alter table public.store_receipts enable row level security;
alter table public.plus_funnel_events enable row level security;
alter table public.couple_prompt_items enable row level security;

create policy couple_entitlements_select_member
  on public.couple_entitlements for select to authenticated
  using (couple_id = public.current_couple_id());

create policy store_receipts_select_own
  on public.store_receipts for select to authenticated
  using (user_id = (select auth.uid()));

create policy plus_funnel_select_member
  on public.plus_funnel_events for select to authenticated
  using (couple_id = public.current_couple_id());

create policy couple_prompt_items_member
  on public.couple_prompt_items for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (
    couple_id = public.current_couple_id()
    and created_by = (select auth.uid())
  );

create or replace function public.mutual_reveal_count(cid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from (
    select check_in_date
    from public.daily_check_ins
    where couple_id = cid
    group by check_in_date
    having count(distinct user_id) >= 2
  ) opened;
$$;

revoke all on function public.mutual_reveal_count(uuid) from public;
grant execute on function public.mutual_reveal_count(uuid) to authenticated;

create or replace function public.founding_slots_remaining()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    250 - (
      select count(*)::int
      from public.couple_entitlements
      where plan = 'founding_annual'
        and status in ('active', 'grace', 'trialing', 'paused')
    )
  );
$$;

revoke all on function public.founding_slots_remaining() from public;
grant execute on function public.founding_slots_remaining() to authenticated;

create or replace function private.ensure_couple_entitlement(cid uuid)
returns public.couple_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.couple_entitlements;
begin
  insert into public.couple_entitlements (couple_id)
  values (cid)
  on conflict (couple_id) do nothing;

  select * into row from public.couple_entitlements where couple_id = cid;
  return row;
end;
$$;

create or replace function private.refresh_couple_entitlement(cid uuid)
returns public.couple_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.couple_entitlements;
begin
  row := private.ensure_couple_entitlement(cid);

  if row.status = 'trialing'
     and row.trial_ends_at is not null
     and row.trial_ends_at <= now() then
    update public.couple_entitlements
      set status = 'expired', updated_at = now()
      where couple_id = cid
      returning * into row;
  elsif row.status = 'active'
     and row.current_period_ends_at is not null
     and row.current_period_ends_at <= now() then
    if row.grace_period_ends_at is not null and row.grace_period_ends_at > now() then
      update public.couple_entitlements
        set status = 'grace', updated_at = now()
        where couple_id = cid
        returning * into row;
    else
      update public.couple_entitlements
        set status = 'expired', updated_at = now()
        where couple_id = cid
        returning * into row;
    end if;
  elsif row.status = 'grace'
     and (row.grace_period_ends_at is null or row.grace_period_ends_at <= now()) then
    update public.couple_entitlements
      set status = 'expired', updated_at = now()
      where couple_id = cid
      returning * into row;
  end if;

  return row;
end;
$$;

create or replace function public.plus_is_active(cid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.couple_entitlements;
begin
  row := private.refresh_couple_entitlement(cid);
  return row.status in ('trialing', 'active', 'grace');
end;
$$;

revoke all on function public.plus_is_active(uuid) from public;
grant execute on function public.plus_is_active(uuid) to authenticated;

create or replace function private.track_funnel(
  cid uuid,
  uid uuid,
  ev text,
  meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plus_funnel_events (couple_id, user_id, event, metadata)
  values (cid, uid, ev, coalesce(meta, '{}'::jsonb))
  on conflict do nothing;
exception
  when unique_violation then null;
end;
$$;

create or replace function public.track_plus_funnel(ev text, meta jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  if ev not in (
    'invite_sent',
    'plus_preview_viewed'
  ) then
    raise exception 'Event is not client-writable';
  end if;

  perform private.track_funnel(cid, uid, ev, meta);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.track_plus_funnel(text, jsonb) from public;
grant execute on function public.track_plus_funnel(text, jsonb) to authenticated;

create or replace function public.plus_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  row public.couple_entitlements;
  reveals int := 0;
  members int := 0;
  paired timestamptz;
  restore_ok boolean := false;
  has_trialed boolean := false;
  active boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    return json_build_object('ok', false, 'error', 'Not in a Bond');
  end if;

  row := private.refresh_couple_entitlement(cid);
  reveals := public.mutual_reveal_count(cid);
  select count(*)::int into members from public.profiles where couple_id = cid;
  select paired_at into paired from public.couples where id = cid;

  if members >= 2
     and paired is not null
     and paired <= now() - interval '28 days' then
    perform private.track_funnel(cid, uid, 'four_week_retained', '{}'::jsonb);
  end if;

  select exists (
    select 1 from public.store_receipts r
    where r.user_id = uid
      and r.status in ('active', 'grace')
      and (r.expires_at is null or r.expires_at > now()
           or r.grace_period_ends_at > now())
  ) into restore_ok;

  has_trialed := row.trial_started_at is not null;
  active := row.status in ('trialing', 'active', 'grace');

  return json_build_object(
    'ok', true,
    'entitlement', row.entitlement,
    'status', row.status,
    'plan', row.plan,
    'active', active,
    'purchaser_id', row.purchaser_id,
    'is_purchaser', row.purchaser_id = uid,
    'store', row.store,
    'store_product_id', row.store_product_id,
    'trial_started_at', row.trial_started_at,
    'trial_ends_at', row.trial_ends_at,
    'current_period_ends_at', row.current_period_ends_at,
    'grace_period_ends_at', row.grace_period_ends_at,
    'offer_shown_at', row.offer_shown_at,
    'offer_snoozed_until', row.offer_snoozed_until,
    'mutual_reveals', reveals,
    'founding_slots_remaining', public.founding_slots_remaining(),
    'trial_eligible', (not active) and (not has_trialed) and reveals >= 3,
    'offer_eligible',
      (not active)
      and reveals >= 3
      and (row.offer_snoozed_until is null or row.offer_snoozed_until <= now()),
    'restore_available', restore_ok,
    'has_trialed', has_trialed
  );
end;
$$;

revoke all on function public.plus_status() from public;
grant execute on function public.plus_status() to authenticated;

create or replace function public.start_plus_trial()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  row public.couple_entitlements;
  reveals int;
  partner_count int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  select count(*)::int into partner_count
  from public.profiles
  where couple_id = cid;
  if partner_count < 2 then
    raise exception 'Pair first';
  end if;

  reveals := public.mutual_reveal_count(cid);
  if reveals < 3 then
    raise exception 'Trial opens after three days you both reveal';
  end if;

  row := private.refresh_couple_entitlement(cid);
  if row.status in ('trialing', 'active', 'grace') then
    raise exception 'Bond Plus is already on';
  end if;
  if row.trial_started_at is not null then
    raise exception 'This Bond already used its trial';
  end if;

  update public.couple_entitlements
    set status = 'trialing',
        plan = 'trial',
        purchaser_id = uid,
        trial_started_at = now(),
        trial_ends_at = now() + interval '14 days',
        offer_shown_at = coalesce(offer_shown_at, now()),
        updated_at = now()
    where couple_id = cid
    returning * into row;

  perform private.track_funnel(cid, uid, 'trial_started', '{}'::jsonb);

  return json_build_object('ok', true, 'trial_ends_at', row.trial_ends_at);
end;
$$;

revoke all on function public.start_plus_trial() from public;
grant execute on function public.start_plus_trial() to authenticated;

create or replace function public.snooze_plus_offer()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set offer_shown_at = coalesce(offer_shown_at, now()),
        offer_snoozed_until = now() + interval '14 days',
        updated_at = now()
    where couple_id = cid;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.snooze_plus_offer() from public;
grant execute on function public.snooze_plus_offer() to authenticated;

create or replace function public.mark_plus_preview_viewed()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set offer_shown_at = coalesce(offer_shown_at, now()),
        updated_at = now()
    where couple_id = cid;
  perform private.track_funnel(cid, uid, 'plus_preview_viewed', '{}'::jsonb);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.mark_plus_preview_viewed() from public;
grant execute on function public.mark_plus_preview_viewed() to authenticated;

-- Store webhooks (service role) attach a verified receipt to the purchaser
-- and grant Bond Plus to their current couple.
create or replace function public.apply_plus_purchase(
  purchaser uuid,
  cid uuid,
  product_id text,
  store_name text,
  original_tx text,
  latest_tx text,
  expires timestamptz,
  found boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_name text;
  row public.couple_entitlements;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not allowed';
  end if;

  plan_name := case product_id
    when 'bond_plus_monthly' then 'monthly'
    when 'bond_plus_annual' then 'annual'
    when 'bond_plus_founding_annual' then 'founding_annual'
    else null
  end;
  if plan_name is null then
    raise exception 'Unknown product';
  end if;

  if plan_name = 'founding_annual'
     and not exists (
       select 1
       from public.store_receipts
       where store = store_name
         and original_transaction_id = original_tx
     )
     and public.founding_slots_remaining() <= 0 then
    raise exception 'Founding Couple is full';
  end if;

  insert into public.store_receipts (
    user_id,
    couple_id,
    plan,
    store,
    store_product_id,
    original_transaction_id,
    latest_transaction_id,
    expires_at,
    grace_period_ends_at,
    status
  )
  values (
    purchaser,
    cid,
    plan_name,
    store_name,
    product_id,
    original_tx,
    latest_tx,
    expires,
    expires + interval '16 days',
    'active'
  )
  on conflict (store, original_transaction_id) do update
    set latest_transaction_id = excluded.latest_transaction_id,
        expires_at = excluded.expires_at,
        grace_period_ends_at = excluded.grace_period_ends_at,
        couple_id = excluded.couple_id,
        status = 'active',
        updated_at = now();

  row := private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set status = 'active',
        plan = plan_name,
        purchaser_id = purchaser,
        store = store_name,
        store_product_id = product_id,
        current_period_ends_at = expires,
        grace_period_ends_at = expires + interval '16 days',
        updated_at = now()
    where couple_id = cid;

  perform private.track_funnel(cid, purchaser, 'subscription_purchased',
    json_build_object('product_id', product_id, 'store', store_name)::jsonb);

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.apply_plus_purchase(uuid, uuid, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.apply_plus_purchase(uuid, uuid, text, text, text, text, timestamptz, boolean) to service_role;

create or replace function public.restore_plus()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  rec public.store_receipts;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  select * into rec
  from public.store_receipts
  where user_id = uid
    and status in ('active', 'grace')
    and (
      expires_at is null
      or expires_at > now()
      or grace_period_ends_at > now()
    )
  order by expires_at desc nulls last
  limit 1;

  if rec.id is null then
    raise exception 'No Bond Plus purchase to restore';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set status = case
          when rec.expires_at is not null and rec.expires_at <= now() then 'grace'
          else 'active'
        end,
        plan = rec.plan,
        purchaser_id = uid,
        store = rec.store,
        store_product_id = rec.store_product_id,
        current_period_ends_at = rec.expires_at,
        grace_period_ends_at = rec.grace_period_ends_at,
        updated_at = now()
    where couple_id = cid;

  update public.store_receipts
    set couple_id = cid, updated_at = now()
    where id = rec.id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.restore_plus() from public;
grant execute on function public.restore_plus() to authenticated;

-- Funnel: pairing
create or replace function private.on_couple_paired()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paired_at is not null and (old.paired_at is null or old.paired_at is distinct from new.paired_at) then
    perform private.track_funnel(new.id, new.created_by, 'partner_paired', '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists couples_plus_paired on public.couples;
create trigger couples_plus_paired
  after update of paired_at on public.couples
  for each row
  execute function private.on_couple_paired();

-- Funnel: mutual reveals
create or replace function private.on_check_in_mutual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reveals int;
begin
  reveals := public.mutual_reveal_count(new.couple_id);
  if reveals = 1 then
    perform private.track_funnel(new.couple_id, new.user_id, 'first_mutual_reveal', '{}'::jsonb);
  elsif reveals = 3 then
    perform private.track_funnel(new.couple_id, new.user_id, 'third_mutual_reveal', '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists daily_check_ins_plus_mutual on public.daily_check_ins;
create trigger daily_check_ins_plus_mutual
  after insert or update on public.daily_check_ins
  for each row
  execute function private.on_check_in_mutual();

-- Unpair: purchaser leaving pauses Plus; receipts stay with the purchaser.
create or replace function public.leave_couple()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  remaining int;
  couple_deleted boolean := false;
  was_purchaser boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid
  from public.profiles
  where id = uid;

  if cid is null then
    return json_build_object('ok', true, 'left', false, 'couple_deleted', false);
  end if;

  select exists (
    select 1 from public.couple_entitlements
    where couple_id = cid and purchaser_id = uid
  ) into was_purchaser;

  delete from public.daily_check_ins where user_id = uid;
  delete from public.weekly_reviews where user_id = uid;

  begin
    delete from public.weekly_ai_summaries where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.partner_signals where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.habit_completions where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.couple_goal_reviews where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.bid_logs where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.appreciations
      where from_user_id = uid or to_user_id = uid;
  exception
    when undefined_table then null;
  end;

  update public.profiles
    set couple_id = null
    where id = uid;

  begin
    update public.profiles
      set expo_push_token = null
      where id = uid;
  exception
    when undefined_column then null;
  end;

  select count(*)::int into remaining
  from public.profiles
  where couple_id = cid;

  if remaining = 0 then
    update public.store_receipts
      set couple_id = null, updated_at = now()
      where couple_id = cid;
    delete from public.couples where id = cid;
    couple_deleted := true;
  else
    if was_purchaser then
      update public.couple_entitlements
        set status = 'paused', updated_at = now()
        where couple_id = cid;
      update public.store_receipts
        set couple_id = null, updated_at = now()
        where couple_id = cid and user_id = uid;
    end if;
    update public.couples
      set invite_code = private.generate_invite_code(),
          paired_at = null
      where id = cid;
  end if;

  return json_build_object(
    'ok', true,
    'left', true,
    'couple_deleted', couple_deleted
  );
end;
$$;

alter function public.leave_couple() owner to postgres;
revoke all on function public.leave_couple() from public;
grant execute on function public.leave_couple() to authenticated;

notify pgrst, 'reload schema';

-- 20260827140000_plus_lifetime_promo.sql
-- Lifetime Bond Plus via promo code on Us → Purchases.

alter table public.couple_entitlements
  drop constraint if exists couple_entitlements_plan_check;
alter table public.couple_entitlements
  add constraint couple_entitlements_plan_check
  check (plan is null or plan in (
    'trial', 'monthly', 'annual', 'founding_annual', 'lifetime'
  ));

alter table public.couple_entitlements
  drop constraint if exists couple_entitlements_store_check;
alter table public.couple_entitlements
  add constraint couple_entitlements_store_check
  check (store is null or store in (
    'apple', 'google', 'stripe', 'founding', 'promo'
  ));

alter table public.store_receipts
  drop constraint if exists store_receipts_plan_check;
alter table public.store_receipts
  add constraint store_receipts_plan_check
  check (plan in ('monthly', 'annual', 'founding_annual', 'lifetime'));

create or replace function public.restore_plus()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  rec public.store_receipts;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  select * into rec
  from public.store_receipts
  where user_id = uid
    and status in ('active', 'grace')
    and (
      expires_at is null
      or expires_at > now()
      or grace_period_ends_at > now()
    )
  order by (expires_at is null) desc, expires_at desc
  limit 1;

  if rec.id is null then
    raise exception 'No Bond Plus purchase to restore';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set status = case
          when rec.expires_at is not null and rec.expires_at <= now() then 'grace'
          else 'active'
        end,
        plan = rec.plan,
        purchaser_id = uid,
        store = rec.store,
        store_product_id = rec.store_product_id,
        current_period_ends_at = rec.expires_at,
        grace_period_ends_at = rec.grace_period_ends_at,
        updated_at = now()
    where couple_id = cid;

  update public.store_receipts
    set couple_id = cid, updated_at = now()
    where id = rec.id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.restore_plus() from public;
grant execute on function public.restore_plus() to authenticated;

create or replace function public.redeem_plus_promo(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  row public.couple_entitlements;
  normalized text;
  tx text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  normalized := lower(btrim(coalesce(code, '')));
  if normalized is distinct from '43v3r' then
    raise exception 'That code is not valid';
  end if;

  row := private.ensure_couple_entitlement(cid);
  if row.status = 'active' and row.plan = 'lifetime' then
    return json_build_object('ok', true, 'already', true);
  end if;

  tx := 'promo:43v3r:' || uid::text;

  insert into public.store_receipts (
    user_id,
    couple_id,
    plan,
    store,
    store_product_id,
    original_transaction_id,
    latest_transaction_id,
    expires_at,
    grace_period_ends_at,
    status
  )
  values (
    uid,
    cid,
    'lifetime',
    'promo',
    'bond_plus_lifetime_promo',
    tx,
    tx,
    null,
    null,
    'active'
  )
  on conflict (store, original_transaction_id) do update
    set couple_id = excluded.couple_id,
        status = 'active',
        expires_at = null,
        grace_period_ends_at = null,
        updated_at = now();

  update public.couple_entitlements
    set status = 'active',
        plan = 'lifetime',
        purchaser_id = uid,
        store = 'promo',
        store_product_id = 'bond_plus_lifetime_promo',
        current_period_ends_at = null,
        grace_period_ends_at = null,
        updated_at = now()
    where couple_id = cid;

  perform private.track_funnel(
    cid,
    uid,
    'subscription_purchased',
    json_build_object('product_id', 'bond_plus_lifetime_promo', 'store', 'promo')::jsonb
  );

  return json_build_object('ok', true, 'already', false);
end;
$$;

alter function public.redeem_plus_promo(text) owner to postgres;
revoke all on function public.redeem_plus_promo(text) from public;
grant execute on function public.redeem_plus_promo(text) to authenticated;

-- 20260902120000_notification_dedupe.sql
create table if not exists public.notification_dedupe (
  couple_id uuid not null references public.couples (id) on delete cascade,
  event_date date not null,
  event_type text not null,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (couple_id, event_date, event_type, recipient_user_id)
);

alter table public.notification_dedupe enable row level security;

grant select, insert on public.notification_dedupe to service_role;

-- 20260902130000_couple_plays.sql
create table if not exists public.couple_plays (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  kind text not null check (kind in (
    'know_me',
    'choose_date',
    'appreciation',
    'memory',
    'dreams',
    'challenge',
    'ritual',
    'repair'
  )),
  prompt jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);

create index if not exists couple_plays_couple_created_idx
  on public.couple_plays (couple_id, created_at desc);

create table if not exists public.couple_play_answers (
  play_id uuid not null references public.couple_plays (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (play_id, user_id)
);

create index if not exists couple_play_answers_play_idx
  on public.couple_play_answers (play_id);

create or replace function public.has_own_play_answer(p_play_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_play_answers
    where play_id = p_play_id
      and user_id = auth.uid()
  );
$$;

alter function public.has_own_play_answer(uuid) owner to postgres;
revoke all on function public.has_own_play_answer(uuid) from public;
grant execute on function public.has_own_play_answer(uuid) to authenticated;

create or replace function private.enforce_play_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.created_by <> auth.uid() then
    raise exception 'Can only start a play as yourself';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to play';
  end if;

  new.couple_id := profile_couple;
  return new;
end;
$$;

drop trigger if exists couple_plays_set_couple on public.couple_plays;
create trigger couple_plays_set_couple
  before insert on public.couple_plays
  for each row
  execute function private.enforce_play_couple();

create or replace function private.enforce_play_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Can only answer as yourself';
  end if;

  if not exists (
    select 1
    from public.couple_plays
    where id = new.play_id
      and couple_id = public.current_couple_id()
  ) then
    raise exception 'Play is not in this Bond';
  end if;

  return new;
end;
$$;

drop trigger if exists couple_play_answers_enforce on public.couple_play_answers;
create trigger couple_play_answers_enforce
  before insert on public.couple_play_answers
  for each row
  execute function private.enforce_play_answer();

create or replace function private.reveal_play_when_both()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  answer_count integer;
begin
  select count(*) into answer_count
  from public.couple_play_answers
  where play_id = new.play_id;

  if answer_count >= 2 then
    update public.couple_plays
      set revealed_at = coalesce(revealed_at, now())
      where id = new.play_id;
  end if;

  return new;
end;
$$;

drop trigger if exists couple_play_answers_reveal on public.couple_play_answers;
create trigger couple_play_answers_reveal
  after insert on public.couple_play_answers
  for each row
  execute function private.reveal_play_when_both();

grant select, insert on public.couple_plays to authenticated;
grant select, insert on public.couple_play_answers to authenticated;

alter table public.couple_plays enable row level security;
alter table public.couple_play_answers enable row level security;

drop policy if exists "couple_plays_select_own_bond" on public.couple_plays;
create policy "couple_plays_select_own_bond"
  on public.couple_plays
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

drop policy if exists "couple_plays_insert_own" on public.couple_plays;
create policy "couple_plays_insert_own"
  on public.couple_plays
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

drop policy if exists "couple_play_answers_select_blind_reveal" on public.couple_play_answers;
create policy "couple_play_answers_select_blind_reveal"
  on public.couple_play_answers
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_own_play_answer(play_id)
  );

drop policy if exists "couple_play_answers_insert_own" on public.couple_play_answers;
create policy "couple_play_answers_insert_own"
  on public.couple_play_answers
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
