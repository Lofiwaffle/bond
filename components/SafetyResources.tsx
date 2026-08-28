import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

import {
  SAFETY_FOOTNOTE,
  SAFETY_INTRO,
  SAFETY_RESOURCES,
} from '../lib/privacy'
import { colors, hit, type } from '../lib/theme'

export function SafetyResources() {
  return (
    <View>
      <Text style={styles.intro}>{SAFETY_INTRO}</Text>
      {SAFETY_RESOURCES.map((item) => {
        if (!item.href) {
          return (
            <View key={item.label} style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </View>
          )
        }
        return (
          <Pressable
            key={item.href}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            accessibilityHint="Opens in your browser. Your partner is not notified."
            onPress={() => void Linking.openURL(item.href)}
            hitSlop={8}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
          </Pressable>
        )
      })}
      <Text style={styles.footnote}>{SAFETY_FOOTNOTE}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  intro: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  row: {
    minHeight: hit,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  detail: {
    ...type.label,
    marginBottom: 0,
  },
  footnote: {
    ...type.body,
    color: colors.muted,
    marginTop: 8,
  },
})
