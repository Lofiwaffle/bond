import { Stack } from 'expo-router'

export default function BondLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="habits" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="streaks" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="prompts" />
    </Stack>
  )
}
