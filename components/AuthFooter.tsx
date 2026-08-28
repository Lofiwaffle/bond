import { Link, type Href } from 'expo-router'
import { StyleSheet } from 'react-native'

import { showChangeServer } from '../lib/authRedirect'
import { colors, type } from '../lib/theme'

export function AuthFooter() {
  return (
    <>
      {showChangeServer() ? (
        <Link href="/connect" style={styles.privacy}>
          Change server
        </Link>
      ) : null}
      <Link href="/privacy" style={styles.privacy}>
        Privacy
      </Link>
      <Link href={'/help' as Href} style={styles.privacy}>
        Help & safety
      </Link>
    </>
  )
}

const styles = StyleSheet.create({
  privacy: {
    marginTop: 12,
    textAlign: 'center',
    ...type.label,
    color: colors.muted,
  },
})
