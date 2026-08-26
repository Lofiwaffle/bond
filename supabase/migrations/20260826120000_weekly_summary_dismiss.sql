-- Optional AI weekly summaries can be edited or dismissed by either partner.
-- Original generated text stays so a dismiss does not erase the couple's record.

alter table public.weekly_ai_summaries
  add column if not exists original_summary text,
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_by uuid references public.profiles (id) on delete set null;

update public.weekly_ai_summaries
set original_summary = summary
where original_summary is null;
