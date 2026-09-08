import { useState } from 'react'
import { Redirect } from 'expo-router'

import { CheckInComposer, CheckInSaved } from '../components/CheckInComposer'
import { Screen } from '../components/ui'
import {
  EMPTY_CHECK_IN_FORM,
  canSaveCheckIn,
  validateCheckIn,
  type CheckInFormState,
} from '../lib/checkInForm'
import { formatDisplayDate, localDateString } from '../lib/dates'

/** Dev-only sandbox so the composer can be exercised without pairing. */
export default function CheckInPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />

  const [form, setForm] = useState<CheckInFormState>(EMPTY_CHECK_IN_FORM)
  const [saved, setSaved] = useState(false)
  const [feelingError, setFeelingError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (saved) {
    return (
      <Screen style={styles.screen} keyboard>
        <CheckInSaved onDone={() => setSaved(false)} />
      </Screen>
    )
  }

  return (
    <Screen style={styles.screen} keyboard>
      <CheckInComposer
        dateLabel={formatDisplayDate(localDateString())}
        form={form}
        onChange={(next) => {
          setForm(next)
          if (feelingError && canSaveCheckIn(next)) {
            setFeelingError(false)
            setError(null)
          }
        }}
        onClose={() => undefined}
        onSave={() => {
          const invalid = validateCheckIn(form)
          if (invalid) {
            setFeelingError(true)
            setError(invalid)
            return
          }
          setSaved(true)
        }}
        onSkip={() => undefined}
        error={error}
        feelingError={feelingError}
      />
    </Screen>
  )
}

const styles = {
  screen: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
}
