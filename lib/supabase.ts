import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

import { reportError } from './monitor'
import { markNetworkOffline, markNetworkOnline } from './network'
import type { Database } from '../types/database'

const STORAGE_KEY = 'bond.supabase'
const DUMMY_URL = 'https://unavailable.supabase.co'
const DUMMY_KEY = 'public-anon-key'

export type SupabaseAppConfig = { url: string; key: string }

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const envKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/** Public publishable key for the hosted Bond project (safe in the client). */
const HOSTED_BOND: SupabaseAppConfig = {
  url: 'https://melmzlgzfcysbnvtuksv.supabase.co',
  key: 'sb_publishable_I3LAmPEB6tGY-1l2-_-9ng_xu-PRSGh',
}

function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      hostname === '::1'
    )
  } catch {
    return /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url)
  }
}

function configIssue(url?: string | null, key?: string | null): string | null {
  if (!url?.trim() || !key?.trim()) {
    return 'Bond is not connected to a server in this install.'
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'Server URL must start with https://'
    }
  } catch {
    return 'Server URL is not valid.'
  }
  if (!__DEV__ && isLoopbackUrl(url)) {
    return 'This install needs a hosted Bond server, not localhost.'
  }
  if (!__DEV__ && url.startsWith('http://')) {
    return 'This install needs an https:// server.'
  }
  return null
}

function makeClient(url: string, key: string, persist: boolean): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: persist,
      persistSession: persist,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: {
      fetch: async (input, init) => {
        try {
          const response = await fetch(input, init)
          markNetworkOnline()
          if (!response.ok && response.status >= 500) {
            reportError('supabase', `HTTP ${response.status}`)
          }
          return response
        } catch (error) {
          markNetworkOffline()
          reportError('supabase', error)
          throw error
        }
      },
    },
  })
}

const listeners = new Set<() => void>()

function notifyConfigListeners() {
  listeners.forEach((listener) => listener())
}

export function subscribeSupabaseConfig(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export let supabase = makeClient(DUMMY_URL, DUMMY_KEY, false)
export let supabaseConfigured = false
export let supabaseConfigError: string | null =
  'Bond is not connected to a server in this install.'

function applyConfig(config: SupabaseAppConfig): string | null {
  const issue = configIssue(config.url, config.key)
  if (issue) {
    supabaseConfigured = false
    supabaseConfigError = issue
    supabase = makeClient(DUMMY_URL, DUMMY_KEY, false)
    notifyConfigListeners()
    return issue
  }
  supabase = makeClient(config.url.trim(), config.key.trim(), true)
  supabaseConfigured = true
  supabaseConfigError = null
  notifyConfigListeners()
  return null
}

async function readStoredConfig(): Promise<SupabaseAppConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SupabaseAppConfig>
    if (typeof parsed.url === 'string' && typeof parsed.key === 'string') {
      return { url: parsed.url, key: parsed.key }
    }
  } catch {
    return null
  }
  return null
}

async function readHostedConfig(): Promise<SupabaseAppConfig | null> {
  if (Platform.OS !== 'web' || typeof fetch === 'undefined') return null
  const base = process.env.EXPO_PUBLIC_BASE_PATH ?? ''
  try {
    const response = await fetch(`${base}/supabase.json`, { cache: 'no-store' })
    if (!response.ok) return null
    const parsed = (await response.json()) as Partial<SupabaseAppConfig>
    if (typeof parsed.url === 'string' && typeof parsed.key === 'string') {
      return { url: parsed.url, key: parsed.key }
    }
  } catch {
    return null
  }
  return null
}

let initPromise: Promise<void> | null = null

async function resolveConfig(): Promise<SupabaseAppConfig | null> {
  const stored = await readStoredConfig()
  if (stored && !configIssue(stored.url, stored.key)) return stored

  if (envUrl && envKey && !configIssue(envUrl, envKey)) {
    return { url: envUrl, key: envKey }
  }

  const hosted = await readHostedConfig()
  if (hosted && !configIssue(hosted.url, hosted.key)) return hosted

  if (!configIssue(HOSTED_BOND.url, HOSTED_BOND.key)) return HOSTED_BOND

  return stored ?? (envUrl && envKey ? { url: envUrl, key: envKey } : hosted)
}

export function initSupabase(): Promise<void> {
  if (!initPromise) {
    initPromise = resolveConfig().then((config) => {
      if (config) applyConfig(config)
    })
  }
  return initPromise
}

export async function saveSupabaseConfig(
  url: string,
  key: string,
): Promise<{ error: string | null }> {
  const issue = applyConfig({ url, key })
  if (issue) return { error: issue }
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ url: url.trim(), key: key.trim() }),
  )
  return { error: null }
}
