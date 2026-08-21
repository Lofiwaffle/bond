-- Couple-visible activity pings (no private notes/scores) so partners can be
-- notified even when the underlying row is still blind-reveal.

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
