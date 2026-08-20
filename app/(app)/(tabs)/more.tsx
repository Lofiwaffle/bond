import { useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Redirect, router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

import { ConfirmDialog } from '../../../components/ConfirmDialog'
import {
  ErrorText,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { computeStreak, useCheckInHistory } from '../../../hooks/useCheckIn'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useAuth } from '../../../lib/auth'
import { BADGES, badgesForProgress } from '../../../lib/badges'
import { localDateString } from '../../../lib/dates'
import { Icon, type IconName } from '../../../lib/icons'
import { colors, hairlineWidth, type } from '../../../lib/theme'

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

const LINKS: Array<{
  id: string
  icon: IconName
  title: string
  body: string
  href: '/(app)/bond/habits' | '/(app)/bond/streaks' | '/(app)/bond/goals' | '/(app)/bond/reviews' | '/(app)/weekly-review'
}> = [
  {
    id: 'habits',
    icon: 'calendar',
    title: 'Habits',
    body: 'Calendar and badge key',
    href: '/(app)/bond/habits',
  },
  {
    id: 'streaks',
    icon: 'trending-up',
    title: 'Streaks',
    body: 'Daily streak and rhythm',
    href: '/(app)/bond/streaks',
  },
  {
    id: 'goals',
    icon: 'target',
    title: 'Goals',
    body: 'Shared SMART goals',
    href: '/(app)/bond/goals',
  },
  {
    id: 'reviews',
    icon: 'book-open',
    title: 'Reviews',
    body: 'Past weekly review summaries',
    href: '/(app)/bond/reviews',
  },
  {
    id: 'weekly',
    icon: 'edit-3',
    title: 'Weekly review',
    body: 'Look back on the week together',
    href: '/(app)/weekly-review',
  },
]

export default function MoreScreen() {
  const {
    profile,
    couple,
    partner,
    isLoading,
    signOut,
    refreshProfile,
    deleteAccount,
  } = useAuth()
  const { days, isLoading: historyLoading, refresh: refreshHistory } =
    useCheckInHistory()
  const {
    counts,
    isLoading: habitsLoading,
    refresh: refreshHabits,
  } = useHabitBadges()
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

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

  const onDeleteAccount = async () => {
    setDeleteError(null)
    setDeleting(true)
    const result = await deleteAccount()
    setDeleting(false)
    if (result.error) {
      setConfirmDelete(false)
      setDeleteError(result.error)
    }
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshAll} />
        }
      >
        <Text style={styles.label}>Couple portfolio</Text>
        <Text style={styles.heroTitle}>{coupleTitle}</Text>
        <Text style={styles.heroSub}>{since}</Text>

        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <View style={styles.avatarLetterWrap}>
              <Text style={styles.avatarLetter}>{initialOf(myName)}</Text>
            </View>
            <Text style={styles.avatarCaption}>{myName}</Text>
          </View>
          <Text style={styles.ampersand}>&</Text>
          <View style={[styles.avatar, !partnerName && styles.avatarEmpty]}>
            <View
              style={[
                styles.avatarLetterWrap,
                !partnerName && styles.avatarLetterMuted,
              ]}
            >
              <Text
                style={[
                  styles.avatarLetter,
                  !partnerName && styles.avatarLetterMutedText,
                ]}
              >
                {partnerName ? initialOf(partnerName) : '?'}
              </Text>
            </View>
            <Text style={styles.avatarCaption}>
              {partnerName ?? 'Waiting'}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <Text style={styles.sectionHint}>
            Habits you've unlocked together.
          </Text>
          <View style={styles.chipWrap}>
            {BADGES.map((badge) => {
              const earned = stats.badges.find((b) => b.id === badge.id)
              const count = earned?.count ?? 0
              const on = count > 0
              return (
                <View
                  key={badge.id}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Icon
                    name={badge.icon}
                    size={14}
                    color={on ? colors.onAccent : colors.ink}
                  />
                  <Text style={[styles.chipName, on && styles.chipNameOn]}>
                    {badge.label}
                  </Text>
                </View>
              )
            })}
          </View>
          <Text style={styles.emptyHint}>
            {stats.habitLogs === 0
              ? 'No habit logs yet. Open Habits to start filling your portfolio.'
              : `${stats.habitLogs} habit moment${stats.habitLogs === 1 ? '' : 's'} logged · ${stats.myCheckIns} check-in${stats.myCheckIns === 1 ? '' : 's'}`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Together</Text>
          <Text style={styles.sectionHint}>Jump into how you're growing.</Text>
          {LINKS.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.linkRow,
                index === LINKS.length - 1 && styles.linkRowLast,
                pressed && styles.linkRowPressed,
              ]}
            >
              <Icon name={item.icon} size={18} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>{item.title}</Text>
                <Text style={styles.linkBody}>{item.body}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {!partner && couple?.invite_code ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite your partner</Text>
            <Text style={styles.sectionHint}>
              Share this code so your portfolio becomes a pair.
            </Text>
            <Text style={styles.code}>{couple.invite_code}</Text>
            <PrimaryButton
              label={copied ? 'Copied' : 'Copy invite code'}
              onPress={() => void copyInviteCode()}
            />
          </View>
        ) : null}

        <View style={styles.accountBlock}>
          <Text style={styles.label}>Account</Text>
          <TextLink
            label="Privacy"
            onPress={() => router.push('/privacy')}
          />
          <TextLink label="Sign out" onPress={() => void signOut()} />
          {deleteError ? <ErrorText message={deleteError} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => {
              setDeleteError(null)
              setConfirmDelete(true)
            }}
            disabled={deleting}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.deleteBtnPressed,
              deleting && styles.deleteBtnDisabled,
            ]}
          >
            <Text style={styles.deleteLabel}>
              {deleting ? 'Deleting...' : 'Delete account'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        body="This permanently removes your profile and sign-in. Shared couple data stays for your partner until they delete their account too."
        confirmLabel="Delete account"
        destructive
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDeleteAccount()}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  label: {
    ...type.label,
    marginBottom: 6,
  },
  heroTitle: {
    ...type.heading,
  },
  heroSub: {
    ...type.body,
    color: colors.muted,
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
  avatarEmpty: {
    opacity: 0.7,
  },
  avatarLetterWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...type.heading,
    marginBottom: 0,
  },
  avatarLetterMuted: {
    backgroundColor: colors.bgSoft,
  },
  avatarLetterMutedText: {
    color: colors.muted,
  },
  avatarCaption: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
    textAlign: 'center',
  },
  ampersand: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: hairlineWidth,
    borderBottomWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...type.heading,
  },
  statLabel: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
  statDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: colors.hairline,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  sectionHint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipName: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  chipNameOn: {
    color: colors.onAccent,
  },
  emptyHint: {
    ...type.label,
    marginTop: 12,
    marginBottom: 0,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  linkRowLast: {
    borderBottomWidth: 0,
  },
  linkRowPressed: {
    opacity: 0.7,
  },
  linkTitle: {
    ...type.body,
    fontWeight: '500',
  },
  linkBody: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
  code: {
    ...type.heading,
    letterSpacing: 4,
    marginBottom: 12,
  },
  accountBlock: {
    marginTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  deleteBtnPressed: {
    opacity: 0.6,
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteLabel: {
    ...type.body,
    color: colors.danger,
  },
})
