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
