-- Owner-only reminder preferences. Defaults are off so Bond does not
-- interrupt until someone opts in.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_enabled boolean not null default false,
  daily_time time not null default '20:00:00',
  reveal_enabled boolean not null default false,
  timezone text not null default 'UTC',
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start smallint not null default 22
    check (quiet_hours_start >= 0 and quiet_hours_start <= 23),
  quiet_hours_end smallint not null default 8
    check (quiet_hours_end >= 0 and quiet_hours_end <= 23),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notification_preferences to service_role;

create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

alter function public.ensure_notification_preferences() owner to postgres;
revoke all on function public.ensure_notification_preferences() from public;

drop trigger if exists on_profile_notification_prefs on public.profiles;
create trigger on_profile_notification_prefs
  after insert on public.profiles
  for each row
  execute function public.ensure_notification_preferences();

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
