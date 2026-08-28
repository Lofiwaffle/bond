import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'

import {
  inviteHttpsUrl,
  normalizeInviteCode,
  parseInviteFromUrl,
  shareInviteMessage,
} from './inviteParse'

export const INVITE_STORAGE_KEY = 'bond.invite.code'

export {
  INVITE_CODE_PATTERN,
  classifyJoinError,
  inviteHttpsUrl,
  invitePathFromIncoming,
  inviteStatusCopy,
  joinErrorCopy,
  normalizeInviteCode,
  parseInviteFromUrl,
  shareInviteMessage,
  type InviteStatus,
  type JoinErrorKind,
} from './inviteParse'

export async function shareInvite(
  code: string,
  fromName?: string,
): Promise<{ error: string | null; copied?: boolean }> {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return { error: 'That invite code is not valid.' }
  const message = shareInviteMessage(normalized, fromName)
  const url = inviteHttpsUrl(normalized)
  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message, url }
        : { message, title: 'Join my Bond', url },
    )
    if (result.action === Share.dismissedAction) {
      return { error: null }
    }
    return { error: null }
  } catch {
    try {
      await Clipboard.setStringAsync(message)
      return { error: null, copied: true }
    } catch {
      return { error: 'Could not share that invite.' }
    }
  }
}

export async function loadPendingInvite(): Promise<string | null> {
  try {
    return normalizeInviteCode(await AsyncStorage.getItem(INVITE_STORAGE_KEY))
  } catch {
    return null
  }
}

export async function savePendingInvite(code: string): Promise<string | null> {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return null
  await AsyncStorage.setItem(INVITE_STORAGE_KEY, normalized)
  return normalized
}

export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(INVITE_STORAGE_KEY)
}

export async function captureInviteFromUrl(
  url: string | null | undefined,
): Promise<string | null> {
  const code = parseInviteFromUrl(url)
  if (!code) return null
  return savePendingInvite(code)
}
