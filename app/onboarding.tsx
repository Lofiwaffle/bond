import { useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { router } from 'expo-router'

import { PrimaryButton, TextLink } from '../components/ui'
import { FaceIcon, Icon, type IconName } from '../lib/icons'
import { markOnboardingSeen } from '../lib/onboarding'
import { colors, radii, type } from '../lib/theme'

type Slide = {
  id: string
  icon?: IconName
  faces?: boolean
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    icon: 'heart',
    title: 'Welcome to Bond',
    body: 'A private space for the two of you. No feed, no ads, no one else.',
  },
  {
    id: 'checkin',
    faces: true,
    title: 'Check in every day',
    body: 'Save how connected you felt, answer a shared prompt, and tag what shaped the day.',
  },
  {
    id: 'reveal',
    icon: 'eye-off',
    title: 'Hidden until you both show up',
    body: 'Your partner cannot see your entry until they check in too. Then the day opens for both of you.',
  },
  {
    id: 'pair',
    icon: 'users',
    title: 'Pair with a code',
    body: 'Create an account, generate an invite, and share it with one person. Then achievements, goals, and weekly reviews live here together.',
  },
]

export default function OnboardingScreen() {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const isLast = index === SLIDES.length - 1

  const goToIndex = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true })
    setIndex(next)
  }

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1))
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
          onPress={() => void finish('/(auth)/signup')}
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
          <View key={slide.id} style={[styles.slide, { width }]}>
            {slide.faces ? (
              <View style={styles.faces}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <FaceIcon key={score} score={score} size={36} />
                ))}
              </View>
            ) : (
              <Icon name={slide.icon ?? 'heart'} size={48} color={colors.ink} />
            )}
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.id}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <>
            <PrimaryButton
              label="Create account"
              onPress={() => void finish('/(auth)/signup')}
            />
            <TextLink
              label="I already have an account"
              onPress={() => void finish('/(auth)/login')}
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
    ...type.body,
    color: colors.muted,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 36,
    flex: 1,
    minHeight: 280,
  },
  faces: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    ...type.heading,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    ...type.body,
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
    ...type.body,
    color: colors.muted,
  },
  navLabelPrimary: {
    color: colors.onAccent,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
})
