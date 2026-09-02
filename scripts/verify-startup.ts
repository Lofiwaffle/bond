/**
 * First-open gates. Run: npx --yes tsx scripts/verify-startup.ts
 */
import {
  FIRST_LAUNCH_TIMEOUT_MS,
  SESSION_RESTORE_ERROR,
  SESSION_RESTORE_TIMEOUT_MS,
  SUPABASE_FETCH_TIMEOUT_MS,
  SUPABASE_INIT_TIMEOUT_MS,
  abortAfter,
  captureInviteFromWindowLocation,
  fetchWithTimeout,
  withTimeout,
} from '../lib/startup'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('native skips window.location', captureInviteFromWindowLocation('android') === false)
assert('ios skips window.location', captureInviteFromWindowLocation('ios') === false)
assert('web reads window.location', captureInviteFromWindowLocation('web') === true)

assert('init timeout is short', SUPABASE_INIT_TIMEOUT_MS <= 5_000)
assert('first launch timeout is short', FIRST_LAUNCH_TIMEOUT_MS <= 5_000)
assert('session timeout is bounded', SESSION_RESTORE_TIMEOUT_MS <= 12_000)
assert('fetch timeout is bounded', SUPABASE_FETCH_TIMEOUT_MS <= 20_000)
assert('restore copy asks to retry', SESSION_RESTORE_ERROR.includes('try again'))

async function main() {
  const abort = abortAfter(20)
  assert('abort signal starts live', abort.aborted === false)
  assert('fetchWithTimeout is exported', typeof fetchWithTimeout === 'function')

  await new Promise((resolve) => setTimeout(resolve, 40))
  assert('abort signal fires', abort.aborted === true)

  const quick = await withTimeout(Promise.resolve('ok'), 1_000, () => 'late')
  assert('withTimeout keeps a fast result', quick === 'ok')

  const hung = await withTimeout(
    new Promise<string>(() => {}),
    30,
    () => 'fallback',
  )
  assert('withTimeout unblocks a hung promise', hung === 'fallback')

  let rejected = false
  try {
    await withTimeout(Promise.reject(new Error('boom')), 1_000, () => 'late')
  } catch (error) {
    rejected = error instanceof Error && error.message === 'boom'
  }
  assert('withTimeout still rejects', rejected)

  let timedOut = false
  try {
    await withTimeout(
      new Promise<string>(() => {}),
      20,
      () => {
        throw new Error(SESSION_RESTORE_ERROR)
      },
    )
  } catch (error) {
    timedOut = error instanceof Error && error.message === SESSION_RESTORE_ERROR
  }
  assert('withTimeout can fail closed', timedOut)

  console.log('startup gates ok')
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
