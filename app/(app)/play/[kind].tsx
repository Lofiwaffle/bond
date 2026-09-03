import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

import {
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useCouplePlays, type PlayWithAnswers } from '../../../hooks/useCouplePlay'
import { useAuth } from '../../../lib/auth'
import {
  DATE_WHEN_TIMES,
  DATE_WHERE_SUGGESTIONS,
  datePlanCalendarEvent,
  datePlanLabel,
  datePlanReady,
  upcomingDateChips,
  type DateWhenTime,
  normalizeDatePlan,
} from '../../../lib/datePlan'
import { openGoogleCalendarEvent } from '../../../lib/googleCalendar'
import { Icon, type IconName } from '../../../lib/icons'
import {
  APPRECIATION_FIELDS,
  CHALLENGES,
  DATE_DECK,
  DREAM_CATEGORIES,
  KNOW_ME_QUESTIONS,
  REPAIR_CONSENT,
  REPAIR_STEPS,
  RITUAL_TEMPLATES,
  overlapStrings,
  playKindFromRoute,
  playMeta,
  type DreamCategoryId,
} from '../../../lib/plays'
import { useToast } from '../../../lib/toast'
import { colors, fonts, hairlineWidth, radii, type } from '../../../lib/theme'
import type { Json, Ritual } from '../../../types/database'

const REPAIR_CONSENT_KEY = 'bond:repair-consent'

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string
  icon?: IconName
  selected?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? (
        <Icon name={icon} size={14} color={selected ? colors.onAccent : colors.ink} />
      ) : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  )
}

export default function PlayScreen() {
  const params = useLocalSearchParams<{ kind?: string | string[] }>()
  const kindParam = Array.isArray(params.kind) ? params.kind[0] : params.kind
  const kind = playKindFromRoute(kindParam)
  const { profile, partner, isLoading: authLoading } = useAuth()
  const plays = useCouplePlays()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState<boolean | null>(kind === 'repair' ? null : true)

  useEffect(() => {
    if (kind !== 'repair') {
      setConsent(true)
      return
    }
    let cancelled = false
    void AsyncStorage.getItem(REPAIR_CONSENT_KEY).then((value) => {
      if (!cancelled) setConsent(value === 'true')
    })
    return () => {
      cancelled = true
    }
  }, [kind])

  if (authLoading || plays.isLoading || (kind === 'repair' && consent === null)) {
    return <LoadingScreen />
  }
  if (!kind) return <Redirect href="/(app)/(tabs)" />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const meta = playMeta(kind)
  const partnerName = partner?.display_name?.trim() || 'your person'
  const play = plays.openOfKind(kind) ?? plays.latestByKind.get(kind) ?? null

  const onStart = async (prompt?: Json) => {
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await plays.startOrOpen(kind, prompt)
    setBusy(false)
    if (result.error) setError(result.error)
  }

  const onAnswer = async (payload: Json) => {
    if (busy || !play) return
    setBusy(true)
    setError(null)
    const result = await plays.answer(play.id, payload)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    showToast('Saved. Private until they finish too.')
  }

  const onSubmitDatePlan = async (payload: Json) => {
    if (busy) return
    const plan = normalizeDatePlan(payload)
    if (!plan) {
      setError('Choose what, when, and where first.')
      return
    }
    setBusy(true)
    setError(null)
    let current = plays.openOfKind('choose_date')
    if (!current) {
      const started = await plays.startOrOpen('choose_date')
      if (started.error || !started.data) {
        setBusy(false)
        setError(started.error ?? 'Could not start this date.')
        return
      }
      current = started.data
    }
    const result = await plays.answer(current.id, payload)
    if (result.error) {
      setBusy(false)
      setError(result.error)
      return
    }
    const calendar = await openGoogleCalendarEvent(datePlanCalendarEvent(plan))
    setBusy(false)
    if (calendar.error) {
      showToast(calendar.error)
      return
    }
    showToast('Saved. Calendar opened for that day.')
  }

  return (
    <Screen keyboard>
      <TextLink label="Back" onPress={() => router.back()} />
      <View style={styles.hero}>
        <View style={styles.glyph}>
          <Icon name={meta.icon} size={22} color={colors.accentFill} />
        </View>
        <Text style={styles.title}>{meta.title}</Text>
      </View>

      {kind === 'repair' && !consent ? (
        <RepairConsent
          onAgree={() => {
            void AsyncStorage.setItem(REPAIR_CONSENT_KEY, 'true')
            setConsent(true)
          }}
        />
      ) : kind === 'ritual' ? (
        <RitualPlay
          rituals={plays.rituals}
          busy={busy}
          error={error}
          onCreate={async (input) => {
            setBusy(true)
            setError(null)
            const result = await plays.createRitual(input)
            setBusy(false)
            if (result.error) setError(result.error)
            else showToast('Ritual saved for both of you.')
          }}
          onComplete={async (ritual) => {
            setBusy(true)
            setError(null)
            const result = await plays.completeRitual(ritual)
            setBusy(false)
            if (result.error) setError(result.error)
            else showToast('Logged. Keep it light.')
          }}
        />
      ) : (
        <KindPlay
          kind={kind}
          play={play}
          partnerName={partnerName}
          userId={plays.userId ?? ''}
          busy={busy}
          error={error || plays.error}
          onStart={onStart}
          onAnswer={onAnswer}
          onSubmitDatePlan={onSubmitDatePlan}
        />
      )}
    </Screen>
  )
}

function KindPlay({
  kind,
  play,
  partnerName,
  userId,
  busy,
  error,
  onStart,
  onAnswer,
  onSubmitDatePlan,
}: {
  kind: NonNullable<ReturnType<typeof playKindFromRoute>>
  play: PlayWithAnswers | null
  partnerName: string
  userId: string
  busy: boolean
  error: string | null
  onStart: (prompt?: Json) => Promise<void>
  onAnswer: (payload: Json) => Promise<void>
  onSubmitDatePlan: (payload: Json) => Promise<void>
}) {
  if (!play && kind === 'choose_date') {
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <DateAnswer busy={busy} error={error} onSubmit={onSubmitDatePlan} />
      </ScrollView>
    )
  }

  if (!play) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>
          Both of you answer privately. Answers open together. Nothing leaves this Bond.
        </Text>
        {kind === 'challenge' ? (
          <ChallengePicker busy={busy} error={error} onPick={(prompt) => void onStart(prompt)} />
        ) : (
          <>
            <ErrorText message={error} />
            <PrimaryButton
              label={busy ? 'Starting…' : 'Start'}
              onPress={() => void onStart()}
              loading={busy}
            />
          </>
        )}
      </ScrollView>
    )
  }

  const revealed = Boolean(play.revealed_at && play.mine && play.partner)
  if (play.mine && !revealed) {
    return (
      <View>
        <Text style={styles.body}>
          Your answer is safe. {partnerName} will not see it until they finish too.
        </Text>
        <ErrorText message={error} />
      </View>
    )
  }
  if (revealed) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Reveal kind={kind} play={play} partnerName={partnerName} userId={userId} />
        {kind === 'memory' ? (
          <Text style={styles.hint}>This stays in your private memory collection.</Text>
        ) : null}
        <TextLink
          label="Start another round"
          onPress={() => void onStart()}
        />
      </ScrollView>
    )
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {kind === 'know_me' ? (
        <KnowMeAnswer play={play} userId={userId} partnerName={partnerName} busy={busy} error={error} onAnswer={onAnswer} />
      ) : kind === 'choose_date' ? (
        <DateAnswer busy={busy} error={error} onSubmit={onSubmitDatePlan} />
      ) : kind === 'appreciation' ? (
        <AppreciationAnswer busy={busy} error={error} onAnswer={onAnswer} />
      ) : kind === 'memory' ? (
        <MemoryAnswer play={play} busy={busy} error={error} onAnswer={onAnswer} />
      ) : kind === 'dreams' ? (
        <DreamsAnswer busy={busy} error={error} onAnswer={onAnswer} />
      ) : kind === 'challenge' ? (
        <ChallengeAnswer play={play} busy={busy} error={error} onAnswer={onAnswer} />
      ) : (
        <RepairForm busy={busy} error={error} onAnswer={onAnswer} />
      )}
    </ScrollView>
  )
}

function KnowMeAnswer({
  play,
  userId,
  partnerName,
  busy,
  error,
  onAnswer,
}: {
  play: PlayWithAnswers
  userId: string
  partnerName: string
  busy: boolean
  error: string | null
  onAnswer: (payload: Json) => Promise<void>
}) {
  const prompt = asRecord(play.prompt)
  const question =
    KNOW_ME_QUESTIONS.find((item) => item.id === asString(prompt.id)) ??
    KNOW_ME_QUESTIONS[0]
  const iAmSubject = play.created_by === userId
  const [choice, setChoice] = useState<string | null>(null)
  return (
    <View>
      <Text style={styles.kicker}>{iAmSubject ? 'Your preference' : `Guess for ${partnerName}`}</Text>
      <Text style={styles.sectionTitle}>{question.text}</Text>
      <View style={styles.chipWrap}>
        {question.options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={choice === option}
            onPress={() => setChoice(option)}
          />
        ))}
      </View>
      <ErrorText message={error} />
      <PrimaryButton
        label="Save privately"
        disabled={!choice}
        loading={busy}
        onPress={() =>
          void onAnswer(
            iAmSubject
              ? ({ option: choice } as unknown as Json)
              : ({ guess: choice } as unknown as Json),
          )
        }
      />
    </View>
  )
}

function DateAnswer({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean
  error: string | null
  onSubmit: (payload: Json) => Promise<void>
}) {
  const days = upcomingDateChips()
  const [whatId, setWhatId] = useState<string | null>(null)
  const [whatCustom, setWhatCustom] = useState('')
  const [when, setWhen] = useState('')
  const [whenCustom, setWhenCustom] = useState('')
  const [whenTime, setWhenTime] = useState<DateWhenTime>('evening')
  const [wherePick, setWherePick] = useState<string | null>(null)
  const [whereCustom, setWhereCustom] = useState('')
  const [why, setWhy] = useState('')

  const what = whatCustom.trim() || DATE_DECK.find((idea) => idea.id === whatId)?.label || ''
  const where = whereCustom.trim() || wherePick || ''
  const ready = datePlanReady({ what, when, where })

  return (
    <View>
      <Text style={styles.body}>
        Answers stay private until you both submit. Submit also puts this date on the
        calendar.
      </Text>

      <Text style={styles.kicker}>What are we doing</Text>
      <View style={styles.chipWrap}>
        {DATE_DECK.map((idea) => (
          <Chip
            key={idea.id}
            label={idea.label}
            icon={idea.icon}
            selected={!whatCustom.trim() && whatId === idea.id}
            onPress={() => {
              setWhatId(idea.id)
              setWhatCustom('')
            }}
          />
        ))}
      </View>
      <Field
        value={whatCustom}
        onChangeText={setWhatCustom}
        placeholder="Or write your own"
        accessibilityLabel="What are we doing, write your own"
        autoCapitalize="sentences"
      />

      <Text style={styles.kicker}>When</Text>
      <View style={styles.chipWrap}>
        {days.map((day) => (
          <Chip
            key={day.iso}
            label={day.label}
            selected={!whenCustom.trim() && when === day.iso}
            onPress={() => {
              setWhen(day.iso)
              setWhenCustom('')
            }}
          />
        ))}
      </View>
      <View style={styles.chipWrap}>
        {DATE_WHEN_TIMES.map((slot) => (
          <Chip
            key={slot.id}
            label={slot.label}
            selected={whenTime === slot.id}
            onPress={() => setWhenTime(slot.id)}
          />
        ))}
      </View>
      <Field
        value={whenCustom}
        onChangeText={(text) => {
          setWhenCustom(text)
          if (/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) setWhen(text.trim())
        }}
        placeholder="Or another day (YYYY-MM-DD)"
        accessibilityLabel="Another day, year month day"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.kicker}>Where</Text>
      <View style={styles.chipWrap}>
        {DATE_WHERE_SUGGESTIONS.map((place) => (
          <Chip
            key={place}
            label={place}
            selected={!whereCustom.trim() && wherePick === place}
            onPress={() => {
              setWherePick(place)
              setWhereCustom('')
            }}
          />
        ))}
      </View>
      <Field
        value={whereCustom}
        onChangeText={setWhereCustom}
        placeholder="Or write your own"
        accessibilityLabel="Where, write your own"
        autoCapitalize="sentences"
      />

      <Text style={styles.kicker}>Why</Text>
      <Field
        value={why}
        onChangeText={setWhy}
        placeholder="Why this date, for the two of you"
        accessibilityLabel="Why this date"
        autoCapitalize="sentences"
        multiline
        style={styles.multiline}
      />

      <ErrorText message={error} />
      <PrimaryButton
        label={busy ? 'Submitting…' : 'Submit'}
        disabled={!ready}
        loading={busy}
        onPress={() =>
          void onSubmit({
            what,
            when,
            whenTime,
            where,
            why: why.trim(),
          } as unknown as Json)
        }
      />
    </View>
  )
}

function AppreciationAnswer({
  busy,
  error,
  onAnswer,
}: {
  busy: boolean
  error: string | null
  onAnswer: (payload: Json) => Promise<void>
}) {
  const [fields, setFields] = useState({ noticed: '', appreciated: '', forward: '' })
  return (
    <View>
      <Text style={styles.body}>Three minutes. Specific is kinder than grand.</Text>
      {APPRECIATION_FIELDS.map((field) => (
        <View key={field.id} style={styles.block}>
          <Text style={styles.kicker}>{field.label}</Text>
          <Field
            value={fields[field.id]}
            onChangeText={(text) => setFields((prev) => ({ ...prev, [field.id]: text }))}
            placeholder={field.placeholder}
            accessibilityLabel={field.label}
            autoCapitalize="sentences"
            multiline
            style={styles.multiline}
          />
        </View>
      ))}
      <ErrorText message={error} />
      <PrimaryButton
        label="Save privately"
        disabled={!fields.noticed.trim() && !fields.appreciated.trim() && !fields.forward.trim()}
        loading={busy}
        onPress={() => void onAnswer(fields as unknown as Json)}
      />
    </View>
  )
}

function MemoryAnswer({
  play,
  busy,
  error,
  onAnswer,
}: {
  play: PlayWithAnswers
  busy: boolean
  error: string | null
  onAnswer: (payload: Json) => Promise<void>
}) {
  const [text, setText] = useState('')
  const prompt = asRecord(play.prompt)
  return (
    <View>
      <Text style={styles.sectionTitle}>{asString(prompt.text) || 'A day to keep'}</Text>
      <Field
        value={text}
        onChangeText={setText}
        placeholder="A few sentences"
        accessibilityLabel="Memory"
        autoCapitalize="sentences"
        multiline
        style={styles.multiline}
      />
      <ErrorText message={error} />
      <PrimaryButton
        label="Save privately"
        disabled={!text.trim()}
        loading={busy}
        onPress={() => void onAnswer({ text: text.trim() } as unknown as Json)}
      />
    </View>
  )
}

function DreamsAnswer({
  busy,
  error,
  onAnswer,
}: {
  busy: boolean
  error: string | null
  onAnswer: (payload: Json) => Promise<void>
}) {
  const [picks, setPicks] = useState<Record<DreamCategoryId, string[]>>({
    travel: [],
    home: [],
    family: [],
    finances: [],
    lifestyle: [],
  })
  const toggle = (category: DreamCategoryId, option: string) => {
    setPicks((prev) => {
      const current = prev[category]
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
      return { ...prev, [category]: next }
    })
  }
  return (
    <View>
      <Text style={styles.body}>Choose wishes in each area. You will only see overlap.</Text>
      {DREAM_CATEGORIES.map((category) => (
        <View key={category.id} style={styles.block}>
          <Text style={styles.kicker}>{category.label}</Text>
          <View style={styles.chipWrap}>
            {category.options.map((option) => (
              <Chip
                key={option}
                label={option}
                icon={category.icon}
                selected={picks[category.id].includes(option)}
                onPress={() => toggle(category.id, option)}
              />
            ))}
          </View>
        </View>
      ))}
      <ErrorText message={error} />
      <PrimaryButton
        label="Save privately"
        loading={busy}
        onPress={() => void onAnswer(picks as unknown as Json)}
      />
    </View>
  )
}

function ChallengeAnswer({
  play,
  busy,
  error,
  onAnswer,
}: {
  play: PlayWithAnswers
  busy: boolean
  error: string | null
  onAnswer: (payload: Json) => Promise<void>
}) {
  const prompt = asRecord(play.prompt)
  const mission =
    CHALLENGES.find((item) => item.id === asString(prompt.id)) ?? CHALLENGES[0]
  return (
    <View>
      <Text style={styles.sectionTitle}>{mission.label}</Text>
      <Text style={styles.body}>Mark that you are in. It opens when they are in too.</Text>
      <ErrorText message={error} />
      <PrimaryButton
        label="I'm in"
        loading={busy}
        onPress={() => void onAnswer({ accepted: true } as unknown as Json)}
      />
    </View>
  )
}

function Reveal({
  kind,
  play,
  partnerName,
  userId,
}: {
  kind: NonNullable<ReturnType<typeof playKindFromRoute>>
  play: PlayWithAnswers
  partnerName: string
  userId: string
}) {
  const prompt = asRecord(play.prompt)
  const mine = asRecord(play.mine?.payload)
  const theirs = asRecord(play.partner?.payload)

  if (kind === 'know_me') {
    const question =
      KNOW_ME_QUESTIONS.find((item) => item.id === asString(prompt.id)) ??
      KNOW_ME_QUESTIONS[0]
    const iAmSubject = play.created_by === userId
    const truth = iAmSubject ? asString(mine.option) : asString(theirs.option)
    const guess = iAmSubject ? asString(theirs.guess) : asString(mine.guess)
    const match = Boolean(truth && guess && truth === guess)
    return (
      <View>
        <Text style={styles.kicker}>{question.text}</Text>
        <Text style={styles.sectionTitle}>
          {match ? 'Match point' : 'Not a match this time'}
        </Text>
        <Text style={styles.body}>Preference: {truth || '—'}</Text>
        <Text style={styles.body}>Guess: {guess || '—'}</Text>
      </View>
    )
  }

  if (kind === 'choose_date') {
    const myPlan = normalizeDatePlan(mine)
    const theirPlan = normalizeDatePlan(theirs)
    if (myPlan || theirPlan) {
      return (
        <SideBySide
          mineLabel="You"
          theirLabel={partnerName}
          rows={[
            {
              label: 'What are we doing',
              mine: myPlan?.what ?? '',
              theirs: theirPlan?.what ?? '',
            },
            {
              label: 'When',
              mine: myPlan ? datePlanLabel(myPlan.when, myPlan.whenTime) : '',
              theirs: theirPlan ? datePlanLabel(theirPlan.when, theirPlan.whenTime) : '',
            },
            {
              label: 'Where',
              mine: myPlan?.where ?? '',
              theirs: theirPlan?.where ?? '',
            },
            {
              label: 'Why',
              mine: myPlan?.why ?? '',
              theirs: theirPlan?.why ?? '',
            },
          ]}
        />
      )
    }
    const overlap = overlapStrings(asStrings(mine.picks), asStrings(theirs.picks))
    return (
      <View>
        <Text style={styles.sectionTitle}>Your matches</Text>
        {overlap.length === 0 ? (
          <Text style={styles.body}>No overlap this round.</Text>
        ) : (
          <View style={styles.chipWrap}>
            {overlap.map((id) => {
              const idea = DATE_DECK.find((item) => item.id === id)
              return (
                <View key={id} style={styles.chip}>
                  {idea ? <Icon name={idea.icon} size={14} color={colors.ink} /> : null}
                  <Text style={styles.chipLabel}>{idea?.label ?? id}</Text>
                </View>
              )
            })}
          </View>
        )}
      </View>
    )
  }

  if (kind === 'appreciation') {
    return (
      <View>
        <SideBySide
          mineLabel="You"
          theirLabel={partnerName}
          rows={APPRECIATION_FIELDS.map((field) => ({
            label: field.label,
            mine: asString(mine[field.id]),
            theirs: asString(theirs[field.id]),
          }))}
        />
      </View>
    )
  }

  if (kind === 'memory') {
    return (
      <View>
        <Text style={styles.kicker}>{asString(prompt.text)}</Text>
        <SideBySide
          mineLabel="You"
          theirLabel={partnerName}
          rows={[
            {
              label: 'Memory',
              mine: asString(mine.text),
              theirs: asString(theirs.text),
            },
          ]}
        />
      </View>
    )
  }

  if (kind === 'dreams') {
    return (
      <View>
        <Text style={styles.sectionTitle}>Overlap</Text>
        {DREAM_CATEGORIES.map((category) => {
          const overlap = overlapStrings(
            asStrings(mine[category.id]),
            asStrings(theirs[category.id]),
          )
          return (
            <View key={category.id} style={styles.block}>
              <Text style={styles.kicker}>{category.label}</Text>
              {overlap.length ? (
                <View style={styles.chipWrap}>
                  {overlap.map((label) => (
                    <View key={label} style={styles.chip}>
                      <Icon name={category.icon} size={14} color={colors.ink} />
                      <Text style={styles.chipLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.hint}>No overlap here.</Text>
              )}
            </View>
          )
        })}
      </View>
    )
  }

  if (kind === 'challenge') {
    const mission =
      CHALLENGES.find((item) => item.id === asString(prompt.id)) ?? CHALLENGES[0]
    return (
      <View>
        <Text style={styles.sectionTitle}>You are both in</Text>
        <Text style={styles.body}>{mission.label}</Text>
      </View>
    )
  }

  return (
    <SideBySide
      mineLabel="You"
      theirLabel={partnerName}
      rows={REPAIR_STEPS.map((step) => ({
        label: step.title,
        mine: asString(mine[step.id]),
        theirs: asString(theirs[step.id]),
      }))}
    />
  )
}

function SideBySide({
  mineLabel,
  theirLabel,
  rows,
}: {
  mineLabel: string
  theirLabel: string
  rows: { label: string; mine: string; theirs: string }[]
}) {
  return (
    <View>
      {rows.map((row) => (
        <View key={row.label} style={styles.block}>
          <Text style={styles.kicker}>{row.label}</Text>
          <Text style={styles.sideName}>{mineLabel}</Text>
          <Text style={styles.body}>{row.mine || '—'}</Text>
          <Text style={styles.sideName}>{theirLabel}</Text>
          <Text style={styles.body}>{row.theirs || '—'}</Text>
        </View>
      ))}
    </View>
  )
}

function ChallengePicker({
  busy,
  error,
  onPick,
}: {
  busy: boolean
  error: string | null
  onPick: (prompt: Json) => void
}) {
  return (
    <View>
      <Text style={styles.body}>Pick a small mission. They will see it when they open this too.</Text>
      {CHALLENGES.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => onPick({ id: item.id, label: item.label } as unknown as Json)}
          style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
        >
          <View style={styles.glyphSmall}>
            <Icon name={item.icon} size={16} color={colors.accentFill} />
          </View>
          <Text style={styles.listTitle}>{item.label}</Text>
        </Pressable>
      ))}
      <ErrorText message={error} />
      {busy ? <Text style={styles.hint}>Starting…</Text> : null}
    </View>
  )
}

function RitualPlay({
  rituals,
  busy,
  error,
  onCreate,
  onComplete,
}: {
  rituals: Ritual[]
  busy: boolean
  error: string | null
  onCreate: (input: {
    name: string
    frequency: Ritual['frequency']
    description?: string
  }) => Promise<void>
  onComplete: (ritual: Ritual) => Promise<void>
}) {
  const [custom, setCustom] = useState('')
  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.body}>
        Recurring time that belongs to the two of you. Keep it small enough to repeat.
      </Text>
      <Text style={styles.kicker}>Start from a template</Text>
      {RITUAL_TEMPLATES.map((template) => (
        <Pressable
          key={template.id}
          accessibilityRole="button"
          accessibilityLabel={template.name}
          onPress={() =>
            void onCreate({
              name: template.name,
              frequency: template.frequency,
              description: template.description,
            })
          }
          style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
        >
          <View style={styles.glyphSmall}>
            <Icon name="repeat" size={16} color={colors.accentFill} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.listTitle}>{template.name}</Text>
            <Text style={styles.hint}>{template.description}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={styles.kicker}>Or name your own</Text>
      <Field
        value={custom}
        onChangeText={setCustom}
        placeholder="Sunday pancakes"
        accessibilityLabel="Custom ritual name"
        autoCapitalize="sentences"
      />
      <PrimaryButton
        label="Save ritual"
        disabled={!custom.trim()}
        loading={busy}
        onPress={() =>
          void onCreate({ name: custom.trim(), frequency: 'weekly' }).then(() =>
            setCustom(''),
          )
        }
      />
      <Text style={styles.kicker}>Yours</Text>
      {rituals.length === 0 ? (
        <Text style={styles.hint}>None yet.</Text>
      ) : (
        rituals.map((ritual) => (
          <View key={ritual.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.listTitle}>{ritual.name}</Text>
              <Text style={styles.hint}>
                {ritual.frequency}
                {ritual.streak ? ` · ${ritual.streak} in a row` : ''}
              </Text>
            </View>
            <TextLink label="We did it" onPress={() => void onComplete(ritual)} />
          </View>
        ))
      )}
      <ErrorText message={error} />
    </ScrollView>
  )
}

function RepairConsent({ onAgree }: { onAgree: () => void }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Optional, and gentle</Text>
      <Text style={styles.body}>{REPAIR_CONSENT}</Text>
      <PrimaryButton label="Continue" onPress={onAgree} />
      <TextLink label="Not now" onPress={() => router.back()} />
    </View>
  )
}

function RepairForm({
  busy,
  error,
  onAnswer,
}: {
  busy: boolean
  error: string | null
  onAnswer: (payload: Json) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [fields, setFields] = useState<Record<string, string>>({
    pause: '',
    describe: '',
    feelings: '',
    responsibility: '',
    next: '',
  })
  const current = REPAIR_STEPS[step]
  const last = step === REPAIR_STEPS.length - 1
  return (
    <View>
      <Text style={styles.kicker}>
        {step + 1} of {REPAIR_STEPS.length}
      </Text>
      <Text style={styles.sectionTitle}>{current.title}</Text>
      <Text style={styles.body}>{current.body}</Text>
      <Field
        value={fields[current.id]}
        onChangeText={(text) => setFields((prev) => ({ ...prev, [current.id]: text }))}
        placeholder={current.prompt}
        accessibilityLabel={current.title}
        autoCapitalize="sentences"
        multiline
        style={styles.multiline}
      />
      <ErrorText message={error} />
      {last ? (
        <PrimaryButton
          label="Save privately"
          loading={busy}
          onPress={() => void onAnswer(fields as unknown as Json)}
        />
      ) : (
        <PrimaryButton
          label="Next"
          onPress={() => setStep((value) => value + 1)}
        />
      )}
      {step > 0 ? (
        <TextLink label="Back a step" onPress={() => setStep((value) => value - 1)} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.heading,
    flex: 1,
    marginBottom: 0,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 8,
  },
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    ...type.body,
    marginBottom: 12,
  },
  hint: {
    ...type.label,
    marginBottom: 8,
  },
  block: {
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
  },
  chipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  chipLabelOn: {
    color: colors.onAccent,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  listTitle: {
    ...type.body,
    fontFamily: fonts.medium,
    fontWeight: '500',
    marginBottom: 0,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  sideName: {
    ...type.label,
    marginBottom: 2,
  },
})
