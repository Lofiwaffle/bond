import { useMemo } from 'react'

import { useCheckInHistory } from './useCheckIn'
import { useCoupleGoal } from './useCoupleGoal'
import { useWeeklyReviewHistory } from './useWeeklyReview'
import { milestonesFrom, type Milestone } from '../lib/milestones'

export function useMilestones(): {
  milestones: Milestone[]
  earnedCount: number
  isLoading: boolean
} {
  const { days, isLoading: daysLoading } = useCheckInHistory()
  const { weeks, isLoading: weeksLoading } = useWeeklyReviewHistory()
  const { completed, isLoading: goalsLoading } = useCoupleGoal()

  const milestones = useMemo(() => {
    const mineDays = days
      .filter((d) => d.mine)
      .map((d) => d.date)
      .sort()
    const revealed = days.filter((d) => d.revealed).sort((a, b) => a.date.localeCompare(b.date))
    const firstRevealDate = revealed[0]?.date ?? null

    let firstRepairDate: string | null = null
    for (const day of revealed) {
      const mineScore = day.mine?.score
      const partnerScore = day.partner?.score
      if (
        (typeof mineScore === 'number' && mineScore <= 2) ||
        (typeof partnerScore === 'number' && partnerScore <= 2)
      ) {
        firstRepairDate = day.date
        break
      }
    }

    const completedWeeks = weeks
      .filter((week) => week.completed)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    const firstReviewDate = completedWeeks[0]?.weekEnd ?? null

    let firstAppreciationDate: string | null = null
    for (const week of completedWeeks) {
      const answers = [
        ...(week.mine?.answers ?? []),
        ...(week.partnerReview?.answers ?? []),
      ]
      if (
        answers.some(
          (item) =>
            item.prompt_id === 'appreciate' && item.answer.trim().length > 0,
        )
      ) {
        firstAppreciationDate = week.weekEnd
        break
      }
    }

    const firstSevenDate = mineDays[6] ?? null
    const firstGoalDate = completed
      .map((goal) => goal.completed_at ?? goal.created_at)
      .sort()[0] ?? null

    return milestonesFrom({
      firstRevealDate,
      firstAppreciationDate,
      firstRepairDate,
      checkInCount: mineDays.length,
      firstSevenDate,
      firstReviewDate,
      firstGoalDate,
    })
  }, [completed, days, weeks])

  return {
    milestones,
    earnedCount: milestones.filter((item) => item.earnedOn).length,
    isLoading: daysLoading || weeksLoading || goalsLoading,
  }
}
