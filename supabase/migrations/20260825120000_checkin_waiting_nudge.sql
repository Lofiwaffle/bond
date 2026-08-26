-- Optional respectful nudge while waiting. No scores or notes in the row.
-- Check-in rows stay insert-only so a score cannot be revised after reveal.
grant insert on public.partner_signals to authenticated;

drop policy if exists "partner_signals_insert_nudge" on public.partner_signals;
create policy "partner_signals_insert_nudge"
  on public.partner_signals
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and couple_id = public.current_couple_id()
    and event_type = 'check_in_nudge'
  );
