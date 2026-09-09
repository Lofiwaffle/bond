-- Catch-up: grant Bond Plus from Play / App Store checkout.
-- Paste in the hosted SQL editor after catchup_plus_pricing.sql. Safe to re-run.

create or replace function private.grant_plus_purchase(
  purchaser uuid,
  cid uuid,
  product_id text,
  store_name text,
  original_tx text,
  latest_tx text,
  expires timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_name text;
begin
  plan_name := case product_id
    when 'bond_plus_monthly' then 'monthly'
    when 'bond_plus_annual' then 'annual'
    when 'bond_plus_founding_annual' then 'founding_annual'
    else null
  end;
  if plan_name is null then
    raise exception 'Unknown product';
  end if;

  if plan_name = 'founding_annual'
     and not exists (
       select 1
       from public.store_receipts
       where store = store_name
         and original_transaction_id = original_tx
     )
     and public.founding_slots_remaining() <= 0 then
    raise exception 'Founding Couple is full';
  end if;

  insert into public.store_receipts (
    user_id,
    couple_id,
    plan,
    store,
    store_product_id,
    original_transaction_id,
    latest_transaction_id,
    expires_at,
    grace_period_ends_at,
    status
  )
  values (
    purchaser,
    cid,
    plan_name,
    store_name,
    product_id,
    original_tx,
    latest_tx,
    expires,
    expires + interval '16 days',
    'active'
  )
  on conflict (store, original_transaction_id) do update
    set latest_transaction_id = excluded.latest_transaction_id,
        expires_at = excluded.expires_at,
        grace_period_ends_at = excluded.grace_period_ends_at,
        couple_id = excluded.couple_id,
        user_id = excluded.user_id,
        status = 'active',
        updated_at = now();

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set status = 'active',
        plan = plan_name,
        purchaser_id = purchaser,
        store = store_name,
        store_product_id = product_id,
        current_period_ends_at = expires,
        grace_period_ends_at = expires + interval '16 days',
        updated_at = now()
    where couple_id = cid;

  perform private.track_funnel(cid, purchaser, 'subscription_purchased',
    json_build_object('product_id', product_id, 'store', store_name)::jsonb);

  return json_build_object('ok', true);
end;
$$;

create or replace function public.apply_plus_purchase(
  purchaser uuid,
  cid uuid,
  product_id text,
  store_name text,
  original_tx text,
  latest_tx text,
  expires timestamptz,
  found boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not allowed';
  end if;

  return private.grant_plus_purchase(
    purchaser,
    cid,
    product_id,
    store_name,
    original_tx,
    latest_tx,
    expires
  );
end;
$$;

revoke all on function public.apply_plus_purchase(uuid, uuid, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.apply_plus_purchase(uuid, uuid, text, text, text, text, timestamptz, boolean) to service_role;

create or replace function public.claim_plus_store_purchase(
  p_product_id text,
  p_store text,
  p_original_transaction_id text,
  p_latest_transaction_id text default null,
  p_expires_at timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  expires timestamptz;
  existing_uid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_product_id not in ('bond_plus_monthly', 'bond_plus_annual') then
    raise exception 'Unknown product';
  end if;
  if p_store not in ('apple', 'google') then
    raise exception 'Unknown store';
  end if;
  if p_original_transaction_id is null
     or length(btrim(p_original_transaction_id)) < 6 then
    raise exception 'Missing transaction';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Create a Bond first';
  end if;

  select r.user_id into existing_uid
  from public.store_receipts r
  where r.store = p_store
    and r.original_transaction_id = btrim(p_original_transaction_id);

  if existing_uid is not null and existing_uid <> uid then
    raise exception 'This purchase is already on another Bond account';
  end if;

  if p_expires_at is null then
    expires := case p_product_id
      when 'bond_plus_annual' then now() + interval '1 year'
      else now() + interval '1 month'
    end;
  else
    expires := p_expires_at;
  end if;

  return private.grant_plus_purchase(
    uid,
    cid,
    p_product_id,
    p_store,
    btrim(p_original_transaction_id),
    coalesce(nullif(btrim(p_latest_transaction_id), ''), btrim(p_original_transaction_id)),
    expires
  );
end;
$$;

revoke all on function public.claim_plus_store_purchase(text, text, text, text, timestamptz) from public;
grant execute on function public.claim_plus_store_purchase(text, text, text, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';
