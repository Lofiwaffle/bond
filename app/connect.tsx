import { useRef, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, type TextInput } from 'react-native'
import { router } from 'expo-router'

import {
  ErrorText,
  Field,
  Label,
  PrimaryButton,
  Screen,
  TextLink,
} from '../components/ui'
import { Icon } from '../lib/icons'
import {
  connectHostedBond,
  saveSupabaseConfig,
  supabaseConfigured,
} from '../lib/supabase'
import { focusFirstInvalid } from '../lib/formFocus'
import { colors, type } from '../lib/theme'

export default function ConnectScreen() {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(supabaseConfigured)
  const urlRef = useRef<TextInput>(null)
  const keyRef = useRef<TextInput>(null)
  const customServer = __DEV__

  const finish = () => {
    setConnected(true)
    router.replace('/')
  }

  const onConnectHosted = async () => {
    if (saving) return
    setError(null)
    setSaving(true)
    const result = await connectHostedBond()
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    finish()
  }

  const onSaveCustom = async () => {
    if (saving) return
    const urlMissing = !url.trim()
    const keyMissing = !key.trim()
    if (urlMissing || keyMissing) {
      setError(urlMissing ? 'Enter a project URL' : 'Enter a publishable key')
      focusFirstInvalid([
        { ref: urlRef, invalid: urlMissing },
        { ref: keyRef, invalid: keyMissing },
      ])
      return
    }
    setError(null)
    setSaving(true)
    const result = await saveSupabaseConfig(url, key)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      focusFirstInvalid([
        { ref: urlRef, invalid: true },
        { ref: keyRef, invalid: false },
      ])
      return
    }
    finish()
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Connect to Bond</Text>
        <Text style={styles.subtitle}>
          {connected
            ? 'This install is already attached to the Bond project. Continue, or connect again if sign-in is failing.'
            : 'Attach this install to the hosted Bond project so you can create an account and pair.'}
        </Text>

        <PrimaryButton
          label={connected ? 'Use Bond project' : 'Connect to Bond'}
          onPress={() => void onConnectHosted()}
          loading={saving}
        />

        {connected ? (
          <TextLink label="Continue" onPress={() => router.replace('/')} />
        ) : null}

        {customServer ? (
          <>
            <Text style={styles.or}>Or use a different Supabase project</Text>
            <Label>Project URL</Label>
            <Field
              ref={urlRef}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Project URL"
              placeholder="https://xxxx.supabase.co"
            />

            <Label>Publishable key</Label>
            <Field
              ref={keyRef}
              value={key}
              onChangeText={setKey}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Publishable key"
              placeholder="sb_publishable_… or anon jwt"
            />

            <PrimaryButton
              label="Connect custom server"
              onPress={() => void onSaveCustom()}
              loading={saving}
            />
          </>
        ) : null}

        <ErrorText nativeID="connect-error" message={error} />

        <TextLink
          label="Open Supabase dashboard"
          onPress={() =>
            void Linking.openURL('https://supabase.com/dashboard/projects')
          }
        />
        <Text style={styles.hint}>
          Bond uses the hosted project at melmzlgzfcysbnvtuksv.supabase.co.
          Custom servers are only offered in development.
        </Text>
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
  or: {
    ...type.label,
    color: colors.muted,
    marginTop: 28,
    marginBottom: 12,
  },
  hint: {
    ...type.label,
    color: colors.muted,
    marginTop: 12,
  },
})
