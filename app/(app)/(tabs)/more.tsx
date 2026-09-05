import { useRef, useState } from 'react'
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native'
import { Redirect, router, type Href } from 'expo-router'

import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { InviteShare } from '../../../components/InviteShare'
import { NotificationSettings } from '../../../components/NotificationSettings'
import {
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  Screen,
  StatusPanel,
  TextLink,
} from '../../../components/ui'
import { useTodayCheckIn } from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useAuth } from '../../../lib/auth'
import {
  ACCOUNT_DELETION_REQUEST_URL,
  SUPPORT_URL,
} from '../../../lib/appUrls'
import { buildExportBundle, shareExportBundle } from '../../../lib/exportData'
import { DELETE_SEMANTICS, UNPAIR_SEMANTICS } from '../../../lib/privacy'
import { PLUS_LIFETIME_COPY, PLUS_PROMO_HINT } from '../../../lib/bondPlus'
import { Icon } from '../../../lib/icons'
import { bondHubItems } from '../../../lib/nextStep'
import { focusInput } from '../../../lib/formFocus'
import { useToast } from '../../../lib/toast'
import { colors, elevation, hairlineWidth, hit, radii, type } from '../../../lib/theme'

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
    updateDisplayName,
    signOut,
    refreshProfile,
    deleteAccount,
    leaveCouple,
  } = useAuth()
  const plus = useBondPlus()
  const { isLoading: historyLoading, error: historyError, refresh: refreshHistory } =
    useTodayCheckIn()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile?.display_name?.trim() ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const nameRef = useRef<TextInput>(null)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [promoDraft, setPromoDraft] = useState('')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const { showToast } = useToast()

  if (isLoading || historyLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name?.trim() || null
  const coupleTitle = partnerName ? `${myName} & ${partnerName}` : myName
  const since = togetherSinceLabel(couple?.paired_at ?? couple?.created_at)

  const onSaveName = async () => {
    if (savingName) return
    if (!nameDraft.trim()) {
      setNameError('Enter a display name')
      focusInput(nameRef)
      return
    }
    setNameError(null)
    setSavingName(true)
    const result = await updateDisplayName(nameDraft)
    setSavingName(false)
    if (result.error) {
      setNameError(result.error)
      focusInput(nameRef)
      return
    }
    setEditingName(false)
    showToast('Name saved')
  }

  const refreshAll = () => {
    void refreshProfile()
    void refreshHistory()
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

  const onApplyPromo = async () => {
    if (applyingPromo) return
    const code = promoDraft.trim()
    if (!code) {
      setPromoError('Enter a promo code')
      return
    }
    setPromoError(null)
    setApplyingPromo(true)
    const result = await plus.redeemPromo(code)
    setApplyingPromo(false)
    if (result.error) {
      setPromoError(result.error)
      return
    }
    setPromoDraft('')
    showToast('Lifetime Bond Plus is on')
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

        {editingName ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your name</Text>
            <Field
              ref={nameRef}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoCapitalize="words"
              accessibilityLabel="Display name"
              placeholder="Alex"
            />
            <ErrorText nativeID="name-error" message={nameError} />
            <PrimaryButton
              label="Save name"
              onPress={() => void onSaveName()}
              loading={savingName}
            />
            <TextLink
              label="Cancel"
              onPress={() => {
                setEditingName(false)
                setNameDraft(myName === 'You' ? '' : myName)
                setNameError(null)
              }}
            />
          </View>
        ) : (
          <TextLink
            label="Edit my name"
            onPress={() => {
              setNameDraft(profile.display_name?.trim() ?? '')
              setEditingName(true)
            }}
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bond</Text>
          {bondHubItems().map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              onPress={() => router.push(item.href as Href)}
              style={(state) => [
                styles.linkRow,
                state.pressed && styles.linkRowPressed,
                Boolean((state as { focused?: boolean }).focused) &&
                  styles.linkFocus,
              ]}
            >
              <View style={styles.linkCopy}>
                <Text style={styles.linkTitle}>{item.title}</Text>
                <Text style={styles.linkBody}>{item.body}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Repair together. Optional guided steps after a disagreement."
              onPress={() => router.push('/(app)/play/repair' as Href)}
              style={(state) => [
                styles.linkRow,
                styles.linkRowLast,
                state.pressed && styles.linkRowPressed,
                Boolean((state as { focused?: boolean }).focused) &&
                  styles.linkFocus,
              ]}
            >
              <View style={styles.linkCopy}>
                <Text style={styles.linkTitle}>Repair together</Text>
                <Text style={styles.linkBody}>
                  Optional. Pause, describe, and choose a next step.
                </Text>
              </View>
              <Icon name="life-buoy" size={16} color={colors.muted} />
            </Pressable>
        </View>

        {!partner && couple?.invite_code ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pairing</Text>
            <Text style={styles.sectionHint}>
              Share the link, show the QR, or send the code.
            </Text>
            <InviteShare
              code={couple.invite_code}
              fromName={profile.display_name}
              onCopied={(message) => showToast(message)}
            />
          </View>
        ) : null}

        <View style={styles.accountBlock}>
          <Text style={styles.label}>Notifications</Text>
          <NotificationSettings />

          <Text style={[styles.label, styles.accountLabel]}>Purchases</Text>
          <Text style={styles.sectionHint}>
            {plus.plan === 'lifetime'
              ? PLUS_LIFETIME_COPY
              : plus.active
                ? plus.status === 'trialing'
                  ? 'Trial is on for both of you.'
                  : 'Bond Plus is on for both of you.'
                : `Deeper growth after three opened days. ${PLUS_PROMO_HINT} You never pay to see an answer already shared.`}
          </Text>
          {plus.plan === 'lifetime' ? null : (
            <>
              <Field
                value={promoDraft}
                onChangeText={setPromoDraft}
                placeholder="Promo code"
                accessibilityLabel="Promo code"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!applyingPromo}
              />
              {promoError ? <ErrorText message={promoError} /> : null}
              <PrimaryButton
                label={applyingPromo ? 'Applying…' : 'Apply code'}
                onPress={() => void onApplyPromo()}
                loading={applyingPromo}
                disabled={applyingPromo}
              />
            </>
          )}
          <TextLink
            label={plus.active ? 'Manage Bond Plus' : 'See Bond Plus'}
            onPress={() => router.push('/(app)/plus' as Href)}
          />

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
            label="Report a problem"
            onPress={() => void Linking.openURL(SUPPORT_URL)}
          />
          <TextLink
            label={exporting ? 'Preparing download...' : 'Download my data'}
            onPress={() => void onExport()}
            disabled={exporting}
          />
          {exportError ? <ErrorText message={exportError} /> : null}

          <Text style={[styles.label, styles.accountLabel]}>Account</Text>
          <TextLink label="Sign out" onPress={() => void signOut()} />
          <TextLink
            label="Request account & data deletion"
            onPress={() => void Linking.openURL(ACCOUNT_DELETION_REQUEST_URL)}
          />
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
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
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
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    marginBottom: 16,
    ...elevation.card,
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    ...elevation.card,
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
  linkCopy: {
    flex: 1,
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
    marginBottom: 24,
    padding: 16,
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    ...elevation.card,
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
