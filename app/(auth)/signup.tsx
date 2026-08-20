import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'
import { Link, Redirect } from 'expo-router'

import { ErrorText, Field, Label, LoadingScreen, PrimaryButton, Screen } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { Icon } from '../../lib/icons'
import { colors, type } from '../../lib/theme'

export default function SignUpScreen() {
  const { session, profile, isLoading, signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) return <LoadingScreen />
  if (session) {
    return (
      <Redirect
        href={profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup'}
      />
    )
  }

  const onSubmit = async () => {
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    const result = await signUp(email, password, displayName)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Icon name="heart" size={28} color={colors.ink} />
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start pairing with your partner in Bond.</Text>

          <Label>Display name</Label>
          <Field
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            textContentType="name"
            placeholder="Alex"
          />

          <Label>Email</Label>
          <Field
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="you@example.com"
          />

          <Label>Password</Label>
          <Field
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />

          <ErrorText message={error} />

          <PrimaryButton
            label="Sign up"
            onPress={onSubmit}
            loading={submitting}
            disabled={!email || !password || !displayName}
          />

          <Link href="/(auth)/login" style={styles.link}>
            Already have an account? Sign in
          </Link>
          <Link href="/connect" style={styles.privacy}>
            Change server
          </Link>
          <Link href="/privacy" style={styles.privacy}>
            Privacy
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
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
  privacy: {
    marginTop: 12,
    textAlign: 'center',
    ...type.label,
    color: colors.muted,
  },
})
