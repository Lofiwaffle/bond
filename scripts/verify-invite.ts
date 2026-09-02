/**
 * Invite URL parsing and join-error copy.
 * Run: npx --yes tsx scripts/verify-invite.ts
 */
import {
  classifyJoinError,
  inviteHttpsUrl,
  invitePathFromIncoming,
  joinErrorCopy,
  normalizeInviteCode,
  parseInviteFromUrl,
} from '../lib/inviteParse'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('normalize trims and uppercases', normalizeInviteCode(' ab12cd ') === 'AB12CD')
assert('normalize rejects short', normalizeInviteCode('ABC12') === null)
assert('normalize strips punctuation', normalizeInviteCode('ab-12-cd') === 'AB12CD')

assert(
  'https query',
  parseInviteFromUrl('https://lofiwaffle.github.io/bond/?invite=ABC234') === 'ABC234',
)
assert(
  'join path',
  parseInviteFromUrl('https://lofiwaffle.github.io/bond/join/XYZ789') === 'XYZ789',
)
assert(
  'native scheme',
  parseInviteFromUrl('bond://join?invite=LMN456') === 'LMN456',
)
assert(
  'does not treat oauth code as invite',
  parseInviteFromUrl('https://example.com/auth?code=very-long-oauth-token') === null,
)

assert(
  'share url keeps invite on the hosted origin',
  inviteHttpsUrl('abc234') === 'https://lofiwaffle.github.io/bond/?invite=ABC234',
)
assert(
  'incoming rewrite',
  invitePathFromIncoming('bond://join?invite=ABC234') === '/join?invite=ABC234',
)
assert(
  'auth callback is not rewritten as join',
  invitePathFromIncoming('bond://auth-callback?code=abcdefghijk') === null,
)

assert('full', classifyJoinError('Couple is full') === 'full')
assert('expired', classifyJoinError('Invite expired') === 'expired')
assert('invalid', classifyJoinError('Invalid invite code') === 'invalid')
assert('own', classifyJoinError('Cannot join your own invite') === 'own')
assert('copy mentions two people', joinErrorCopy('full').includes('two people'))

console.log('invite helpers ok')
