import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  Card,
  LoadingScreen,
  PrimaryButton,
  ScoreEmoji,
  Screen,
  SecondaryButton,
  StreakChip,
  Subtitle,
  Title,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
  useMonthCheckIns,
} from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import {
  DAILY_PROMPT,
  SCORE_LABELS,
  dateKey,
  formatDisplayDate,
  formatMonthTitle,
  getMonthGrid,
  localDateString,
} from '../../../lib/dates'
import { colors, radii, scoreColors } from '../../../lib/theme'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function EntriesScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const today = localDateString()
  const initial = useMemo(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  }, [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDate, setSelectedDate] = useState(today)

  const { byDate, isLoading, refresh } = useMonthCheckIns(year, month)
  const { days } = useCheckInHistory()

  const streak = useMemo(() => {
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    return computeStreak(myDates, today)
  }, [days, today])

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const grid = getMonthGrid(year, month)
  const selected = byDate[selectedDate]
  const isToday = selectedDate === today

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Title>Entries</Title>
            {partner ? (
              <Text style={styles.partnerChip}>with {partner.display_name}</Text>
            ) : null}
          </View>
          <StreakChip streak={streak} />
        </View>
        <Subtitle>{DAILY_PROMPT}</Subtitle>

        <Card style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => shiftMonth(-1)}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{formatMonthTitle(year, month)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => shiftMonth(1)}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAYS.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.weekHeaderText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map((day, index) => {
              if (day == null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />
              }
              const key = dateKey(year, month, day)
              const data = byDate[key]
              const mineScore = data?.mine?.score
              const isSelected = key === selectedDate
              const isTodayCell = key === today

              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={formatDisplayDate(key)}
                  onPress={() => setSelectedDate(key)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.daySelected,
                    isTodayCell && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  <View style={styles.dayDots}>
                    {mineScore != null ? (
                      <View
                        style={[
                          styles.moodDot,
                          { backgroundColor: scoreColors[mineScore] },
                        ]}
                      />
                    ) : (
                      <View style={styles.moodDotEmpty} />
                    )}
                    {data?.revealed && data.partner ? (
                      <View
                        style={[
                          styles.partnerDot,
                          { backgroundColor: scoreColors[data.partner.score] },
                        ]}
                      />
                    ) : null}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </Card>

        <Card>
          <Text style={styles.selectedTitle}>{formatDisplayDate(selectedDate)}</Text>
          {selected?.mine ? (
            <View style={styles.selectedRow}>
              <View
                style={[
                  styles.faceBlob,
                  { backgroundColor: scoreColors[selected.mine.score] },
                ]}
              >
                <ScoreEmoji score={selected.mine.score} size={28} />
              </View>
              <View>
                <Text style={styles.selectedScore}>
                  You · {SCORE_LABELS[selected.mine.score]}
                </Text>
                {selected.revealed && selected.partner ? (
                  <Text style={styles.selectedPartner}>
                    {partner?.display_name ?? 'Partner'} ·{' '}
                    {SCORE_LABELS[selected.partner.score]}
                  </Text>
                ) : selected.mine && !selected.revealed ? (
                  <Text style={styles.selectedPartner}>
                    Waiting for partner to reveal
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyDay}>No check-in logged for this day.</Text>
          )}

          {isToday && !selected?.mine ? (
            <PrimaryButton
              label="Check in today"
              onPress={() => router.push('/(app)/check-in')}
            />
          ) : (
            <SecondaryButton
              label="Open day"
              onPress={() => router.push(`/(app)/day/${selectedDate}`)}
            />
          )}
        </Card>

        <SecondaryButton label="Refresh" onPress={() => void refresh()} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  partnerChip: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -2,
    marginBottom: 8,
  },
  calendarCard: {
    paddingBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 24,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  daySelected: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  dayToday: {
    backgroundColor: colors.bgSoft,
  },
  dayNumber: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: colors.accent,
  },
  dayDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    minHeight: 6,
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moodDotEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  partnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.85,
  },
  selectedTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  faceBlob: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedScore: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  selectedPartner: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  emptyDay: {
    color: colors.muted,
    marginBottom: 12,
  },
})
