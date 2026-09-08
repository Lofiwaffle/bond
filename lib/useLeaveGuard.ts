import { useCallback, useEffect, useRef, useState } from 'react'
import { router, useNavigation } from 'expo-router'

type LeaveAction = {
  type: string
  payload?: object
  source?: string
  target?: string
}

/**
 * Confirm before Android back / stack pop when the screen has unsaved work.
 * Skip and confirmed leave set `allowed` so the same pop is not intercepted again.
 */
export function useLeaveGuard(block: boolean) {
  const navigation = useNavigation()
  const [promptOpen, setPromptOpen] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const pending = useRef<LeaveAction | null>(null)
  const blocking = block && !allowed

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!blocking) return
      event.preventDefault()
      pending.current = event.data.action as LeaveAction
      setPromptOpen(true)
    })
    return unsubscribe
  }, [blocking, navigation])

  useEffect(() => {
    if (!allowed) return
    const action = pending.current
    pending.current = null
    if (action) navigation.dispatch(action)
    else router.back()
  }, [allowed, navigation])

  const requestClose = useCallback(() => {
    if (blocking) {
      pending.current = null
      setPromptOpen(true)
      return
    }
    router.back()
  }, [blocking])

  const stay = useCallback(() => {
    pending.current = null
    setPromptOpen(false)
  }, [])

  const leave = useCallback(() => {
    setPromptOpen(false)
    setAllowed(true)
  }, [])

  const leaveNow = useCallback(() => {
    setPromptOpen(false)
    setAllowed(true)
  }, [])

  return { promptOpen, requestClose, stay, leave, leaveNow }
}
