import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, type TextInput } from 'react-native'
import { Redirect, router, type Href } from 'expo-router'

import { ConfirmDialog } from '../../components/ConfirmDialog'
import { InviteShare } from '../../components/InviteShare'
import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { Icon } from '../../lib/icons'
import {
  classifyJoinError,
  joinErrorCopy,
  loadPendingInvite,
  normalizeInviteCode,
  savePendingInvite,
  type JoinErrorKind,
} from '../../lib/invite'
import { DELETE_SEMANTICS, UNPAIR_SEMANTICS } from '../../lib/privacy'
import { focusInput } from '../../lib/formFocus'
import { useToast } from '../../lib/toast'
import { colors, type } from '../../lib/theme'

export default function SetupScreen() {
  const {
    profile,
    couple,
    partner,
    isLoading,
    createCouple,
    joinCouple,
    signOut,
    deleteAccount,
    leaveCouple,
  } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<JoinErrorKind | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const autoJoinTried = useRef(false)
  const inviteRef = useRef<TextInput>(null)
  const { showToast } = useToast()

  useEffect(() => {
    void loadPendingInvite().then((code) => {
      if (code) setInviteCode((current) => current || code)
    })
  }, [])

  useEffect(() => {
    if (isLoading || profile?.couple_id || autoJoinTried.current) return
    let cancelled = false
    void loadPendingInvite().then(async (code) => {
      if (!code || cancelled) return
      autoJoinTried.current = true
      setInviteCode(code)
      setJoining(true)
      setError(null)
      setErrorKind(null)
      const result = await joinCouple(code)
      if (cancelled) return
      setJoining(false)
      if (result.error) {
        const kind = classifyJoinError(result.error)
        setErrorKind(kind)
        setError(joinErrorCopy(kind))
        return
      }
      showToast('You are paired')
      router.replace('/(app)/(tabs)')
    })
    return () => {
      cancelled = true
    }
  }, [isLoading, joinCouple, profile?.couple_id, showToast])

  if (isLoading) return <LoadingScreen />
  if (profile?.couple_id && partner) {
    return <Redirect href="/(app)/(tabs)" />
  }

  const onCreate = async () => {
    if (creating || joining) return
    setError(null)
    setErrorKind(null)
    setCreating(true)
    const result = await createCouple()
    setCreating(false)
    if (result.error) setError(result.error)
    else showToast('Invite ready')
  }

  const onJoin = async () => {
    if (joining || creating) return
    const code = normalizeInviteCode(inviteCode)
    if (!code) {
      setErrorKind('invalid')
      setError(joinErrorCopy('invalid'))
      focusInput(inviteRef)
      return
    }
    setError(null)
    setErrorKind(null)
    setJoining(true)
    await savePendingInvite(code)
    const result = await joinCouple(code)
    setJoining(false)
    if (result.error) {
      const kind = classifyJoinError(result.error)
      setErrorKind(kind)
      setError(joinErrorCopy(kind))
      focusInput(inviteRef)
      return
    }
    showToast('You are paired')
    router.replace('/(app)/(tabs)')
  }

  const onLeave = async () => {
    if (leaving) return
    setLeaving(true)
    const result = await leaveCouple()
    setLeaving(false)
    if (result.error) {
      setConfirmLeave(false)
      setError(result.error)
      return
    }
    setConfirmLeave(false)
    showToast('You left this Bond')
  }

  const onDelete = async () => {
    if (deleting) return
    setDeleting(true)
    const result = await deleteAccount()
    setDeleting(false)
    if (result.error) {
      setConfirmDelete(false)
      setError(result.error)
      return
    }
    router.replace('/(auth)/login')
  }

  const accountLinks = (
    <View style={styles.account}>
      <TextLink label="Sign out" onPress={() => void signOut()} />
      <TextLink label="Privacy" onPress={() => router.push('/privacy')} />
      <TextLink
        label="Help & safety"
        onPress={() => router.push('/help' as Href)}
      />
      <TextLink
        label="Delete account"
        onPress={() => setConfirmDelete(true)}
      />
    </View>
  )

  if (profile?.couple_id && couple && !partner) {
    return (
      <Screen keyboard>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <Icon name="heart" size={28} color={colors.ink} />
          <Text style={styles.kicker}>Almost there</Text>
          <Text style={styles.title}>Invite your person</Text>
          <Text style={styles.subtitle}>
            Share the link, show the QR, or send the six-character code. You
            can keep going and they can catch up later.
          </Text>
          <InviteShare
            code={couple.invite_code}
            fromName={profile.display_name}
            onCopied={(message) => showToast(message)}
          />
          <PrimaryButton
            label="Enter Bond"
            onPress={() => router.replace('/(app)/(tabs)')}
          />
          <ErrorText message={error} />
          <TextLink
            label={leaving ? 'Leaving...' : 'Leave this Bond'}
            onPress={() => setConfirmLeave(true)}
            disabled={leaving}
          />
          {accountLinks}
        </ScrollView>
        <ConfirmDialog
          visible={confirmLeave}
          title="Leave this Bond?"
          body={UNPAIR_SEMANTICS}
          confirmLabel="Leave this Bond"
          destructive
          busy={leaving}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => void onLeave()}
        />
        <ConfirmDialog
          visible={confirmDelete}
          title="Delete account?"
          body={DELETE_SEMANTICS}
          confirmLabel="Delete account"
          destructive
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void onDelete()}
        />
      </Screen>
    )
  }

  const blockedTitle =
    errorKind === 'full'
      ? 'This Bond is full'
      : errorKind === 'expired'
        ? 'This invite expired'
        : errorKind === 'invalid'
          ? 'This invite is not valid'
          : null

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.kicker}>Create a Bond</Text>
        <Text style={styles.title}>Invite your person</Text>
        <Text style={styles.subtitle}>
          This ritual is for two. Generate an invite, or enter the one they
          sent you.
        </Text>
        <PrimaryButton
          label="Generate invite"
          onPress={() => void onCreate()}
          loading={creating}
        />
        <Text style={styles.or}>or</Text>
        <Label>Their invite code</Label>
        <Field
          ref={inviteRef}
          value={inviteCode}
          onChangeText={(text) => {
            setInviteCode(text.toUpperCase())
            setErrorKind(null)
          }}
          autoCapitalize="characters"
          accessibilityLabel="Their invite code"
          placeholder="ABC123"
          maxLength={6}
        />
        {blockedTitle ? (
          <Text style={styles.errorTitle}>{blockedTitle}</Text>
        ) : null}
        <ErrorText nativeID="setup-error" message={error} />
        <PrimaryButton
          label="Join couple"
          onPress={() => void onJoin()}
          loading={joining}
        />

        {accountLinks}
      </ScrollView>
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        body={DELETE_SEMANTICS}
        confirmLabel="Delete account"
        destructive
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  kicker: {
    ...type.label,
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    ...type.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 16,
  },
  or: {
    ...type.label,
    textAlign: 'center',
    marginVertical: 12,
  },
  errorTitle: {
    ...type.body,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  account: {
    marginTop: 28,
    gap: 8,
  },
})
