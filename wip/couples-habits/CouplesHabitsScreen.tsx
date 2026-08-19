import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native'
import { useAuth } from '../../../lib/auth'
import { useBidLogging } from '../../../hooks/useBidLogging'
import { useAppreciation } from '../../../hooks/useAppreciation'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg },
  section: { marginBottom: space.md },
  sectionTitle: { fontSize: type.title, fontWeight: '800', color: colors.ink, marginBottom: space.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xs },
  streakLabel: { fontSize: type.caption, color: colors.muted },
  streakBadge: {
    marginLeft: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    fontSize: type.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayPrompt: { fontSize: type.caption, color: colors.muted, marginBottom: space.sm },
  logButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    minHeight: hit,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    overflow: 'hidden',
  },
  logButtonText: { color: colors.white, fontSize: type.body, fontWeight: '700', letterSpacing: 0.2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg + 2,
    borderWidth: hairline,
    borderColor: colors.hairline,
    marginBottom: space.md,
    ...elevation.card,
  },
  appreciationCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: space.lg,
    marginTop: space.md,
  },
  repairGrid: { gap: space.md, flexWrap: 'wrap' },
  repairCard: {
    padding: space.lg,
    borderRadius: radii.md,
    minWidth: 140,
    backgroundColor: colors.bgSoft,
    borderWidth: hairline,
    borderColor: colors.hairline,
  },
  repairTitle: { fontSize: type.caption, fontWeight: '600', marginBottom: space.xs },
  repairPrompt: { fontSize: type.footnote, color: colors.muted, lineHeight: 16 },
})

export default function CouplesHabitsScreen() {
  const { profile, partner, couple, user } = useAuth()
  const [bestStreak, setBestStreak] = useState(0)
  const [loadingRepairCards, setLoadingRepairCards] = useState(true)
  const [repairCards, setRepairCards] = useState<any[]>([])

  // Load repair cards on mount
  useEffect(() => {
    void loadRepairCards()
  }, [])

  const loadRepairCards = async () => {
    setLoadingRepairCards(true)
    try {
      const result = await listRepairCards()
      if (result.data) {
        setRepairCards(result.data)
      }
    } catch (e) {
      console.error('Failed to load repair cards', e)
    } finally {
      setLoadingRepairCards(false)
    }
  }

  // Feature hooks
  const { logTurnToward, streak: hookStreak, bestStreak: hookBestStreak } = useBidLogging()
  const { tapAppreciation, APPRECIATION_CATEGORIES } = useAppreciation()

  // Use the hook's bestStreak if available, otherwise state
  useEffect(() => {
    setBestStreak(hookBestStreak ?? hookStreak ?? bestStreak)
  }, [hookBestStreak, hookStreak, bestStreak])

  const categories = hookCategories || APPRECIATION_CATEGORIES

  const handleLogBid = async (turnedToward: boolean, note?: string) => {
    const result = await logTurnToward(turnedToward, note)
    if (result.error) {
      Alert.alert('Error', result.error)
    }
  }

  const handleTapAppreciation = async (category: string, message?: string) => {
    const result = await tapAppreciation(category, message)
    if (result.error) {
      Alert.alert('Error', result.error)
    }
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
      {/* BID LOG SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👀 Bid Responsiveness</Text>
        <Text style={styles.dayPrompt}>
          Did you turn toward your partner's bid today?
        </Text>
        <View style={styles.streakRow}>
          <Text style={styles.streakLabel}>Streak: </Text>
          <View style={styles.streakBadge}>
            {bestStreak} day{bestStreak !== 1 ? 's' : ''}
          </View>
        </View>
        <Pressable style={styles.logButton} onPress={() => handleLogBid(true)}>
          <Text style={styles.logButtonText}>✅ Turned toward</Text>
        </Pressable>
        <Pressable style={styles.logButton} onPress={() => handleLogBid(false)}>
          <Text style={styles.logButtonText}>❌ Missed</Text>
        </Pressable>
        {bestStreak > 0 && (
          <Text style={{ fontSize: type.footnote, color: colors.muted, marginTop: space.xs }}>
            🔥 {bestStreak}-day streak of turning toward bids!
          </Text>
        )}
      </View>

      {/* APPRECIATION SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💛 One-Tap Appreciation</Text>
        <Text style={styles.dayPrompt}>Tap a category to appreciate your partner</Text>
        <View style={{ gap: space.xs, marginBottom: space.sm }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.appreciationCard,
                { borderLeft: `3px solid ${getCategoryColor(cat)}` },
              ]}
              onPress={() => handleTapAppreciation(cat)}
            >
              <Text style={{ fontSize: type.caption, color: colors.muted }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Pressable style={styles.logButton} onPress={() => handleTapAppreciation('humor', 'You made me laugh today')}>
          <Text style={styles.logButtonText}>Quick: "You made me laugh"</Text>
        </Pressable>
      </View>

      {/* REPAIR CARDS SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Conflict Repair Cards</Text>
        <Text style={styles.dayPrompt}>Pre-framed attempts to de-escalate conflict</Text>
        {loadingRepairCards ? (
          <Text>Loading repair cards…</Text>
        ) : repairCards.length === 0 ? (
          <Text style={{ color: colors.muted }}>No repair cards loaded.</Text>
        ) : (
          <View style={styles.repairGrid}>
            {repairCards.map((card) => (
              <View key={card.id} style={styles.repairCard}>
                <Text style={styles.repairTitle}>{card.title}</Text>
                <Text style={styles.repairPrompt}>{card.prompt}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function getCategoryColor(cat: string) {
  const colors = {
    support: colors.accent,
    humor: colors.accentSoft,
    effort: colors.success,
    presence: colors.accentSoft,
    other: colors.muted,
  }
  return colors[cat] || colors.muted
}