-- SMART fields on the shared couple goal

alter table public.couple_goals
  add column if not exists success_criteria text,
  add column if not exists realistic_plan text,
  add column if not exists deadline date;

do $$ begin
  alter table public.couple_goals
    add constraint couple_goals_success_criteria_length
    check (
      success_criteria is null
      or char_length(trim(success_criteria)) between 8 and 200
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.couple_goals
    add constraint couple_goals_realistic_plan_length
    check (
      realistic_plan is null
      or char_length(trim(realistic_plan)) between 8 and 200
    );
exception when duplicate_object then null;
end $$;
