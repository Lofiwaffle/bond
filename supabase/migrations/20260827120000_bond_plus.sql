-- Bond Plus: couple-level entitlement, purchaser-held receipts, funnel.

create table public.couple_entitlements (
  couple_id uuid primary key references public.couples (id) on delete cascade,
  entitlement text not null default 'bond_plus',
  status text not null default 'none',
  plan text,
  purchaser_id uuid references auth.users (id) on delete set null,
  store text,
  store_product_id text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  offer_shown_at timestamptz,
  offer_snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_entitlements_entitlement_check
    check (entitlement = 'bond_plus'),
  constraint couple_entitlements_status_check
    check (status in ('none', 'trialing', 'active', 'grace', 'expired', 'paused')),
  constraint couple_entitlements_plan_check
    check (plan is null or plan in ('trial', 'monthly', 'annual', 'founding_annual')),
  constraint couple_entitlements_store_check
    check (store is null or store in ('apple', 'google', 'stripe', 'founding'))
);

create table public.store_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  couple_id uuid references public.couples (id) on delete set null,
  entitlement text not null default 'bond_plus',
  plan text not null,
  store text not null,
  store_product_id text not null,
  original_transaction_id text not null,
  latest_transaction_id text,
  expires_at timestamptz,
  grace_period_ends_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_receipts_original_uidx unique (store, original_transaction_id),
  constraint store_receipts_plan_check
    check (plan in ('monthly', 'annual', 'founding_annual')),
  constraint store_receipts_status_check
    check (status in ('active', 'grace', 'expired', 'refunded', 'paused'))
);

create index store_receipts_user_id_idx on public.store_receipts (user_id);

create table public.plus_funnel_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint plus_funnel_events_event_check
    check (event in (
      'invite_sent',
      'partner_paired',
      'first_mutual_reveal',
      'third_mutual_reveal',
      'plus_preview_viewed',
      'trial_started',
      'subscription_purchased',
      'four_week_retained',
      'renewal',
      'cancellation'
    ))
);

create unique index plus_funnel_once_per_couple_uidx
  on public.plus_funnel_events (couple_id, event)
  where event in (
    'invite_sent',
    'partner_paired',
    'first_mutual_reveal',
    'third_mutual_reveal',
    'plus_preview_viewed',
    'trial_started',
    'subscription_purchased',
    'four_week_retained'
  );

create table public.couple_prompt_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  prompt_text text not null,
  created_at timestamptz not null default now(),
  constraint couple_prompt_items_text_len check (char_length(trim(prompt_text)) between 1 and 280)
);

create index couple_prompt_items_couple_id_idx on public.couple_prompt_items (couple_id);

alter table public.couple_entitlements enable row level security;
alter table public.store_receipts enable row level security;
alter table public.plus_funnel_events enable row level security;
alter table public.couple_prompt_items enable row level security;

create policy couple_entitlements_select_member
  on public.couple_entitlements for select to authenticated
  using (couple_id = public.current_couple_id());

create policy store_receipts_select_own
  on public.store_receipts for select to authenticated
  using (user_id = (select auth.uid()));

create policy plus_funnel_select_member
  on public.plus_funnel_events for select to authenticated
  using (couple_id = public.current_couple_id());

create policy couple_prompt_items_member
  on public.couple_prompt_items for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (
    couple_id = public.current_couple_id()
    and created_by = (select auth.uid())
  );

create or replace function public.mutual_reveal_count(cid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from (
    select check_in_date
    from public.daily_check_ins
    where couple_id = cid
    group by check_in_date
    having count(distinct user_id) >= 2
  ) opened;
$$;

revoke all on function public.mutual_reveal_count(uuid) from public;
grant execute on function public.mutual_reveal_count(uuid) to authenticated;

create or replace function public.founding_slots_remaining()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    250 - (
      select count(*)::int
      from public.couple_entitlements
      where plan = 'founding_annual'
        and status in ('active', 'grace', 'trialing', 'paused')
    )
  );
$$;

revoke all on function public.founding_slots_remaining() from public;
grant execute on function public.founding_slots_remaining() to authenticated;

create or replace function private.ensure_couple_entitlement(cid uuid)
returns public.couple_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.couple_entitlements;
begin
  insert into public.couple_entitlements (couple_id)
  values (cid)
  on conflict (couple_id) do nothing;

  select * into row from public.couple_entitlements where couple_id = cid;
  return row;
end;
$$;

create or replace function private.refresh_couple_entitlement(cid uuid)
returns public.couple_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.couple_entitlements;
begin
  row := private.ensure_couple_entitlement(cid);

  if row.status = 'trialing'
     and row.trial_ends_at is not null
     and row.trial_ends_at <= now() then
    update public.couple_entitlements
      set status = 'expired', updated_at = now()
      where couple_id = cid
      returning * into row;
  elsif row.status = 'active'
     and row.current_period_ends_at is not null
     and row.current_period_ends_at <= now() then
    if row.grace_period_ends_at is not null and row.grace_period_ends_at > now() then
      update public.couple_entitlements
        set status = 'grace', updated_at = now()
        where couple_id = cid
        returning * into row;
    else
      update public.couple_entitlements
        set status = 'expired', updated_at = now()
        where couple_id = cid
        returning * into row;
    end if;
  elsif row.status = 'grace'
     and (row.grace_period_ends_at is null or row.grace_period_ends_at <= now()) then
    update public.couple_entitlements
      set status = 'expired', updated_at = now()
      where couple_id = cid
      returning * into row;
  end if;

  return row;
end;
$$;

create or replace function public.plus_is_active(cid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.couple_entitlements;
begin
  row := private.refresh_couple_entitlement(cid);
  return row.status in ('trialing', 'active', 'grace');
end;
$$;

revoke all on function public.plus_is_active(uuid) from public;
grant execute on function public.plus_is_active(uuid) to authenticated;

create or replace function private.track_funnel(
  cid uuid,
  uid uuid,
  ev text,
  meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plus_funnel_events (couple_id, user_id, event, metadata)
  values (cid, uid, ev, coalesce(meta, '{}'::jsonb))
  on conflict do nothing;
exception
  when unique_violation then null;
end;
$$;

create or replace function public.track_plus_funnel(ev text, meta jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  if ev not in (
    'invite_sent',
    'plus_preview_viewed'
  ) then
    raise exception 'Event is not client-writable';
  end if;

  perform private.track_funnel(cid, uid, ev, meta);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.track_plus_funnel(text, jsonb) from public;
grant execute on function public.track_plus_funnel(text, jsonb) to authenticated;

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
    'trial_eligible', (not active) and (not has_trialed) and reveals >= 3,
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
  reveals int;
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

  reveals := public.mutual_reveal_count(cid);
  if reveals < 3 then
    raise exception 'Trial opens after three days you both reveal';
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
        trial_ends_at = now() + interval '14 days',
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

create or replace function public.snooze_plus_offer()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set offer_shown_at = coalesce(offer_shown_at, now()),
        offer_snoozed_until = now() + interval '14 days',
        updated_at = now()
    where couple_id = cid;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.snooze_plus_offer() from public;
grant execute on function public.snooze_plus_offer() to authenticated;

create or replace function public.mark_plus_preview_viewed()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select couple_id into cid from public.profiles where id = uid;
  if cid is null then
    raise exception 'Not in a Bond';
  end if;

  perform private.ensure_couple_entitlement(cid);
  update public.couple_entitlements
    set offer_shown_at = coalesce(offer_shown_at, now()),
        updated_at = now()
    where couple_id = cid;
  perform private.track_funnel(cid, uid, 'plus_preview_viewed', '{}'::jsonb);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.mark_plus_preview_viewed() from public;
grant execute on function public.mark_plus_preview_viewed() to authenticated;

-- Store webhooks (service role) attach a verified receipt to the purchaser
-- and grant Bond Plus to their current couple.
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
declare
  plan_name text;
  row public.couple_entitlements;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not allowed';
  end if;

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
        status = 'active',
        updated_at = now();

  row := private.ensure_couple_entitlement(cid);
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

revoke all on function public.apply_plus_purchase(uuid, uuid, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.apply_plus_purchase(uuid, uuid, text, text, text, text, timestamptz, boolean) to service_role;

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
  order by expires_at desc nulls last
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

-- Funnel: pairing
create or replace function private.on_couple_paired()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paired_at is not null and (old.paired_at is null or old.paired_at is distinct from new.paired_at) then
    perform private.track_funnel(new.id, new.created_by, 'partner_paired', '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists couples_plus_paired on public.couples;
create trigger couples_plus_paired
  after update of paired_at on public.couples
  for each row
  execute function private.on_couple_paired();

-- Funnel: mutual reveals
create or replace function private.on_check_in_mutual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reveals int;
begin
  reveals := public.mutual_reveal_count(new.couple_id);
  if reveals = 1 then
    perform private.track_funnel(new.couple_id, new.user_id, 'first_mutual_reveal', '{}'::jsonb);
  elsif reveals = 3 then
    perform private.track_funnel(new.couple_id, new.user_id, 'third_mutual_reveal', '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists daily_check_ins_plus_mutual on public.daily_check_ins;
create trigger daily_check_ins_plus_mutual
  after insert or update on public.daily_check_ins
  for each row
  execute function private.on_check_in_mutual();

-- Unpair: purchaser leaving pauses Plus; receipts stay with the purchaser.
create or replace function public.leave_couple()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  remaining int;
  couple_deleted boolean := false;
  was_purchaser boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into cid
  from public.profiles
  where id = uid;

  if cid is null then
    return json_build_object('ok', true, 'left', false, 'couple_deleted', false);
  end if;

  select exists (
    select 1 from public.couple_entitlements
    where couple_id = cid and purchaser_id = uid
  ) into was_purchaser;

  delete from public.daily_check_ins where user_id = uid;
  delete from public.weekly_reviews where user_id = uid;

  begin
    delete from public.weekly_ai_summaries where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.partner_signals where couple_id = cid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.habit_completions where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.couple_goal_reviews where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.bid_logs where user_id = uid;
  exception
    when undefined_table then null;
  end;
  begin
    delete from public.appreciations
      where from_user_id = uid or to_user_id = uid;
  exception
    when undefined_table then null;
  end;

  update public.profiles
    set couple_id = null
    where id = uid;

  begin
    update public.profiles
      set expo_push_token = null
      where id = uid;
  exception
    when undefined_column then null;
  end;

  select count(*)::int into remaining
  from public.profiles
  where couple_id = cid;

  if remaining = 0 then
    update public.store_receipts
      set couple_id = null, updated_at = now()
      where couple_id = cid;
    delete from public.couples where id = cid;
    couple_deleted := true;
  else
    if was_purchaser then
      update public.couple_entitlements
        set status = 'paused', updated_at = now()
        where couple_id = cid;
      update public.store_receipts
        set couple_id = null, updated_at = now()
        where couple_id = cid and user_id = uid;
    end if;
    update public.couples
      set invite_code = private.generate_invite_code(),
          paired_at = null
      where id = cid;
  end if;

  return json_build_object(
    'ok', true,
    'left', true,
    'couple_deleted', couple_deleted
  );
end;
$$;

alter function public.leave_couple() owner to postgres;
revoke all on function public.leave_couple() from public;
grant execute on function public.leave_couple() to authenticated;

notify pgrst, 'reload schema';
