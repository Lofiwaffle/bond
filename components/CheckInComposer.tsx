import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FaceIcon, Icon } from '../lib/icons'
import {
  androidOverlayModal,
  androidTextPad,
  rippleBorderless,
  rippleInk,
  rippleOnFill,
} from '../lib/androidUi'
import {
  ErrorText,
  Field,
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from './ui'
import { ACTIVITIES, type ActivityId } from '../lib/activities'
import { useAccessibleLayout, usePrefersReducedMotion } from '../lib/a11y'
import {
  ACTIVITIES_HEADING,
  ACTIVITIES_HELPER,
  CHECK_IN_DURATION,
  CHECK_IN_TITLE,
  CHOOSE_FEELING_FIRST,
  CONNECTION_QUESTION,
  CONNECTION_SCORES,
  KEEP_SAVED_LABEL,
  NO_WORDS_TODAY,
  OTHER_DETAIL_LABEL,
  OTHER_DETAIL_PLACEHOLDER,
  PRIVACY_DETAIL,
  PRIVACY_INFO_LABEL,
  PRIVACY_ROW,
  REFLECTION_PLACEHOLDER,
  REFLECTION_PROMPT,
  SAVED_BODY,
  SAVED_HEADING,
  SAVED_NEXT,
  SKIP_LABEL,
  applyActivityToggle,
  applyNoWords,
  applyPromptAnswer,
  canSaveCheckIn,
  connectionAccessibilityName,
  saveButtonLabel,
  type CheckInFormState,
} from '../lib/checkInForm'
import {
  colors,
  connectionTones,
  fonts,
  hairlineWidth,
  hit,
  motion,
  radii,
  type,
} from '../lib/theme'

function isFocused(state: { pressed: boolean }): boolean {
  return Boolean((state as { pressed: boolean; focused?: boolean }).focused)
}

function motionStyle(reduce: boolean): ViewStyle | undefined {
  if (Platform.OS !== 'web' || reduce) return undefined
  return {
    transitionProperty: 'transform, opacity',
    transitionDuration: `${motion.fast}ms`,
  } as ViewStyle
}

export function CheckInSaved({
  onDone,
  error,
  onRetry,
}: {
  onDone: () => void
  error?: string | null
  onRetry?: () => void
}) {
  return (
    <View style={styles.saved} testID="check-in-saved">
      <View style={styles.savedMark} accessibilityElementsHidden>
        <Icon name="check" size={22} color={colors.accentFill} />
      </View>
      <Text style={styles.savedTitle} accessibilityRole="header">
        {SAVED_HEADING}
      </Text>
      <Text style={styles.savedBody}>{SAVED_BODY}</Text>
      {error ? <ErrorText message={error} /> : null}
      {error && onRetry ? (
        <PrimaryButton label="Try again" onPress={onRetry} />
      ) : (
        <PrimaryButton label={SAVED_NEXT} onPress={onDone} />
      )}
    </View>
  )
}

export function CheckInComposer({
  title = CHECK_IN_TITLE,
  dateLabel,
  form,
  onChange,
  onClose,
  onSave,
  onSkip,
  skipLabel,
  editing = false,
  queued = false,
  submitting = false,
  error,
  feelingError,
}: {
  title?: string
  dateLabel: string
  form: CheckInFormState
  onChange: (next: CheckInFormState) => void
  onClose: () => void
  onSave: () => void
  onSkip: () => void
  skipLabel?: string
  editing?: boolean
  queued?: boolean
  submitting?: boolean
  error: string | null
  feelingError: boolean
}) {
  const insets = useSafeAreaInsets()
  const reduceMotion = usePrefersReducedMotion()
  const { highContrast, touch } = useAccessibleLayout()
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const otherOn = form.activities.includes('other')
  const otherOpacity = useRef(new Animated.Value(otherOn ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(otherOpacity, {
      toValue: otherOn ? 1 : 0,
      duration: reduceMotion ? 0 : motion.fast,
      useNativeDriver: false,
    }).start()
  }, [otherOn, otherOpacity, reduceMotion])

  const ready = canSaveCheckIn(form)

  return (
    <View style={styles.screen} testID="check-in-composer">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.duration}>{CHECK_IN_DURATION}</Text>
        </View>
        <IconButton
          name="x"
          accessibilityLabel="Close"
          onPress={onClose}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.section}
          nativeID="connection-level"
          accessibilityLabel={feelingError ? CHOOSE_FEELING_FIRST : undefined}
        >
          <Text style={styles.question}>{CONNECTION_QUESTION}</Text>
          <ConnectionScale
            value={form.score}
            onChange={(score) => onChange({ ...form, score })}
            highContrast={highContrast}
            touch={touch}
            reduceMotion={reduceMotion}
          />
          {feelingError ? (
            <ErrorText nativeID="feeling-error" message={CHOOSE_FEELING_FIRST} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.question}>{REFLECTION_PROMPT}</Text>
          {form.noWords ? (
            <Text style={styles.body}>No words today — that’s okay.</Text>
          ) : (
            <Field
              value={form.promptAnswer}
              onChangeText={(text) => onChange(applyPromptAnswer(form, text))}
              placeholder={REFLECTION_PLACEHOLDER}
              accessibilityLabel={REFLECTION_PROMPT}
              autoCapitalize="sentences"
              multiline
              maxLength={500}
              style={styles.note}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={NO_WORDS_TODAY}
            accessibilityState={{ selected: form.noWords }}
            android_ripple={rippleBorderless}
            onPress={() => onChange(applyNoWords(form, !form.noWords))}
            style={(state) => [
              styles.quietAction,
              state.pressed && styles.pressed,
              isFocused(state) && styles.focusRing,
            ]}
          >
            <Text style={styles.quietActionLabel}>
              {form.noWords ? 'I want to write something' : NO_WORDS_TODAY}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.question}>{ACTIVITIES_HEADING}</Text>
          <Text style={styles.helper}>{ACTIVITIES_HELPER}</Text>
          <ActivitySelect
            value={form.activities}
            onToggle={(id) => onChange(applyActivityToggle(form, id))}
            reduceMotion={reduceMotion}
          />
          {otherOn ? (
            <Animated.View
              style={{
                opacity: otherOpacity,
                transform: [
                  {
                    translateY: otherOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 0],
                    }),
                  },
                ],
              }}
            >
              <Field
                value={form.otherText}
                onChangeText={(text) => onChange({ ...form, otherText: text })}
                placeholder={OTHER_DETAIL_PLACEHOLDER}
                accessibilityLabel={OTHER_DETAIL_LABEL}
                autoCapitalize="sentences"
                maxLength={80}
                style={styles.otherField}
              />
            </Animated.View>
          ) : null}
        </View>

        <PrivacyRow onOpen={() => setPrivacyOpen(true)} />

        <ErrorText message={error && error !== CHOOSE_FEELING_FIRST ? error : null} />
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <PrimaryButton
          label={saveButtonLabel({ editing, queued })}
          onPress={onSave}
          loading={submitting}
          disabled={submitting}
          muted={!ready && !submitting}
        />
        <SecondaryButton
          label={skipLabel ?? (editing ? KEEP_SAVED_LABEL : SKIP_LABEL)}
          onPress={onSkip}
          disabled={submitting}
        />
      </View>

      <PrivacySheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
    </View>
  )
}

function ConnectionScale({
  value,
  onChange,
  highContrast,
  touch,
  reduceMotion,
}: {
  value: number | null
  onChange: (score: number) => void
  highContrast: boolean
  touch: number
  reduceMotion: boolean
}) {
  const { width } = useAccessibleLayout()
  const wrap = width < 360
  const face = wrap ? 36 : 44

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={CONNECTION_QUESTION}
      style={[styles.scaleRow, wrap && styles.scaleWrap]}
    >
      {CONNECTION_SCORES.map((score) => {
        const selected = value === score
        const tone = connectionTones[score]
        const label = connectionAccessibilityName(score)
        return (
          <Pressable
            key={score}
            testID={`connection-option-${score}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            aria-checked={selected}
            accessibilityLabel={label}
            android_ripple={rippleInk}
            onPress={() => onChange(score)}
            style={(state) => [
              styles.scaleCell,
              wrap ? styles.scaleCellWrap : styles.scaleCellRow,
              { minWidth: touch, minHeight: touch },
              selected && {
                backgroundColor: tone.selected,
                borderColor: tone.stroke,
                borderWidth: 2,
              },
              highContrast && { borderColor: colors.ink },
              selected && highContrast && { backgroundColor: tone.fill },
              state.pressed && { opacity: 0.85 },
              isFocused(state) && styles.focusRing,
              motionStyle(reduceMotion),
              selected && !reduceMotion ? { transform: [{ scale: 1.02 }] } : null,
            ]}
          >
            <View style={styles.faceWrap}>
              <FaceIcon score={score} size={face} />
              {selected ? (
                <View
                  style={[styles.checkBadge, { backgroundColor: tone.stroke }]}
                  accessibilityElementsHidden
                >
                  <Icon name="check" size={10} color={colors.onAccent} />
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.scaleLabel,
                androidTextPad,
                selected && styles.scaleLabelOn,
              ]}
              numberOfLines={2}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function ActivitySelect({
  value,
  onToggle,
  reduceMotion,
}: {
  value: ActivityId[]
  onToggle: (id: ActivityId) => void
  reduceMotion: boolean
}) {
  return (
    <View style={styles.chipWrap}>
      {ACTIVITIES.map((activity) => {
        const selected = value.includes(activity.id)
        return (
          <Pressable
            key={activity.id}
            testID={`activity-${activity.id}`}
            accessibilityRole="checkbox"
            accessibilityState={{ selected, checked: selected }}
            aria-checked={selected}
            accessibilityLabel={activity.label}
            android_ripple={selected ? rippleOnFill : rippleInk}
            onPress={() => onToggle(activity.id)}
            style={(state) => [
              styles.chip,
              selected && styles.chipSelected,
              state.pressed && { opacity: 0.85 },
              isFocused(state) && styles.focusRing,
              motionStyle(reduceMotion),
            ]}
          >
            <Icon
              name={selected ? 'check' : activity.icon}
              size={16}
              color={selected ? colors.onAccent : colors.ink}
            />
            <Text
              style={[styles.chipLabel, selected && styles.chipLabelSelected]}
            >
              {activity.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function PrivacyRow({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={styles.privacyRow}>
      <Icon name="lock" size={16} color={colors.muted} />
      <Text style={styles.privacyCopy}>{PRIVACY_ROW}</Text>
      <IconButton
        name="info"
        accessibilityLabel={PRIVACY_INFO_LABEL}
        onPress={onOpen}
      />
    </View>
  )
}

function PrivacySheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
      {...androidOverlayModal}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          style={styles.sheet}
          accessibilityRole="summary"
          testID="privacy-sheet"
        >
          <Text style={styles.sheetTitle}>Your check-in stays private</Text>
          <ScrollView
            style={styles.sheetBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetCopy}>{PRIVACY_DETAIL}</Text>
          </ScrollView>
          <PrimaryButton label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.heading,
    fontSize: 22,
    lineHeight: 28,
  },
  date: {
    ...type.body,
    color: colors.muted,
  },
  duration: {
    ...type.label,
    marginBottom: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  question: {
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    color: colors.ink,
  },
  helper: {
    ...type.body,
    color: colors.muted,
  },
  body: {
    ...type.body,
    color: colors.muted,
  },
  note: {
    minHeight: 112,
    textAlignVertical: 'top',
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  otherField: {
    marginTop: 12,
    marginBottom: 0,
    backgroundColor: colors.surface,
  },
  quietAction: {
    alignSelf: 'flex-start',
    minHeight: hit,
    justifyContent: 'center',
    paddingRight: 12,
  },
  quietActionLabel: {
    ...type.label,
    color: colors.muted,
    marginBottom: 0,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
  },
  scaleWrap: {
    flexWrap: 'wrap',
  },
  scaleCell: {
    minWidth: hit,
    minHeight: hit,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 2,
    borderRadius: radii.md,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scaleCellRow: {
    flex: 1,
  },
  scaleCellWrap: {
    width: '30%',
    flexGrow: 1,
  },
  faceWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: colors.muted,
    textAlign: 'center',
  },
  scaleLabelOn: {
    fontFamily: fonts.medium,
    fontWeight: '500',
    color: colors.ink,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hit,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  chipSelected: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
  },
  chipLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.ink,
  },
  chipLabelSelected: {
    color: colors.onAccent,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: hit,
    paddingVertical: 4,
  },
  privacyCopy: {
    ...type.body,
    color: colors.muted,
    flex: 1,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#3A2430',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  saved: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  savedMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  savedTitle: {
    fontFamily: fonts.medium,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500',
    color: colors.ink,
  },
  savedBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: 22,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      android: { elevation: 16 },
      default: {},
    }),
  },
  sheetTitle: {
    ...type.heading,
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 8,
  },
  sheetBody: {
    maxHeight: 280,
    marginBottom: 12,
  },
  sheetCopy: {
    ...type.body,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.7,
  },
  focusRing: Platform.select<ViewStyle>({
    web: {
      outlineWidth: 2,
      outlineColor: colors.ink,
      outlineStyle: 'solid',
      outlineOffset: 2,
    },
    default: {},
  }),
})
