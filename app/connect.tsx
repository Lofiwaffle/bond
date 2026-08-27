import { useRef, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, type TextInput } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ErrorText,
  Field,
  Label,
  PrimaryButton,
  Screen,
  TextLink,
} from '../components/ui'
import { Icon } from '../lib/icons'
import { saveSupabaseConfig, supabaseConfigured } from '../lib/supabase'
import { focusFirstInvalid } from '../lib/formFocus'
import { colors, type } from '../lib/theme'

export default function ConnectScreen() {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const urlRef = useRef<TextInput>(null)
  const keyRef = useRef<TextInput>(null)

  if (supabaseConfigured) {
    return <Redirect href="/" />
  }

  const onSave = async () => {
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
    router.replace('/')
  }

  return (
    <Screen keyboard>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Connect Bond</Text>
        <Text style={styles.subtitle}>
          This phone install is a web app. It needs your hosted Supabase
          project — local 127.0.0.1 will not work here.
        </Text>

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

        <ErrorText nativeID="connect-error" message={error} />

        <PrimaryButton
          label="Connect"
          onPress={() => void onSave()}
          loading={saving}
        />

        <TextLink
          label="Open Supabase dashboard"
          onPress={() =>
            void Linking.openURL('https://supabase.com/dashboard/projects')
          }
        />
        <Text style={styles.hint}>
          Create a project, run the SQL in supabase/migrations, then paste
          Settings → API → Project URL and the publishable/anon key.
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
  hint: {
    ...type.label,
    color: colors.muted,
    marginTop: 12,
  },
})
