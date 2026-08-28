import { useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, type TextInput } from 'react-native'
import { Link, Redirect, type Href } from 'expo-router'

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
import { RESET_REQUESTED_MESSAGE } from '../lib/authRedirect'
import { focusInput } from '../lib/formFocus'
import { Icon } from '../lib/icons'
import { colors, type } from '../lib/theme'

export default function ForgotPasswordScreen() {
  const { session, profile, isLoading, passwordRecovery, requestPasswordReset } =
    useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<TextInput>(null)

  if (isLoading) return <LoadingScreen />
  if (passwordRecovery) return <Redirect href={'/update-password' as Href} />
  if (session) {
    return (
      <Redirect
        href={profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup'}
      />
    )
  }

  const onSubmit = async () => {
    if (submitting) return
    if (!email.trim() || !email.includes('@')) {
      setError(email.trim() ? 'Enter a valid email' : 'Enter an email')
      focusInput(emailRef)
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await requestPasswordReset(email)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      focusInput(emailRef)
      return
    }
    setSent(true)
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          {sent
            ? RESET_REQUESTED_MESSAGE
            : 'Enter the email for this Bond. We will send a reset link if it is on the account.'}
        </Text>

        {sent ? null : (
          <>
            <Label>Email</Label>
            <Field
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              accessibilityLabel="Email"
              placeholder="you@example.com"
            />
            <ErrorText nativeID="forgot-error" message={error} />
            <PrimaryButton
              label="Send reset link"
              onPress={() => void onSubmit()}
              loading={submitting}
            />
          </>
        )}

        <Link href="/(auth)/login" style={styles.link}>
          Back to sign in
        </Link>
        <AuthFooter />
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
