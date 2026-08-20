import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radii, type } from '../lib/theme'

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onCancel}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            disabled={busy}
            style={({ pressed }) => [
              styles.confirm,
              destructive && styles.confirmDanger,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.confirmLabel,
                destructive && styles.confirmLabelDanger,
              ]}
            >
              {busy ? 'Working...' : confirmLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            disabled={busy}
            hitSlop={8}
            style={styles.cancel}
          >
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 22,
    zIndex: 1,
  },
  title: {
    ...type.heading,
    marginBottom: 8,
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  confirm: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDanger: {
    backgroundColor: colors.danger,
  },
  confirmLabel: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '500',
  },
  confirmLabelDanger: {
    color: colors.white,
  },
  cancel: {
    alignItems: 'center',
    paddingTop: 14,
  },
  cancelLabel: {
    ...type.body,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
})
