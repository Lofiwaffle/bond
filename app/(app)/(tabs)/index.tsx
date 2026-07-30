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
  Subtitle,
  Title,
} from '../../../components/ui'
import { useMonthCheckIns } from '../../../hooks/useCheckIn'
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
import { colors, radii, scoreColors, scoreColorsSoft } from '../../../lib/theme'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function EntriesScreen() {
  const { profile, partner, user, isLoading: authLoading } = useAuth()
  const today = localDateString()
  const initial = useMemo(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  }, [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDate, setSelectedDate] = useState(today)

  const { byDate, isLoading, refresh } = useMonthCheckIns(year, month)

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
      <View style={styles.headerRow}>
        <Title>Entries</Title>
        {partner ? (
          <Text style={styles.partnerChip}>with {partner.display_name}</Text>
        ) : null}
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

        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={`${d}-${i}`} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((day, idx) => {
            if (day == null) {
              return <View key={`e-${idx}`} style={styles.dayCell} />
            }
            const key = dateKey(year, month, day)
            const data = byDate[key]
            const myScore = data?.mine?.score
            const selectedCell = key === selectedDate
            const isTodayCell = key === today

            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${key}${myScore ? `, score ${myScore}` : ''}`}
                onPress={() => {
                  setSelectedDate(key)
                  router.push(`/(app)/day/${key}`)
                }}
                style={[
                  styles.dayCell,
                  selectedCell && styles.daySelected,
                  isTodayCell && styles.dayToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    selectedCell && styles.dayNumSelected,
                  ]}
                >
                  {day}
                </Text>
                {myScore ? (
                  <View
                    style={[
                      styles.moodDot,
                      { backgroundColor: scoreColors[myScore] },
                    ]}
                  >
                    <ScoreEmoji score={myScore} size={14} />
                  </View>
                ) : (
                  <View style={styles.moodDotPlaceholder} />
                )}
                {data?.revealed && data.partner ? (
                  <View
                    style={[
                      styles.partnerDot,
                      { backgroundColor: scoreColors[data.partner.score] },
                    ]}
                  />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </Card>

      <ScrollView contentContainerStyle={styles.detail}>
        <Text style={styles.detailDate}>{formatDisplayDate(selectedDate)}</Text>

        {!selected?.mine && isToday ? (
          <Card style={{ backgroundColor: scoreColorsSoft[4] }}>
            <Text style={styles.ctaTitle}>How connected did you feel?</Text>
            <Text style={styles.ctaBody}>
              Tap a face and save — your partner only sees it after they check
              in too.
            </Text>
            <PrimaryButton
              label={partner ? 'Check in now' : 'Waiting for partner'}
              onPress={() => router.push('/(app)/check-in')}
              disabled={!partner}
            />
          </Card>
        ) : null}

        {selected?.mine ? (
          <Card>
            <Text style={styles.metaLabel}>You</Text>
            <View style={styles.scoreLine}>
              <ScoreEmoji score={selected.mine.score} size={36} />
              <Text style={styles.scoreText}>
                {selected.mine.score} · {SCORE_LABELS[selected.mine.score]}
              </Text>
            </View>
            <Text style={styles.note}>
              {selected.mine.note?.trim()
                ? selected.mine.note
                : 'No note written.'}
            </Text>

            <Text style={styles.metaLabel}>
              {partner?.display_name ?? 'Partner'}
            </Text>
            {selected.revealed && selected.partner ? (
              <>
                <View style={styles.scoreLine}>
                  <ScoreEmoji score={selected.partner.score} size={36} />
                  <Text style={styles.scoreText}>
                    {selected.partner.score} ·{' '}
                    {SCORE_LABELS[selected.partner.score]}
                  </Text>
                </View>
                <Text style={styles.note}>
                  {selected.partner.note?.trim()
                    ? selected.partner.note
                    : 'No note written.'}
                </Text>
              </>
            ) : selected.mine && user ? (
              <Text style={styles.hidden}>
                Hidden until you both check in
              </Text>
            ) : (
              <Text style={styles.hidden}>No entry yet</Text>
            )}

            <PrimaryButton
              label="Open full day"
              onPress={() => router.push(`/(app)/day/${selectedDate}`)}
            />
          </Card>
        ) : !isToday ? (
          <Card>
            <Text style={styles.hidden}>No check-in for this day.</Text>
            <PrimaryButton
              label="Open day"
              onPress={() => router.push(`/(app)/day/${selectedDate}`)}
            />
          </Card>
        ) : null}

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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  partnerChip: {
    backgroundColor: colors.accentSoft,
    color: colors.accentPressed,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: 8,
  },
  calendarCard: {
    paddingBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginTop: -2,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  daySelected: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  dayNumSelected: {
    fontWeight: '800',
  },
  moodDot: {
    marginTop: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDotPlaceholder: {
    marginTop: 2,
    width: 22,
    height: 22,
  },
  partnerDot: {
    position: 'absolute',
    bottom: 4,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.white,
  },
  detail: {
    paddingBottom: 24,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  ctaBody: {
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  note: {
    marginTop: 8,
    color: colors.ink,
    lineHeight: 20,
  },
  hidden: {
    color: colors.muted,
    fontStyle: 'italic',
  },
})
