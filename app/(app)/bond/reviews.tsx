import { useCallback, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  LoadingScreen,
  Screen,
  StatusPanel,
  TextLink,
} from '../../../components/ui'
import {
  useWeeklyReview,
  useWeeklyReviewHistory,
} from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import { formatDisplayDate } from '../../../lib/dates'
import { Icon } from '../../../lib/icons'
import { colors, hairlineWidth, type } from '../../../lib/theme'
import { displayWeeklyAnswer } from '../../../lib/weeklyPrompts'

export default function BondReviewsScreen() {
  const { partner, isLoading: authLoading } = useAuth()
  const { weeks, isLoading, error, refresh } = useWeeklyReviewHistory()
  const { unlocked, needsReview } = useWeeklyReview()
  const [openWeek, setOpenWeek] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  if (authLoading || isLoading) return <LoadingScreen />

  const partnerName = partner?.display_name ?? 'your partner'
  const completed = weeks.filter((week) => week.completed)
  const waiting = weeks.filter((week) => week.waiting && !week.completed)

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refresh()} />
        }
      >
        <BondSectionHeader
          title="Reviews"
          subtitle={`Summaries of weekly reviews you finish together${
            partner ? ` with ${partnerName}` : ''
          }.`}
        />

        {error ? (
          <StatusPanel
            message="Couldn't load weekly reviews."
            onRetry={() => void refresh()}
          />
        ) : null}

        {unlocked ? (
          <View style={styles.cta}>
            <Text style={styles.ctaTitle}>
              {needsReview ? "Last week's review is ready" : 'Last week'}
            </Text>
            <Text style={styles.ctaBody}>
              {needsReview
                ? 'Look back at the Sunday–Saturday that already ended. The summary shows up here after you both finish.'
                : 'Open last week’s review, or look back on weeks you’ve already completed.'}
            </Text>
            <TextLink
              label={needsReview ? "Start last week’s review" : 'Open weekly review'}
              onPress={() => router.push('/(app)/weekly-review')}
            />
          </View>
        ) : (
          <Text style={styles.emptyBody}>
            Weekly review opens after seven days of honest reflection, even if
            they were not in a row. Finished weeks live here.
          </Text>
        )}

        {waiting.map((week) => (
          <View key={`wait-${week.weekStart}`} style={styles.card}>
            <Text style={styles.weekLabel}>
              {formatDisplayDate(week.weekStart)} –{' '}
              {formatDisplayDate(week.weekEnd)}
            </Text>
            <Text style={styles.waiting}>
              Waiting for {partnerName} to finish this review. Their answers
              stay hidden until they submit.
            </Text>
          </View>
        ))}

        {completed.length === 0 && waiting.length === 0 ? (
          <Text style={styles.emptyBody}>
            No completed weekly reviews yet. After you both submit, a summary of
            that week’s review will live here.
          </Text>
        ) : null}

        {completed.map((week) => {
          const expanded = openWeek === week.weekStart
          return (
            <View key={week.weekStart} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() =>
                  setOpenWeek((current) =>
                    current === week.weekStart ? null : week.weekStart,
                  )
                }
                style={({ pressed }) => [
                  styles.weekRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.weekCopy}>
                  <Text style={styles.weekLabel}>
                    {formatDisplayDate(week.weekStart)} –{' '}
                    {formatDisplayDate(week.weekEnd)}
                  </Text>
                  <Text style={styles.weekHint} numberOfLines={expanded ? 0 : 2}>
                    {displayWeeklyAnswer(
                      week.mine?.answers.find((a) => a.prompt_id === 'intention'),
                    ) || week.summary}
                  </Text>
                </View>
                <Icon
                  name={expanded ? 'chevron-down' : 'chevron-right'}
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
              {expanded ? (
                <View style={styles.detail}>
                  {week.mine?.answers.map((answer, index) => (
                    <View key={answer.prompt_id} style={styles.prompt}>
                      <Text style={styles.detailKicker}>{answer.prompt_text}</Text>
                      <Text style={styles.detailBody}>
                        You: {displayWeeklyAnswer(answer)}
                      </Text>
                      {week.partnerReview?.answers[index] ? (
                        <Text style={styles.detailBody}>
                          {partnerName}:{' '}
                          {displayWeeklyAnswer(week.partnerReview.answers[index])}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                  {week.summary ? (
                    <>
                      <Text style={styles.detailKicker}>
                        {week.source === 'review'
                          ? 'Your words'
                          : 'Suggested reading'}
                      </Text>
                      <Text style={styles.detailBody}>{week.summary}</Text>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  cta: {
    paddingVertical: 12,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
    marginBottom: 8,
  },
  ctaTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  ctaBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 8,
  },
  emptyBody: {
    ...type.body,
    color: colors.muted,
    marginTop: 8,
  },
  card: {
    paddingVertical: 14,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  weekCopy: {
    flex: 1,
  },
  weekLabel: {
    ...type.body,
    fontWeight: '500',
  },
  weekHint: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
  },
  waiting: {
    ...type.body,
    color: colors.muted,
    marginTop: 6,
  },
  detail: {
    paddingTop: 12,
  },
  detailKicker: {
    ...type.label,
    marginBottom: 6,
  },
  detailBody: {
    ...type.body,
  },
  prompt: {
    marginBottom: 12,
  },
})
