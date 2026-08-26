-- 20260730120000_phase1_foundation.sql
-- Bond Phase 1: profiles, couples, pairing RPCs, RLS

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  constraint couples_invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$')
);

create unique index couples_invite_code_uidx on public.couples (invite_code);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

create index profiles_couple_id_idx on public.profiles (couple_id);

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
      split_part(new.email, '@', 1),
      'Partner'
    )
  );
  return new;
end;
$$;

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
  timestamp timestamptz not null default now(),
  constraint appreciations_unique unique (from_user_id, to_user_id, date(timestamp))
);

create index appreciations_couple_idx
  on public.appreciations (couple_id, timestamp desc);

alter table public.appreciations enable row level security;

create policy "appreciations_select_own_and_partner"
  on public.appreciations
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
    )
  );

create policy "appreciations_insert_own"
  on public.appreciations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
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
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
    )
  );

create policy "rituals_insert_own"
  on public.rituals
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

create policy "rituals_update_own_streak"
  on public.rituals
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
  ('De-escalation', "I'm flooding. Can we take a 20-min break?", 'deescalation'),
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

