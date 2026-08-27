import { useEffect, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import {
  ErrorText,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../components/ui'
import { useBondPlus } from '../../hooks/useBondPlus'
import {
  APPLE_STANDARD_EULA,
  PLUS_CHECKOUT_PENDING,
  PLUS_COUPLE_BILLING,
  PLUS_FEATURES,
  PLUS_FREE_LINES,
  PLUS_LEGAL,
  PLUS_NAME,
  PLUS_PAID_CHECKOUT_READY,
  PLUS_PRODUCTS,
  PLUS_SUBTITLE,
  PLUS_TRIAL_COPY,
  PLUS_TRUST_LINE,
  PLUS_UNPAIR_COPY,
  type PlusProductId,
} from '../../lib/bondPlus'
import { PRIVACY_POLICY_URL } from '../../lib/appUrls'
import { colors, hairlineWidth, type } from '../../lib/theme'

export default function BondPlusScreen() {
  const plus = useBondPlus()
  const [busy, setBusy] = useState<PlusProductId | 'trial' | 'restore' | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void plus.markPreviewViewed()
  }, [plus.markPreviewViewed])

  if (plus.isLoading) return <LoadingScreen />

  const founding = PLUS_PRODUCTS.find((p) => p.id === 'bond_plus_founding_annual')
  const monthly = PLUS_PRODUCTS.find((p) => p.id === 'bond_plus_monthly')
  const annual = PLUS_PRODUCTS.find((p) => p.id === 'bond_plus_annual')
  const showFounding =
    Boolean(founding) && plus.foundingSlotsRemaining > 0 && !plus.active

  const onTrial = async () => {
    if (busy) return
    setError(null)
    setBusy('trial')
    const result = await plus.startTrial()
    setBusy(null)
    if (result.error) {
      setError(result.error)
      return
    }
    router.back()
  }

  const onBuy = async (id: PlusProductId) => {
    if (busy) return
    setError(null)
    setBusy(id)
    const result = await plus.purchase(id)
    setBusy(null)
    if (result.error) setError(result.error)
  }

  const onRestore = async () => {
    if (busy) return
    setError(null)
    setBusy('restore')
    const result = await plus.restore()
    setBusy(null)
    if (result.error) setError(result.error)
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>For both of you</Text>
        <Text style={styles.title}>{PLUS_NAME}</Text>
        <Text style={styles.subtitle}>{PLUS_SUBTITLE}</Text>
        <Text style={styles.trust}>{PLUS_TRUST_LINE}</Text>
        <Text style={styles.body}>{PLUS_COUPLE_BILLING}</Text>
        <Text style={styles.body}>{PLUS_TRIAL_COPY}</Text>

        {plus.active ? (
          <Text style={styles.status}>
            {plus.status === 'trialing'
              ? 'Trial is on for this Bond.'
              : plus.status === 'grace'
                ? 'Billing is in a grace period. Plus stays on.'
                : 'Bond Plus is on for this Bond.'}
          </Text>
        ) : null}

        {plus.trialEligible ? (
          <PrimaryButton
            label={busy === 'trial' ? 'Starting…' : 'Start 14-day trial'}
            onPress={() => void onTrial()}
            loading={busy === 'trial'}
            disabled={Boolean(busy)}
          />
        ) : plus.mutualReveals < 3 ? (
          <Text style={styles.hint}>
            The trial opens after three days you both reveal. You have{' '}
            {plus.mutualReveals}.
          </Text>
        ) : null}

        {PLUS_PAID_CHECKOUT_READY ? (
          <>
            {showFounding && founding ? (
              <View style={styles.plan}>
                <Text style={styles.planTitle}>{founding.title}</Text>
                <Text style={styles.planPrice}>
                  {founding.priceLabel} · {founding.periodLabel}
                </Text>
                <Text style={styles.hint}>
                  {plus.foundingSlotsRemaining} of 250 Founding Couple spots left.
                </Text>
                <TextLink
                  label={
                    busy === founding.id ? 'Opening…' : 'Choose Founding Couple'
                  }
                  onPress={() => void onBuy(founding.id)}
                  disabled={Boolean(busy)}
                />
              </View>
            ) : null}

            {annual ? (
              <View style={styles.plan}>
                <Text style={styles.planTitle}>{annual.title}</Text>
                <Text style={styles.planPrice}>
                  {annual.priceLabel} · {annual.periodLabel}
                </Text>
                <TextLink
                  label={busy === annual.id ? 'Opening…' : 'Choose yearly'}
                  onPress={() => void onBuy(annual.id)}
                  disabled={Boolean(busy)}
                />
              </View>
            ) : null}

            {monthly ? (
              <View style={styles.plan}>
                <Text style={styles.planTitle}>{monthly.title}</Text>
                <Text style={styles.planPrice}>
                  {monthly.priceLabel} · {monthly.periodLabel}
                </Text>
                <TextLink
                  label={busy === monthly.id ? 'Opening…' : 'Choose monthly'}
                  onPress={() => void onBuy(monthly.id)}
                  disabled={Boolean(busy)}
                />
              </View>
            ) : null}

            <TextLink
              label={busy === 'restore' ? 'Restoring…' : 'Restore purchase'}
              onPress={() => void onRestore()}
              disabled={Boolean(busy)}
            />
          </>
        ) : (
          <Text style={styles.hint}>{PLUS_CHECKOUT_PENDING}</Text>
        )}
        <ErrorText message={error ?? plus.error} />

        <Text style={styles.section}>Included</Text>
        {Object.values(PLUS_FEATURES).map((item) => (
          <View key={item.title} style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowBody}>{item.body}</Text>
          </View>
        ))}

        <Text style={styles.section}>Always free</Text>
        {PLUS_FREE_LINES.map((line) => (
          <Text key={line} style={styles.free}>
            {line}
          </Text>
        ))}

        <Text style={styles.legal}>{PLUS_UNPAIR_COPY}</Text>
        {PLUS_PAID_CHECKOUT_READY ? (
          <Text style={styles.legal}>{PLUS_LEGAL}</Text>
        ) : null}
        <TextLink
          label="Privacy policy"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        />
        <TextLink
          label="Apple Standard EULA"
          onPress={() => void Linking.openURL(APPLE_STANDARD_EULA)}
        />
        <TextLink label="Close" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  kicker: {
    ...type.label,
    color: colors.accentFill,
  },
  title: {
    ...type.heading,
    marginTop: 4,
  },
  subtitle: {
    ...type.body,
    marginTop: 4,
    marginBottom: 12,
  },
  trust: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 8,
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginBottom: 8,
  },
  status: {
    ...type.body,
    marginVertical: 12,
  },
  hint: {
    ...type.label,
    marginBottom: 12,
  },
  plan: {
    paddingVertical: 12,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  planTitle: {
    ...type.body,
    fontWeight: '500',
  },
  planPrice: {
    ...type.label,
    marginBottom: 4,
  },
  section: {
    ...type.heading,
    marginTop: 28,
    marginBottom: 8,
  },
  row: {
    marginBottom: 12,
  },
  rowTitle: {
    ...type.body,
    fontWeight: '500',
  },
  rowBody: {
    ...type.label,
    marginBottom: 0,
  },
  free: {
    ...type.body,
    color: colors.muted,
    marginBottom: 4,
  },
  legal: {
    ...type.label,
    marginTop: 16,
  },
})
