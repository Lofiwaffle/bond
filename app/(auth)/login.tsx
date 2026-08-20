import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'
import { Link, Redirect } from 'expo-router'

import { ErrorText, Field, Label, LoadingScreen, PrimaryButton, Screen } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { Icon } from '../../lib/icons'
import { colors, type } from '../../lib/theme'

export default function LoginScreen() {
  const { session, profile, isLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) return <LoadingScreen />
  if (session) {
    return (
      <Redirect
        href={profile?.couple_id ? '/(app)/(tabs)' : '/(app)/pair'}
      />
    )
  }

  const onSubmit = async () => {
    setError(null)
    setSubmitting(true)
    const result = await signIn(email, password)
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
          <Text style={styles.title}>Bond</Text>
          <Text style={styles.subtitle}>Sign in to check in with your partner.</Text>

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
            textContentType="password"
            autoComplete="password"
            placeholder="••••••••"
          />

          <ErrorText message={error} />

          <PrimaryButton
            label="Sign in"
            onPress={onSubmit}
            loading={submitting}
            disabled={!email || !password}
          />

          <Link href="/(auth)/signup" style={styles.link}>
            Need an account? Sign up
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
