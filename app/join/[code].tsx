import { Redirect, useLocalSearchParams, type Href } from 'expo-router'

import { normalizeInviteCode } from '../../lib/inviteParse'

export default function JoinCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const invite = normalizeInviteCode(Array.isArray(code) ? code[0] : code)
  return (
    <Redirect href={(invite ? `/join?invite=${invite}` : '/join') as Href} />
  )
}
