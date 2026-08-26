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

notify pgrst, 'reload schema';
