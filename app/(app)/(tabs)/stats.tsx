import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useNavigation } from 'expo-router'

import {
  BondMenu,
  type BondSection,
} from '../../../components/BondMenu'
import { LoadingScreen, Screen, Subtitle, Title } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { colors, radii } from '../../../lib/theme'

const HUB_OPTIONS: Array<{
  id: BondSection
  glyph: string
  title: string
  body: string
}> = [
  {
    id: 'habits',
    glyph: '✧',
    title: 'Habits',
    body: 'Calendar + badge key for Spark through Sync',
  },
  {
    id: 'goals',
    glyph: '◎',
    title: 'Goals',
    body: 'Shared targets you’re building toward',
  },
  {
    id: 'streaks',
    glyph: '◈',
    title: 'Streaks',
    body: 'Daily streak, month rhythm, connection mix',
  },
]

export default function BondHubScreen() {
  const { profile, isLoading } = useAuth()
  const navigation = useNavigation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // Tab screens receive tabPress from the bottom-tabs navigator.
    const unsub = (navigation as { addListener: (event: string, cb: () => void) => () => void }).addListener(
      'tabPress',
      () => {
        setMenuOpen(true)
      },
    )
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
      <Title>Bond</Title>
      <Subtitle>How are we growing together?</Subtitle>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Bond menu"
        onPress={() => setMenuOpen(true)}
        style={styles.menuBtn}
      >
        <Text style={styles.menuBtnText}>Open menu</Text>
      </Pressable>

      <View style={styles.list}>
        {HUB_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => openSection(option.id)}
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
  menuBtn: {
    alignSelf: 'flex-start',
    borderWidth: 0,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
  },
  menuBtnText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    borderColor: colors.hairline,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    padding: 16,
    shadowColor: '#C9A8B4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
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
})
