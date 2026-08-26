import { useEffect, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Redirect, router, type Href } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

import { ConfirmDialog } from '../../../components/ConfirmDialog'
import {
  ErrorText,
  LoadingScreen,
  PrimaryButton,
  Screen,
  StatusPanel,
  TextLink,
} from '../../../components/ui'
import { useCheckInHistory } from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import { localDateString } from '../../../lib/dates'
import { buildExportBundle, shareExportBundle } from '../../../lib/exportData'
import {
  areNotificationsEnabled,
  disableNotifications,
  enableNotifications,
  syncCheckInReminder,
} from '../../../lib/notifications'
import { DELETE_SEMANTICS, UNPAIR_SEMANTICS } from '../../../lib/privacy'
import { useToast } from '../../../lib/toast'
import { colors, hairlineWidth, hit, type } from '../../../lib/theme'

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

export default function UsScreen() {
  const {
    profile,
    couple,
    partner,
    user,
    isLoading,
    signOut,
    refreshProfile,
    deleteAccount,
    leaveCouple,
  } = useAuth()
  const { days, isLoading: historyLoading, error: historyError, refresh: refreshHistory } =
    useCheckInHistory()
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [notifyOn, setNotifyOn] = useState(false)
  const [notifyBusy, setNotifyBusy] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    void areNotificationsEnabled().then(setNotifyOn)
  }, [])

  if (isLoading || historyLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name?.trim() || null
  const coupleTitle = partnerName ? `${myName} & ${partnerName}` : myName
  const since = togetherSinceLabel(couple?.paired_at ?? couple?.created_at)

  const copyInviteCode = async () => {
    if (!couple?.invite_code) return
    await Clipboard.setStringAsync(couple.invite_code)
    setCopied(true)
    showToast('Invite code copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshAll = () => {
    void refreshProfile()
    void refreshHistory()
  }

  const onToggleNotifications = async () => {
    if (notifyBusy) return
    setNotifyError(null)
    setNotifyBusy(true)
    if (notifyOn) {
      await disableNotifications()
      setNotifyOn(false)
      setNotifyBusy(false)
      return
    }
    const granted = await enableNotifications(user?.id)
    setNotifyOn(granted)
    setNotifyBusy(false)
    if (!granted) {
      setNotifyError(
        'Allow notifications in your browser or phone settings to get reminders.',
      )
      return
    }
    const today = localDateString()
    const hasCompletedToday = days.some((day) => day.date === today && day.mine)
    await syncCheckInReminder(Boolean(hasCompletedToday))
  }

  const onExport = async () => {
    if (exporting || !user?.id) return
    setExportError(null)
    setExporting(true)
    const bundle = await buildExportBundle(user.id)
    const result = await shareExportBundle(bundle)
    setExporting(false)
    if (result.error) {
      setExportError(result.error)
      return
    }
    showToast('Data export ready')
  }

  const onLeaveCouple = async () => {
    if (leaving) return
    setLeaveError(null)
    setLeaving(true)
    const result = await leaveCouple()
    setLeaving(false)
    if (result.error) {
      setConfirmLeave(false)
      setLeaveError(result.error)
      return
    }
    setConfirmLeave(false)
    showToast('You left this Bond')
    router.replace('/(app)/setup')
  }

  const onDeleteAccount = async () => {
    if (deleting) return
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
        <Text style={styles.label}>Us</Text>
        <Text style={styles.heroTitle}>{coupleTitle}</Text>
        <Text style={styles.heroSub}>{since}</Text>
        {historyError ? (
          <StatusPanel
            message="Couldn't refresh your couple."
            onRetry={refreshAll}
          />
        ) : null}

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

        {!partner && couple?.invite_code ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pairing</Text>
            <Text style={styles.sectionHint}>
              Share this code so your person can join.
            </Text>
            <Text style={styles.code}>{couple.invite_code}</Text>
            <PrimaryButton
              label={copied ? 'Copied' : 'Copy invite code'}
              onPress={() => void copyInviteCode()}
            />
          </View>
        ) : null}

        <View style={styles.accountBlock}>
          <Text style={styles.label}>Notifications</Text>
          <Text style={styles.sectionHint}>
            Daily reminder at 8:00 PM, plus an alert when your partner checks
            in. Lock screens never show scores, words, or names — only a generic
            Bond notice.
          </Text>
          <TextLink
            label={
              notifyBusy
                ? 'Working...'
                : notifyOn
                  ? 'Turn notifications off'
                  : 'Turn notifications on'
            }
            onPress={() => void onToggleNotifications()}
            disabled={notifyBusy}
          />
          {notifyError ? <ErrorText message={notifyError} /> : null}

          <Text style={[styles.label, styles.accountLabel]}>Privacy & safety</Text>
          <Text style={styles.sectionHint}>
            Bond is not therapy or emergency support. Who can see each entry is
            listed in Privacy.
          </Text>
          <TextLink
            label="Privacy"
            onPress={() => router.push('/privacy')}
          />
          <TextLink
            label="Help & safety"
            onPress={() => router.push('/help' as Href)}
          />
          <TextLink
            label={exporting ? 'Preparing download...' : 'Download my data'}
            onPress={() => void onExport()}
            disabled={exporting}
          />
          {exportError ? <ErrorText message={exportError} /> : null}

          <Text style={[styles.label, styles.accountLabel]}>Account</Text>
          <TextLink label="Sign out" onPress={() => void signOut()} />
          {leaveError ? <ErrorText message={leaveError} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave this Bond"
            onPress={() => {
              setLeaveError(null)
              setConfirmLeave(true)
            }}
            disabled={leaving}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.deleteBtnPressed,
              leaving && styles.deleteBtnDisabled,
            ]}
          >
            <Text style={styles.leaveLabel}>
              {leaving ? 'Leaving...' : 'Leave this Bond'}
            </Text>
          </Pressable>
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
        visible={confirmLeave}
        title="Leave this Bond?"
        body={UNPAIR_SEMANTICS}
        confirmLabel="Leave this Bond"
        destructive
        busy={leaving}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => void onLeaveCouple()}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        body={DELETE_SEMANTICS}
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
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
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
    minHeight: hit,
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
  linkFocus: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.ink,
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
  accountLabel: {
    marginTop: 16,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    minHeight: hit,
    justifyContent: 'center',
    paddingVertical: 12,
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
  leaveLabel: {
    ...type.body,
    color: colors.muted,
  },
})
