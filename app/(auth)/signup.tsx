import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, type TextInput } from 'react-native'
import { Link, Redirect, useLocalSearchParams, type Href } from 'expo-router'

import { AuthFooter } from '../../components/AuthFooter'
import { GoogleSignInButton } from '../../components/GoogleSignInButton'
import { ErrorText, Field, Label, LoadingScreen, PrimaryButton, Screen } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  CONFIRM_EMAIL_MESSAGE,
  LINK_EXPIRED_MESSAGE,
  RESEND_COOLDOWN_MS,
} from '../../lib/authRedirect'
import { savePendingInvite } from '../../lib/invite'
import { focusFirstInvalid } from '../../lib/formFocus'
import { Icon } from '../../lib/icons'
import { colors, type } from '../../lib/theme'

export default function SignUpScreen() {
  const {
    session,
    profile,
    isLoading,
    passwordRecovery,
    authLinkExpired,
    signUp,
    signInWithGoogle,
    resendConfirmation,
    verifyEmailOtp,
    clearAuthLinkExpired,
  } = useAuth()
  const params = useLocalSearchParams<{ invite?: string | string[] }>()
  const inviteParam = Array.isArray(params.invite) ? params.invite[0] : params.invite
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [code, setCode] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const displayNameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const codeRef = useRef<TextInput>(null)

  useEffect(() => {
    if (inviteParam) void savePendingInvite(inviteParam)
  }, [inviteParam])

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

  if (isLoading) return <LoadingScreen />
  if (passwordRecovery) return <Redirect href={'/update-password' as Href} />
  if (session) {
    return (
      <Redirect
        href={profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup'}
      />
    )
  }

  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))

  const onSubmit = async () => {
    if (submitting) return
    const nameMissing = !displayName.trim()
    const emailMissing = !email.trim()
    const emailInvalid = !emailMissing && !email.includes('@')
    const passwordShort = password.length < 6
    if (nameMissing || emailMissing || emailInvalid || passwordShort) {
      setError(
        nameMissing
          ? 'Enter a display name'
          : emailMissing
            ? 'Enter an email'
            : emailInvalid
              ? 'Enter a valid email'
              : 'Password must be at least 6 characters',
      )
      focusFirstInvalid([
        { ref: displayNameRef, invalid: nameMissing },
        { ref: emailRef, invalid: emailMissing || emailInvalid },
        { ref: passwordRef, invalid: passwordShort },
      ])
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await signUp(email, password, displayName)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      emailRef.current?.focus()
      return
    }
    if (result.needsConfirmation) {
      setNeedsConfirmation(true)
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
    }
  }

  const onGoogle = async () => {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const result = await signInWithGoogle()
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  const onResend = async () => {
    if (submitting || remaining > 0) return
    setError(null)
    setSubmitting(true)
    const result = await resendConfirmation(email)
    setSubmitting(false)
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
    if (result.error) setError(result.error)
  }

  const onConfirmCode = async () => {
    if (submitting) return
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from the email.')
      codeRef.current?.focus()
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await verifyEmailOtp(email, code)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      codeRef.current?.focus()
    }
  }

  if (needsConfirmation || authLinkExpired) {
    return (
      <Screen>
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>
          {authLinkExpired ? 'Link expired' : 'Check your email'}
        </Text>
        <Text style={styles.subtitle}>
          {authLinkExpired ? LINK_EXPIRED_MESSAGE : CONFIRM_EMAIL_MESSAGE}
        </Text>
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
        <Label>6-digit code</Label>
        <Field
          ref={codeRef}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          accessibilityLabel="6-digit confirmation code"
          placeholder="123456"
        />
        <ErrorText nativeID="signup-error" message={error} />
        <PrimaryButton
          label="Confirm account"
          onPress={() => void onConfirmCode()}
          loading={submitting}
          disabled={!email || code.trim().length < 6}
        />
        <PrimaryButton
          label={
            remaining > 0
              ? `Resend in ${remaining}s`
              : 'Send another email'
          }
          onPress={() => {
            clearAuthLinkExpired()
            void onResend()
          }}
          loading={submitting}
          disabled={remaining > 0 || !email}
        />
        <Link
          href={
            inviteParam
              ? ({ pathname: '/(auth)/login', params: { invite: inviteParam } } as Href)
              : '/(auth)/login'
          }
          style={styles.link}
        >
          I already have an account
        </Link>
        <AuthFooter />
      </Screen>
    )
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Create a Bond</Text>
        <Text style={styles.subtitle}>
          {inviteParam
            ? 'You were invited. After this, we will keep that invite and join their Bond.'
            : "Two minutes a day, just the two of you. You'll invite them after this."}
        </Text>

        <GoogleSignInButton
          onPress={() => void onGoogle()}
          loading={submitting}
        />
        <Text style={styles.or}>or</Text>

        <Label>Display name</Label>
        <Field
          ref={displayNameRef}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          textContentType="name"
          accessibilityLabel="Display name"
          placeholder="Alex"
        />

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

        <Label>Password</Label>
        <Field
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          accessibilityLabel="Password"
          placeholder="At least 6 characters"
        />

        <ErrorText nativeID="signup-error" message={error} />

        <PrimaryButton
          label="Create a Bond"
          onPress={() => void onSubmit()}
          loading={submitting}
        />

        <Link
          href={
            inviteParam
              ? ({ pathname: '/(auth)/login', params: { invite: inviteParam } } as Href)
              : '/(auth)/login'
          }
          style={styles.link}
        >
          I already have an account
        </Link>
        <AuthFooter />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    ...type.display,
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 22,
  },
  or: {
    ...type.label,
    textAlign: 'center',
    marginBottom: 8,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    ...type.body,
    color: colors.muted,
  },
})
