-- Phase 5 (partial): weekly reviews with blind-then-reveal

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint weekly_reviews_range check (week_end >= week_start),
  constraint weekly_reviews_user_week_unique unique (user_id, week_start)
);

create index weekly_reviews_couple_week_idx
  on public.weekly_reviews (couple_id, week_start desc);

create or replace function private.enforce_weekly_review_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_couple uuid;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Can only create your own weekly review';
  end if;

  select couple_id into profile_couple
  from public.profiles
  where id = auth.uid();

  if profile_couple is null then
    raise exception 'You must be paired to submit a weekly review';
  end if;

  new.couple_id := profile_couple;
  return new;
end;
$$;

create trigger weekly_reviews_set_couple
  before insert on public.weekly_reviews
  for each row
  execute function private.enforce_weekly_review_couple();

create or replace function public.has_own_weekly_review(
  p_couple_id uuid,
  p_week_start date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.weekly_reviews
    where user_id = auth.uid()
      and couple_id = p_couple_id
      and week_start = p_week_start
  );
$$;

revoke all on function public.has_own_weekly_review(uuid, date) from public;
grant execute on function public.has_own_weekly_review(uuid, date) to authenticated;

grant select, insert on public.weekly_reviews to authenticated;

alter table public.weekly_reviews enable row level security;

create policy "weekly_reviews_select_blind_reveal"
  on public.weekly_reviews
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
      and (select public.has_own_weekly_review(couple_id, week_start))
    )
  );

create policy "weekly_reviews_insert_own"
  on public.weekly_reviews
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );
