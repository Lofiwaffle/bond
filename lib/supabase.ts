import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/database'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

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

function configError(): string | null {
  if (!supabaseUrl || !supabaseKey) {
    return 'Bond is not connected to a server in this install.'
  }
  if (!__DEV__ && isLoopbackUrl(supabaseUrl)) {
    return 'This install needs a hosted Bond server, not localhost.'
  }
  return null
}

export const supabaseConfigError = configError()
export const supabaseConfigured = supabaseConfigError === null

const clientUrl = supabaseConfigured
  ? supabaseUrl!
  : 'https://unavailable.supabase.co'
const clientKey = supabaseConfigured ? supabaseKey! : 'public-anon-key'

export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: supabaseConfigured,
    persistSession: supabaseConfigured,
    detectSessionInUrl: false,
  },
})
