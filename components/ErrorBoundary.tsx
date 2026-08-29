import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { reportError } from '../lib/monitor'
import { colors, fonts, hit, radii, type } from '../lib/theme'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('app', error, { stack: info.componentStack?.slice(0, 200) ?? '' })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Bond hit a snag</Text>
        <Text style={styles.body}>
          {this.state.error.message || 'The app failed to start.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => this.setState({ error: null })}
          style={styles.retry}
        >
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  title: {
    ...type.heading,
    marginBottom: 8,
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginBottom: 16,
  },
  retry: {
    alignSelf: 'flex-start',
    minHeight: hit,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.accentFill,
    borderRadius: radii.pill,
  },
  retryLabel: {
    color: colors.onAccent,
    fontFamily: fonts.medium,
    fontSize: 16,
    fontWeight: '500',
  },
})
