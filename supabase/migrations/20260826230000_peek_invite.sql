-- Peek an invite without joining. Anon can tell expired/full/invalid apart
-- before they create an account. Does not return couple ids or names.

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
