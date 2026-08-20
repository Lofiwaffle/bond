-- Recreate account deletion so authenticated users can remove themselves
-- (Play policy). Hosted Postgres needs a security definer owned by postgres
-- that can delete from auth.users.

alter table public.couples
  alter column created_by drop not null;

alter table public.couples
  drop constraint if exists couples_created_by_fkey;

alter table public.couples
  add constraint couples_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

drop function if exists public.delete_own_account();

create function public.delete_own_account()
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

  update public.profiles
    set couple_id = null
    where id = uid;

  delete from public.couples c
    where not exists (
      select 1 from public.profiles p where p.couple_id = c.id
    );

  delete from auth.users where id = uid;

  return json_build_object('ok', true);
end;
$$;

alter function public.delete_own_account() owner to postgres;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

notify pgrst, 'reload schema';
