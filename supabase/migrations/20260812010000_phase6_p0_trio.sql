-- Phase 6 (partial): P0 trio — bid logs, appreciations, rituals, repair cards

create table public.bid_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  turned_toward boolean not null default true,
  note text null default null,
  created_at timestamptz not null default now()
);

create index bid_logs_couple_date_idx
  on public.bid_logs (couple_id, date desc);

alter table public.bid_logs enable row level security;

create policy "bid_logs_select_own_and_partner"
  on public.bid_logs
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
    )
  );

create policy "bid_logs_insert_own"
  on public.bid_logs
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-------------------------------------------------------------------

create table public.appreciations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('support','humor','effort','presence','other')),
  message text null default null,
  timestamp timestamptz not null default now()
);

create unique index appreciations_unique
  on public.appreciations (from_user_id, to_user_id, ((timestamp at time zone 'utc')::date));

create index appreciations_couple_idx
  on public.appreciations (couple_id, timestamp desc);

alter table public.appreciations enable row level security;

create policy "appreciations_select_own_and_partner"
  on public.appreciations
  for select
  to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
    or (
      couple_id = public.current_couple_id()
    )
  );

create policy "appreciations_insert_own"
  on public.appreciations
  for insert
  to authenticated
  with check (
    from_user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );

-------------------------------------------------------------------

create table public.rituals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  frequency text not null check (frequency in ('daily','weekly','monthly','custom')),
  streak integer not null default 0,
  last_completed timestamptz null default null,
  co_owners text[] not null default '{}',
  description text null default null,
  created_at timestamptz not null default now()
);

create index rituals_couple_idx
  on public.rituals (couple_id);

alter table public.rituals enable row level security;

create policy "rituals_select_own_and_partner"
  on public.rituals
  for select
  to authenticated
  using (
    couple_id = public.current_couple_id()
  );

create policy "rituals_insert_own"
  on public.rituals
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
  );

create policy "rituals_update_own_streak"
  on public.rituals
  for update
  to authenticated
  using (
    couple_id = public.current_couple_id()
  )
  with check (
    couple_id = public.current_couple_id()
  );

-------------------------------------------------------------------

create table public.repair_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  category text not null check (category in ('humor','apology','validation','deescalation','affection')),
  created_at timestamptz not null default now()
);

alter table public.repair_cards enable row level security;

create policy "repair_cards_select_all"
  on public.repair_cards
  for select
  to authenticated
  using (true);

-- Pre-populate with core repair card types
insert into public.repair_cards (title, prompt, category) values
  ('Humor', 'Can we do the "ridiculous accent" thing to lighten the mood?', 'humor'),
  ('Apology', 'I snapped. I am sorry for raising my voice.', 'apology'),
  ('Validation', 'You are right that I did not listen. Tell me more.', 'validation'),
  ('De-escalation', "I'm flooding. Can we take a 20-min break?", 'deescalation'),
  ('Affection', '*reaches for hand*', 'affection');