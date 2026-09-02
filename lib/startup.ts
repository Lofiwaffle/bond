/** First-open gates. None of these may spin forever on a store install. */

export const SUPABASE_INIT_TIMEOUT_MS = 4_000
export const FIRST_LAUNCH_TIMEOUT_MS = 4_000
export const SESSION_RESTORE_TIMEOUT_MS = 8_000
export const SUPABASE_FETCH_TIMEOUT_MS = 15_000

export const SESSION_RESTORE_ERROR =
  "Couldn't restore your session. Check your connection and try again."

/** Native apps have no address bar. Reading window.location there can throw. */
export function captureInviteFromWindowLocation(os: string): boolean {
  return os === 'web'
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }
    const timer = setTimeout(() => {
      finish(() => {
        try {
          resolve(fallback())
        } catch (error) {
          reject(error)
        }
      })
    }, ms)
    promise.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    )
  })
}

export function abortAfter(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  ms: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const onCallerAbort = () => controller.abort()
  try {
    if (init?.signal) {
      if (init.signal.aborted) controller.abort()
      else init.signal.addEventListener('abort', onCallerAbort)
    }
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    init?.signal?.removeEventListener('abort', onCallerAbort)
  }
}
