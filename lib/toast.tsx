import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ToastContextValue = {
  message: string | null
  showToast: (message: string) => void
  clearToast: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const showToast = useCallback((next: string) => {
    setMessage(next)
  }, [])

  const clearToast = useCallback(() => setMessage(null), [])

  const value = useMemo(
    () => ({ message, showToast, clearToast }),
    [clearToast, message, showToast],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
