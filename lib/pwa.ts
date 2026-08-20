import { Platform } from 'react-native'

const BASE = process.env.EXPO_PUBLIC_BASE_PATH ?? ''

type WebNavigator = Navigator & {
  serviceWorker: ServiceWorkerContainer
}

/** Register the GitHub Pages service worker in exported web builds only. */
export function registerWebInstall(): void {
  if (__DEV__) return
  if (Platform.OS !== 'web') return

  const nav = navigator as WebNavigator
  if (typeof nav === 'undefined' || !nav.serviceWorker) return

  const scope = `${BASE}/`
  const register = () => {
    void nav.serviceWorker.register(`${BASE}/sw.js`, { scope })
  }

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}
