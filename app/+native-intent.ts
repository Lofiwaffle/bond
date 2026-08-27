import { invitePathFromIncoming } from '../lib/inviteParse'

/** Rewrite HTTPS and custom-scheme invite URLs onto the join route. */
export function redirectSystemPath({
  path,
}: {
  path: string
  initial: boolean
}): string {
  try {
    return invitePathFromIncoming(path) ?? path
  } catch {
    return path
  }
}
