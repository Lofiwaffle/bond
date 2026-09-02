import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { Icon } from '../lib/icons'
import { FEED_LAUNCHER } from '../lib/plays'
import { colors, fonts, radii, type } from '../lib/theme'

export function TogetherLauncher() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Together</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FEED_LAUNCHER.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}`}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={styles.glyph}>
              <Icon name={item.icon} size={18} color={colors.accentFill} />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  label: {
    ...type.label,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tile: {
    width: 108,
    minHeight: 108,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: colors.ink,
  },
})
