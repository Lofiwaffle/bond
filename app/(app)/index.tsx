import { useState } from 'react'
import { Redirect, router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { StyleSheet, Text, View } from 'react-native'

import {
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../components/ui'
import { useTodayCheckIn } from '../../hooks/useCheckIn'
import { useAuth } from '../../lib/auth'

export default function HomeScreen() {
  const { profile, couple, partner, isLoading, signOut, refreshProfile } =
    useAuth()
  const { mine, bothSubmitted, waitingForPartner } = useTodayCheckIn()
  const [copied, setCopied] = useState(false)

  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const copyInviteCode = async () => {
    if (!couple?.invite_code) return
    await Clipboard.setStringAsync(couple.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checkInLabel = !partner
    ? 'Waiting for partner…'
    : !mine
      ? "Today's check-in"
      : waitingForPartner
        ? "Waiting for partner's check-in"
        : bothSubmitted
          ? "View today's check-in"
          : "Today's check-in"

  return (
    <Screen>
      <Title>Bond</Title>
      <Subtitle>
        {partner
          ? `Paired with ${partner.display_name}`
          : 'Waiting for your partner to join with your invite code.'}
      </Subtitle>

      <View style={styles.card}>
        <Text style={styles.metaLabel}>Your name</Text>
        <Text style={styles.metaValue}>{profile.display_name}</Text>

        <Text style={styles.metaLabel}>Partner</Text>
        <Text style={styles.metaValue}>
          {partner?.display_name ?? 'Waiting for partner to join…'}
        </Text>

        {couple?.invite_code && !partner ? (
          <>
            <Text style={styles.metaLabel}>Invite code</Text>
            <Text style={styles.code}>{couple.invite_code}</Text>
          </>
        ) : null}
      </View>

      {partner ? (
        <PrimaryButton
          label={checkInLabel}
          onPress={() => router.push('/(app)/check-in')}
        />
      ) : null}

      {couple?.invite_code && !partner ? (
        <PrimaryButton
          label={copied ? 'Copied!' : 'Copy invite code'}
          onPress={() => void copyInviteCode()}
        />
      ) : null}

      {partner ? (
        <SecondaryButton
          label="History"
          onPress={() => router.push('/(app)/history')}
        />
      ) : null}

      <SecondaryButton label="Refresh" onPress={() => void refreshProfile()} />
      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D6D3D1',
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 12,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1917',
  },
  code: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#0F766E',
  },
})
