-- list_repair_cards: Return all pre-populated repair cards (P0 feature 5, P1)
create or replace function public.list_repair_cards()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cards repair_card[];
  result json;
begin
  select json_agg(row_to_json(x))
  into result
  from (
    select id, title, prompt, category
    from public.repair_cards
    order by category, title
  ) x;

  return coalease(result, '[]'::json);
end;
$$;