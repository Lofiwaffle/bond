-- Let each partner edit notes on achievements they logged, so Our Memories
-- can be updated after the fact. Ownership cannot be reassigned.

grant update on public.habit_completions to authenticated;

create policy "habit_completions_update_own"
  on public.habit_completions
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  )
  with check (
    user_id = (select auth.uid())
    and couple_id = public.current_couple_id()
  );
