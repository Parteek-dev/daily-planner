/**
 * Root Expo Router layout.
 *
 * Responsibilities:
 *   1. Wrap the entire app in GestureHandlerRootView, ThemeProvider,
 *      AccessibilityProvider, SafeAreaProvider, and FocusProvider.
 *   2. Guard navigation with Firebase Auth state:
 *        - No active session (user === null) → redirect to /index (Landing)
 *        - Active session → redirect to /(tabs)
 *   3. Configure foreground notification display behaviour via
 *      Notifications.setNotificationHandler.
 *   4. Mount the Focus Mode persistent overlay above the tab navigator so it
 *      survives tab navigation (Task 27.1, Req 12.1).
 *   5. Register addNotificationResponseReceivedListener to navigate to the
 *      appropriate task when a notification is tapped (Task 33.1, Req 17.5).
 *
 * Requirements: 4.1, 6.10, 12.1, 17.5
 */

import { useEffect } from 'react'
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { ThemeProvider, useTheme } from '@/src/hooks/useTheme'
import { AccessibilityProvider } from '@/src/hooks/useAccessibility'
import { useAuth } from '@/src/hooks/useAuth'
import FocusMode, { FocusProvider, useFocusContext } from '@/src/components/FocusMode'
import { PomodoroMiniProvider, usePomodoroMini } from '@/src/context/PomodoroMiniContext'
import { WidgetProvider, useWidget } from '@/src/context/WidgetContext'
import WidgetView from '@/src/components/WidgetView'

// ── Foreground notification handler (Req 17.x) ───────────────────────────────
// Called before a notification is displayed when the app is foregrounded.
// We show the alert, play the sound, and show the badge so users always see
// Pomodoro interval completions even when actively using the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// ── Focus Mode overlay ────────────────────────────────────────────────────────
/**
 * Reads the global focus task from FocusContext and renders the FocusMode
 * overlay as a sibling of the navigation stack so it persists across tab
 * navigation (Req 12.1).
 *
 * The overlay receives a no-op `todayTasks` list here; real task data should
 * be threaded in from the today screen via `openFocus` + context when the
 * full Today screen (Task 22.1) is implemented. For now we pass an empty array
 * so the next-task button is simply hidden.
 */
function FocusOverlay() {
  const { focusTask, closeFocus, openFocus } = useFocusContext()

  return (
    <FocusMode
      task={focusTask}
      todayTasks={[]}
      onToggleComplete={(taskId) => {
        if (focusTask?.id === taskId) {
          openFocus({ ...focusTask, completed: true })
        }
      }}
      onNextTask={(nextTask) => {
        openFocus(nextTask)
      }}
      onClose={closeFocus}
    />
  )
}

// ── Notification response handler (Req 17.5) ─────────────────────────────────
/**
 * Registers `addNotificationResponseReceivedListener` so that tapping a
 * scheduled task reminder notification navigates the user to the Today tab
 * and (when possible) deep-links to the relevant task.
 *
 * The notification data payload set by `useNotifications.scheduleTaskReminder`
 * includes `{ taskId: string }`. We navigate to `/(tabs)/today` with the
 * taskId passed as a query param so the Today screen can scroll to / highlight
 * the task.
 *
 * Must be rendered inside the providers (specifically inside the Expo Router
 * tree) so `useRouter` is available.
 *
 * Requirements: 17.5
 */
function NotificationResponseListener() {
  const router = useRouter()

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as
        { taskId?: string } | undefined

      if (data?.taskId) {
        // Navigate to the Today tab; pass taskId so the screen can highlight it
        router.push({
          pathname: '/(tabs)/today',
          params: { highlightTaskId: data.taskId },
        })
      } else {
        // Notification without a task ID — just open the Today tab
        router.push('/(tabs)/today')
      }
    })

    return () => subscription.remove()
  }, [router])

  return null
}

// ── Auth gate ─────────────────────────────────────────────────────────────────

/**
 * Listens to auth state and redirects accordingly.
 *
 * Placed inside the providers so it can safely call useRouter / useSegments
 * after the navigation tree is mounted.
 *
 * Req 6.10:
 *   - unauthenticated (user === null, not loading) → /index
 *   - authenticated                                → /(tabs)
 */
function AuthGate() {
  const { user, authLoading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Wait until Firebase Auth has resolved the initial session
    if (authLoading) return

    const inAuthGroup = segments[0] === '(tabs)'
    const onLanding = segments[0] === undefined
    const onAuth = segments[0] === 'auth'

    if (!user && inAuthGroup) {
      // Session ended while on an authenticated route → send to sign-in
      router.replace('/auth')
    } else if (user && (onLanding || onAuth)) {
      // Session exists but still on public route → send to main app
      router.replace('/(tabs)')
    }
    // Otherwise no redirect needed — let the current screen stay
  }, [user, authLoading, segments, router])

  return null
}

// ── Root layout ───────────────────────────────────────────────────────────────

/**
 * PomodoroMiniPip — floating pill shown when Pomodoro modal is minimized.
 * Reads live timer state from PomodoroMiniContext (timer keeps running).
 */
function PomodoroMiniPip() {
  const {
    isMinimized, setIsMinimized, pipTaskTitle,
    formattedTime, isRunning, mode, toggleTimer,
  } = usePomodoroMini()
  const { tokens } = useTheme()
  const router = useRouter()

  if (!isMinimized) return null

  const modeColors: Record<string, string> = {
    work: '#3b82f6',
    break: '#22c55e',
    longBreak: '#a855f7',
  }
  const modeColor = modeColors[mode] ?? '#3b82f6'

  return (
    <View style={[pipStyles.container, { pointerEvents: 'box-none' } as any]}>
      <View
        style={[pipStyles.pill, {
          backgroundColor: tokens.bgSecondary,
          borderColor: tokens.borderPrimary,
        }]}
        // @ts-ignore — web-only prop, needed so only the pill itself captures touches
        pointerEvents="auto"
      >
        {/* Header */}
        <View style={pipStyles.header}>
          <Text style={[pipStyles.headerTitle, { color: tokens.textSecondary }]}>Focus Mode</Text>
          <Pressable onPress={() => setIsMinimized(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Expand">
            <Text style={{ color: tokens.textMuted, fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>
        {/* Task name */}
        {pipTaskTitle && (
          <Text style={[pipStyles.taskTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
            {pipTaskTitle}
          </Text>
        )}
        {/* Live timer + pause/resume */}
        <View style={pipStyles.timerRow}>
          <Pressable onPress={() => router.push('/(modals)/pomodoro' as never)} accessibilityRole="button">
            <Text style={[pipStyles.timerText, { color: modeColor }]}>
              {formattedTime}
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleTimer}
            style={[pipStyles.expandBtn, { backgroundColor: modeColor }]}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? 'Pause' : 'Resume'}
          >
            <Text style={pipStyles.expandBtnText}>
              {isRunning ? '⏸ Pause' : '▶ Resume'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

// ── Widget overlay (root-level so it shares stacking context with pip) ────────
/**
 * Reads widget state from WidgetContext and renders WidgetView here at the
 * root layout so its z-index is evaluated in the same stacking context as
 * PomodoroMiniPip — guaranteeing it always paints on top of the pip.
 */
function WidgetOverlay() {
  const { isOpen, close, tasks, onToggleComplete, getTopicColor } = useWidget()
  return (
    <WidgetView
      isOpen={isOpen}
      onClose={close}
      tasks={tasks}
      onToggleComplete={onToggleComplete}
      getTopicColor={getTopicColor}
    />
  )
}

const pipStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    // Pass all touches through except to the pill itself
  } as any,
  pill: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 320,
    maxWidth: '90%' as any,
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' } as any,
    }),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  taskTitle: { fontSize: 14, fontWeight: '500' },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerText: { fontSize: 28, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 1 },
  expandBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  expandBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
})

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PomodoroMiniProvider>
            <WidgetProvider>
              <AccessibilityProvider>
                <FocusProvider>
                  {/* Navigation tree */}
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(modals)" options={{ headerShown: false }} />
                    <Stack.Screen name="ui-demo" options={{ headerShown: false }} />
                  </Stack>

                  <AuthGate />
                  <NotificationResponseListener />
                  <FocusOverlay />
                  {/* Pomodoro mini pip — shown when timer is minimized */}
                  <PomodoroMiniPip />
                  {/* Widget overlay — rendered at root so it sits above pip */}
                  <WidgetOverlay />
                </FocusProvider>
              </AccessibilityProvider>
            </WidgetProvider>
          </PomodoroMiniProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
})
