export const PRIVACY_UPDATED = '27 August 2026'

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
    who: 'Only this device. It is not in the relationship until Bond confirms the save.',
  },
  {
    entry: 'Private thought',
    who: 'This device only. Never uploaded. Your partner never sees it. Clearing Bond’s app storage, uninstalling, or switching phones deletes it.',
  },
  {
    entry: 'Daily check-in (score, shared words, tags)',
    who: 'Only you until you both check in that day. You can correct yours until they submit. Then both entries lock. Then the two of you. No one else.',
  },
  {
    entry: 'One small action',
    who: 'Both of you, once offered. Your private thought never goes with it. After they accept, it stays on Feed until marked done.',
  },
  {
    entry: 'Weekly review draft',
    who: 'Only this device. It is not in the relationship until Bond confirms the save.',
  },
  {
    entry: 'Weekly review answers',
    who: 'Only you until you both finish that week. Then the two of you. After save, the original answers cannot be changed.',
  },
  {
    entry: 'Goals',
    who: 'Both of you, once offered. It stays proposed until the other person agrees. Completing takes both of you. Either of you can archive.',
  },
  {
    entry: 'Together activities',
    who: 'Only you until you both finish that round. Then the two of you. Repair together is optional and starts from Us.',
  },
  {
    entry: 'Optional weekly suggestion',
    who: 'The original is both of you, if one of you generates it. Hide or edit applies only to you. Your partner still sees the original.',
  },
  {
    entry: 'Push and lock-screen alerts',
    who: 'A generic Bond reminder only. Never scores, words, or names.',
  },
  {
    entry: 'Notification preferences',
    who: 'Only you. Your partner cannot see your reminder settings.',
  },
]

export const STORED_ON_SERVER = [
  'Account: email, optional password (held by our auth provider, not in plain text), display name. If you continue with Google, Google shares your email and name so we can create the account.',
  'Pairing: invite code, invite link, and the link between two accounts.',
  'Shared ritual: check-in scores, shared words, activity tags, one small action, weekly answers, goals, achievements, and optional weekly suggestions.',
  'Your hide or edit choice for a weekly suggestion. Your partner cannot see that preference.',
  'A push token if you turn on “Our reveal is ready.”',
  'Notification preferences: whether reminders are on, the time, timezone, and quiet hours.',
  'On the free plan, a device advertising ID for ads (Google AdMob). Bond Plus and the trial remove ads.',
]

export const ADS_DISCLOSURE =
  'On the free plan, Bond shows an ad when you open the app the first time that day, and ads in History. Ads are served by Google AdMob and may use a device advertising ID. Bond Plus and the trial remove ads. We do not use your check-in answers to target ads.'

export const DEVICE_ONLY_THOUGHTS =
  'Private thoughts stay on this device and are never uploaded. They are lost if you clear Bond’s app storage, uninstall, or switch phones.'

export const MUTUAL_REVEAL_TITLE = 'They cannot see this yet'

export const MUTUAL_REVEAL_BODY =
  'Your check-in stays only yours until they check in too. Then both answers open to the two of you, and neither of you can change them. Nobody else can see this.'

export const MUTUAL_REVEAL_CONFIRM = 'I understand — save'

export const NOT_STORED = [
  'Private thoughts typed during check-in (this device only; lost if app storage is cleared).',
  'Weekly review drafts (this device only; lost if app storage is cleared).',
  'Precise location, contacts, photos, or microphone.',
]

export const UNPAIR_SEMANTICS =
  'Leaving a Bond removes your words from it: your check-ins, weekly answers, achievement logs, small actions you offered, anything you wrote on a shared goal, and your hide or edit choices for weekly suggestions. Your partner keeps their own entries. Shared weekly suggestions are removed because they quote both of you. Shared goals stay with the remaining partner. If you paid for Bond Plus, the receipt stays with you and Plus pauses for this Bond; you can restore it onto a new Bond you join. If your partner paid, you keep every answer already opened and you do not keep Plus. Your account stays, so you can start a new Bond later. The old invite code stops working.'

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
