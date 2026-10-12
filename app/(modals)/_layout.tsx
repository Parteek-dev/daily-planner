import { Stack } from 'expo-router';

/**
 * Modal stack layout.
 * Each modal screen is pushed with the appropriate presentation style.
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
      <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="pomodoro" options={{ presentation: 'modal', title: 'Pomodoro Timer' }} />
      <Stack.Screen name="overdue-rollover" options={{ presentation: 'modal', title: 'Overdue Tasks' }} />
      <Stack.Screen name="feedback" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="profile" options={{ presentation: 'fullScreenModal', headerShown: false }} />
    </Stack>
  );
}
