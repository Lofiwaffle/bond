-- Dedupe key for Expo push from notify-partner / notify-special-dates.
-- Service role only; authenticated clients never read this table.

create table if not exists public.notification_dedupe (
  couple_id uuid not null references public.couples (id) on delete cascade,
  event_date date not null,
  event_type text not null,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (couple_id, event_date, event_type, recipient_user_id)
);

alter table public.notification_dedupe enable row level security;

grant select, insert on public.notification_dedupe to service_role;
