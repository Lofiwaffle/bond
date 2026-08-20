import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { Screen } from '../components/ui'
import { Icon } from '../lib/icons'
import { colors, type } from '../lib/theme'

const SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'Who we are',
    body: 'Bond provides a paired daily check-in space for two partners.',
  },
  {
    title: 'Data we collect',
    body: 'Account: email, password (stored by our auth provider, not in plain text), and display name. Couple pairing: invite codes and the link between two accounts. Check-ins: connection scores, optional notes, activity tags, prompt answers, and timestamps. Shared content you choose to save: habits, goals, weekly reviews, and summaries of completed weeks. Device: a local reminder if you allow notifications. We do not collect precise location, contacts, photos, microphone, or advertising IDs.',
  },
  {
    title: 'How we use data',
    body: 'We use this data to run the app: sign you in, pair you with your partner, show shared entries after both of you check in, and generate weekly summaries. We do not sell personal data. We do not use your relationship content for ads.',
  },
  {
    title: 'Sharing',
    body: 'Your partner can see shared couple data according to in-app rules (for example, a daily check-in is hidden from them until they check in that day). We use infrastructure providers (hosting, authentication, database) only to operate Bond.',
  },
  {
    title: 'Retention and deletion',
    body: 'You can delete your account in the app (Us → Delete account). That removes your profile and sign-in. Shared couple records with no remaining members are removed. You can also email a deletion request using the address in the Play Store listing.',
  },
  {
    title: 'Security',
    body: 'Data is sent over HTTPS. Access to couple rows is limited by signed-in identity and row-level rules. Device backups of Bond app data are disabled on Android.',
  },
  {
    title: 'Children',
    body: 'Bond is for adults. Do not use the app if you are under 18.',
  },
  {
    title: 'Changes',
    body: 'We may update this policy. The date below will change when we do.',
  },
  {
    title: 'Contact',
    body: 'Use the support email on the Bond Play Store listing.',
  },
]

export default function PrivacyScreen() {
  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(auth)/login')
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
        <Text style={styles.title}>Privacy</Text>
        <Text style={styles.updated}>Last updated 20 August 2026</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.heading}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
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
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    ...type.label,
    marginBottom: 0,
  },
  title: {
    ...type.heading,
  },
  updated: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  heading: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 6,
  },
  body: {
    ...type.body,
    color: colors.ink,
  },
})
