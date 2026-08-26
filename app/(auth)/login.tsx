import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { Link, Redirect, type Href } from 'expo-router'

import { ErrorText, Field, Label, LoadingScreen, PrimaryButton, Screen, StatusPanel } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { Icon } from '../../lib/icons'
import { colors, type } from '../../lib/theme'

export default function LoginScreen() {
  const { session, profile, isLoading, signIn, sessionError, retrySession } = useAuth()
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
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Bond</Text>
        <Text style={styles.subtitle}>
          Welcome back to your daily ritual.
        </Text>
        {sessionError ? (
          <StatusPanel
            message="Couldn't restore your session."
            onRetry={() => void retrySession()}
          />
        ) : null}

        <Label>Email</Label>
        <Field
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          accessibilityLabel="Email"
          placeholder="you@example.com"
        />

        <Label>Password</Label>
        <Field
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          accessibilityLabel="Password"
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
          Create a Bond
        </Link>
        <Link href="/connect" style={styles.privacy}>
          Change server
        </Link>
        <Link href="/privacy" style={styles.privacy}>
          Privacy
        </Link>
        <Link href={'/help' as Href} style={styles.privacy}>
          Help & safety
        </Link>
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
  privacy: {
    marginTop: 12,
    textAlign: 'center',
    ...type.label,
    color: colors.muted,
  },
})
