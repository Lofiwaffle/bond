import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import {
  ErrorText,
  PrimaryButton,
  TextLink,
} from './ui'
import {
  inviteHttpsUrl,
  shareInvite,
} from '../lib/invite'
import { supabase } from '../lib/supabase'
import { colors, type } from '../lib/theme'

export function InviteShare({
  code,
  fromName,
  onCopied,
}: {
  code: string
  fromName?: string
  onCopied?: (message: string) => void
}) {
  const [showQr, setShowQr] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = inviteHttpsUrl(code)

  const onShare = async () => {
    if (sharing) return
    setError(null)
    setSharing(true)
    const result = await shareInvite(code, fromName)
    setSharing(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.copied) onCopied?.('Invite copied')
    void supabase.rpc('track_plus_funnel', { ev: 'invite_sent', meta: {} })
  }

  return (
    <View>
      <Text style={styles.code} accessibilityLabel={`Invite code ${code}`}>
        {code}
      </Text>
      <PrimaryButton
        label={sharing ? 'Opening share…' : 'Share invite'}
        onPress={() => void onShare()}
        loading={sharing}
      />
      <TextLink
        label={showQr ? 'Hide QR code' : 'Show QR code'}
        onPress={() => setShowQr((value) => !value)}
      />
      {showQr ? (
        <View style={styles.qr} accessibilityLabel="QR code for this invite">
          <QRCode
            value={url}
            size={168}
            color={colors.ink}
            backgroundColor={colors.bg}
          />
          <Text style={styles.qrHint}>They can scan this in person.</Text>
        </View>
      ) : null}
      <ErrorText message={error} />
    </View>
  )
}

const styles = StyleSheet.create({
  code: {
    ...type.heading,
    letterSpacing: 6,
    textAlign: 'center',
    marginVertical: 16,
  },
  qr: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  qrHint: {
    ...type.label,
    color: colors.muted,
    textAlign: 'center',
  },
})
