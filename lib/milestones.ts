export type MilestoneId =
  | 'first_reveal'
  | 'first_appreciation'
  | 'first_repair'
  | 'seven_days'
  | 'first_review'
  | 'first_goal'
  | 'first_shared_action'

export type Milestone = {
  id: MilestoneId
  title: string
  body: string
  earnedOn: string | null
}

export const MILESTONES: Array<Omit<Milestone, 'earnedOn'>> = [
  {
    id: 'first_reveal',
    title: 'First mutual reveal',
    body: 'You both showed up on the same day and opened it together.',
  },
  {
    id: 'first_appreciation',
    title: 'First appreciation shared',
    body: 'You named something they did that you were grateful for.',
  },
  {
    id: 'first_repair',
    title: 'First difficult-day repair',
    body: 'A distant day still got a check-in from both of you.',
  },
  {
    id: 'seven_days',
    title: 'Seven days of honest reflection',
    body: 'Seven check-ins, even if they were not in a row.',
  },
  {
    id: 'first_review',
    title: 'First weekly review completed',
    body: 'You both finished a week’s reflection.',
  },
  {
    id: 'first_goal',
    title: 'First shared goal achieved',
    body: 'You marked a goal you set together as done.',
  },
  {
    id: 'first_shared_action',
    title: 'First small action completed',
    body: 'You both followed through on one small thing.',
  },
]

export type MilestoneInput = {
  firstRevealDate: string | null
  firstAppreciationDate: string | null
  firstRepairDate: string | null
  checkInCount: number
  firstSevenDate: string | null
  firstReviewDate: string | null
  firstGoalDate: string | null
  firstSharedActionDate: string | null
}

export function milestonesFrom(input: MilestoneInput): Milestone[] {
  const earned: Record<MilestoneId, string | null> = {
    first_reveal: input.firstRevealDate,
    first_appreciation: input.firstAppreciationDate,
    first_repair: input.firstRepairDate,
    seven_days: input.checkInCount >= 7 ? input.firstSevenDate : null,
    first_review: input.firstReviewDate,
    first_goal: input.firstGoalDate,
    first_shared_action: input.firstSharedActionDate,
  }

  return MILESTONES.map((item) => ({
    ...item,
    earnedOn: earned[item.id],
  }))
}
