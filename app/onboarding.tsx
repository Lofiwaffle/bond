import { useRef, useState } from 'react'
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { router } from 'expo-router'

import { PrimaryButton, SecondaryButton } from '../components/ui'
import { markOnboardingSeen } from '../lib/onboarding'
import { colors, radii } from '../lib/theme'

const { width } = Dimensions.get('window')

type Slide = {
  glyph: string
  glyphColor: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    glyph: '◎',
    glyphColor: colors.accent,
    title: 'Bond',
    body: 'A shared daily check-in space for you and your partner.',
  },
  {
    glyph: '✦',
    glyphColor: '#FF7EB6',
    title: 'Check In, Every Day',
    body: 'Log your mood and connection score in seconds, and see how your partner is feeling too.',
  },
  {
    glyph: '✧',
    glyphColor: '#FF8B5C',
    title: 'Grow Habits Together',
    body: 'Track shared habits like Spark, Glow, Forge, and Sync, and watch your streak calendar fill in.',
  },
  {
    glyph: '◈',
    glyphColor: '#E8C547',
    title: 'Stay in Sync',
    body: 'Get gentle reminders so you never miss a check-in, and read weekly summaries of how you two are doing.',
  },
]

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const isLast = index === SLIDES.length - 1

  const goToIndex = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true })
    setIndex(next)
  }

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    setIndex(next)
  }

  const finish = async (destination: '/(auth)/signup' | '/(auth)/login') => {
    await markOnboardingSeen()
    router.replace(destination)
  }

  return (
    <View style={styles.screen}>
      <View style={styles.skipRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
          onPress={() => finish('/(auth)/signup')}
          hitSlop={12}
        >
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.carousel}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={styles.slide}>
            <Text style={[styles.glyph, { color: slide.glyphColor }]}>
              {slide.glyph}
            </Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.title}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <>
            <PrimaryButton
              label="Get started"
              onPress={() => finish('/(auth)/signup')}
            />
            <SecondaryButton
              label="I already have an account"
              onPress={() => finish('/(auth)/login')}
            />
          </>
        ) : (
          <View style={styles.navRow}>
            {index > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => goToIndex(index - 1)}
                style={styles.navButton}
              >
                <Text style={styles.navLabel}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              onPress={() => goToIndex(index + 1)}
              style={[styles.navButton, styles.navButtonPrimary]}
            >
              <Text style={styles.navLabelPrimary}>Next</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 56,
    paddingBottom: 24,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    minHeight: 24,
  },
  skipLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  carousel: {
    flexGrow: 0,
  },
  slide: {
    width,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  glyph: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 12,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.hairline,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    minWidth: 88,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    marginLeft: 12,
  },
  navLabel: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  navLabelPrimary: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '800',
  },
})
