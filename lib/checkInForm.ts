import { MAX_ACTIVITIES, type ActivityId } from './activities'
import { DEVICE_ONLY_THOUGHTS, MUTUAL_REVEAL_BODY } from './privacy'
import { SCORE_LABELS } from './theme'

export const CHECK_IN_TITLE = "Today's check-in"
export const CHECK_IN_DURATION = 'About 1 minute.'
export const CONNECTION_QUESTION = 'How connected do you feel today?'
export const REFLECTION_PROMPT =
  'What shared moment from the last six months still makes you smile?'
export const REFLECTION_PROMPT_ID = 'p-smile'
export const REFLECTION_PLACEHOLDER = 'A few words, if you’d like…'
export const NO_WORDS_TODAY = 'No words today'
export const ACTIVITIES_HEADING = 'What shaped your day?'
export const ACTIVITIES_HELPER = 'Choose anything that shaped your day.'
export const OTHER_DETAIL_PLACEHOLDER = 'A few words about it…'
export const OTHER_DETAIL_LABEL = 'What else shaped your day?'
export const PRIVACY_ROW = 'Private until you both check in.'
export const PRIVACY_INFO_LABEL = 'More about privacy'
export const PRIVACY_DETAIL = `${MUTUAL_REVEAL_BODY} ${DEVICE_ONLY_THOUGHTS}`
export const SAVE_LABEL = 'Save check-in'
export const SAVE_CORRECTION_LABEL = 'Save correction'
export const SKIP_LABEL = 'Skip today'
export const KEEP_SAVED_LABEL = 'Keep what I saved'
export const CHOOSE_FEELING_FIRST = 'Choose how you’re feeling first.'
export const SAVED_HEADING = 'Check-in saved'
export const SAVED_BODY =
  'We’ll reveal your check-ins when you’ve both shared.'
export const SAVED_NEXT = 'Done'
export const DISCARD_TITLE = 'Leave this check-in?'
export const DISCARD_BODY =
  'What you typed stays on this device until you come back, unless you start over.'
export const DISCARD_CONFIRM = 'Leave'
export const DISCARD_STAY = 'Keep writing'
export const SAVE_ERROR = "Couldn't save just now. Try again."

export type CheckInFormState = {
  score: number | null
  promptAnswer: string
  noWords: boolean
  activities: ActivityId[]
  otherText: string
}

export const EMPTY_CHECK_IN_FORM: CheckInFormState = {
  score: null,
  promptAnswer: '',
  noWords: false,
  activities: [],
  otherText: '',
}

export function connectionLabel(score: number): string {
  return SCORE_LABELS[score] ?? `Connection ${score}`
}

export function connectionAccessibilityName(score: number): string {
  return connectionLabel(score)
}

export function isCheckInDirty(form: CheckInFormState): boolean {
  return (
    form.score != null ||
    form.promptAnswer.trim().length > 0 ||
    form.noWords ||
    form.activities.length > 0 ||
    form.otherText.trim().length > 0
  )
}

export function canSaveCheckIn(form: CheckInFormState): boolean {
  return form.score != null && form.score >= 1 && form.score <= 5
}

export function validateCheckIn(form: CheckInFormState): string | null {
  if (!canSaveCheckIn(form)) return CHOOSE_FEELING_FIRST
  return null
}

export function toggleActivity(
  current: ActivityId[],
  id: ActivityId,
  max = MAX_ACTIVITIES,
): ActivityId[] {
  if (current.includes(id)) return current.filter((item) => item !== id)
  if (current.length >= max) return current
  return [...current, id]
}

export function applyActivityToggle(
  form: CheckInFormState,
  id: ActivityId,
  max = MAX_ACTIVITIES,
): CheckInFormState {
  const activities = toggleActivity(form.activities, id, max)
  const otherOn = activities.includes('other')
  return {
    ...form,
    activities,
    otherText: otherOn ? form.otherText : '',
  }
}

export function applyNoWords(
  form: CheckInFormState,
  noWords: boolean,
): CheckInFormState {
  if (noWords) return { ...form, noWords: true, promptAnswer: '' }
  return { ...form, noWords: false }
}

export function applyPromptAnswer(
  form: CheckInFormState,
  text: string,
): CheckInFormState {
  return { ...form, noWords: false, promptAnswer: text }
}

export function promptAnswerForSubmit(form: CheckInFormState): string {
  if (form.noWords) return ''
  return form.promptAnswer.trim()
}

export function noteForSubmit(form: CheckInFormState): string {
  if (!form.activities.includes('other')) return ''
  return form.otherText.trim()
}

export function otherTextFromSaved(params: {
  activities: string[] | null | undefined
  note: string | null | undefined
  promptAnswer: string | null | undefined
}): string {
  if (!(params.activities ?? []).includes('other')) return ''
  const note = params.note?.trim() ?? ''
  if (!note) return ''
  if (note === params.promptAnswer?.trim()) return ''
  return note
}

export function saveButtonLabel(params: {
  editing: boolean
  queued: boolean
}): string {
  if (params.editing) return SAVE_CORRECTION_LABEL
  if (params.queued) return 'Update what will send'
  return SAVE_LABEL
}

export function formsEqual(a: CheckInFormState, b: CheckInFormState): boolean {
  const aActs = [...a.activities].sort().join(',')
  const bActs = [...b.activities].sort().join(',')
  return (
    a.score === b.score &&
    a.promptAnswer === b.promptAnswer &&
    a.noWords === b.noWords &&
    a.otherText === b.otherText &&
    aActs === bActs
  )
}

export const CONNECTION_SCORES = [1, 2, 3, 4, 5] as const
