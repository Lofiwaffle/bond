export const PRIVACY_UPDATED = '26 August 2026'

export const NOT_THERAPY =
  'Bond is a daily check-in habit for two people. It is not therapy, counseling, medical care, or emergency support. If you are in danger, contact local emergency services.'

export type VisibilityRow = {
  entry: string
  who: string
}

/** Who can see each kind of entry. Shown in-product so users can trust the ritual. */
export const VISIBILITY_ROWS: VisibilityRow[] = [
  {
    entry: 'Check-in draft',
    who: 'Only this device, until you save.',
  },
  {
    entry: 'Private thought',
    who: 'This device only. Never uploaded. Your partner never sees it.',
  },
  {
    entry: 'Daily check-in (score, shared words, tags)',
    who: 'Only you until you both check in that day. Then the two of you. No one else.',
  },
  {
    entry: 'Weekly review answers',
    who: 'Only you until you both finish that week. Then the two of you.',
  },
  {
    entry: 'Goals, achievements, and rituals',
    who: 'Both of you, once saved.',
  },
  {
    entry: 'Optional weekly suggestion',
    who: 'Both of you, if one of you generates it. Either of you can edit or hide it.',
  },
  {
    entry: 'Push and lock-screen alerts',
    who: 'A generic Bond reminder only. Never scores, words, or names.',
  },
]

export const STORED_ON_SERVER = [
  'Account: email, hashed password (held by the auth provider), display name.',
  'Pairing: invite code and the link between two accounts.',
  'Shared ritual: check-in scores, shared words, activity tags, weekly answers, goals, achievements, and optional weekly suggestions.',
  'A push token if you turn notifications on.',
]

export const NOT_STORED = [
  'Private thoughts typed during check-in (this device only).',
  'Precise location, contacts, photos, microphone, or advertising IDs.',
]

export const UNPAIR_SEMANTICS =
  'Leaving a Bond removes your words from it: your check-ins, weekly answers, achievement logs, and anything you wrote on a shared goal. Your partner keeps their own entries. Shared weekly suggestions are removed because they quote both of you. Shared goals stay with the remaining partner. Your account stays, so you can start a new Bond later. The old invite code stops working.'

export const DELETE_SEMANTICS =
  'Deleting your account first leaves any Bond you are in (same rules as above), then permanently removes your profile and sign-in. If you are the last remaining member, the couple record and leftover shared data are deleted too. This cannot be undone. You can also email a deletion request using the address on the Bond store listing.'

export const EXPORT_NOTE =
  'You can download a copy of what this account can currently see: your profile, and any couple data still visible to you. After you leave a Bond, the export no longer includes the words that were deleted.'

export type SafetyResource = {
  label: string
  href: string
  detail: string
}

export const SAFETY_INTRO =
  'If someone is monitoring this phone, you can leave this page the same way you leave Privacy. Opening these links does not notify a partner.'

export const SAFETY_RESOURCES: SafetyResource[] = [
  {
    label: 'Local emergency services',
    href: '',
    detail: 'If you are in immediate danger, use the emergency number for where you are.',
  },
  {
    label: 'IASP — find support',
    href: 'https://www.iasp.info/suicidalthoughts/',
    detail: 'Confidential resources if you are in crisis or thinking about suicide.',
  },
  {
    label: 'thehotline.org',
    href: 'https://www.thehotline.org/',
    detail: 'U.S. domestic violence hotline. Chat and phone, including help with coercion or abuse.',
  },
]

export const SAFETY_FOOTNOTE =
  'You do not have to discuss Bond, or this page, with anyone. Bond will never tell you that you must talk something through together.'
