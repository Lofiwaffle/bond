-- upsert_appreciation: Log a one-tap appreciation (P0 feature 2)
-- Usage: user taps 💛 button → logs appreciation for partner
create or replace function public.upsert_appreciation(
  p_couple_id uuid,
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_category text,
  p_message text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row appreciations%rowtype;
  updated_row appreciations%rowtype;
begin
  -- Check for existing appreciation from same user to same partner on same day
  select * into existing_row
  from public.appreciations
  where couple_id = p_couple_id
    and from_user_id = p_from_user_id
    and to_user_id = p_to_user_id
    and date(timestamp) = date(now());

  if existing_row is null then
    -- Insert new entry
    insert into public.appreciations (couple_id, from_user_id, to_user_id, category, message, timestamp)
    values (p_couple_id, p_from_user_id, p_to_user_id, p_category, p_message, now())
    returning * into updated_row;
    return json_build_object('status', 'inserted', 'data', row_to_json(updated_row));
  else
    -- Update existing entry (light re-engagement)
    update public.appreciations
    set message = p_message,
        timestamp = now()
    where couple_id = p_couple_id
      and from_user_id = p_from_user_id
      and to_user_id = p_to_user_id
      and date(timestamp) = date(now())
    returning * into updated_row;
    return json_build_object('status', 'updated', 'data', row_to_json(updated_row));
  end if;
end;
$$;