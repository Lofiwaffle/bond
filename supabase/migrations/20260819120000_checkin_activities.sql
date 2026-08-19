-- Add optional activity tags to daily check-ins (tap-to-select categories)

alter table public.daily_check_ins
  add column if not exists activities text[] not null default '{}';

alter table public.daily_check_ins
  drop constraint if exists daily_check_ins_activities_valid;

alter table public.daily_check_ins
  add constraint daily_check_ins_activities_valid check (
    cardinality(activities) <= 5
    and activities <@ array[
      'sports',
      'work',
      'food',
      'home',
      'social',
      'rest',
      'travel',
      'other'
    ]::text[]
  );
