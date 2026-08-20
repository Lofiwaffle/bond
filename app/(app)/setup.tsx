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
import { FaceIcon, Icon } from '../../lib/icons'
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

  if (isLoading) return <LoadingScreen />
  if (profile?.couple_id && partner) {
    return <Redirect href="/(app)/(tabs)" />
  }

  const onSaveName = async () => {
    setError(null)
    setSavingName(true)
    const result = await updateDisplayName(name)
    setSavingName(false)
    if (result.error) setError(result.error)
  }

  const onCreate = async () => {
    setError(null)
    setCreating(true)
    const result = await createCouple()
    setCreating(false)
    if (result.error) setError(result.error)
  }

  const onJoin = async () => {
    setError(null)
    setJoining(true)
    const result = await joinCouple(inviteCode)
    setJoining(false)
    if (result.error) setError(result.error)
    else router.replace('/(app)/(tabs)')
  }

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const onDelete = async () => {
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
      <Screen>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <Icon name="heart" size={28} color={colors.ink} />
          <Text style={styles.kicker}>Almost there</Text>
          <Text style={styles.title}>Invite your person</Text>
          <Text style={styles.subtitle}>
            Bond is for two. Share this code so your partner can join. You can
            keep going and they can catch up later.
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
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.kicker}>Set up your Bond</Text>
        <Text style={styles.title}>How should we call you?</Text>
        <Text style={styles.subtitle}>
          Your partner will see this name after you both check in.
        </Text>
        <Label>Display name</Label>
        <Field
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Alex"
        />
        <PrimaryButton
          label="Save name"
          onPress={() => void onSaveName()}
          loading={savingName}
          disabled={!name.trim()}
        />

        <Text style={styles.sectionTitle}>Pair with your partner</Text>
        <Text style={styles.subtitle}>
          Generate a code, or enter the one they already sent you.
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

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Daily check-ins look like this</Text>
          <View style={styles.faces}>
            {[1, 2, 3, 4, 5].map((score) => (
              <FaceIcon key={score} score={score} size={28} />
            ))}
          </View>
          <Text style={styles.previewHint}>
            Their day stays hidden until they check in too.
          </Text>
        </View>
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
  preview: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  previewLabel: {
    ...type.label,
    marginBottom: 10,
  },
  faces: {
    flexDirection: 'row',
    gap: 8,
  },
  previewHint: {
    ...type.body,
    color: colors.muted,
    marginTop: 10,
  },
  account: {
    marginTop: 28,
    gap: 8,
  },
})
