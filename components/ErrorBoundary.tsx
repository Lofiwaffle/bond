import { Component, type ErrorInfo, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { colors, type } from '../lib/theme'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Bond crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Bond hit a snag</Text>
        <Text style={styles.body}>
          {this.state.error.message || 'The app failed to start.'}
        </Text>
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
  },
})
