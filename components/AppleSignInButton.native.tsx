import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'

import { isAppleSignInAvailable } from '../lib/appleAuth'
import { hit, radii } from '../lib/theme'

export function AppleSignInButton({
  onPress,
  loading,
  disabled,
}: {
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  const [available, setAvailable] = useState(false)
  const busy = Boolean(loading || disabled)

  useEffect(() => {
    void isAppleSignInAvailable().then(setAvailable)
  }, [])

  if (!available) return null

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radii.pill}
        style={styles.button}
        accessibilityLabel={loading ? 'Opening Apple…' : 'Continue with Apple'}
        onPress={() => {
          if (busy) return
          onPress()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: hit,
  },
})
