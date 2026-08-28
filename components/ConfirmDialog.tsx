import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { colors, hit, radii, type } from '../lib/theme'

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
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onCancel}
        />
        <View style={styles.sheet} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.body}>{body}</Text>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Working' : confirmLabel}
            accessibilityState={{ disabled: Boolean(busy), busy: Boolean(busy) }}
            onPress={() => {
              if (busy) return
              onConfirm()
            }}
            disabled={busy}
            style={(state) => [
              styles.confirm,
              destructive && styles.confirmDanger,
              state.pressed && !busy && styles.pressed,
              busy && styles.disabled,
              Boolean((state as { focused?: boolean }).focused) &&
                styles.focusRing,
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
            accessibilityLabel={cancelLabel}
            onPress={onCancel}
            disabled={busy}
            style={(state) => [
              styles.cancel,
              state.pressed && !busy && styles.pressed,
              Boolean((state as { focused?: boolean }).focused) &&
                styles.focusRing,
            ]}
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
  bodyScroll: {
    maxHeight: 280,
    marginBottom: 20,
  },
  body: {
    ...type.body,
    color: colors.muted,
  },
  confirm: {
    backgroundColor: colors.accentFill,
    borderRadius: radii.pill,
    minHeight: hit,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    minHeight: hit,
    paddingTop: 4,
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
  focusRing: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
})
