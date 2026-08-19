-- Habit badges: couples log real-world completions of the 5 badge habits
-- (spark/glow/forge/bond/sync), independent of the daily check-in streak.

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id text not null check (habit_id in ('spark', 'glow', 'forge', 'bond', 'sync')),
  note text null default null,
  created_at timestamptz not null default now()
);

create index habit_completions_couple_habit_idx
  on public.habit_completions (couple_id, habit_id, created_at desc);

grant select, insert on public.habit_completions to authenticated;

alter table public.habit_completions enable row level security;

create policy "habit_completions_select_couple"
  on public.habit_completions
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "habit_completions_insert_own"
  on public.habit_completions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );
