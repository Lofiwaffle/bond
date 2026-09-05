import * as Haptics from 'expo-haptics'

async function run(task: () => Promise<void>): Promise<void> {
  try {
    await task()
  } catch {
    // No vibrator, denied permission, or unsupported browser.
  }
}

export function hapticLight(): void {
  void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft))
}

export function hapticSelect(): void {
  void run(() => Haptics.selectionAsync())
}

export function hapticSuccess(): void {
  void run(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  )
}
