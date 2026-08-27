import type { RefObject } from 'react'
import type { TextInput } from 'react-native'

export function focusInput(ref: RefObject<TextInput | null>) {
  const node = ref.current
  if (!node) return
  node.focus()
}

export function focusFirstInvalid(
  fields: { ref: RefObject<TextInput | null>; invalid: boolean }[],
) {
  const first = fields.find((field) => field.invalid)
  if (first) focusInput(first.ref)
}
