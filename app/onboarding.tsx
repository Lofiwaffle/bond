import { useRef, useState, type ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { router, Redirect, type Href } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  CompactScorePicker,
  ExpectationRow,
  PromiseVisual,
  RevealPreview,
  SAMPLE_PROMPT,
} from '../components/OnboardingRitual'
import { PrimaryButton, TextLink, LoadingScreen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { markOnboardingSeen } from '../lib/onboarding'
import { DEVICE_ONLY_THOUGHTS } from '../lib/privacy'
import { colors, radii, type } from '../lib/theme'

const SLIDE_IDS = ['promise', 'reveal', 'invite'] as const

export default function OnboardingScreen() {
  const { session, profile, isLoading } = useAuth()
  const insets = useSafeAreaInsets()
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [slideSize, setSlideSize] = useState({ width: 0, height: 0 })
  const scrollRef = useRef<ScrollView>(null)
  const innerRefs = useRef<Array<ScrollView | null>>([])
  const widthRef = useRef(0)
  const pageWidth = slideSize.width
  const slideHeight = slideSize.height
  const isLast = index === SLIDE_IDS.length - 1
  const yours = score ?? 4
  const current = SLIDE_IDS[index]

  const goToIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_IDS.length - 1, next))
    innerRefs.current[clamped]?.scrollTo({ y: 0, animated: false })
    scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated: true })
    setIndex(clamped)
  }

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(
      e.nativeEvent.contentOffset.x / Math.max(pageWidth, 1),
    )
    setIndex(Math.max(0, Math.min(SLIDE_IDS.length - 1, next)))
  }

  const finish = async (destination: '/(auth)/signup' | '/(auth)/login') => {
    await markOnboardingSeen()
    router.replace(destination)
  }

  const nextHint =
    current === 'reveal' && !revealed ? 'See the reveal' : 'Next'

  if (isLoading) return <LoadingScreen label="Opening Bond" />
  if (session) {
    return (
      <Redirect
        href={
          (profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup') as Href
        }
      />
    )
  }

  return (
    <View
      testID="onboarding-screen"
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.skipRow}>
        {index > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            onPress={() => void finish('/(auth)/signup')}
            hitSlop={12}
            style={styles.skipHit}
          >
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipHit} />
        )}
      </View>

      <View
        style={styles.carousel}
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width)
          const nextHeight = Math.round(event.nativeEvent.layout.height)
          if (nextWidth <= 0 || nextHeight <= 0) return
          const widthChanged = nextWidth !== widthRef.current
          if (
            nextWidth !== slideSize.width ||
            nextHeight !== slideSize.height
          ) {
            setSlideSize({ width: nextWidth, height: nextHeight })
          }
          if (widthChanged) {
            widthRef.current = nextWidth
            scrollRef.current?.scrollTo({
              x: index * nextWidth,
              animated: false,
            })
          }
        }}
      >
        {pageWidth > 0 && slideHeight > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            decelerationRate="fast"
            snapToInterval={pageWidth}
            snapToAlignment="start"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            style={{ height: slideHeight }}
            contentContainerStyle={{ height: slideHeight }}
            keyboardShouldPersistTaps="handled"
          >
            <Slide
              width={pageWidth}
              height={slideHeight}
              scrollRef={(node) => {
                innerRefs.current[0] = node
              }}
              testID="onboarding-slide-promise"
              kicker="Bond"
              title="Before distance builds"
            >
              <PromiseVisual />
              <Text style={styles.promise}>
                A two-minute daily ritual that helps couples understand each
                other before distance builds.
              </Text>
            </Slide>

            <Slide
              width={pageWidth}
              height={slideHeight}
              scrollRef={(node) => {
                innerRefs.current[1] = node
              }}
              testID="onboarding-slide-reveal"
              kicker="The ritual"
              title="Check in privately. Reveal when you both show up."
            >
              <Text style={styles.prompt}>{SAMPLE_PROMPT}</Text>
              <CompactScorePicker value={score} onChange={setScore} />
              <RevealPreview
                yours={yours}
                revealed={revealed}
                stacked={pageWidth < 400}
                onReveal={() => setRevealed(true)}
              />
              <Text style={styles.body}>
                {!revealed
                  ? 'Your answer stays yours until they check in too. Tap the sealed side to see the same day through both eyes.'
                  : yours >= 4
                    ? 'You felt close. They felt far. Naming the gap is enough — talking it through together is optional, and only if it feels safe.'
                    : yours <= 2
                      ? 'You named a hard day. You do not have to discuss it together. A conversation is optional, and only if it feels safe.'
                      : 'Same day, two different temperatures. Understanding can stay in the app. Talking together is optional, and only if it feels safe.'}
              </Text>
            </Slide>

            <Slide
              width={pageWidth}
              height={slideHeight}
              scrollRef={(node) => {
                innerRefs.current[2] = node
              }}
              testID="onboarding-slide-invite"
              kicker="Create, then invite"
              title="Start a Bond, then invite one person."
            >
              <ExpectationRow
                icon="clock"
                title="Two minutes a day"
                body="That is the whole habit. Miss a day, come back tomorrow."
              />
              <ExpectationRow
                icon="eye-off"
                title="Private until you both check in"
                body="Only the two of you. No one else sees this."
              />
              <ExpectationRow
                icon="smartphone"
                title="Device-only thoughts"
                body={DEVICE_ONLY_THOUGHTS}
              />
              <ExpectationRow
                icon="bell"
                title="Reminders are optional"
                body="Off by default. You can choose one daily reminder, or none. There is no rush."
              />
              <Text style={styles.body}>
                Next, invite the one person this ritual is for. Bond is not
                therapy or emergency support.
              </Text>
            </Slide>
          </ScrollView>
        ) : null}
      </View>

      <View testID="onboarding-dots" style={styles.dots}>
        {SLIDE_IDS.map((id, i) => (
          <View
            key={id}
            testID={`onboarding-dot-${id}`}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View testID="onboarding-footer" style={styles.footer}>
        {isLast ? (
          <>
            <PrimaryButton
              label="Create a Bond"
              onPress={() => void finish('/(auth)/signup')}
            />
            <TextLink
              label="I already have an account"
              onPress={() => void finish('/(auth)/login')}
            />
            <TextLink
              label="Privacy"
              onPress={() => router.push('/privacy')}
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
              testID="onboarding-next"
              accessibilityRole="button"
              accessibilityLabel={nextHint}
              onPress={() => {
                if (current === 'reveal' && !revealed) {
                  setRevealed(true)
                  return
                }
                goToIndex(index + 1)
              }}
              style={[styles.navButton, styles.navButtonPrimary]}
            >
              <Text style={styles.navLabelPrimary}>{nextHint}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

function Slide({
  width,
  height,
  kicker,
  title,
  children,
  testID,
  scrollRef,
}: {
  width: number
  height: number
  kicker: string
  title: string
  children: ReactNode
  testID: string
  scrollRef: (node: ScrollView | null) => void
}) {
  return (
    <View testID={testID} style={{ width, height }}>
      <ScrollView
        ref={scrollRef}
        style={{ height }}
        contentContainerStyle={styles.slide}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <Text accessibilityRole="header" style={styles.kicker}>
          {kicker}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  skipLabel: {
    ...type.body,
    color: colors.muted,
  },
  carousel: {
    flex: 1,
    minHeight: 0,
  },
  slide: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  kicker: {
    ...type.label,
    marginBottom: 0,
  },
  title: {
    ...type.display,
    marginBottom: 4,
  },
  prompt: {
    ...type.body,
    fontWeight: '500',
  },
  promise: {
    ...type.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  body: {
    ...type.body,
    color: colors.muted,
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
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPrimary: {
    backgroundColor: colors.accentFill,
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
