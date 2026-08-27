import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import { plusGate } from '../../../components/PlusPreview'
import {
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useAuth } from '../../../lib/auth'
import { reportError } from '../../../lib/monitor'
import { supabase } from '../../../lib/supabase'
import { colors, hairlineWidth, type } from '../../../lib/theme'

type PromptItem = {
  id: string
  prompt_text: string
}

export default function BondPromptsScreen() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const plus = useBondPlus()
  const [items, setItems] = useState<PromptItem[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      setLoading(false)
      return
    }
    const { data, error: fetchError } = await supabase
      .from('couple_prompt_items')
      .select('id, prompt_text')
      .order('created_at', { ascending: true })
    if (fetchError) {
      reportError('supabase', fetchError.message, { op: 'plus-prompts' })
      setError(fetchError.message)
      setLoading(false)
      return
    }
    setItems((data as PromptItem[]) ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  const plusLock = plusGate('custom_prompts', plus)
  if (authLoading || loading) return <LoadingScreen />
  if (plusLock) return plusLock

  const onAdd = async () => {
    if (saving || !user?.id || !profile?.couple_id) return
    const text = draft.trim()
    if (!text) {
      setError('Write a question first.')
      return
    }
    setError(null)
    setSaving(true)
    const { error: insertError } = await supabase
      .from('couple_prompt_items')
      .insert({
        prompt_text: text,
        created_by: user.id,
        couple_id: profile.couple_id,
      })
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setDraft('')
    void refresh()
  }

  const onRemove = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('couple_prompt_items')
      .delete()
      .eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    void refresh()
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Private prompt decks"
          subtitle="Questions only the two of you see. They never leave this Bond."
        />
        <Field
          value={draft}
          onChangeText={setDraft}
          placeholder="A question for the two of you"
          accessibilityLabel="New private question"
        />
        <PrimaryButton
          label={saving ? 'Saving…' : 'Add question'}
          onPress={() => void onAdd()}
          loading={saving}
        />
        <ErrorText message={error} />
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.body}>{item.prompt_text}</Text>
            <TextLink label="Remove" onPress={() => void onRemove(item.id)} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  body: {
    ...type.body,
    marginBottom: 4,
  },
})
