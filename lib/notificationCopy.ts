/**
 * Lock-screen and push copy. Never include scores, notes, prompt answers,
 * names, or other emotional content. Android channels hide the body on the
 * lock screen; iOS still shows title + body, so both stay generic.
 */
export const LOCK_SCREEN_TITLE = 'Bond'
export const LOCK_SCREEN_BODY = 'Open the app when you have a minute.'

export type PartnerSignalEvent =
  | 'partner_checked_in'
  | 'check_in_nudge'
  | 'partner_logged_achievement'
  | 'partner_set_goal'
  | 'partner_completed_goal'
  | 'partner_weekly_review'
  | 'partner_joined'
  | string

/** In-app toast only. Still never includes scores, notes, or raw summaries. */
export function inAppSignalCopy(eventType: PartnerSignalEvent): string {
  switch (eventType) {
    case 'partner_checked_in':
      return 'Your partner checked in.'
    case 'check_in_nudge':
      return 'Your partner is waiting on today, no rush.'
    case 'partner_logged_achievement':
      return 'Your partner logged an achievement.'
    case 'partner_set_goal':
      return 'Your partner set a goal.'
    case 'partner_completed_goal':
      return 'Your partner completed a goal.'
    case 'partner_weekly_review':
      return 'Your partner finished a weekly review.'
    case 'partner_joined':
      return 'Your partner joined this Bond.'
    default:
      return 'Something new is in Bond.'
  }
}
