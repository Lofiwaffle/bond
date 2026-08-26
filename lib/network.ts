import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'

let nativeOnline = true
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function markNetworkOffline(): void {
  if (!nativeOnline) return
  nativeOnline = false
  notify()
}

export function markNetworkOnline(): void {
  if (nativeOnline) return
  nativeOnline = true
  notify()
}

export function isOnlineNow(): boolean {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.onLine
  }
  return nativeOnline
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(isOnlineNow)

  useEffect(() => {
    const sync = () => setOnline(isOnlineNow())

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', sync)
      window.addEventListener('offline', sync)
      return () => {
        window.removeEventListener('online', sync)
        window.removeEventListener('offline', sync)
      }
    }

    listeners.add(sync)
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        markNetworkOnline()
        sync()
      }
    })
    return () => {
      listeners.delete(sync)
      app.remove()
    }
  }, [])

  return online
}
