import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { localDateString } from './dates'

export type CheckInOutboxEntry = {
  userId: string
  coupleId: string
  date: string
  score: number
  note: string | null
  activities: string[]
  prompt_id: string | null
  prompt_text: string | null
  prompt_answer: string | null
  queuedAt: string
}

const PREFIX = 'bond.checkin.outbox.'

const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeCheckInOutbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function outboxKey(userId: string, date: string): string {
  return `${PREFIX}${userId}.${date}`
}

export async function enqueueCheckIn(
  entry: CheckInOutboxEntry,
): Promise<void> {
  await AsyncStorage.setItem(
    outboxKey(entry.userId, entry.date),
    JSON.stringify(entry),
  )
  notify()
}

export async function loadQueuedCheckIn(
  userId: string,
  date = localDateString(),
): Promise<CheckInOutboxEntry | null> {
  const raw = await AsyncStorage.getItem(outboxKey(userId, date))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<CheckInOutboxEntry>
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.coupleId !== 'string' ||
      typeof parsed.date !== 'string' ||
      typeof parsed.score !== 'number'
    ) {
      return null
    }
    return {
      userId: parsed.userId,
      coupleId: parsed.coupleId,
      date: parsed.date,
      score: parsed.score,
      note: parsed.note ?? null,
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      prompt_id: parsed.prompt_id ?? null,
      prompt_text: parsed.prompt_text ?? null,
      prompt_answer: parsed.prompt_answer ?? null,
      queuedAt: parsed.queuedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function clearQueuedCheckIn(
  userId: string,
  date = localDateString(),
): Promise<void> {
  await AsyncStorage.removeItem(outboxKey(userId, date))
  notify()
}

export async function listQueuedCheckIns(
  userId: string,
): Promise<CheckInOutboxEntry[]> {
  const keys = await AsyncStorage.getAllKeys()
  const mine = keys.filter((key) => key.startsWith(`${PREFIX}${userId}.`))
  const rows = await Promise.all(
    mine.map(async (key) => {
      const date = key.slice(`${PREFIX}${userId}.`.length)
      return loadQueuedCheckIn(userId, date)
    }),
  )
  return rows.filter((row): row is CheckInOutboxEntry => Boolean(row))
}

export function useQueuedCheckIn(
  userId: string | undefined,
  date = localDateString(),
): boolean {
  const [queued, setQueued] = useState(false)

  useEffect(() => {
    if (!userId) {
      setQueued(false)
      return
    }
    const sync = () => {
      void loadQueuedCheckIn(userId, date).then((row) => setQueued(Boolean(row)))
    }
    sync()
    return subscribeCheckInOutbox(sync)
  }, [date, userId])

  return queued
}

export const SAVED_WAITING_TO_SYNC =
  'Saved on this device, waiting to sync.'

export const SAVED_WAITING_TO_SYNC_DETAIL =
  'Your partner cannot see this yet. Bond will send it when you reconnect.'

export const SYNCING_BANNER = 'Sending your check-in now.'

export const OFFLINE_DRAFT_BANNER =
  "You're offline. Your draft is saved on this device. Reconnect to submit."

export const OFFLINE_QUEUED_BANNER = SAVED_WAITING_TO_SYNC

export const QUEUED_TOAST = SAVED_WAITING_TO_SYNC

export function checkInSyncMessage({
  queued,
  syncing,
  online,
  allowDraft = true,
}: {
  queued: boolean
  syncing?: boolean
  online: boolean
  allowDraft?: boolean
}): { title: string; detail: string | null } | null {
  if (queued && syncing && online) {
    return { title: SYNCING_BANNER, detail: null }
  }
  if (queued) {
    return {
      title: SAVED_WAITING_TO_SYNC,
      detail: SAVED_WAITING_TO_SYNC_DETAIL,
    }
  }
  if (!online && allowDraft) {
    return { title: OFFLINE_DRAFT_BANNER, detail: null }
  }
  return null
}
