import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native'
import { Link, Redirect } from 'expo-router'

import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { colors } from '../../lib/theme'

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
          <Text style={{ fontSize: 44, marginBottom: 4 }}>😊</Text>
          <Title>Bond</Title>
          <Subtitle>Sign in to check in with your partner.</Subtitle>

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

          <Link
            href="/(auth)/signup"
            style={{
              marginTop: 20,
              textAlign: 'center',
              color: colors.accentPressed,
              fontWeight: '700',
            }}
          >
            Need an account? Sign up
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
