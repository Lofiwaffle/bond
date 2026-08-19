import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable, TouchableOpacity, Image } from 'react-native'
import { useAuth } from '../../../lib/auth'
import { useBidLogging } from '../../../hooks/useBidLogging'
import { useAppreciation } from '../../../hooks/useAppreciation'
import { useRitualTracker } from '../../../hooks/useRitualTracker'
import { listRepairCards } from '../../../supabase/functions/repair-cards/list-repair-cards'

// Styles
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  scroll: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#2d3748', marginBottom: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  streakBadge: { 
    marginLeft: 6, 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 12, 
    fontSize: 12, 
    fontWeight: '600', 
    textTransform: 'uppercase' 
  },
  dayPrompt: { fontSize: 14, color: '#4a5568', marginBottom: 8 },
  logButton: {
    marginTop: 8,
    backgroundColor: '#3182ce',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  card: {
    background: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appreciationCard: {
    background: '#edf2f7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  categoryTag: {
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    marginRight: 4,
  },
  ritualCard: {
    background: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ritualName: { fontSize: 14, fontWeight: '700', color: '#2d3748' },
  ritualFreq: { fontSize: 12, color: '#718096', marginTop: 4 },
  repairGrid: { gap: 12, flexWrap: 'wrap' },
  repairCard: {
    padding: 12,
    borderRadius: 8,
    minWidth: 140,
    background: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  repairTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  repairPrompt: { fontSize: 11, color: '#718096', lineHeight: 16 },
})

export default function CouplesHabitsScreen() {
  const { profile, partner, couple, user } = useAuth()
  const [tab, setTab] = useState('bids')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Feature hooks
  const { logTurnToward, streak, bestStreak } = useBidLogging()
  const { tapAppreciation, APPRECIATION_CATEGORIES } = useAppreciation()
  const { trackRitual, rituals, streak: ritualStreak, completeRitual } = useRitualTracker()
  const [repairCards, setRepairCards] = useState<any[]>([])
  const [loadingRepairCards, setLoadingRepairCards] = useState(true)

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

  // --- BID LOG SECTION ---
  const handleLogBid = async (turnedToward: boolean, note?: string) => {
    const result = await logTurnToward(turnedToward, note)
    if (result.error) {
      alert(result.error)
    }
  }

  // --- APPRECIATION SECTION ---
  const handleTapAppreciation = async (category: string, message?: string) => {
    const result = await tapAppreciation(category, message)
    if (result.error) {
      alert(result.error)
    }
  }

  // --- RITUAL SECTION ---
  const handleCompleteRitual = async () => {
    const result = await completeRitual()
    if (result.error) {
      alert(result.error)
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
          <Text style={{ fontSize: 14, color: '#4a5568' }}>Streak: </Text>
          <View style={{
            ...styles.streakBadge,
            background: streak > 0 ? '#38a169' : '#e2e8f0',
            color: streak > 0 ? 'white' : '#4a5568',
          }}>
            {bestStreak} day{bestStreak !== 1 ? '' : ''}
          </View>
        </View>
        <Pressable style={styles.logButton} onPress={() => handleLogBid(true)}>
          <Text style={styles.logButtonText}>✅ Turned toward</Text>
        </Pressable>
        <Pressable style={styles.logButton} onPress={() => handleLogBid(false)}>
          <Text style={styles.logButtonText}>❌ Missed</Text>
        </Pressable>
        {streak > 0 && (
          <Text style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
            🔥 {streak}-day streak of turning toward bids!
          </Text>
        )}
      </View>

      {/* APPRECIATION SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💛 One-Tap Appreciation</Text>
        <Text style={styles.dayPrompt}>
          Tap a category to appreciate your partner
        </Text>
        <View style={{ gap: 6, marginBottom: 8 }}>
          {APPRECIATION_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.appreciationCard,
                { borderLeft: `3px solid ${getCategoryColor(cat)}` },
              ]}
              onPress={() => handleTapAppreciation(cat)}
            >
              <Text style={{ fontSize: 12, color: '#4a5568' }}>{cat}</Text>
              {cat === 'effort' && (
                <Text style={{ fontSize: 10, color: '#718096' }}> effort noticed</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Pressable style={styles.logButton} onPress={() => handleTapAppreciation('humor', 'You made me laugh today')}>
          <Text style={styles.logButtonText}>Quick: "You made me laugh"</Text>
        </Pressable>
      </View>

      {/* RITUAL SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Shared Rituals</Text>
        <Text style={styles.dayPrompt}>
          Co-create recurring moments together
        </Text>
        <View style={{ gap: 6, marginBottom: 8 }}>
          <Pressable style={styles.appreciationCard} onPress={() => setTab('ritual-form')}>
            <Text style={{ fontSize: 14, color: '#3182ce' }}>
              + Create new ritual
            </Text>
          </Pressable>
        </View>
        {rituals.map((ritual) => (
          <View key={ritual.id} style={styles.ritualCard}>
            <Text style={styles.ritualName}>{ritual.name}</Text>
            <Text style={styles.ritualFreq}>Frequency: {ritual.frequency}</Text>
            <View style={styles.streakRow}>
              <Text style={{ fontSize: 12, color: '#4a5568' }}>Streak: </Text>
              <View style={styles.streakBadge} style={{ background: ritual.streak > 0 ? '#38a169' : '#e2e8f0', color: ritual.streak > 0 ? 'white' : '#4a5568' }}>
                {ritual.streak}
              </View>
            </View>
            {ritual.last_completed && (
              <Text style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
                Last: {new Date(ritual.last_completed).toLocaleDateString()}
              </Text>
            )}
            <Pressable style={{ marginTop: 8 }}>
              <Text style={{ color: '#3182ce' }}>Mark complete</Text>
            </Pressable>
          </View>
        ))}
        {rituals.length === 0 && (
          <Text style={{ fontSize: 13, color: '#718096' }}>No rituals yet. Create one above!</Text>
        )}
      </View>

      {/* REPAIR CARDS SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Conflict Repair Cards</Text>
        <Text style={styles.dayPrompt}>
          Pre-framed attempts to de-escalate conflict
        </Text>
        {loadingRepairCards ? (
          <Text>Loading repair cards…</Text>
        ) : repairCards.length === 0 ? (
          <Text style={{ color: '#718096' }}>No repair cards loaded.</Text>
        ) : (
          <View style={styles.repairGrid}>
            {repairCards.map((card) => (
              <View
                key={card.id}
                style={styles.repairCard}
              >
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
    support: '#3182ce',
    humor: '#f6e05e',
    effort: '#68d391',
    presence: '#ed8936',
    other: '#a0aec0',
  }
  return colors[cat] || '#a0aec0'
}