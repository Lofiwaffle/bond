-- Bond Plus: $5.99/month, $60/year, 7-day limited free trial after pairing.

create or replace function public.plus_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  row public.couple_entitlements;
  reveals int := 0;
  members int := 0;
  paired timestamptz;
  restore_ok boolean := false;
  has_trialed boolean := false;
  active boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    return json_build_object('ok', false, 'error', 'Not in a Bond');
  end if;

  row := private.refresh_couple_entitlement(cid);
  reveals := public.mutual_reveal_count(cid);
  select count(*)::int into members from public.profiles where couple_id = cid;
  select paired_at into paired from public.couples where id = cid;

  if members >= 2
     and paired is not null
     and paired <= now() - interval '28 days' then
    perform private.track_funnel(cid, uid, 'four_week_retained', '{}'::jsonb);
  end if;

  select exists (
    select 1 from public.store_receipts r
    where r.user_id = uid
      and r.status in ('active', 'grace')
      and (r.expires_at is null or r.expires_at > now()
           or r.grace_period_ends_at > now())
  ) into restore_ok;

  has_trialed := row.trial_started_at is not null;
  active := row.status in ('trialing', 'active', 'grace');

  return json_build_object(
    'ok', true,
    'entitlement', row.entitlement,
    'status', row.status,
    'plan', row.plan,
    'active', active,
    'purchaser_id', row.purchaser_id,
    'is_purchaser', row.purchaser_id = uid,
    'store', row.store,
    'store_product_id', row.store_product_id,
    'trial_started_at', row.trial_started_at,
    'trial_ends_at', row.trial_ends_at,
    'current_period_ends_at', row.current_period_ends_at,
    'grace_period_ends_at', row.grace_period_ends_at,
    'offer_shown_at', row.offer_shown_at,
    'offer_snoozed_until', row.offer_snoozed_until,
    'mutual_reveals', reveals,
    'founding_slots_remaining', public.founding_slots_remaining(),
    'trial_eligible', (not active) and (not has_trialed) and members >= 2,
    'offer_eligible',
      (not active)
      and reveals >= 3
      and (row.offer_snoozed_until is null or row.offer_snoozed_until <= now()),
    'restore_available', restore_ok,
    'has_trialed', has_trialed
  );
end;
$$;

revoke all on function public.plus_status() from public;
grant execute on function public.plus_status() to authenticated;

create or replace function public.start_plus_trial()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  row public.couple_entitlements;
  partner_count int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  select count(*)::int into partner_count
  from public.profiles
  where couple_id = cid;
  if partner_count < 2 then
    raise exception 'Pair first';
  end if;

  row := private.refresh_couple_entitlement(cid);
  if row.status in ('trialing', 'active', 'grace') then
    raise exception 'Bond Plus is already on';
  end if;
  if row.trial_started_at is not null then
    raise exception 'This Bond already used its trial';
  end if;

  update public.couple_entitlements
    set status = 'trialing',
        plan = 'trial',
        purchaser_id = uid,
        trial_started_at = now(),
        trial_ends_at = now() + interval '7 days',
        offer_shown_at = coalesce(offer_shown_at, now()),
        updated_at = now()
    where couple_id = cid
    returning * into row;

  perform private.track_funnel(cid, uid, 'trial_started', '{}'::jsonb);

  return json_build_object('ok', true, 'trial_ends_at', row.trial_ends_at);
end;
$$;

revoke all on function public.start_plus_trial() from public;
grant execute on function public.start_plus_trial() to authenticated;

notify pgrst, 'reload schema';
