import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

import {
  Card,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
} from '../../../hooks/useCheckIn'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useAuth } from '../../../lib/auth'
import { BADGES, badgesForProgress } from '../../../lib/badges'
import { localDateString } from '../../../lib/dates'
import { colors, radii } from '../../../lib/theme'

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function togetherSinceLabel(iso: string | null | undefined): string {
  if (!iso) return 'Just getting started'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Just getting started'
  return `Together since ${d.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })}`
}

export default function MoreScreen() {
  const { profile, couple, partner, isLoading, signOut, refreshProfile } =
    useAuth()
  const { days, isLoading: historyLoading, refresh: refreshHistory } =
    useCheckInHistory()
  const {
    counts,
    isLoading: habitsLoading,
    refresh: refreshHabits,
  } = useHabitBadges()
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    const streak = computeStreak(myDates, today)
    const myCheckIns = days.filter((d) => d.mine).length
    const syncDays = days.filter((d) => d.revealed).length
    const badges = badgesForProgress({ completions: counts })
    const earned = badges.filter((b) => b.earned)
    const habitLogs = Object.values(counts).reduce((a, n) => a + n, 0)
    return { streak, myCheckIns, syncDays, badges, earned, habitLogs }
  }, [counts, days])

  if (isLoading || historyLoading || habitsLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name?.trim() || null
  const coupleTitle = partnerName ? `${myName} & ${partnerName}` : myName
  const since = togetherSinceLabel(couple?.paired_at ?? couple?.created_at)

  const copyInviteCode = async () => {
    if (!couple?.invite_code) return
    await Clipboard.setStringAsync(couple.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshAll = () => {
    void refreshProfile()
    void refreshHistory()
    void refreshHabits()
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Couple portfolio</Text>
        <Text style={styles.heroTitle}>{coupleTitle}</Text>
        <Text style={styles.heroSub}>{since}</Text>

        <View style={styles.avatarRow}>
          <View style={[styles.avatar, styles.avatarYou]}>
            <Text style={styles.avatarLetter}>{initialOf(myName)}</Text>
            <Text style={styles.avatarCaption}>{myName}</Text>
          </View>
          <Text style={styles.ampersand}>◎</Text>
          <View
            style={[
              styles.avatar,
              partnerName ? styles.avatarPartner : styles.avatarEmpty,
            ]}
          >
            <Text
              style={[
                styles.avatarLetter,
                !partnerName && styles.avatarLetterMuted,
              ]}
            >
              {partnerName ? initialOf(partnerName) : '?'}
            </Text>
            <Text style={styles.avatarCaption}>
              {partnerName ?? 'Waiting…'}
            </Text>
          </View>
        </View>

        <View style={styles.statStrip}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.earned.length}/5</Text>
            <Text style={styles.statLabel}>habits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.syncDays}</Text>
            <Text style={styles.statLabel}>sync days</Text>
          </View>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <Text style={styles.sectionHint}>
            Habits you’ve unlocked together.
          </Text>
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => {
              const earned = stats.badges.find((b) => b.id === badge.id)
              const count = earned?.count ?? 0
              const on = count > 0
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCell,
                    on && { borderColor: badge.color },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeSquare,
                      {
                        backgroundColor: on ? badge.color : colors.bgSoft,
                        borderColor: on ? badge.color : colors.hairline,
                      },
                    ]}
                  />
                  <Text
                    style={[styles.badgeName, !on && styles.badgeNameMuted]}
                  >
                    {badge.glyph} {badge.label}
                  </Text>
                  <Text style={[styles.badgeCount, on && { color: badge.color }]}>
                    {on ? `×${count}` : 'locked'}
                  </Text>
                </View>
              )
            })}
          </View>
          {stats.habitLogs === 0 ? (
            <Text style={styles.emptyHint}>
              No habit logs yet. Open Habits to start filling your portfolio.
            </Text>
          ) : (
            <Text style={styles.emptyHint}>
              {stats.habitLogs} habit moment{stats.habitLogs === 1 ? '' : 's'}{' '}
              logged · {stats.myCheckIns} check-in
              {stats.myCheckIns === 1 ? '' : 's'}
            </Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Together</Text>
          <Text style={styles.sectionHint}>Jump into how you’re growing.</Text>
          {(
            [
              {
                id: 'habits',
                glyph: '✧',
                tint: '#FFE4D6',
                title: 'Habits',
                body: 'Calendar and badge key',
                href: '/(app)/bond/habits' as const,
              },
              {
                id: 'streaks',
                glyph: '◈',
                tint: '#FFF4CC',
                title: 'Streaks',
                body: 'Daily streak and rhythm',
                href: '/(app)/bond/streaks' as const,
              },
              {
                id: 'goals',
                glyph: '◎',
                tint: '#DCEBFF',
                title: 'Goals',
                body: 'Shared targets',
                href: '/(app)/bond/goals' as const,
              },
              {
                id: 'weekly',
                glyph: '✦',
                tint: '#FFE0EE',
                title: 'Weekly review',
                body: 'Look back on the week together',
                href: '/(app)/weekly-review' as const,
              },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && styles.linkRowPressed,
              ]}
            >
              <View style={[styles.linkGlyphBubble, { backgroundColor: item.tint }]}>
                <Text style={styles.linkGlyph}>{item.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>{item.title}</Text>
                <Text style={styles.linkBody}>{item.body}</Text>
              </View>
              <Text style={styles.linkChevron}>›</Text>
            </Pressable>
          ))}
        </Card>

        {!partner && couple?.invite_code ? (
          <Card style={styles.inviteCard}>
            <Text style={styles.sectionTitle}>Invite your partner</Text>
            <Text style={styles.sectionHint}>
              Share this code so your portfolio becomes a pair.
            </Text>
            <Text style={styles.code}>{couple.invite_code}</Text>
            <PrimaryButton
              label={copied ? 'Copied!' : 'Copy invite code'}
              onPress={() => void copyInviteCode()}
            />
          </Card>
        ) : null}

        <View style={styles.accountBlock}>
          <Text style={styles.accountLabel}>Account</Text>
          <SecondaryButton label="Refresh" onPress={refreshAll} />
          <SecondaryButton label="Sign out" onPress={() => void signOut()} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Bond · made for two</Text>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    alignItems: 'center',
    gap: 8,
  },
  avatarYou: {},
  avatarPartner: {},
  avatarEmpty: {
    opacity: 0.7,
  },
  avatarLetter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 0,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 70,
    overflow: 'hidden',
  },
  avatarLetterMuted: {
    borderColor: colors.hairline,
    backgroundColor: colors.bgSoft,
    color: colors.muted,
  },
  avatarCaption: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  ampersand: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 22,
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: colors.hairline,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#C9A8B4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.hairline,
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCell: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 0,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    backgroundColor: colors.bgSoft,
    padding: 10,
    alignItems: 'center',
  },
  badgeSquare: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0,
    marginBottom: 6,
  },
  badgeName: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  badgeNameMuted: {
    color: colors.muted,
    opacity: 0.7,
  },
  badgeCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 17,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    backgroundColor: colors.bgSoft,
    padding: 12,
    marginBottom: 8,
  },
  linkRowPressed: {
    backgroundColor: colors.accentSoft,
  },
  linkGlyphBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkGlyph: {
    textAlign: 'center',
    color: colors.ink,
    fontSize: 18,
  },
  linkTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  linkBody: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  linkChevron: {
    color: colors.muted,
    fontSize: 20,
  },
  inviteCard: {
    backgroundColor: colors.accentSoft,
  },
  code: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.accent,
    marginBottom: 12,
  },
  accountBlock: {
    marginTop: 8,
    gap: 0,
  },
  accountLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  footer: {
    marginTop: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  footerText: {
    color: colors.muted,
    fontWeight: '600',
    backgroundColor: colors.bgSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
})
