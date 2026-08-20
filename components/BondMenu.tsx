import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radii } from '../lib/theme'

export type BondSection = 'habits' | 'goals' | 'streaks'

const OPTIONS: Array<{
  id: BondSection
  glyph: string
  title: string
  body: string
}> = [
  {
    id: 'habits',
    glyph: '✧',
    title: 'Habits',
    body: 'Spark, Glow, Forge, Bond, Sync. Log moments together',
  },
  {
    id: 'goals',
    glyph: '◎',
    title: 'Goals',
    body: 'Shared targets you’re building toward as a couple',
  },
  {
    id: 'streaks',
    glyph: '◈',
    title: 'Streaks',
    body: 'Daily check-in streak, rhythm, and connection mix',
  },
]

export function BondMenu({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean
  onClose: () => void
  onSelect: (section: BondSection) => void
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss Bond menu"
        style={styles.backdrop}
        onPress={onClose}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Bond</Text>
          <Text style={styles.subtitle}>What do you want to open?</Text>

          {OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              onPress={() => {
                onClose()
                onSelect(option.id)
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.glyphBubble, { backgroundColor: colors.accentSoft }]}>
                <Text style={styles.glyph}>{option.glyph}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowBody}>{option.body}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.hairline,
    marginBottom: 14,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.bgSoft,
    padding: 14,
    marginBottom: 8,
  },
  rowPressed: {
    backgroundColor: colors.accentSoft,
  },
  glyphBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    textAlign: 'center',
    color: colors.accent,
    fontSize: 20,
  },
  copy: {
    flex: 1,
  },
  rowTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  rowBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  chevron: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '300',
  },
  cancel: {
    marginTop: 6,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 15,
  },
})
