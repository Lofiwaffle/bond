-- Shared together-activities with the same blind-then-reveal pattern as check-ins.

create table if not exists public.couple_plays (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  kind text not null check (kind in (
    'know_me',
    'choose_date',
    'appreciation',
    'memory',
    'dreams',
    'challenge',
    'ritual',
    'repair'
  )),
  prompt jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);

create index if not exists couple_plays_couple_created_idx
  on public.couple_plays (couple_id, created_at desc);

create table if not exists public.couple_play_answers (
  play_id uuid not null references public.couple_plays (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (play_id, user_id)
);

create index if not exists couple_play_answers_play_idx
  on public.couple_play_answers (play_id);

create or replace function public.has_own_play_answer(p_play_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_play_answers
    where play_id = p_play_id
      and user_id = auth.uid()
  );
$$;

alter function public.has_own_play_answer(uuid) owner to postgres;
revoke all on function public.has_own_play_answer(uuid) from public;
grant execute on function public.has_own_play_answer(uuid) to authenticated;

create or replace function private.enforce_play_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.created_by <> auth.uid() then
    raise exception 'Can only start a play as yourself';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to play';
  end if;

  new.couple_id := profile_couple;
  return new;
end;
$$;

drop trigger if exists couple_plays_set_couple on public.couple_plays;
create trigger couple_plays_set_couple
  before insert on public.couple_plays
  for each row
  execute function private.enforce_play_couple();

create or replace function private.enforce_play_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Can only answer as yourself';
  end if;

  if not exists (
    select 1
    from public.couple_plays
    where id = new.play_id
      and couple_id = public.current_couple_id()
  ) then
    raise exception 'Play is not in this Bond';
  end if;

  return new;
end;
$$;

drop trigger if exists couple_play_answers_enforce on public.couple_play_answers;
create trigger couple_play_answers_enforce
  before insert on public.couple_play_answers
  for each row
  execute function private.enforce_play_answer();

create or replace function private.reveal_play_when_both()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  answer_count integer;
begin
  select count(*) into answer_count
  from public.couple_play_answers
  where play_id = new.play_id;

  if answer_count >= 2 then
    update public.couple_plays
      set revealed_at = coalesce(revealed_at, now())
      where id = new.play_id;
  end if;

  return new;
end;
$$;

drop trigger if exists couple_play_answers_reveal on public.couple_play_answers;
create trigger couple_play_answers_reveal
  after insert on public.couple_play_answers
  for each row
  execute function private.reveal_play_when_both();

grant select, insert on public.couple_plays to authenticated;
grant select, insert on public.couple_play_answers to authenticated;

alter table public.couple_plays enable row level security;
alter table public.couple_play_answers enable row level security;

drop policy if exists "couple_plays_select_own_bond" on public.couple_plays;
create policy "couple_plays_select_own_bond"
  on public.couple_plays
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

drop policy if exists "couple_plays_insert_own" on public.couple_plays;
create policy "couple_plays_insert_own"
  on public.couple_plays
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

drop policy if exists "couple_play_answers_select_blind_reveal" on public.couple_play_answers;
create policy "couple_play_answers_select_blind_reveal"
  on public.couple_play_answers
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_own_play_answer(play_id)
  );

drop policy if exists "couple_play_answers_insert_own" on public.couple_play_answers;
create policy "couple_play_answers_insert_own"
  on public.couple_play_answers
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
