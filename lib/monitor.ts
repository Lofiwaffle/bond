type ErrorArea = 'auth' | 'supabase' | 'notifications' | 'app' | 'export'

type ErrorPayload = {
  area: ErrorArea
  message: string
  at: string
  extra?: Record<string, string>
}

const recent: ErrorPayload[] = []
const MAX = 40
const listeners = new Set<(payload: ErrorPayload) => void>()

function asMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong'
}

/** Record a client failure without sending secrets or payloads. */
export function reportError(
  area: ErrorArea,
  error: unknown,
  extra?: Record<string, string>,
): void {
  const payload: ErrorPayload = {
    area,
    message: asMessage(error),
    at: new Date().toISOString(),
    extra,
  }
  recent.unshift(payload)
  if (recent.length > MAX) recent.pop()
  listeners.forEach((listener) => listener(payload))
  console.error(`[bond:${area}]`, payload.message, extra ?? '')
}

if (typeof globalThis !== 'undefined') {
  const g = globalThis as typeof globalThis & {
    __bondMonitorInstalled?: boolean
  }
  if (!g.__bondMonitorInstalled) {
    g.__bondMonitorInstalled = true
    g.addEventListener?.('unhandledrejection', (event) => {
      reportError('app', (event as PromiseRejectionEvent).reason, {
        op: 'unhandledrejection',
      })
    })
    g.addEventListener?.('error', (event) => {
      const err = event as ErrorEvent
      reportError('app', err.error ?? err.message, { op: 'window-error' })
    })
  }
}

export function subscribeErrors(
  listener: (payload: ErrorPayload) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function recentErrors(): ErrorPayload[] {
  return [...recent]
}
