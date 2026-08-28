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
  | 'partner_accepted_goal'
  | 'partner_declined_goal'
  | 'partner_goal_complete_requested'
  | 'partner_completed_goal'
  | 'partner_archived_goal'
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
      return 'Your partner offered a goal.'
    case 'partner_accepted_goal':
      return 'Your partner agreed to a goal.'
    case 'partner_declined_goal':
      return 'Your partner passed on a goal.'
    case 'partner_goal_complete_requested':
      return 'Your partner thinks a goal is done.'
    case 'partner_completed_goal':
      return 'You both marked a goal complete.'
    case 'partner_archived_goal':
      return 'A goal was archived.'
    case 'partner_weekly_review':
      return 'Your partner finished a weekly review.'
    case 'partner_joined':
      return 'Your partner joined this Bond.'
    case 'daily_action_proposed':
      return 'Your partner offered a small action.'
    case 'daily_action_accepted':
      return 'Your partner accepted a small action.'
    case 'daily_action_skipped':
      return 'Your partner passed on a small action tonight.'
    case 'daily_action_completed':
      return 'You completed a small action together.'
    default:
      return 'Something new is in Bond.'
  }
}
