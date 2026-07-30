-- Bond Phase 2: daily check-ins with blind-then-reveal RLS

create table public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  check_in_date date not null,
  score smallint not null,
  note text,
  created_at timestamptz not null default now(),
  constraint daily_check_ins_score_range check (score between 1 and 5),
  constraint daily_check_ins_note_length check (note is null or char_length(note) <= 500),
  constraint daily_check_ins_user_date_unique unique (user_id, check_in_date)
);

create index daily_check_ins_couple_date_idx
  on public.daily_check_ins (couple_id, check_in_date desc);

-- Ensure couple_id always matches the submitting user's profile couple
create or replace function private.enforce_check_in_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Can only create your own check-in';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to check in';
  end if;

  new.couple_id := profile_couple;
  return new;
end;
$$;

create trigger daily_check_ins_set_couple
  before insert on public.daily_check_ins
  for each row
  execute function private.enforce_check_in_couple();

-- Helper avoids RLS recursion when checking whether the caller submitted today
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

grant select, insert on public.daily_check_ins to authenticated;

alter table public.daily_check_ins enable row level security;

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

create policy "daily_check_ins_insert_own"
  on public.daily_check_ins
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );
