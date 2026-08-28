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
