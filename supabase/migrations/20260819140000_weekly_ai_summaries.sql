-- Couple-shared AI weekly summaries (check-in narrative)

create table public.weekly_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text not null,
  source text not null default 'ai'
    check (source in ('ai', 'fallback')),
  model text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_ai_summaries_range check (week_end >= week_start),
  constraint weekly_ai_summaries_couple_week_unique unique (couple_id, week_start)
);

create index weekly_ai_summaries_couple_week_idx
  on public.weekly_ai_summaries (couple_id, week_start desc);

create or replace function private.touch_weekly_ai_summary_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger weekly_ai_summaries_updated_at
  before update on public.weekly_ai_summaries
  for each row
  execute function private.touch_weekly_ai_summary_updated_at();

grant select, insert, update on public.weekly_ai_summaries to authenticated;

alter table public.weekly_ai_summaries enable row level security;

create policy "weekly_ai_summaries_select_couple"
  on public.weekly_ai_summaries
  for select
  to authenticated
  using (
    couple_id = public.current_couple_id()
  );

create policy "weekly_ai_summaries_insert_couple"
  on public.weekly_ai_summaries
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
  );

create policy "weekly_ai_summaries_update_couple"
  on public.weekly_ai_summaries
  for update
  to authenticated
  using (
    couple_id = public.current_couple_id()
  )
  with check (
    couple_id = public.current_couple_id()
  );

-- Edge function may also write with the service role.
