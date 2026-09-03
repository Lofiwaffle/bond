-- Catch-up for a hosted Bond project that was created before these tables existed.
-- Paste the whole file in the Supabase SQL editor. Safe to re-run.
--
-- Fixes these console errors:
--   Could not find the table 'public.daily_actions' in the schema cache
--   Could not find the table 'public.weekly_ai_summary_prefs' in the schema cache
--   Could not find the table 'public.couple_prompt_items' in the schema cache
--   new row violates row-level security policy for table "partner_signals"
--
-- Do not run bootstrap.sql on a project that already has couples.

-- 1. One small shared action per couple per day -------------------------------

create table if not exists public.daily_actions (
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

create index if not exists daily_actions_couple_status_idx
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

drop policy if exists "daily_actions_select_couple" on public.daily_actions;
create policy "daily_actions_select_couple"
  on public.daily_actions
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

drop policy if exists "daily_actions_insert_own" on public.daily_actions;
create policy "daily_actions_insert_own"
  on public.daily_actions
  for insert
  to authenticated
  with check (
    proposed_by = (select auth.uid())
    and couple_id = public.current_couple_id()
    and status = 'proposed'
  );

drop policy if exists "daily_actions_update_couple" on public.daily_actions;
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

-- 2. Per-person hide/edit for a weekly suggestion -----------------------------

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

-- 3. Questions only the two of you see ----------------------------------------

create table if not exists public.couple_prompt_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  prompt_text text not null,
  created_at timestamptz not null default now(),
  constraint couple_prompt_items_text_len
    check (char_length(trim(prompt_text)) between 1 and 280)
);

create index if not exists couple_prompt_items_couple_id_idx
  on public.couple_prompt_items (couple_id);

grant select, insert, update, delete on table public.couple_prompt_items to authenticated;

alter table public.couple_prompt_items enable row level security;

drop policy if exists couple_prompt_items_member on public.couple_prompt_items;
create policy couple_prompt_items_member
  on public.couple_prompt_items for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (
    couple_id = public.current_couple_id()
    and created_by = (select auth.uid())
  );

-- 4. One partner can schedule a Together activity, no approval ----------------

grant insert on public.partner_signals to authenticated;

drop policy if exists "partner_signals_insert_nudge" on public.partner_signals;
create policy "partner_signals_insert_nudge"
  on public.partner_signals
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and couple_id = public.current_couple_id()
    and event_type in ('check_in_nudge', 'together_scheduled')
  );

notify pgrst, 'reload schema';
