-- Bond Phase 1: profiles, couples, pairing RPCs, RLS

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  constraint couples_invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$')
);

create unique index couples_invite_code_uidx on public.couples (invite_code);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

create index profiles_couple_id_idx on public.profiles (couple_id);

-- ---------------------------------------------------------------------------
-- Profile bootstrap on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1),
      'Partner'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_couple_id() from public;
grant execute on function public.current_couple_id() to authenticated;

create or replace function private.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';
    for idx in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.couples where invite_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pairing RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_couple()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_couple_id uuid;
  new_couple public.couples;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into existing_couple_id
  from public.profiles
  where id = uid;

  if existing_couple_id is not null then
    raise exception 'Already paired';
  end if;

  insert into public.couples (invite_code, created_by)
  values (private.generate_invite_code(), uid)
  returning * into new_couple;

  update public.profiles
  set couple_id = new_couple.id
  where id = uid;

  return new_couple;
end;
$$;

revoke all on function public.create_couple() from public;
grant execute on function public.create_couple() to authenticated;

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
    raise exception 'Invalid invite code';
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

-- ---------------------------------------------------------------------------
-- Grants (Data API)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.couples to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;

create policy "profiles_select_own_or_partner"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (
      couple_id is not null
      and couple_id = public.current_couple_id()
    )
  );

create policy "profiles_update_own_display_name"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "couples_select_own"
  on public.couples
  for select
  to authenticated
  using (id = public.current_couple_id());
