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

notify pgrst, 'reload schema';
