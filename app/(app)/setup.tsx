import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

import { ConfirmDialog } from '../../components/ConfirmDialog'
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
    updateDisplayName,
    signOut,
    deleteAccount,
  } = useAuth()
  const [name, setName] = useState(profile?.display_name?.trim() ?? '')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  if (isLoading) return <LoadingScreen />
  if (profile?.couple_id && partner) {
    return <Redirect href="/(app)/(tabs)" />
  }

  const onSaveName = async () => {
    if (savingName) return
    setError(null)
    setSavingName(true)
    const result = await updateDisplayName(name)
    setSavingName(false)
    if (result.error) setError(result.error)
    else showToast('Name saved')
  }

  const onCreate = async () => {
    if (creating || joining) return
    setError(null)
    setCreating(true)
    const result = await createCouple()
    setCreating(false)
    if (result.error) setError(result.error)
    else showToast('Invite code ready')
  }

  const onJoin = async () => {
    if (joining || creating) return
    setError(null)
    setJoining(true)
    const result = await joinCouple(inviteCode)
    setJoining(false)
    if (result.error) setError(result.error)
    else {
      showToast('You are paired')
      router.replace('/(app)/(tabs)')
    }
  }

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    setCopied(true)
    showToast('Invite code copied')
    setTimeout(() => setCopied(false), 2000)
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
            Share this code with the person this ritual is for. You can keep
            going and they can catch up later.
          </Text>
          <Text style={styles.code}>{couple.invite_code}</Text>
          <PrimaryButton
            label={copied ? 'Copied' : 'Copy invite code'}
            onPress={() => void copyCode(couple.invite_code)}
          />
          <PrimaryButton
            label="Enter Bond"
            onPress={() => router.replace('/(app)/(tabs)')}
          />
          <ErrorText message={error} />
          {accountLinks}
        </ScrollView>
        <ConfirmDialog
          visible={confirmDelete}
          title="Delete account?"
          body="This permanently removes your profile and sign-in."
          confirmLabel="Delete account"
          destructive
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void onDelete()}
        />
      </Screen>
    )
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.kicker}>Create a Bond</Text>
        <Text style={styles.title}>How should we call you?</Text>
        <Text style={styles.subtitle}>
          They'll see this name when a day opens for both of you.
        </Text>
        <Label>Display name</Label>
          <Field
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          accessibilityLabel="Display name"
          placeholder="Alex"
        />
        <PrimaryButton
          label="Save name"
          onPress={() => void onSaveName()}
          loading={savingName}
          disabled={!name.trim()}
        />

        <Text style={styles.sectionTitle}>Invite your person</Text>
        <Text style={styles.subtitle}>
          This ritual is for two. Generate a code, or enter the one they
          already sent you.
        </Text>
        <PrimaryButton
          label="Generate invite code"
          onPress={() => void onCreate()}
          loading={creating}
        />
        <Text style={styles.or}>or</Text>
        <Label>Their invite code</Label>
          <Field
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          accessibilityLabel="Their invite code"
          placeholder="ABC123"
          maxLength={6}
        />
        <ErrorText message={error} />
        <PrimaryButton
          label="Join couple"
          onPress={() => void onJoin()}
          loading={joining}
          disabled={inviteCode.trim().length !== 6}
        />

        {accountLinks}
      </ScrollView>
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        body="This permanently removes your profile and sign-in."
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
  sectionTitle: {
    ...type.heading,
    marginTop: 28,
    marginBottom: 8,
  },
  or: {
    ...type.label,
    textAlign: 'center',
    marginVertical: 12,
  },
  code: {
    ...type.heading,
    letterSpacing: 6,
    textAlign: 'center',
    marginVertical: 20,
  },
  account: {
    marginTop: 28,
    gap: 8,
  },
})
