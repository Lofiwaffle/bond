import { Redirect } from 'expo-router'

/** Pairing now lives in first-run setup. */
export default function PairRedirect() {
  return <Redirect href="/(app)/setup" />
}
