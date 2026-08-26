import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import { LoadingScreen, Screen } from '../../../components/ui'
import { useMilestones } from '../../../hooks/useMilestones'
import { formatDisplayDate } from '../../../lib/dates'
import { colors, hairlineWidth, type } from '../../../lib/theme'

export default function BondMilestonesScreen() {
  const { milestones, earnedCount, isLoading } = useMilestones()

  if (isLoading) return <LoadingScreen />

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Milestones"
          subtitle="Constructive moments you already lived. Nobody is ranked."
        />
        <Text style={styles.count}>
          {earnedCount} of {milestones.length} so far
        </Text>
        {milestones.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>
              {item.earnedOn
                ? `Lived ${formatDisplayDate(item.earnedOn.slice(0, 10))}`
                : 'Still ahead. No rush.'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 8 },
  count: {
    ...type.label,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  title: {
    ...type.body,
    fontWeight: '500',
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
  },
  meta: {
    ...type.label,
    marginTop: 8,
    marginBottom: 0,
  },
})
