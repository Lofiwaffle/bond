/**
 * Manual Phase 1 verification against local Supabase.
 * Run: npx --yes tsx scripts/verify-pairing.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const anon =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

function client() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function main() {
  const stamp = Date.now()
  const emailA = `partner-a-${stamp}@example.com`
  const emailB = `partner-b-${stamp}@example.com`
  const password = 'test-password-123'

  const a = client()
  const b = client()

  const signUpA = await a.auth.signUp({
    email: emailA,
    password,
    options: { data: { display_name: 'Partner A' } },
  })
  if (signUpA.error) throw signUpA.error

  const signUpB = await b.auth.signUp({
    email: emailB,
    password,
    options: { data: { display_name: 'Partner B' } },
  })
  if (signUpB.error) throw signUpB.error

  const created = await a.rpc('create_couple')
  if (created.error) throw created.error

  const inviteCode = created.data.invite_code as string
  console.log('Invite code:', inviteCode)

  const joined = await b.rpc('join_couple', { invite: inviteCode })
  if (joined.error) throw joined.error

  const profileA = await a
    .from('profiles')
    .select('*')
    .eq('id', signUpA.data.user!.id)
    .single()
  const profileB = await b
    .from('profiles')
    .select('*')
    .eq('id', signUpB.data.user!.id)
    .single()
  if (profileA.error) throw profileA.error
  if (profileB.error) throw profileB.error

  if (!profileA.data.couple_id || profileA.data.couple_id !== profileB.data.couple_id) {
    throw new Error(
      `couple_id mismatch: A=${profileA.data.couple_id} B=${profileB.data.couple_id}`,
    )
  }

  console.log('✅ Shared couple_id:', profileA.data.couple_id)
  console.log('Partner A:', profileA.data.display_name)
  console.log('Partner B:', profileB.data.display_name)
}

main().catch((err) => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})
