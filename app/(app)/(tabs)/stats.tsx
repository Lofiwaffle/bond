import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useNavigation } from 'expo-router'

import {
  BondMenu,
  type BondSection,
} from '../../../components/BondMenu'
import { LoadingScreen, Screen } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { Icon, type IconName } from '../../../lib/icons'
import { colors, hairlineWidth, type } from '../../../lib/theme'

const HUB_OPTIONS: Array<{
  id: BondSection
  icon: IconName
  title: string
  body: string
}> = [
  {
    id: 'habits',
    icon: 'calendar',
    title: 'Habits',
    body: 'Calendar and key for Spark through Sync',
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
    body: 'Daily streak, month rhythm, connection mix',
  },
  {
    id: 'reviews',
    icon: 'book-open',
    title: 'Reviews',
    body: 'Summaries of weekly reviews you finish together',
  },
]

export default function BondHubScreen() {
  const { profile, isLoading } = useAuth()
  const navigation = useNavigation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const unsub = (
      navigation as {
        addListener: (event: string, cb: () => void) => () => void
      }
    ).addListener('tabPress', () => {
      setMenuOpen(true)
    })
    return unsub
  }, [navigation])

  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const openSection = (section: BondSection) => {
    setMenuOpen(false)
    router.push(`/(app)/bond/${section}`)
  }

  return (
    <Screen>
      <Text style={styles.title}>Bond</Text>
      <Text style={styles.subtitle}>How are we growing together?</Text>

      <View>
        {HUB_OPTIONS.map((option, index) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => openSection(option.id)}
            style={({ pressed }) => [
              styles.row,
              index === HUB_OPTIONS.length - 1 && styles.rowLast,
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
      </View>

      <BondMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={openSection}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    ...type.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
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
})
