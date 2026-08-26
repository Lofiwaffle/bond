import { useRef, useState, type ReactNode } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  ActionPreview,
  CompactScorePicker,
  ExpectationRow,
  PromiseVisual,
  RevealPreview,
  SAMPLE_PROMPT,
  UnderstandingPreview,
} from '../components/OnboardingRitual'
import { PrimaryButton, TextLink } from '../components/ui'
import { markOnboardingSeen } from '../lib/onboarding'
import { colors, phoneMaxWidth, radii, type } from '../lib/theme'

const SLIDE_IDS = [
  'promise',
  'reflect',
  'reveal',
  'understand',
  'act',
] as const

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const width = Math.min(windowWidth, phoneMaxWidth)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const isLast = index === SLIDE_IDS.length - 1
  const yours = score ?? 4

  const goToIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_IDS.length - 1, next))
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true })
    setIndex(clamped)
  }

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1))
    setIndex(next)
  }

  const finish = async (destination: '/(auth)/signup' | '/(auth)/login') => {
    await markOnboardingSeen()
    router.replace(destination)
  }

  const current = SLIDE_IDS[index]
  const nextHint =
    current === 'reflect' && score == null
      ? 'Continue'
      : current === 'reveal' && !revealed
        ? 'See the reveal'
        : current === 'understand'
          ? 'Take a step'
          : 'Next'

  return (
    <View
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

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.carousel}
      >
        <Slide width={width} kicker="Bond" title="Before distance builds">
          <PromiseVisual />
          <Text style={styles.promise}>
            A two-minute daily ritual that helps couples understand each other
            before distance builds.
          </Text>
        </Slide>

        <Slide
          width={width}
          kicker="1 · Reflect privately"
          title="You go first. They cannot see it yet."
        >
          <Text style={styles.prompt}>{SAMPLE_PROMPT}</Text>
          <CompactScorePicker value={score} onChange={setScore} />
          <Text style={styles.body}>
            Honest, not performed. Your check-in stays yours until they answer
            too.
          </Text>
        </Slide>

        <Slide
          width={width}
          kicker="2 · Reveal when both respond"
          title="Nothing opens until you both show up."
        >
          <RevealPreview
            yours={yours}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
          />
          <Text style={styles.body}>
            {revealed
              ? 'Same day, side by side. Until they check in, their side stays sealed.'
              : 'Your answer is already saved. Tap the sealed side to see what happens when they respond.'}
          </Text>
        </Slide>

        <Slide
          width={width}
          kicker="3 · Understand each other"
          title="See the same day through both eyes."
        >
          <UnderstandingPreview yours={yours} />
          <Text style={styles.body}>
            {yours >= 4
              ? 'You felt close. They felt far. Naming the gap is enough — talking it through together is optional, and only if it feels safe.'
              : yours <= 2
                ? 'You named a hard day. You do not have to discuss it together. A conversation is optional, and only if it feels safe.'
                : 'Same day, two different temperatures. Understanding can stay in the app. Talking together is optional, and only if it feels safe.'}
          </Text>
        </Slide>

        <Slide
          width={width}
          kicker="4 · One small action"
          title="Then one small next step."
        >
          <ActionPreview />
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
            icon="bell"
            title="Reminders are optional"
            body="An 8pm nudge if you want it. You can leave notifications off."
          />
          <Text style={styles.body}>
            Next, invite the one person this ritual is for. Bond is not therapy
            or emergency support.
          </Text>
        </Slide>
      </ScrollView>

      <View style={styles.dots}>
        {SLIDE_IDS.map((id, i) => (
          <View
            key={id}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
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
  kicker,
  title,
  children,
}: {
  width: number
  kicker: string
  title: string
  children: ReactNode
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      {children}
    </ScrollView>
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
  },
  slide: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
    flexGrow: 1,
  },
  kicker: {
    ...type.label,
    marginBottom: 0,
  },
  title: {
    ...type.heading,
    fontSize: 22,
    lineHeight: 28,
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
