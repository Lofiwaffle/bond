-- upsert_bid_log: Log a bid-turning-toward moment (P0 feature 1)
-- Usage: user logs whether they turned toward a bid from their partner yesterday
create or replace function public.upsert_bid_log(
  p_couple_id uuid,
  p_user_id uuid,
  p_date date,
  p_turned_toward boolean,
  p_note text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row bid_logs%rowtype;
  updated_row bid_logs%rowtype;
begin
  -- Check if there's already a bid log entry for this user/date
  select * into existing_row
  from public.bid_logs
  where couple_id = p_couple_id
    and user_id = p_user_id
    and date = p_date;

  if existing_row is null then
    -- Insert new entry
    insert into public.bid_logs (couple_id, user_id, date, turned_toward, note, created_at)
    values (p_couple_id, p_user_id, p_date, p_turned_toward, p_note, now())
    returning * into updated_row;
    return json_build_object('status', 'inserted', 'data', row_to_json(updated_row));
  else
    -- Update existing entry
    update public.bid_logs
    set turned_toward = p_turned_toward,
        note = p_note,
        created_at = now()
    where couple_id = p_couple_id
      and user_id = p_user_id
      and date = p_date
    returning * into updated_row;
    return json_build_object('status', 'updated', 'data', row_to_json(updated_row));
  end if;
end;
$$;