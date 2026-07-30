import { useState } from 'react'
import { Redirect, router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { StyleSheet, Text, View } from 'react-native'

import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'

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
    return <Redirect href="/(app)" />
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
    router.replace('/(app)')
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
    router.replace('/(app)')
  }

  const copyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (profile?.couple_id && couple && !partner) {
    return (
      <Screen>
        <Title>Share your code</Title>
        <Subtitle>
          Give this invite code to your partner so they can link accounts.
        </Subtitle>
        <View style={styles.codeBox}>
          <Text style={styles.code}>{couple.invite_code}</Text>
        </View>
        <PrimaryButton
          label={copied ? 'Copied!' : 'Copy invite code'}
          onPress={() => void copyInviteCode(couple.invite_code)}
        />
        <SecondaryButton
          label="Continue to home"
          onPress={() => router.replace('/(app)')}
        />
        <SecondaryButton label="Sign out" onPress={() => void signOut()} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Title>Pair with partner</Title>
      <Subtitle>
        Generate an invite code, or enter the one your partner shared.
      </Subtitle>

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
      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  codeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D6D3D1',
    marginBottom: 24,
  },
  code: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 6,
    color: '#0F766E',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerText: {
    color: '#78716C',
    fontSize: 14,
  },
})
