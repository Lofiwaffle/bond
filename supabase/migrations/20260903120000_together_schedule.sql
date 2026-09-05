-- One person can schedule a Together activity without partner approval.
-- Safe to re-run.

grant insert on public.partner_signals to authenticated;

drop policy if exists "partner_signals_insert_nudge" on public.partner_signals;
create policy "partner_signals_insert_nudge"
  on public.partner_signals
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and couple_id = public.current_couple_id()
    and event_type in ('check_in_nudge', 'together_scheduled')
  );

notify pgrst, 'reload schema';
