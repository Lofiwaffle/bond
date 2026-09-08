/**
 * Check-in composer interaction logic.
 * Run: npx --yes tsx scripts/verify-checkin-composer.ts
 */
import { ACTIVITIES, MAX_ACTIVITIES } from '../lib/activities'
import {
  ACTIVITIES_HEADING,
  ACTIVITIES_HELPER,
  applyActivityToggle,
  applyNoWords,
  applyPromptAnswer,
  canSaveCheckIn,
  CHECK_IN_DURATION,
  CHECK_IN_TITLE,
  CHOOSE_FEELING_FIRST,
  CONNECTION_QUESTION,
  CONNECTION_SCORES,
  connectionAccessibilityName,
  EMPTY_CHECK_IN_FORM,
  formsEqual,
  isCheckInDirty,
  NO_WORDS_TODAY,
  noteForSubmit,
  otherTextFromSaved,
  PRIVACY_DETAIL,
  PRIVACY_ROW,
  promptAnswerForSubmit,
  REFLECTION_PLACEHOLDER,
  REFLECTION_PROMPT,
  SAVE_LABEL,
  SAVED_BODY,
  SAVED_HEADING,
  saveButtonLabel,
  SKIP_LABEL,
  toggleActivity,
  validateCheckIn,
  type CheckInFormState,
} from '../lib/checkInForm'
import { DEVICE_ONLY_THOUGHTS, MUTUAL_REVEAL_BODY } from '../lib/privacy'
import { SCORE_LABELS } from '../lib/theme'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('title', CHECK_IN_TITLE === "Today's check-in")
assert('duration', CHECK_IN_DURATION.includes('1 minute'))
assert('connection question', CONNECTION_QUESTION.includes('connected'))
assert('reflection prompt names six months', REFLECTION_PROMPT.includes('six months'))
assert('placeholder invites optional words', REFLECTION_PLACEHOLDER.includes('if you’d like'))
assert('activities heading', ACTIVITIES_HEADING.includes('shaped'))
assert('activities helper', ACTIVITIES_HELPER.includes('Choose anything'))
assert('privacy row is compact', PRIVACY_ROW === 'Private until you both check in.')
assert('privacy detail includes mutual reveal', PRIVACY_DETAIL.includes(MUTUAL_REVEAL_BODY))
assert(
  'privacy detail includes local-thought loss',
  PRIVACY_DETAIL.includes(DEVICE_ONLY_THOUGHTS),
)
assert('save label', SAVE_LABEL === 'Save check-in')
assert('skip label', SKIP_LABEL === 'Skip today')
assert('saved heading', SAVED_HEADING === 'Check-in saved')
assert('saved body names shared reveal', SAVED_BODY.includes('both shared'))

assert('far away', SCORE_LABELS[1] === 'Far away')
assert('distant', SCORE_LABELS[2] === 'Distant')
assert('steady', SCORE_LABELS[3] === 'Steady')
assert('close', SCORE_LABELS[4] === 'Close')
assert('very close', SCORE_LABELS[5] === 'Very close')
assert(
  'accessible names match labels',
  CONNECTION_SCORES.every((score) => connectionAccessibilityName(score) === SCORE_LABELS[score]),
)

let form: CheckInFormState = { ...EMPTY_CHECK_IN_FORM }
assert('empty is not dirty', isCheckInDirty(form) === false)
assert('empty cannot save', canSaveCheckIn(form) === false)
assert('empty validates with inline copy', validateCheckIn(form) === CHOOSE_FEELING_FIRST)

form = { ...form, score: 4 }
assert('score selection is dirty', isCheckInDirty(form))
assert('score enables save', canSaveCheckIn(form))
assert('score clears validation', validateCheckIn(form) === null)
assert('entered data survives failed validation check', form.score === 4)

form = applyPromptAnswer(form, 'Sunset on the porch')
assert('reflection is optional but kept', promptAnswerForSubmit(form) === 'Sunset on the porch')
form = applyNoWords(form, true)
assert('no words today clears text', form.promptAnswer === '' && form.noWords)
assert('no words submits empty answer', promptAnswerForSubmit(form) === '')
form = applyPromptAnswer(form, 'Sunset on the porch')
assert('writing again clears no-words', form.noWords === false)

form = applyActivityToggle(form, 'work')
form = applyActivityToggle(form, 'food')
form = applyActivityToggle(form, 'work')
assert('multi-select toggles work', form.activities.join(',') === 'food')
form = applyActivityToggle(form, 'other')
form = { ...form, otherText: 'A long walk' }
assert('other reveals stored text', noteForSubmit(form) === 'A long walk')
form = applyActivityToggle(form, 'other')
assert('deselecting other clears text', form.otherText === '' && noteForSubmit(form) === '')

const filled: CheckInFormState = {
  score: 5,
  promptAnswer: 'Camping in June',
  noWords: false,
  activities: ['home', 'other'],
  otherText: 'Board games',
}
assert('save payload keeps optional fields', promptAnswerForSubmit(filled) === 'Camping in June')
assert('other note is separate from reflection', noteForSubmit(filled) === 'Board games')
assert(
  'other restores from saved note',
  otherTextFromSaved({
    activities: ['other'],
    note: 'Board games',
    promptAnswer: 'Camping in June',
  }) === 'Board games',
)
assert(
  'legacy note is not treated as other when other is off',
  otherTextFromSaved({
    activities: ['home'],
    note: 'old answer',
    promptAnswer: null,
  }) === '',
)

assert('skip stays available without a score', SKIP_LABEL.length > 0)
assert(
  'save button stays save for a new check-in',
  saveButtonLabel({ editing: false, queued: false }) === SAVE_LABEL,
)
assert(
  'queued save is an update',
  saveButtonLabel({ editing: false, queued: true }) === 'Update what will send',
)

const eight = ACTIVITIES.map((item) => item.id)
assert('all eight activities can be chosen', eight.length === MAX_ACTIVITIES)
let many = EMPTY_CHECK_IN_FORM.activities
for (const id of eight) many = toggleActivity(many, id)
assert('toggle accepts every chip', many.length === 8)
assert(
  'toggle does not exceed max',
  toggleActivity(['sports', 'work'], 'food', 2).join(',') === 'sports,work',
)

assert(
  'formsEqual ignores activity order',
  formsEqual(
    { ...filled, activities: ['other', 'home'] },
    filled,
  ),
)

assert('no-words control stays quiet copy', NO_WORDS_TODAY === 'No words today')
assert('reflection field is inline', REFLECTION_PLACEHOLDER.startsWith('A few words'))

console.log('verify-checkin-composer: ok')
