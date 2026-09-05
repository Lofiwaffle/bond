/**
 * A hosted project can predate a table this build queries. That is a setup gap,
 * not a client failure: the feature stays quiet instead of reporting an error.
 * Paste supabase/catchup_hosted_current.sql to close it.
 */
export const SCHEMA_CATCHUP_NOTE =
  'This part of Bond needs a quick database update. Paste supabase/catchup_hosted_current.sql in the Supabase SQL editor, then try again.'

export function isSchemaMissing(message: string): boolean {
  return (
    message.includes('schema cache') ||
    message.toLowerCase().includes('does not exist')
  )
}
