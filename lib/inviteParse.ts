import { HOSTED_APP_URL } from './appUrls'

export const INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/

export type InviteStatus = 'open' | 'invalid' | 'expired' | 'full'
export type JoinErrorKind =
  | 'invalid'
  | 'expired'
  | 'full'
  | 'own'
  | 'already'
  | 'other'

export function normalizeInviteCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!INVITE_CODE_PATTERN.test(normalized)) return null
  return normalized
}

function firstQueryValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)
  return value && value.trim() ? value : null
}

function readParams(url: string): URLSearchParams {
  const params = new URLSearchParams()
  const hashIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')
  if (queryIndex >= 0) {
    const end = hashIndex >= 0 ? hashIndex : url.length
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((value, key) => {
      params.set(key, value)
    })
  }
  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1)
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash
    if (hashQuery && !hashQuery.startsWith('/')) {
      new URLSearchParams(hashQuery).forEach((value, key) => {
        params.set(key, value)
      })
    }
  }
  return params
}

function pathInvite(url: string): string | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const joinAt = parts.lastIndexOf('join')
    if (joinAt >= 0 && parts[joinAt + 1]) {
      return normalizeInviteCode(parts[joinAt + 1])
    }
  } catch {
    const match = url.match(/\/join\/([A-Za-z0-9]{6})(?:[/?#]|$)/)
    if (match) return normalizeInviteCode(match[1])
  }
  return null
}

/** Read a Bond invite from any incoming URL (HTTPS, bond://, Expo Go). */
export function parseInviteFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const params = readParams(url)
  const fromQuery =
    normalizeInviteCode(firstQueryValue(params, 'invite')) ??
    normalizeInviteCode(firstQueryValue(params, 'inviteCode'))
  if (fromQuery) return fromQuery
  return pathInvite(url)
}

export function inviteHttpsUrl(code: string): string {
  const normalized = normalizeInviteCode(code) ?? code.trim().toUpperCase()
  return `${HOSTED_APP_URL}/?invite=${encodeURIComponent(normalized)}`
}

export function shareInviteMessage(code: string, fromName?: string): string {
  const url = inviteHttpsUrl(code)
  const who = fromName?.trim()
  const intro = who
    ? `${who} invited you to Bond, a two-person daily check-in.`
    : 'Join my Bond, a two-person daily check-in.'
  return `${intro}\n\nOpen this link to join:\n${url}\n\nOr enter code ${code}.`
}

/** Rewrite native/HTTPS incoming paths so Expo Router opens /join. */
export function invitePathFromIncoming(path: string): string | null {
  const code = parseInviteFromUrl(path)
  if (!code) {
    if (/\/join(?:[/?#]|$)/i.test(path) || /^join(?:[/?#]|$)/i.test(path)) {
      return '/join'
    }
    return null
  }
  return `/join?invite=${encodeURIComponent(code)}`
}

export function classifyJoinError(message: string | null | undefined): JoinErrorKind {
  const text = (message ?? '').toLowerCase()
  if (!text) return 'other'
  if (text.includes('full')) return 'full'
  if (text.includes('own invite')) return 'own'
  if (text.includes('already paired') || text.includes('already in')) return 'already'
  if (text.includes('expired') || text.includes('no longer')) return 'expired'
  if (text.includes('invalid') || text.includes('not found') || text.includes('not valid')) {
    return 'invalid'
  }
  return 'other'
}

export function joinErrorCopy(kind: JoinErrorKind): string {
  switch (kind) {
    case 'full':
      return 'This Bond already has two people. Ask them for a new invite if that was a mistake.'
    case 'expired':
      return 'This invite is no longer valid. Ask them to share a new link.'
    case 'invalid':
      return "That code isn't a Bond invite. Check the six characters and try again."
    case 'own':
      return "That's the invite you created. Share it with them instead."
    case 'already':
      return "You're already in a Bond."
    default:
      return 'Could not join with that invite. Try again, or ask for a new link.'
  }
}

export function inviteStatusCopy(status: InviteStatus): string {
  switch (status) {
    case 'full':
      return joinErrorCopy('full')
    case 'expired':
      return joinErrorCopy('expired')
    case 'invalid':
      return joinErrorCopy('invalid')
    default:
      return 'This invite is ready. Create an account or sign in to join.'
  }
}
