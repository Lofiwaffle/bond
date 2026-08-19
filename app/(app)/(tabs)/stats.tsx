import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  Card,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
  useMonthCheckIns,
  useTodayCheckIn,
} from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import {
  badgesForProgress,
  nextStreakBadge,
  streakProgressToward,
} from '../../../lib/badges'
import {
  formatMonthTitle,
  getMonthGrid,
  dateKey,
  localDateString,
} from '../../../lib/dates'
import { SCORE_LABELS, colors, radii, scoreColors } from '../../../lib/theme'

export default function StatsScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const { days, isLoading, refresh } = useCheckInHistory()
  const { mine: todayMine } = useTodayCheckIn()
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()
  const { byDate, isLoading: monthLoading } = useMonthCheckIns(year, month)

  const stats = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    const streak = computeStreak(myDates, today)
    const syncDays = days.filter((d) => d.revealed).length
    const hasMutualReveal = syncDays > 0
    const togetherCount =
      days.filter((d) => d.mine).length +
      days.filter((d) => d.revealed && d.partner).length

    const yearMine = [0, 0, 0, 0, 0]
    const yearPartner = [0, 0, 0, 0, 0]
    for (const day of days) {
      if (!day.date.startsWith(String(year))) continue
      if (day.mine?.score) yearMine[day.mine.score - 1] += 1
      if (day.revealed && day.partner?.score) {
        yearPartner[day.partner.score - 1] += 1
      }
    }

    const mineTotal = yearMine.reduce((a, b) => a + b, 0)
    const partnerTotal = yearPartner.reduce((a, b) => a + b, 0)
    const progress = {
      streak,
      hasMutualReveal,
      syncDays,
      togetherCount,
    }
    const badges = badgesForProgress(progress)
    const earnedCount = badges.filter((b) => b.earned).length
    const next = nextStreakBadge(streak)
    const nextProgress = next?.streakTarget
      ? streakProgressToward(streak, next.streakTarget)
      : null

    return {
      streak,
      hasMutualReveal,
      syncDays,
      togetherCount,
      yearMine,
      yearPartner,
      mineTotal,
      partnerTotal,
      badges,
      earnedCount,
      next,
      nextProgress,
    }
  }, [days, year])

  if (authLoading || isLoading || monthLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const grid = getMonthGrid(year, month)
  const partnerName = partner?.display_name ?? 'your partner'

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Title>Bond</Title>
            <Subtitle>
              Grow together{partner ? ` with ${partner.display_name}` : ''}.
              Every check-in levels your connection.
            </Subtitle>
          </View>
        </View>

        <Card style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Together streak</Text>
          <Text style={styles.heroStreak}>{stats.streak}</Text>
          <Text style={styles.heroUnit}>days showing up</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.earnedCount}/5</Text>
              <Text style={styles.heroStatLabel}>badges</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.syncDays}</Text>
              <Text style={styles.heroStatLabel}>sync days</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.togetherCount}</Text>
              <Text style={styles.heroStatLabel}>check-ins</Text>
            </View>
          </View>

          {stats.next && stats.nextProgress ? (
            <View style={styles.nextBlock}>
              <View style={styles.nextHeader}>
                <Text style={styles.nextGlyph}>{stats.next.glyph}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextTitle}>
                    Next: {stats.next.label}
                  </Text>
                  <Text style={styles.nextQuest}>{stats.next.quest}</Text>
                </View>
                <Text style={styles.nextFraction}>
                  {stats.nextProgress.current}/{stats.nextProgress.target}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(stats.nextProgress.ratio * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.nextHint}>
                {stats.nextProgress.remaining === 0
                  ? 'Unlocked — keep going'
                  : `${stats.nextProgress.remaining} more day${stats.nextProgress.remaining === 1 ? '' : 's'} to unlock`}
              </Text>
            </View>
          ) : (
            <Text style={styles.nextHint}>
              You’ve forged every streak badge. Keep Sync days stacking.
            </Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Quests</Text>
          <Text style={styles.sectionHint}>
            Small plays that build the relationship.
          </Text>
          {!todayMine ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/check-in')}
              style={styles.questRow}
            >
              <Text style={styles.questGlyph}>◎</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Check in today</Text>
                <Text style={styles.questBody}>
                  Protect the streak and share how connected you feel.
                </Text>
              </View>
              <Text style={styles.questCta}>Go</Text>
            </Pressable>
          ) : (
            <View style={[styles.questRow, styles.questDone]}>
              <Text style={styles.questGlyph}>◎</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Today’s check-in saved</Text>
                <Text style={styles.questBody}>
                  {partner
                    ? `Waiting on ${partnerName} keeps today’s Sync pending.`
                    : 'Come back tomorrow to keep growing.'}
                </Text>
              </View>
              <Text style={styles.questDoneLabel}>Done</Text>
            </View>
          )}

          {!stats.hasMutualReveal ? (
            <View style={styles.questRow}>
              <Text style={styles.questGlyph}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Unlock Sync</Text>
                <Text style={styles.questBody}>
                  Both of you check in on the same day to reveal and earn ✦ Sync.
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.questRow, styles.questDone]}>
              <Text style={styles.questGlyph}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Sync unlocked</Text>
                <Text style={styles.questBody}>
                  {stats.syncDays} mutual day{stats.syncDays === 1 ? '' : 's'}{' '}
                  revealed with {partnerName}.
                </Text>
              </View>
              <Text style={styles.questDoneLabel}>Done</Text>
            </View>
          )}

          {stats.next ? (
            <View style={styles.questRow}>
              <Text style={styles.questGlyph}>{stats.next.glyph}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Chase {stats.next.label}</Text>
                <Text style={styles.questBody}>{stats.next.quest}</Text>
              </View>
            </View>
          ) : null}

          {!todayMine ? (
            <PrimaryButton
              label="Check in now"
              onPress={() => router.push('/(app)/check-in')}
            />
          ) : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Badge path</Text>
          <Text style={styles.sectionHint}>
            Earn marks as you grow — streak badges plus Sync for doing it together.
          </Text>
          <View style={styles.badgePath}>
            {stats.badges.map((badge, index) => (
              <View key={badge.id} style={styles.badgePathItem}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.badgeConnector,
                      badge.earned && styles.badgeConnectorOn,
                    ]}
                  />
                ) : null}
                <View style={styles.badgeNodeRow}>
                  <View
                    style={[
                      styles.badgeNodeGlyphWrap,
                      badge.earned
                        ? styles.badgeNodeGlyphOn
                        : styles.badgeNodeGlyphOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeNodeGlyph,
                        !badge.earned && styles.badgeMutedText,
                      ]}
                    >
                      {badge.glyph}
                    </Text>
                  </View>
                  <View style={styles.badgeNodeCopy}>
                    <Text
                      style={[
                        styles.badgeNodeLabel,
                        !badge.earned && styles.badgeMutedText,
                      ]}
                    >
                      {badge.label}
                    </Text>
                    <Text style={styles.badgeNodeDesc} numberOfLines={2}>
                      {badge.earned ? badge.description : badge.quest}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>
            {formatMonthTitle(year, month)} rhythm
          </Text>
          <Text style={styles.sectionHint}>
            Your connection colors this month — fill more cells together.
          </Text>
          <View style={styles.matrix}>
            {grid.map((day, index) => {
              if (day == null) {
                return <View key={`e-${index}`} style={styles.matrixCell} />
              }
              const key = dateKey(year, month, day)
              const score = byDate[key]?.mine?.score
              const synced = byDate[key]?.revealed
              return (
                <View
                  key={key}
                  style={[
                    styles.matrixCell,
                    {
                      backgroundColor:
                        score != null ? scoreColors[score] : colors.bgSoft,
                      borderColor: synced ? colors.accent : colors.hairline,
                    },
                  ]}
                />
              )
            })}
          </View>
          <View style={styles.legendRow}>
            {[1, 2, 3, 4, 5].map((score) => (
              <View key={score} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: scoreColors[score] },
                  ]}
                />
                <Text style={styles.legendText}>{score}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>{year} connection mix</Text>
          <Text style={styles.meta}>You · {stats.mineTotal} check-ins</Text>
          <DistributionBars counts={stats.yearMine} total={stats.mineTotal} />
          {partner ? (
            <>
              <Text style={[styles.meta, { marginTop: 16 }]}>
                {partner.display_name} · {stats.partnerTotal} revealed
              </Text>
              <DistributionBars
                counts={stats.yearPartner}
                total={stats.partnerTotal}
              />
            </>
          ) : null}
        </Card>

        <SecondaryButton label="Refresh" onPress={() => void refresh()} />
      </ScrollView>
    </Screen>
  )
}

function DistributionBars({
  counts,
  total,
}: {
  counts: number[]
  total: number
}) {
  return (
    <View style={styles.distList}>
      {counts.map((count, index) => {
        const score = index + 1
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <View key={score} style={styles.distRow}>
            <Text style={styles.distLabel}>{SCORE_LABELS[score]}</Text>
            <View style={styles.distTrack}>
              <View
                style={[
                  styles.distFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: scoreColors[score],
                  },
                ]}
              />
            </View>
            <Text style={styles.distCount}>{count}</Text>
          </View>
        )
      })}
    </View>
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
  heroCard: {
    borderColor: colors.accent,
  },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroStreak: {
    color: colors.accent,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroUnit: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 14,
    marginBottom: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.hairline,
  },
  nextBlock: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.bgSoft,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  nextGlyph: {
    fontSize: 28,
    color: colors.accent,
    width: 36,
    textAlign: 'center',
  },
  nextTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  nextQuest: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  nextFraction: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  nextHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.bgSoft,
  },
  questDone: {
    borderColor: colors.accentSoft,
  },
  questGlyph: {
    fontSize: 22,
    color: colors.accent,
    width: 28,
    textAlign: 'center',
  },
  questTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  questBody: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  questCta: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  questDoneLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  badgePath: {
    gap: 12,
  },
  badgePathItem: {
    position: 'relative',
  },
  badgeConnector: {
    position: 'absolute',
    left: 23,
    top: -12,
    width: 2,
    height: 12,
    backgroundColor: colors.hairline,
  },
  badgeConnectorOn: {
    backgroundColor: colors.accent,
  },
  badgeNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeNodeGlyphWrap: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNodeGlyphOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  badgeNodeGlyphOff: {
    borderColor: colors.hairline,
    backgroundColor: colors.bgSoft,
  },
  badgeNodeGlyph: {
    fontSize: 22,
    color: colors.accent,
  },
  badgeNodeCopy: {
    flex: 1,
  },
  badgeNodeLabel: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  badgeNodeDesc: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  badgeMutedText: {
    color: colors.muted,
    opacity: 0.55,
  },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  matrixCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distList: {
    gap: 8,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distLabel: {
    width: 96,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  distTrack: {
    flex: 1,
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
  },
  distCount: {
    width: 28,
    textAlign: 'right',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
})
