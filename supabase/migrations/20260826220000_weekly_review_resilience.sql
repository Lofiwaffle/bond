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

notify pgrst, 'reload schema';
