import { Pressable, StyleSheet, Text } from 'react-native'

import { hapticLight } from '../lib/haptics'
import { colors, elevation, fonts, hit, radii, type } from '../lib/theme'

export function GoogleSignInButton({
  onPress,
  loading,
  disabled,
}: {
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  const busy = Boolean(loading || disabled)
  const label = loading ? 'Opening Google…' : 'Continue with Google'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy: Boolean(loading) }}
      onPress={() => {
        if (busy) return
        hapticLight()
        onPress()
      }}
      disabled={busy}
      style={(state) => [
        styles.button,
        busy && styles.disabled,
        state.pressed && !busy && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: hit,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: colors.card,
    ...elevation.card,
  },
  label: {
    ...type.body,
    fontFamily: fonts.medium,
    fontWeight: '500',
    color: colors.ink,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.accentSoft,
  },
  disabled: {
    opacity: 0.4,
  },
})
