import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
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
      <Redirect href={profile?.couple_id ? '/(app)' : '/(app)/pair'} />
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
          <Title>Create account</Title>
          <Subtitle>Start pairing with your partner in Bond.</Subtitle>

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

          <Link href="/(auth)/login" style={{ marginTop: 20, textAlign: 'center' }}>
            Already have an account? Sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
