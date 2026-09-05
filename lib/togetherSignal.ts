export const TOGETHER_SCHEDULED_EVENT = 'together_scheduled'

export const TOGETHER_SIGNAL_SETUP_NOTICE =
  'Saved for you. Nudging your person needs one SQL catch-up in Supabase.'

/** True when the hosted project has not run catchup_together_schedule.sql yet. */
export function isMissingSignalPolicy(message: string): boolean {
  return message.toLowerCase().includes('row-level security policy')
}
