import { useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, type TextInput } from 'react-native'
import { Link, Redirect, router, type Href } from 'expo-router'

import { AuthFooter } from '../components/AuthFooter'
import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  Screen,
} from '../components/ui'
import { useAuth } from '../lib/auth'
import { LINK_EXPIRED_MESSAGE } from '../lib/authRedirect'
import { focusInput } from '../lib/formFocus'
import { Icon } from '../lib/icons'
import { colors, type } from '../lib/theme'

export default function UpdatePasswordScreen() {
  const {
    session,
    profile,
    isLoading,
    passwordRecovery,
    authLinkExpired,
    updatePassword,
  } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const passwordRef = useRef<TextInput>(null)

  if (isLoading) return <LoadingScreen />

  if (authLinkExpired) {
    return (
      <Screen>
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Link expired</Text>
        <Text style={styles.subtitle}>{LINK_EXPIRED_MESSAGE}</Text>
        <Link href={'/forgot-password' as Href} style={styles.link}>
          Send a new reset link
        </Link>
        <AuthFooter />
      </Screen>
    )
  }

  if (!passwordRecovery) {
    if (session) {
      return (
        <Redirect
          href={profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup'}
        />
      )
    }
    return (
      <Screen>
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>
          Open the reset link from your email on this phone. If it expired,
          request a new one.
        </Text>
        <Link href={'/forgot-password' as Href} style={styles.link}>
          Forgot password
        </Link>
        <AuthFooter />
      </Screen>
    )
  }

  const onSubmit = async () => {
    if (submitting) return
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      focusInput(passwordRef)
      return
    }
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      focusInput(passwordRef)
      return
    }
    router.replace(profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup')
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>
          This replaces the old one. Then you can sign in as usual.
        </Text>

        <Label>New password</Label>
        <Field
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          accessibilityLabel="New password"
          placeholder="At least 6 characters"
        />
        <ErrorText nativeID="password-error" message={error} />
        <PrimaryButton
          label="Save password"
          onPress={() => void onSubmit()}
          loading={submitting}
        />
      </ScrollView>
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
    marginBottom: 22,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    ...type.body,
    color: colors.muted,
  },
})
