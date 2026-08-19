-- Allow couple members to cache weekly AI / fallback summaries from the app

grant insert, update on public.weekly_ai_summaries to authenticated;

drop policy if exists "weekly_ai_summaries_insert_couple" on public.weekly_ai_summaries;
create policy "weekly_ai_summaries_insert_couple"
  on public.weekly_ai_summaries
  for insert
  to authenticated
  with check (
    couple_id = public.current_couple_id()
  );

drop policy if exists "weekly_ai_summaries_update_couple" on public.weekly_ai_summaries;
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
