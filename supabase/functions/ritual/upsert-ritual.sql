-- upsert_ritual: Co-create or update a shared ritual (P0 feature 3)
-- Usage: couple creates/modifies a recurring ritual (e.g., "Sunday walk, phones away")
create or replace function public.upsert_ritual(
  p_couple_id uuid,
  p_name text,
  p_frequency text,
  p_description text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row rituals%rowtype;
  updated_row rituals%rowtype;
  owner1 uuid;
  owner2 uuid;
begin
  -- Find rituals owned by either partner (at least one co-owner)
  select * into existing_row
  from public.rituals
  where couple_id = p_couple_id
    and (p_name = any(co_owners) or co_owners @> array[p_name]::text[])  -- simplified: check if ritual exists
  limit 1;

  -- Actually, let's search by name instead
  select * into existing_row
  from public.rituals
  where couple_id = p_couple_id
    and name = p_name
  limit 1;

  if existing_row is null then
    -- Insert new ritual with initial streak 0
    insert into public.rituals (couple_id, name, frequency, description, co_owners, streak, last_completed, created_at)
    values (p_couple_id, p_name, p_frequency, p_description, '{}'::text[], 0, null, now())
    returning * into updated_row;
    return json_build_object('status', 'inserted', 'data', row_to_json(updated_row));
  else
    -- Update existing ritual
    update public.rituals
    set frequency = p_frequency,
        description = p_description,
        last_completed = now(),
        streak = (existing_row.streak + 1),
        co_owners = array_append(existing_row.co_owners, (select auth.uid()))
    where id = existing_row.id
    returning * into updated_row;
    return json_build_object('status', 'updated', 'data', row_to_json(updated_row));
  end if;
end;
$$;