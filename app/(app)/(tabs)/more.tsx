import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

import {
  Card,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { colors, radii } from '../../../lib/theme'

export default function MoreScreen() {
  const { profile, couple, partner, isLoading, signOut, refreshProfile } =
    useAuth()
  const [copied, setCopied] = useState(false)

  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const copyInviteCode = async () => {
    if (!couple?.invite_code) return
    await Clipboard.setStringAsync(couple.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Screen>
      <Title>More</Title>
      <Subtitle>Your Bond profile and pairing details.</Subtitle>

      <Card>
        <Text style={styles.metaLabel}>You</Text>
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
      </Card>

      {couple?.invite_code && !partner ? (
        <PrimaryButton
          label={copied ? 'Copied!' : 'Copy invite code'}
          onPress={() => void copyInviteCode()}
        />
      ) : null}

      <SecondaryButton label="Refresh" onPress={() => void refreshProfile()} />
      <SecondaryButton label="Sign out" onPress={() => void signOut()} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Bond · made for two</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  code: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.accent,
  },
  footer: {
    marginTop: 28,
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
