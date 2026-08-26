/**
 * Simulate seven check-ins so weekly review unlocks for two fresh test accounts.
 * Run: npx --yes tsx scripts/simulate-weekly-review.ts
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

function localDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function insertWeek(
  supabase: SupabaseClient,
  userId: string,
  coupleId: string,
  baseScore: number,
) {
  for (let i = 6; i >= 0; i--) {
    const score = Math.min(5, Math.max(1, baseScore + ((6 - i) % 3) - 1))
    const { error } = await supabase.from('daily_check_ins').insert({
      couple_id: coupleId,
      user_id: userId,
      check_in_date: localDate(-i),
      score,
      note: i === 0 ? 'Simulated today note' : `Simulated day -${i}`,
    })
    if (error) throw error
  }
}

async function main() {
  const stamp = Date.now()
  const password = 'weekly-test-123'
  const emailA = `weekly-a-${stamp}@example.com`
  const emailB = `weekly-b-${stamp}@example.com`

  const a = client()
  const b = client()

  const signUpA = await a.auth.signUp({
    email: emailA,
    password,
    options: { data: { display_name: 'Weekly A' } },
  })
  if (signUpA.error) throw signUpA.error

  const signUpB = await b.auth.signUp({
    email: emailB,
    password,
    options: { data: { display_name: 'Weekly B' } },
  })
  if (signUpB.error) throw signUpB.error

  const created = await a.rpc('create_couple')
  if (created.error) throw created.error

  const joined = await b.rpc('join_couple', {
    invite: created.data.invite_code as string,
  })
  if (joined.error) throw joined.error

  const coupleId = created.data.id as string
  await insertWeek(a, signUpA.data.user!.id, coupleId, 4)
  await insertWeek(b, signUpB.data.user!.id, coupleId, 3)

  console.log('✅ Weekly review simulation ready')
  console.log('')
  console.log('Sign in as either account in the app:')
  console.log(`  Partner A: ${emailA}`)
  console.log(`  Partner B: ${emailB}`)
  console.log(`  Password:  ${password}`)
  console.log('')
  console.log('Then open Check in → “Start weekly check-in”')
  console.log('(Both have seven check-ins ending today.)')
}

main().catch((err) => {
  console.error('❌ Simulation failed:', err)
  process.exit(1)
})
