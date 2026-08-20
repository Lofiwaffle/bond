-- Let partners hear new daily check-ins so Entries can reveal both sides.

alter table public.daily_check_ins replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_check_ins'
  ) then
    execute 'alter publication supabase_realtime add table public.daily_check_ins';
  end if;
end $$;
