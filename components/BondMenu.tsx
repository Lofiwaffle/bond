import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { Icon, type IconName } from '../lib/icons'
import { colors, hairlineWidth, radii, type } from '../lib/theme'

export type BondSection = 'habits' | 'goals' | 'streaks' | 'reviews'

const OPTIONS: Array<{
  id: BondSection
  icon: IconName
  title: string
  body: string
}> = [
  {
    id: 'habits',
    icon: 'calendar',
    title: 'Habits',
    body: 'Spark, Glow, Forge, Bond, Sync. Log moments together',
  },
  {
    id: 'goals',
    icon: 'target',
    title: 'Goals',
    body: 'SMART goals you set, review, and put on the calendar',
  },
  {
    id: 'streaks',
    icon: 'trending-up',
    title: 'Streaks',
    body: 'Daily check-in streak, rhythm, and connection mix',
  },
  {
    id: 'reviews',
    icon: 'book-open',
    title: 'Reviews',
    body: 'Summaries of weekly reviews you finish together',
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
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Bond menu"
          onPress={onClose}
          style={styles.backdropHit}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Bond</Text>
          <Text style={styles.subtitle}>What do you want to open?</Text>

          {OPTIONS.map((option, index) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              onPress={() => {
                onClose()
                onSelect(option.id)
              }}
              style={({ pressed }) => [
                styles.row,
                index === OPTIONS.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <Icon name={option.icon} size={18} color={colors.ink} />
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowBody}>{option.body}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
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
    justifyContent: 'flex-end',
  },
  backdropHit: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    zIndex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.hairline,
    marginBottom: 14,
  },
  title: {
    ...type.heading,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  copy: {
    flex: 1,
  },
  rowTitle: {
    ...type.body,
    fontWeight: '500',
  },
  rowBody: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
  cancel: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    ...type.body,
    color: colors.muted,
  },
})
