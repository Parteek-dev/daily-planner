import { Stack } from 'expo-router';

/**
 * Modal stack layout.
 * Each modal screen is pushed with the appropriate presentation style.
 *
 * Animations:
 * - add-task, settings: fade (transparent modal overlay)
 * - pomodoro, overdue-rollover: slide_from_bottom (action sheets)
 * - feedback, profile: slide_from_right (full-screen navigation feel)
 */
export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="add-task"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="pomodoro"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="overdue-rollover"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="feedback"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
