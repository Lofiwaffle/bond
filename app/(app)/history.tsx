import { Redirect } from 'expo-router'

/** History lives on the Entries calendar now. */
export default function HistoryRedirect() {
  return <Redirect href="/(app)/(tabs)" />
}
