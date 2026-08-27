-- Lifetime Bond Plus via promo code on Us → Purchases.

alter table public.couple_entitlements
  drop constraint if exists couple_entitlements_plan_check;
alter table public.couple_entitlements
  add constraint couple_entitlements_plan_check
  check (plan is null or plan in (
    'trial', 'monthly', 'annual', 'founding_annual', 'lifetime'
  ));

alter table public.couple_entitlements
  drop constraint if exists couple_entitlements_store_check;
alter table public.couple_entitlements
  add constraint couple_entitlements_store_check
  check (store is null or store in (
    'apple', 'google', 'stripe', 'founding', 'promo'
  ));

alter table public.store_receipts
  drop constraint if exists store_receipts_plan_check;
alter table public.store_receipts
  add constraint store_receipts_plan_check
  check (plan in ('monthly', 'annual', 'founding_annual', 'lifetime'));

-- Prefer a lifetime (non-expiring) receipt when restoring.
create or replace function public.restore_plus()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  rec public.store_receipts;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  select * into rec
  from public.store_receipts
  where user_id = uid
    and status in ('active', 'grace')
    and (
      expires_at is null
      or expires_at > now()
      or grace_period_ends_at > now()
    )
  order by (expires_at is null) desc, expires_at desc
  limit 1;

  if rec.id is null then
    raise exception 'No Bond Plus purchase to restore';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set status = case
          when rec.expires_at is not null and rec.expires_at <= now() then 'grace'
          else 'active'
        end,
        plan = rec.plan,
        purchaser_id = uid,
        store = rec.store,
        store_product_id = rec.store_product_id,
        current_period_ends_at = rec.expires_at,
        grace_period_ends_at = rec.grace_period_ends_at,
        updated_at = now()
    where couple_id = cid;

  update public.store_receipts
    set couple_id = cid, updated_at = now()
    where id = rec.id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.restore_plus() from public;
grant execute on function public.restore_plus() to authenticated;

create or replace function public.redeem_plus_promo(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  row public.couple_entitlements;
  normalized text;
  tx text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  normalized := lower(btrim(coalesce(code, '')));
  if normalized is distinct from '43v3r' then
    raise exception 'That code is not valid';
  end if;

  row := private.ensure_couple_entitlement(cid);
  if row.status = 'active' and row.plan = 'lifetime' then
    return json_build_object('ok', true, 'already', true);
  end if;

  tx := 'promo:43v3r:' || uid::text;

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
    uid,
    cid,
    'lifetime',
    'promo',
    'bond_plus_lifetime_promo',
    tx,
    tx,
    null,
    null,
    'active'
  )
  on conflict (store, original_transaction_id) do update
    set couple_id = excluded.couple_id,
        status = 'active',
        expires_at = null,
        grace_period_ends_at = null,
        updated_at = now();

  update public.couple_entitlements
    set status = 'active',
        plan = 'lifetime',
        purchaser_id = uid,
        store = 'promo',
        store_product_id = 'bond_plus_lifetime_promo',
        current_period_ends_at = null,
        grace_period_ends_at = null,
        updated_at = now()
    where couple_id = cid;

  perform private.track_funnel(
    cid,
    uid,
    'subscription_purchased',
    json_build_object('product_id', 'bond_plus_lifetime_promo', 'store', 'promo')::jsonb
  );

  return json_build_object('ok', true, 'already', false);
end;
$$;

alter function public.redeem_plus_promo(text) owner to postgres;
revoke all on function public.redeem_plus_promo(text) from public;
grant execute on function public.redeem_plus_promo(text) to authenticated;

notify pgrst, 'reload schema';
