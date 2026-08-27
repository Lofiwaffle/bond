-- Owner may correct a check-in until the partner submits that day.
-- After both rows exist, both entries lock. Identity columns cannot be reassigned.

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
