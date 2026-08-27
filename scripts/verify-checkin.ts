/**
 * Phase 2 verification: blind-then-reveal daily check-ins.
 * Run: set -a && source .env && set +a && npx --yes tsx scripts/verify-checkin.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

function client(): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  const stamp = Date.now()
  const password = 'test-password-123'
  const a = client()
  const b = client()

  const signUpA = await a.auth.signUp({
    email: `checkin-a-${stamp}@example.com`,
    password,
    options: { data: { display_name: 'Checkin A' } },
  })
  if (signUpA.error) throw signUpA.error

  const signUpB = await b.auth.signUp({
    email: `checkin-b-${stamp}@example.com`,
    password,
    options: { data: { display_name: 'Checkin B' } },
  })
  if (signUpB.error) throw signUpB.error

  const created = await a.rpc('create_couple')
  if (created.error) throw created.error
  const joined = await b.rpc('join_couple', {
    invite: created.data.invite_code as string,
  })
  if (joined.error) throw joined.error

  const coupleId = created.data.id as string
  const date = today()

  const insertA = await a.from('daily_check_ins').insert({
    couple_id: coupleId,
    user_id: signUpA.data.user!.id,
    check_in_date: date,
    score: 4,
    note: 'Feeling close',
  })
  if (insertA.error) throw insertA.error

  // B should NOT see A's check-in yet
  const beforeB = await b
    .from('daily_check_ins')
    .select('*')
    .eq('check_in_date', date)
  if (beforeB.error) throw beforeB.error
  if ((beforeB.data ?? []).length !== 0) {
    throw new Error('Blind failed: B saw A before submitting')
  }

  // A can see own only
  const beforeA = await a
    .from('daily_check_ins')
    .select('*')
    .eq('check_in_date', date)
  if (beforeA.error) throw beforeA.error
  if ((beforeA.data ?? []).length !== 1) {
    throw new Error(`Expected A to see 1 row, got ${(beforeA.data ?? []).length}`)
  }

  const reviseA = await a
    .from('daily_check_ins')
    .update({ score: 2, note: 'Corrected' })
    .eq('user_id', signUpA.data.user!.id)
    .eq('check_in_date', date)
    .select('score, note, revised_at')
    .single()
  if (reviseA.error) throw reviseA.error
  if (reviseA.data.score !== 2 || !reviseA.data.revised_at) {
    throw new Error('Owner revise failed while waiting')
  }

  const steal = await b
    .from('daily_check_ins')
    .update({ score: 1 })
    .eq('user_id', signUpA.data.user!.id)
    .eq('check_in_date', date)
    .select('id')
  if (steal.error) throw steal.error
  if ((steal.data ?? []).length !== 0) {
    throw new Error('Partner updated owner row while waiting')
  }

  const insertB = await b.from('daily_check_ins').insert({
    couple_id: coupleId,
    user_id: signUpB.data.user!.id,
    check_in_date: date,
    score: 5,
    note: 'Very connected',
  })
  if (insertB.error) throw insertB.error

  const afterA = await a
    .from('daily_check_ins')
    .select('*')
    .eq('check_in_date', date)
  const afterB = await b
    .from('daily_check_ins')
    .select('*')
    .eq('check_in_date', date)
  if (afterA.error) throw afterA.error
  if (afterB.error) throw afterB.error

  if ((afterA.data ?? []).length !== 2 || (afterB.data ?? []).length !== 2) {
    throw new Error(
      `Reveal failed: A=${(afterA.data ?? []).length} B=${(afterB.data ?? []).length}`,
    )
  }

  const locked = await a
    .from('daily_check_ins')
    .update({ score: 1, note: 'too late' })
    .eq('user_id', signUpA.data.user!.id)
    .eq('check_in_date', date)
    .select('id')
  if (locked.error && locked.error.code !== 'P0001') {
    throw locked.error
  }
  if ((locked.data ?? []).length !== 0) {
    throw new Error('Lock failed: A updated after B submitted')
  }

  console.log('✅ Blind-then-reveal OK for', date)
  console.log(
    'Scores:',
    (afterA.data ?? [])
      .map((row) => `${row.user_id.slice(0, 8)}=${row.score}`)
      .join(', '),
  )
}

main().catch((err) => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})
