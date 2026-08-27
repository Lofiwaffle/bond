import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { SafetyResources } from '../components/SafetyResources'
import { Screen } from '../components/ui'
import { Icon } from '../lib/icons'
import {
  DELETE_SEMANTICS,
  EXPORT_NOTE,
  NOT_STORED,
  NOT_THERAPY,
  PRIVACY_UPDATED,
  STORED_ON_SERVER,
  UNPAIR_SEMANTICS,
  VISIBILITY_ROWS,
  ADS_DISCLOSURE,
} from '../lib/privacy'
import { colors, hairlineWidth, type } from '../lib/theme'

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
        <Text style={styles.updated}>Last updated {PRIVACY_UPDATED}</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Not therapy or emergency support</Text>
          <Text style={styles.body}>{NOT_THERAPY}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Who can see each entry</Text>
          {VISIBILITY_ROWS.map((row) => (
            <View key={row.entry} style={styles.visibility}>
              <Text style={styles.entry}>{row.entry}</Text>
              <Text style={styles.body}>{row.who}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>What Bond stores</Text>
          {STORED_ON_SERVER.map((line) => (
            <Text key={line} style={styles.body}>
              {line}
            </Text>
          ))}
          <Text style={[styles.body, styles.gap]}>Bond does not store:</Text>
          {NOT_STORED.map((line) => (
            <Text key={line} style={styles.body}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Notifications</Text>
          <Text style={styles.body}>
            Reminders and partner alerts never include scores, shared words, or
            names. On Android, the lock screen hides the message body. iOS
            still shows the title and body, so both are generic: “Bond” and
            “Open the app when you have a minute.” Reminders stay off until you
            opt in. You can set one daily time, a separate “Our reveal is
            ready” alert, quiet hours, and an optional one-hour snooze. Bond
            will not remind you after today’s check-in is saved, and it will
            not interrupt you with a popup while you are using another part of
            the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Leaving a Bond</Text>
          <Text style={styles.body}>{UNPAIR_SEMANTICS}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Deleting your account</Text>
          <Text style={styles.body}>{DELETE_SEMANTICS}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Download a copy</Text>
          <Text style={styles.body}>{EXPORT_NOTE}</Text>
          <Text style={styles.body}>
            Signed-in, use Us → Download my data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Ads</Text>
          <Text style={styles.body}>{ADS_DISCLOSURE}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>How we use data</Text>
          <Text style={styles.body}>
            We use this data to run the app: sign you in (email or Google), pair you, and show
            shared entries after both of you check in, and (on the free plan)
            show ads. We do not sell personal data. We do not use your
            relationship content to target ads. Hosting, authentication (including Google if you choose it), and
            AdMob see data only to operate Bond.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Security</Text>
          <Text style={styles.body}>
            Data is sent over HTTPS. Couple rows are limited by signed-in
            identity and row-level rules. Device backups of Bond app data are
            disabled on Android.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Children</Text>
          <Text style={styles.body}>
            Bond is for adults. Do not use the app if you are under 18.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>If you need help</Text>
          <SafetyResources />
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Contact</Text>
          <Text style={styles.body}>
            Use the support email on the Bond Play Store listing. We may
            update this page; the date above will change when we do.
          </Text>
        </View>
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
  },
  updated: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    marginBottom: 22,
  },
  heading: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 6,
  },
  body: {
    ...type.body,
    color: colors.ink,
    marginBottom: 8,
  },
  gap: {
    marginTop: 8,
  },
  visibility: {
    paddingVertical: 10,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  entry: {
    ...type.label,
    marginBottom: 4,
  },
})
