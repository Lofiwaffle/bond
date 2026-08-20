-- Shared couple goal (one active outcome) + daily check-in prompt answers

alter table public.daily_check_ins
  add column prompt_id text,
  add column prompt_text text,
  add column prompt_answer text;

alter table public.daily_check_ins
  add constraint daily_check_ins_prompt_text_length
  check (prompt_text is null or char_length(prompt_text) <= 280);

alter table public.daily_check_ins
  add constraint daily_check_ins_prompt_answer_length
  check (prompt_answer is null or char_length(prompt_answer) <= 500);

create table public.couple_goals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  outcome text not null,
  why text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint couple_goals_status_check check (status in ('active', 'completed')),
  constraint couple_goals_outcome_length check (
    char_length(trim(outcome)) between 8 and 140
  ),
  constraint couple_goals_why_length check (
    why is null or char_length(why) <= 280
  ),
  constraint couple_goals_completed_at_check check (
    (status = 'active' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create unique index couple_goals_one_active
  on public.couple_goals (couple_id)
  where status = 'active';

create index couple_goals_couple_created_idx
  on public.couple_goals (couple_id, created_at desc);

create table public.couple_goal_reviews (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.couple_goals (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  constraint couple_goal_reviews_note_length check (
    char_length(trim(note)) between 1 and 500
  )
);

create index couple_goal_reviews_goal_idx
  on public.couple_goal_reviews (goal_id, created_at desc);

grant select, insert, update on public.couple_goals to authenticated;
grant select, insert on public.couple_goal_reviews to authenticated;

alter table public.couple_goals enable row level security;
alter table public.couple_goal_reviews enable row level security;

create policy "couple_goals_select_couple"
  on public.couple_goals
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "couple_goals_insert_couple"
  on public.couple_goals
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
    and created_by = (select auth.uid())
    and status = 'active'
  );

create policy "couple_goals_update_couple"
  on public.couple_goals
  for update
  to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

create policy "couple_goal_reviews_select_couple"
  on public.couple_goal_reviews
  for select
  to authenticated
  using (couple_id = public.current_couple_id());

create policy "couple_goal_reviews_insert_own"
  on public.couple_goal_reviews
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
    and user_id = (select auth.uid())
  );
