-- Play Store: users who can create an account must be able to delete it.

alter table public.couples
  alter column created_by drop not null;

alter table public.couples
  drop constraint if exists couples_created_by_fkey;

alter table public.couples
  add constraint couples_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

create or replace function public.delete_own_account()
returns void
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
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
