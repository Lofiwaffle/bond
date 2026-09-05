/**
 * Seed two paired accounts with Together rounds in every board state, so the
 * Growth board can be checked by hand: ready to open, your turn, waiting.
 * Run: npx --yes tsx scripts/seed-together-board.ts
 * Point it at the hosted project with EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
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

async function answer(
  supabase: SupabaseClient,
  playId: string,
  userId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('couple_play_answers')
    .insert({ play_id: playId, user_id: userId, payload })
  if (error) throw new Error(`answer: ${error.message}`)
}

async function main() {
  const stamp = Date.now()
  const password = 'board-test-123'
  const emailA = `board-a-${stamp}@bondtest.dev`
  const emailB = `board-b-${stamp}@bondtest.dev`

  const a = client()
  const b = client()

  const signUpA = await a.auth.signUp({
    email: emailA,
    password,
    options: { data: { display_name: 'Avery' } },
  })
  if (signUpA.error) throw signUpA.error
  const signUpB = await b.auth.signUp({
    email: emailB,
    password,
    options: { data: { display_name: 'Sam' } },
  })
  if (signUpB.error) throw signUpB.error

  const userA = signUpA.data.user?.id
  const userB = signUpB.data.user?.id
  if (!userA || !userB) throw new Error('signup did not return users (email confirmation on?)')
  if (!signUpA.data.session) throw new Error('no session for A (email confirmation on?)')

  const created = await a.rpc('create_couple')
  if (created.error) throw created.error
  const coupleId = created.data.id as string
  const joined = await b.rpc('join_couple', {
    invite: created.data.invite_code as string,
  })
  if (joined.error) throw joined.error

  // Ready to open: both answered.
  const ready = await a
    .from('couple_plays')
    .insert({
      couple_id: coupleId,
      kind: 'know_me',
      prompt: { id: 'km1', text: 'My ideal Saturday is…' },
      created_by: userA,
    })
    .select('id')
    .single()
  if (ready.error) throw ready.error
  await answer(a, ready.data.id as string, userA, { option: 'A long walk outside' })
  await answer(b, ready.data.id as string, userB, { guess: 'A long walk outside' })

  // Your turn (signed in as A): B answered, A has not.
  const yourTurn = await b
    .from('couple_plays')
    .insert({
      couple_id: coupleId,
      kind: 'memory',
      prompt: { id: 'm2', text: 'Which day together would you relive?' },
      created_by: userB,
    })
    .select('id')
    .single()
  if (yourTurn.error) throw yourTurn.error
  await answer(b, yourTurn.data.id as string, userB, {
    text: 'The rainy afternoon we stayed in and made soup.',
  })

  // Waiting for Sam: A answered, B has not.
  const waiting = await a
    .from('couple_plays')
    .insert({
      couple_id: coupleId,
      kind: 'dreams',
      prompt: {},
      created_by: userA,
    })
    .select('id')
    .single()
  if (waiting.error) throw waiting.error
  await answer(a, waiting.data.id as string, userA, {
    travel: ['A long train trip'],
    home: ['A kitchen we cook in often'],
    family: [],
    finances: [],
    lifestyle: ['Slower mornings'],
  })

  // Three check-ins so Growth is past its quiet state.
  for (let i = 2; i >= 0; i -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    const date = day.toISOString().slice(0, 10)
    for (const [supabase, userId, score] of [
      [a, userA, 4],
      [b, userB, 4],
    ] as const) {
      const { error } = await supabase.from('daily_check_ins').insert({
        couple_id: coupleId,
        user_id: userId,
        check_in_date: date,
        score,
        note: 'Seeded for the Growth board check.',
      })
      if (error) throw new Error(`check-in ${date}: ${error.message}`)
    }
  }

  console.log('Together board seeded.')
  console.log(`  Avery: ${emailA}`)
  console.log(`  Sam:   ${emailB}`)
  console.log(`  Password: ${password}`)
  console.log('Sign in as Avery: ready (know me), your turn (memory), waiting (dreams).')
}

main().catch((error) => {
  console.error('seed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
