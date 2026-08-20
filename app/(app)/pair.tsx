import { useState } from 'react'
import { Redirect, router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'

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
import { colors, type } from '../../lib/theme'

export default function PairScreen() {
  const {
    profile,
    couple,
    partner,
    isLoading,
    createCouple,
    joinCouple,
    signOut,
  } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  if (isLoading) return <LoadingScreen />

  if (profile?.couple_id && partner) {
    return <Redirect href="/(app)/(tabs)" />
  }

  const onCreate = async () => {
    setError(null)
    setCreating(true)
    const result = await createCouple()
    setCreating(false)
    if (result.error) {
      setError(result.error)
      return
    }
  }

  const onJoin = async () => {
    setError(null)
    setJoining(true)
    const result = await joinCouple(inviteCode)
    setJoining(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.replace('/(app)/(tabs)')
  }

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (profile?.couple_id && couple && !partner) {
    return (
      <Screen>
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Share your code</Text>
        <Text style={styles.subtitle}>
          Give this invite to your partner so you can check in together.
        </Text>
        <Text style={styles.code}>{couple.invite_code}</Text>
        <PrimaryButton
          label={copied ? 'Copied' : 'Copy invite code'}
          onPress={() => void copyCode(couple.invite_code)}
        />
        <TextLink
          label="Continue"
          onPress={() => router.replace('/(app)/(tabs)')}
        />
        <TextLink label="Sign out" onPress={() => void signOut()} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Icon name="heart" size={28} color={colors.ink} />
      <Text style={styles.title}>Pair with partner</Text>
      <Text style={styles.subtitle}>
        Generate an invite code, or enter the one your partner shared.
      </Text>

      <PrimaryButton
        label="Generate invite code"
        onPress={onCreate}
        loading={creating}
      />

      <View style={styles.divider}>
        <Text style={styles.dividerText}>or join with a code</Text>
      </View>

      <Label>Invite code</Label>
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
        onPress={onJoin}
        loading={joining}
        disabled={inviteCode.trim().length !== 6}
      />
      <TextLink label="Sign out" onPress={() => void signOut()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    ...type.heading,
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  code: {
    ...type.heading,
    letterSpacing: 6,
    textAlign: 'center',
    marginVertical: 20,
  },
  divider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerText: {
    ...type.label,
    marginBottom: 0,
  },
})
