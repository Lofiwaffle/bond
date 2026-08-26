import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'

import { SafetyResources } from '../components/SafetyResources'
import { Screen } from '../components/ui'
import { Icon } from '../lib/icons'
import { NOT_THERAPY } from '../lib/privacy'
import { colors, type } from '../lib/theme'

export default function HelpScreen() {
  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/privacy')
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={16} color={colors.muted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Help & safety</Text>
        <Text style={styles.body}>{NOT_THERAPY}</Text>
        <SafetyResources />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backText: {
    ...type.label,
    marginBottom: 0,
  },
  title: {
    ...type.heading,
    marginBottom: 12,
  },
  body: {
    ...type.body,
    marginBottom: 16,
  },
})
