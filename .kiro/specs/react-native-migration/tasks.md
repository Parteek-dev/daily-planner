# Implementation Plan: React Native Migration

## Overview

Migrate the Daily Planner from a React 19 + Vite SPA to a single Expo SDK 52 project targeting iOS, Android, and Web. The `frontend/` directory is replaced entirely by a new Expo project at the repository root. Supabase is replaced by Firebase (Firestore + Firebase Auth). All business logic is preserved; only platform-specific I/O calls change.

The plan follows the five-phase migration strategy from the design document.

---

## Tasks

### Phase 1: Project Scaffolding and Configuration

- [x] 1. Initialize the Expo SDK 52 project at the repository root
  - [x] 1.1 Create the Expo project using `create-expo-app` with the `expo-router` template at the repository root (or `app/` directory)
    - Run `npx create-expo-app@latest . --template expo-template-blank-typescript` and configure `expo-router` v4
    - Set `main` to `expo-router/entry` in `package.json`; set `scheme` in `app.json`
    - Verify `frontend/` is untouched — the new project coexists during the migration
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Write `app.json` with all required Expo and distribution fields
    - Include `name`, `slug`, `version`, `scheme`, `ios.bundleIdentifier`, `ios.minimumOsVersion: "16.0"`, `android.package`, `android.versionCode`, `android.minSdkVersion: 26`, `icon`, `splash.image`
    - Add `expo-notifications` plugin block with `NSUserNotificationUsageDescription`, `RECEIVE_BOOT_COMPLETED`, and `SCHEDULE_EXACT_ALARM` permissions
    - _Requirements: 22.1, 22.3, 22.5, 22.6_

  - [x] 1.3 Write `eas.json` with `development`, `preview`, and `production` build profiles
    - All three profiles target the Expo managed workflow (no `prebuild` step)
    - _Requirements: 22.4_

  - [x] 1.4 Write the root `.gitignore`
    - Explicitly list `node_modules/`, `.expo/`, `dist/`, `*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`, `*.orig.*`
    - _Requirements: 1.9_

  - [x] 1.5 Install and pin all core dependencies using `npx expo install`
    - Pin exact versions (no `^` or `~`) for: `expo`, `react-native`, `expo-router`, `firebase`, `@react-native-async-storage/async-storage`, `expo-notifications`, `expo-av`, `expo-document-picker`, `expo-sharing`, `expo-file-system`, `expo-speech`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `victory-native`, `react-native-svg`, `lucide-react-native`
    - Add `react-native-draggable-flatlist` for drag-and-drop reorder
    - Run `npx expo-doctor` and fix any reported mismatches
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.6 Write `DEPENDENCIES.md` documenting all version resolutions
    - For every dependency that `expo-doctor` flagged: record original version, resolved version, and reason
    - For `victory-native` and `lucide-react-native`: record selection rationale
    - _Requirements: 2.6, 2.7_

  - [x] 1.7 Add placeholder app icon and splash screen assets
    - `assets/icon.png` — 1024×1024 px placeholder PNG
    - `assets/splash.png` — 1242×2688 px placeholder PNG
    - _Requirements: 22.2_

  - [x] 1.8 Write `tsconfig.json` with path aliases
    - Configure `@/*` to resolve to the project root so imports like `@/src/hooks/useTheme` work on all platforms
    - _Requirements: 1.1_

- [x] 2. Checkpoint — verify scaffold compiles
  - Ensure `npx expo start --web` opens without errors and `expo-doctor` reports no issues. Ask the user if questions arise.resume run the task

### Phase 2: Data Layer — Firebase, Mappers, and Adapted Hooks

- [x] 3. Implement the Firebase initialization module
  - [x] 3.1 Create `src/lib/firebase.ts` with single-instance initialization
    - Call `initializeApp` guarded by `getApps().length === 0`; export `db` (Firestore instance) and `auth` (Firebase Auth instance)
    - Call `enableIndexedDbPersistence(db)` when `typeof window !== 'undefined'` (web); native uses default offline cache
    - Read Firebase config from environment variables (never hard-code secrets)
    - _Requirements: 23.1, 23.6, 2.2_

- [x] 4. Implement Firestore mapping functions
  - [x] 4.1 Create `src/lib/firestoreMappers.ts` with all document converters
    - Implement `docToTask(snap)` and `taskToDoc(task, userId)` converting between `DocumentSnapshot` and the camelCase `Task` schema defined in `useProgress` (all fields: `id`, `title`, `description`, `topic`, `duration`, `actualDuration`, `date`, `originalDate`, `dueTime`, `completed`, `completedAt`, `createdAt`, `note`, `priority`, `dependsOn`, `subtasks`, `recurrence`, `recurrenceEndDate`, `recurrenceParentId`, `customRecurrenceDays`)
    - Implement `docToTopic`, `topicToDoc`, `docToNote`, `noteToDoc`, `docToGoals`, `goalsToDoc`, `docToTemplate`, `templateToDoc`
    - _Requirements: 23.2, 23.3_

  - [x]* 4.2 Write property test for Firestore mapping round-trip
    - **Property 4: Firestore mapping round-trip** — for any valid `Task` object, `docToTask(taskToDoc(task, uid))` produces a task where every field equals the original
    - Use `fast-check` with `fc.record` to generate arbitrary valid task objects; run 100+ iterations
    - **Validates: Requirements 23.2, 23.3**

- [x] 5. Implement `src/lib/utils.ts` — port duration utilities
  - [x] 5.1 Copy `fmtDuration` from `frontend/src/lib/utils.js` unchanged; add `parseDuration` from `AddTaskModal`
    - `fmtDuration`: `< 60` → `"45m"`, exact hours → `"2h"`, otherwise → `"1h 30m"`
    - `parseDuration`: accepts plain integer strings, `Xm`, `Xh`, `Xh Ym` — returns `null` for unrecognized input without throwing
    - Export both functions; no `localStorage` or Supabase calls present, so copy verbatim per Req 1.8
    - _Requirements: 24.1, 24.2, 24.4, 1.8_

  - [x]* 5.2 Write property test for duration round-trip
    - **Property 1: Duration format round-trip** — for any integer `n` in 1–480 inclusive, `parseDuration(fmtDuration(n))` equals `n`
    - Use `fast-check` `fc.integer({ min: 1, max: 480 })`; run 100+ iterations
    - **Validates: Requirements 24.2**

  - [x]* 5.3 Write property test for `parseDuration` null on unrecognized input
    - **Property 3: parseDuration returns null on unrecognized input** — for any string not matching a supported format, `parseDuration` returns `null` without throwing
    - Generate arbitrary strings with `fc.string()` filtered to exclude valid patterns; assert result is `null`
    - **Validates: Requirements 24.4**

- [x] 6. Adapt `useProgress` hook for Firestore
  - [x] 6.1 Create `src/hooks/useProgress.ts` — replace Supabase data load with Firestore `onSnapshot` subscriptions
    - Subscribe to all five collections (`tasks`, `topics`, `notes`, `goals/daily`, `templates`) using `onSnapshot` on mount; set `dataLoading = false` after the first snapshot from all five listeners arrives
    - Replace the one-shot `Promise.all` load from `frontend/src/hooks/useProgress.js` with live listeners
    - Keep the existing undo/redo state machine, recurring task generation, and all query/stats memos unchanged
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 6.2 Replace all Supabase write calls with Firestore SDK calls in `useProgress.ts`
    - Map each operation: `insert` → `setDoc`, `update` → `updateDoc`, `delete` → `deleteDoc`
    - Use Firestore `writeBatch()` for multi-document operations: recurring task generation, bulk complete, archive+delete
    - Use the JS-generated `id` field as the Firestore document ID for stable IDs across offline/online transitions
    - _Requirements: 23.4, 23.5, 5.1_

  - [x] 6.3 Replace `localStorage` (guest mode) with `AsyncStorage` in `useProgress.ts`
    - Replace `localStorage.getItem(GUEST_KEY)` → `await AsyncStorage.getItem(GUEST_KEY)`
    - Replace `localStorage.setItem(GUEST_KEY, json)` → `await AsyncStorage.setItem(GUEST_KEY, json)`
    - Replace `localStorage.removeItem(GUEST_KEY)` → `await AsyncStorage.removeItem(GUEST_KEY)`
    - _Requirements: 1.6, 5.7_

  - [x] 6.4 Implement AsyncStorage cache layer in `useProgress.ts`
    - On each `onSnapshot` update, serialize the snapshot and write to `AsyncStorage` under `cache_tasks`, `cache_topics`, `cache_notes`, `cache_goals`, `cache_templates`
    - On mount, before subscribing to Firestore, read all `cache_` keys and hydrate state immediately (stale-while-revalidate pattern)
    - _Requirements: 5.9_

  - [x] 6.5 Replace web-only `exportData` and `exportAsIcs` with mobile-compatible versions
    - Remove `document.createElement('a')` download pattern from `exportData` — return the JSON string and call `expo-sharing` `shareAsync` at the call site
    - Remove `URL.createObjectURL` from `exportAsIcs` — write ICS string to a temp file via `expo-file-system` `writeAsStringAsync` and share via `expo-sharing`
    - Keep `importFromIcs` and `confirmImportFromIcs` logic byte-for-byte identical (no platform I/O inside them)
    - _Requirements: 15.2, 15.3, 19.4_

  - [x]* 6.6 Write property test for ICS export–import round-trip
    - **Property 2: ICS export–import round-trip** — for any non-empty array of valid task objects, `importFromIcs(exportAsIcs(tasks))` produces tasks where `title`, `date`, and `duration` equal the originals
    - Generate task arrays with `fast-check`; run 100+ iterations
    - **Validates: Requirements 24.3, 15.2**

  - [x]* 6.7 Write property test for undo history depth invariant
    - **Property 6: Undo history depth invariant** — for any sequence of at most 50 reversible operations (add, update, complete-toggle, delete), applying the same number of undo operations restores the task list to its initial state
    - Use `fast-check` to generate operation sequences; run against the hook's state machine with a Firestore emulator or mock
    - **Validates: Requirements 5.6**

- [x] 7. Adapt `useAuth` hook for Firebase Auth
  - [x] 7.1 Create `src/hooks/useAuth.ts` — replace Supabase Auth with Firebase Auth
    - Replace `supabase.auth.getSession()` → `onAuthStateChanged(auth, cb)` for session hydration
    - Replace `supabase.auth.signInWithPassword` → `signInWithEmailAndPassword`
    - Replace `supabase.auth.signUp` → `createUserWithEmailAndPassword`
    - Replace `supabase.auth.signOut` → `signOut(auth)` + `AsyncStorage.removeItem('guest_mode')`
    - Replace `supabase.auth.resetPasswordForEmail` → `sendPasswordResetEmail`
    - Add `signInAnonymously` for guest mode entry; set `AsyncStorage.setItem('guest_mode', 'true')`
    - Add `deleteUser` for guest mode exit; remove `guest_mode` from AsyncStorage
    - Add `linkWithCredential` for guest account upgrade
    - Keep return shape `{ user, isGuest, authLoading, signIn, signUp, signOut, resetPassword, enterGuestMode, exitGuestMode, upgradeGuestAccount }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10, 6.11_

- [x] 8. Adapt `usePomodoro` hook for AsyncStorage
  - [x] 8.1 Create `src/hooks/usePomodoro.ts` — replace `localStorage` with `AsyncStorage`
    - Replace `localStorage.getItem(POMODORO_KEY)` → `await AsyncStorage.getItem(POMODORO_KEY)` in an async `useEffect`
    - Replace `localStorage.setItem` → `await AsyncStorage.setItem`
    - Remove `window.AudioContext` — Pomodoro sound is handled by `expo-av` `Audio.Sound` at the call site (timer screen)
    - Remove `document.title` update (browser tab title has no equivalent on native)
    - Remove `window.Notification` — notifications are handled by `useNotifications` hook via `expo-notifications`
    - Preserve all session counting logic, long-break trigger, `timerAlert` state, and the full return shape
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 1.6_

- [x] 9. Adapt `useNotifications` hook for `expo-notifications`
  - [x] 9.1 Create `src/hooks/useNotifications.ts` — replace Web Notification API with `expo-notifications`
    - Replace `Notification.requestPermission()` → `requestPermissionsAsync()` from `expo-notifications`
    - Replace `new Notification(title, opts)` → `scheduleNotificationAsync` with a date trigger set to `dueTime - reminderMinutes`
    - On task `dueTime` edit or delete: call `cancelScheduledNotificationAsync(notificationId)` then reschedule if applicable
    - Replace `localStorage` settings read/write → `AsyncStorage` under `planner_notification_settings`
    - Add `setNotificationHandler` in the root layout to define foreground notification behavior
    - Keep permission status, `toggleNotifications`, `updateReminderMinutes`, and `scheduledNotifications` in the return shape
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.6_

- [x] 10. Adapt remaining hooks and copy unchanged utilities
  - [x] 10.1 Create `src/hooks/useLocalStorage.ts` — AsyncStorage wrapper matching the existing `useLocalStorage.js` API
    - Replace `localStorage.getItem` → `AsyncStorage.getItem`; replace `localStorage.setItem` → `AsyncStorage.setItem`
    - Keep the same hook signature: `[value, setValue]`
    - _Requirements: 1.6_

  - [x] 10.2 Create `src/hooks/useKeyboardShortcuts.ts` — no-op on native, active on web
    - On web: keep the existing `window.addEventListener('keydown', …)` logic unchanged
    - On native: export the hook as a no-op (empty `useEffect`)
    - Use `Platform.OS` check to branch; do not import `window` on native
    - _Requirements: 1.4, 1.8_

  - [x] 10.3 Create `src/hooks/useAccessibility.ts` — replace DOM APIs with `AccessibilityInfo`
    - Replace `document.addEventListener('focusin', …)` with `AccessibilityInfo.addEventListener('screenReaderChanged', …)`
    - Add `isReduceMotionEnabled()` flag exposed in return shape for animation disabling
    - _Requirements: 21.5_

- [x] 11. Checkpoint — data layer tests pass
  - Ensure all property tests (Tasks 4.2, 5.2, 5.3, 6.6, 6.7) pass with `npx vitest --run`. Confirm `src/lib/firebase.ts` initializes without error against the Firebase emulator. Ask the user if questions arise.

---

### Phase 3: Theme System and Navigation Skeleton

- [x] 12. Implement the JS token theme system
  - [x] 12.1 Create `src/theme/tokens.ts` with `DARK_TOKENS` and `LIGHT_TOKENS`
    - Map every CSS variable from `frontend/src/App.css` to a concrete color: `bgPrimary`, `bgSecondary`, `bgInput`, `borderPrimary`, `borderSecondary`, `textPrimary`, `textSecondary`, `textMuted`, `accentBlue`, `accentGreen`, `accentOrange`, `accentRed`, `accentPurple`, `accentPrimary`
    - Export `Tokens` type; both maps satisfy this interface
    - _Requirements: 3.5_

  - [x] 12.2 Create `src/hooks/useTheme.tsx` — adapt `ThemeContext` for React Native
    - Replace `localStorage.getItem('ip_theme')` → `await AsyncStorage.getItem('ip_theme')`; replace `localStorage.setItem` → `await AsyncStorage.setItem`
    - Replace `window.matchMedia('(prefers-color-scheme: dark)')` → `Appearance.getColorScheme()` from `react-native`; subscribe to changes via `Appearance.addChangeListener`
    - When `themeMode = 'auto'` and `Appearance.getColorScheme()` returns `null`, resolve theme to `'light'`
    - When `accentColor` changes, update `tokens.accentBlue` and `tokens.accentPrimary` synchronously within the same `setState` call
    - Expose `{ theme, themeMode, setThemeMode, toggleTheme, accentColor, setAccentColor, tokens }` — identical API to existing `useTheme`
    - Remove all `document.documentElement.style.setProperty` and `document.documentElement.setAttribute` calls
    - The `App_Root` must contain no `.css` files and no `var(--` strings after this task
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 13. Implement the root Expo Router layout and auth gate
  - [x] 13.1 Create `app/_layout.tsx` — root layout wrapping all screens
    - Wrap children in `GestureHandlerRootView`, `ThemeProvider`, `AccessibilityProvider`, and `SafeAreaProvider`
    - Use `onAuthStateChanged` (via `useAuth`) to guard navigation: unauthenticated users see `index.tsx`; authenticated users see `(tabs)/`
    - Mount the Focus Mode persistent overlay from root layout so it survives tab navigation (see task 22.1)
    - Set `setNotificationHandler` for foreground notification display behavior
    - _Requirements: 4.1, 6.10_

  - [x] 13.2 Create `app/index.tsx` — Landing screen for unauthenticated users
    - Apply theme tokens via `StyleSheet.create`; include "Get Started", "Sign In", and "Guest Mode" entry points
    - _Requirements: 6.10_

  - [x] 13.3 Create `app/auth.tsx` — Auth screen (sign-in / sign-up / password reset tabs)
    - Wire to `useAuth`: `signIn`, `signUp`, `resetPassword`, `enterGuestMode`
    - Show error messages on failure; retain email in input field on error
    - Validate email (RFC 5321, max 254 chars) and password (8–128 chars) client-side before calling Firebase
    - Retain all field values when navigating back with the hardware back button / swipe
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 14. Implement the tab navigator and platform-specific navigation chrome
  - [x] 14.1 Create `app/(tabs)/_layout.tsx` — four-tab navigator with platform branching
    - Define exactly four tabs: Dashboard, Today, Week, Calendar
    - When `Platform.OS === 'web'` and `useWindowDimensions().width > 768`: render `SidebarLayout` (web-only sidebar)
    - Otherwise: render `Tabs` with a `NavigationBar` as `tabBarComponent`
    - Show overdue task badge on the Today tab (value from `useProgress`, capped at 99)
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 14.2 Create `src/components/Sidebar.web.tsx` — collapsible left sidebar (web-only)
    - Render using RN `View`, `Pressable`, `Text` primitives and theme tokens (no CSS)
    - Accept `SidebarProps`: `activeTab`, `onNavigate`, `taskCounts`, `onOpenSettings`, `onOpenCommandPalette`
    - _Requirements: 4.4_

  - [x] 14.3 Create `src/components/Sidebar.native.tsx` — returns `null` (no sidebar on native)
    - _Requirements: 4.3_

  - [x] 14.4 Create `src/components/NavigationBar.tsx` — bottom tab bar for mobile/web-narrow
    - Render using RN primitives and theme tokens; show overdue badge on Today tab
    - Accept `NavigationBarProps`: `state`, `descriptors`, `navigation`, `overdueCount`
    - _Requirements: 4.3, 4.5, 8.6_

- [x] 15. Implement modal stack screens (stubs)
  - [x] 15.1 Create stub screens for all modal routes
    - `app/(modals)/add-task.tsx` — placeholder `Text` component, `presentation: 'modal'`
    - `app/(modals)/settings.tsx` — placeholder, `presentation: 'modal'`
    - `app/(modals)/pomodoro.tsx` — placeholder, `presentation: 'modal'`
    - `app/(modals)/overdue-rollover.tsx` — placeholder, `presentation: 'modal'`
    - `app/(modals)/feedback.tsx` — placeholder, `presentation: 'fullScreen'`
    - _Requirements: 4.6_

  - [x] 15.2 Implement Android back / iOS swipe preservation
    - In `app/(modals)/add-task.tsx`, add a `beforeRemove` navigation listener that checks `isDirty` ref; if dirty, show `Alert.alert` confirmation before discarding
    - _Requirements: 4.7_

- [x] 16. Create tab screen stubs
  - [x] 16.1 Create placeholder tab screens
    - `app/(tabs)/index.tsx` (Dashboard) — placeholder `Text` using theme tokens
    - `app/(tabs)/today.tsx` (Today) — placeholder
    - `app/(tabs)/week.tsx` (Week) — placeholder
    - `app/(tabs)/calendar.tsx` (Calendar) — placeholder
    - _Requirements: 4.2_

- [x] 17. Checkpoint — navigation skeleton works on all three targets
  - Run `npx expo start --web`, iOS simulator, and Android emulator. Confirm tab navigation, modal push/pop, auth gate redirect, and hardware back button all work. Ask the user if questions arise.

---

### Phase 4: UI Components

- [x] 18. Implement shared primitive components and form fields
  - [x] 18.1 Create `src/components/ProgressRing.tsx` — circular progress indicator
    - Implement using `react-native-svg` `Circle` with `strokeDasharray`/`strokeDashoffset`
    - Accept `{ percent: number; size: number; strokeWidth: number; color: string; label?: string }`
    - Disable SVG animation when `AccessibilityInfo.isReduceMotionEnabled()` returns `true`
    - _Requirements: 9.1, 21.5_

  - [x] 18.2 Create `src/components/DatePickerField.tsx` — cross-platform date picker
    - On iOS/Android: use `@react-native-community/datetimepicker` or equivalent Expo-compatible library
    - On web: render an HTML `<input type="date">` via `Platform.OS === 'web'` branch
    - _Requirements: 7.1_

  - [x] 18.3 Create `src/components/TimePickerField.tsx` — cross-platform time picker
    - Same platform-branching pattern as `DatePickerField.tsx`
    - _Requirements: 7.1_

  - [x] 18.4 Create `src/components/DurationField.tsx` — duration text input with parsing
    - Reuse `parseDuration` and `fmtDuration` from `src/lib/utils.ts`
    - Display inline validation error when input is not parseable
    - _Requirements: 7.1, 24.1_

- [x] 19. Implement the Add/Edit Task form screen
  - [x] 19.1 Complete `app/(modals)/add-task.tsx` — full Add/Edit Task bottom sheet
    - Replace the stub with the full form: title (required, 1–120 chars), description (0–500 chars), topic chips + "New topic" inline form with color-picker, duration field, date, due time, priority buttons (None/High/Medium/Low with color-coded borders), subtask list (up to 20), recurrence selector, recurrence end date, task dependency selector
    - Show inline errors: empty title, title > 120 chars, duplicate task (same title + date) with proceed/cancel options
    - Default recurrence end date to 365 days from task date when recurrence is set and no end date is provided
    - Dependency selector shows only incomplete tasks from the same date range; remove dependency if it completes/deletes before save
    - Receive `initialTask` via `useLocalSearchParams` for edit mode pre-fill
    - Wire to `addTask` / `updateTask` from `useProgress`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

- [x] 20. Implement the Confetti component
  - [x] 20.1 Create `src/components/Confetti.tsx` — task completion confetti animation
    - Use `react-native-reanimated` for particle animation; play for 1–3 seconds then auto-dismiss
    - When `AccessibilityInfo.isReduceMotionEnabled()` returns `true`, skip the animation entirely
    - _Requirements: 7.12, 21.5_

- [x] 21. Implement the TaskItem component with swipe gestures
  - [x] 21.1 Create `src/components/TaskItem.tsx` — swipeable task row
    - On iOS/Android: wrap in `react-native-gesture-handler` `Swipeable`; require minimum 80 dp swipe distance to trigger complete or delete
    - On web: show hover-reveal action buttons instead of swipe gestures
    - Show priority color indicator, due time badge, duration badge, subtask progress
    - Accept `TaskItemProps`: `task`, `onComplete`, `onDelete`, `onEdit`, `onStartFocus`, `onStartPomodoro`, `showDate`, `isDragging`
    - Set `accessible={true}`, `accessibilityLabel`, `accessibilityRole="button"` on all interactive elements
    - Set `accessibilityState={{ checked: task.completed }}` on the completion checkbox element
    - _Requirements: 7.13, 21.1, 21.2, 21.3_

- [x] 22. Implement the Today screen
  - [x] 22.1 Complete `app/(tabs)/today.tsx` — full Today screen
    - Render task list grouped by topic with `DraggableFlatList` (react-native-draggable-flatlist) supporting drag-and-drop reorder; persist new order immediately via `reorderTasks`
    - Include `QuickAdd` bar (non-empty title required before saving)
    - Include `DailyGoals` card with progress bars from `useProgress.dailyGoalProgress` and `extraGoalsProgress`
    - Include `DailyNotes` section with auto-save after 800 ms of inactivity; show inline error indicator on save failure
    - Show overdue badge on the Today tab with count capped at 99
    - On first open of a given calendar day with overdue tasks, show `OverdueRolloverModal`
    - Show `Confetti` on task completion
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x]* 22.2 Write property test for overdue badge cap
    - **Property 8: Overdue badge cap** — for any count `N ≥ 0` of overdue tasks, the badge value equals `Math.min(N, 99)`
    - Use `fc.nat()` to generate arbitrary overdue counts; assert the badge renders the correct capped value
    - **Validates: Requirements 8.6**

  - [x]* 22.3 Write property test for empty/whitespace title rejection
    - **Property 9: Empty and whitespace task title rejection** — for any string composed entirely of whitespace characters (including the empty string), submitting the Add Task form rejects the input and adds no task
    - Use `fc.string()` filtered to whitespace-only strings; assert no task is added and an error is shown
    - **Validates: Requirements 7.2**

- [x] 23. Implement the Dashboard screen
  - [x] 23.1 Complete `app/(tabs)/index.tsx` — full Dashboard screen
    - Render: `ProductivityScore` card, `Heatmap` (last 12 weeks), streak card (current + best + studied-today indicator), `WeeklyReport` card, `TopicBalance` chart, `BestHoursChart`, `GoalSetting` card
    - Single-column layout when viewport width < 768 px; two-column grid at ≥ 768 px
    - Goal target edit saves immediately and updates the goal progress bar on the same screen
    - Extra goal add/remove updates list immediately, up to 10 extra goals
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

- [x] 24. Implement the Week and Calendar screens
  - [x] 24.1 Complete `app/(tabs)/week.tsx` — Week screen with 7 day columns
    - Render Mon–Sun columns; current day selected by default
    - Enable horizontal scrolling across columns when viewport width < 360 dp
    - Tap a day column to expand its task list inline; tap a second column to collapse the first and expand the new one
    - Left swipe → next week; right swipe → previous week (use `react-native-gesture-handler` `PanGestureHandler`)
    - Show "Add task" button on selected day that opens Add Task form with that date pre-filled
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 10.7_

  - [x] 24.2 Complete `app/(tabs)/calendar.tsx` — Calendar screen with monthly grid
    - Render monthly grid showing `completed/total` per day
    - Tap a day to open a day detail bottom sheet listing all tasks (incomplete first, then completed)
    - Left swipe → next month; right swipe → previous month
    - Show "Add task" button in the detail sheet pre-filled with the selected date
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 25. Implement chart components
  - [x] 25.1 Create `src/components/BestHoursChart.tsx` — bar chart using `victory-native`
    - Replace `recharts` `BarChart` with `VictoryBar` from `victory-native`
    - Highlight peak hour bar in the accent color from theme tokens
    - Accept `BestHoursChartProps`: `data: Array<{ hour: number; count: number }>`, `accentColor?`
    - Render empty-state message when `data` is empty or all counts are zero
    - _Requirements: 14.1, 14.2, 14.6, 2.3_

  - [x] 25.2 Create `src/components/LineChart.tsx` — line/area chart using `victory-native`
    - Replace `recharts` `LineChart` with `VictoryLine` + `VictoryArea`
    - Show daily task completion count over the last 30 days
    - Render empty-state message when data is empty
    - _Requirements: 14.1, 14.3, 14.6, 2.3_

  - [x] 25.3 Create `src/components/Heatmap.tsx` — contribution grid using `react-native-svg`
    - Render colored squares for the last 12 weeks (16-week default); tap a cell to navigate to Calendar screen with that date selected
    - Accept `HeatmapProps`: `data: Record<string, number>`, `weeks?`, `colorScale?`
    - Render empty-state message when `data` has no entries
    - _Requirements: 14.1, 14.4, 14.6, 9.2_

  - [x] 25.4 Create `src/components/TopicBalance.tsx` — donut/bar chart using `victory-native`
    - Replace `recharts` `PieChart` with `VictoryPie` or `VictoryBar`
    - Display at most 5 topics; group remainder as "Other"
    - Render empty-state message when data is empty
    - _Requirements: 14.1, 14.5, 14.6, 2.3_

- [x] 26. Implement the Pomodoro Timer screen
  - [x] 26.1 Complete `app/(modals)/pomodoro.tsx` — full Pomodoro Timer modal
    - Wire `usePomodoro` hook; render remaining time in MM:SS, phase name, interval count
    - Configure work/short break/long break durations; long break triggers after every 4 completed work intervals
    - On interval complete (foreground): play alert sound via `expo-av` `Audio.Sound`, show `TimerAlert` overlay, pause and wait for user to confirm before advancing
    - On interval complete (backgrounded): fire a local notification via `useNotifications.scheduleTaskReminder` identifying the phase that ended
    - On modal close while running: stop timer, cancel pending interval notification, discard interval count
    - Task-link option: show today's incomplete tasks; disable if no incomplete tasks today
    - Accept `initialTask` via `useLocalSearchParams` when launched from a task row
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x]* 26.2 Write property test for Pomodoro long-break trigger parity
    - **Property 7: Pomodoro long-break trigger parity** — for any completed work session count `n ≥ 1`, the break type is `'longBreak'` iff `n % SESSIONS_BEFORE_LONG_BREAK === 0`, otherwise `'break'`
    - Use `fc.nat({ min: 1, max: 200 })` to generate session counts; assert break type from hook state
    - **Validates: Requirements 11.2**

- [x] 27. Implement Focus Mode
  - [x] 27.1 Create `src/components/FocusMode.tsx` and integrate as a persistent root overlay
    - Implement as an `absolute`-positioned `View` with `zIndex: 100` rendered from `app/_layout.tsx` when a global focus task is set
    - Full mode: task title (truncated at 60 chars with ellipsis), elapsed time in MM:SS updating every second, complete button, next-task button
    - Minimized mode: compact pill at the bottom showing title (truncated at 30 chars) and elapsed time
    - On focused task completion: if other incomplete tasks exist today, offer advance or close; if none, offer close only
    - When Pomodoro Timer modal opens while Focus Mode is active, pass the focus task reference to the timer
    - When `AccessibilityInfo.isReduceMotionEnabled()`, disable slide-in transition animation
    - Accept `FocusModeProps`: `task`, `onComplete`, `onMinimize`, `onExit`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 21.5_

- [x] 28. Implement the Time Block View
  - [x] 28.1 Create `src/components/TimeBlockView.tsx` — hourly timeline from 06:00 to 23:00
    - Render scrollable `ScrollView` with one-hour rows from 06:00 to 23:00
    - Tasks with `dueTime` in range: colored block at the time slot, height proportional to `duration` (minimum 24 dp); `duration` not set → render at 24 dp minimum height
    - Tasks with `dueTime` outside range or no `dueTime`: render in "Unscheduled" section below timeline, sorted alphabetically by title
    - When `date` is today: render a horizontal current-time indicator line across the timeline
    - Tap a task block → open Edit Task modal for that task
    - Accept `TimeBlockViewProps`: `tasks`, `date`, `onTaskPress`, `onSlotPress?`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 29. Implement settings-related screens and components
  - [x] 29.1 Complete `app/(modals)/settings.tsx` — full Settings screen
    - Render sections: Appearance, Notifications, Data, Templates, Account, App Tour
    - Appearance: theme mode toggle (Light/Dark/Auto) and accent color picker showing all 10 `ACCENT_COLORS` from `useTheme`
    - Notifications: link to `NotificationSettings` component
    - Data: Reset All Data (confirmation dialog → delete all Firestore collections for the user → reset UI); JSON export via `exportData` + `expo-sharing`; JSON import via `expo-document-picker` + `importData`
    - Templates: link to `TaskTemplates` screen
    - Account: sign out, exit guest mode, take the App Tour
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 29.2 Create `src/components/NotificationSettings.tsx` — notification toggle and lead time selector
    - Enable/disable toggle; lead time selector (1–60 minutes); wire to `useNotifications`
    - When user revokes permission, cancel all pending notifications
    - _Requirements: 17.3, 17.4_

  - [x] 29.3 Create `src/components/TaskTemplates.tsx` — templates management screen
    - List all templates with title, topic, duration, description, subtasks
    - Create task from template: open Add Task form pre-filled with template data, date defaults to today
    - Delete template: confirmation dialog → remove from list and Firestore
    - Save task as template: prompt for non-empty name; inline validation error if empty
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 29.4 Create `src/components/ThemeCustomizer.tsx` — accent color picker
    - Render 10 color swatches from `ACCENT_COLORS`; call `setAccentColor` on selection
    - _Requirements: 19.2_

- [x] 30. Implement ICS import/export flow
  - [x] 30.1 Create `src/components/IcsImportPreview.tsx` — ICS import review modal
    - Reuse `importFromIcs` logic from `useProgress` (byte-for-byte identical, no platform I/O inside it)
    - Use `expo-document-picker` to select `.ics` files; cancel → return silently, no error
    - Show parsed events with selective import checkboxes; confirm → call `confirmImportFromIcs`
    - When `importFromIcs` returns `success: false`, show error toast with the error message
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.6_

- [x] 31. Implement the Voice Input component
  - [x] 31.1 Create `src/components/VoiceInput.tsx` — speech-to-text task entry
    - Use a speech-to-text library compatible with Expo SDK 52 for recognition; use `expo-speech` for TTS confirmation feedback
    - On non-empty transcript: parse using the same natural-language parsing logic as `frontend/src/components/VoiceInput.jsx`; display confirmation preview of parsed fields before adding task
    - On empty/unrecognizable transcript: show error message and prompt retry without creating a task
    - On service error: show error message with retry button
    - On microphone permission denied: show informational message and a button that opens app permission settings
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 32. Implement remaining dashboard and utility components
  - [x] 32.1 Create `src/components/ProductivityScore.tsx`
    - Show numeric score (0–100), level label, and breakdown of streak/completion/goal score components
    - Use theme tokens for all colors; no CSS
    - _Requirements: 9.1_

  - [x] 32.2 Create `src/components/GoalSetting.tsx`
    - Render primary daily task target (1–99, whole number) with inline edit
    - Render extra goals list (up to 10); add and remove controls; save immediately on change
    - Accept `GoalSettingProps`: `goals`, `topics`, `onSave`, `onClose`
    - _Requirements: 9.7, 9.8, 9.9_

  - [x] 32.3 Create `src/components/WeeklyReport.tsx`
    - Render daily completion bars for current and previous week from `thisWeekReport` and `lastWeekReport`
    - Replace `recharts` with `victory-native` `VictoryBar`; empty state message when no data
    - _Requirements: 9.4, 14.1_

  - [x] 32.4 Create `src/components/TimeTrackingStats.tsx`
    - Port from `frontend/src/components/TimeTrackingStats.jsx` replacing CSS styles with `StyleSheet` + tokens and removing `recharts`
    - _Requirements: 3.7_

  - [x] 32.5 Create `src/components/DailyNotes.tsx`
    - Multi-line `TextInput` with `KeyboardAvoidingView`; auto-save after 800 ms of inactivity via debounce ref
    - On save failure: inline error indicator; retain unsaved text in the field
    - _Requirements: 8.4, 8.5_

  - [x] 32.6 Create `src/components/QuickAdd.tsx`
    - Single-line text input + submit button; require non-empty title before calling `addTask`
    - _Requirements: 8.3_

  - [x] 32.7 Create `src/components/OverdueRolloverModal.tsx`
    - Show list of overdue tasks with rollover to today / reschedule / dismiss options
    - _Requirements: 8.7_

  - [x] 32.8 Create `src/components/SearchFilter.tsx` and `src/components/CommandPalette.tsx`
    - Port filter logic from `frontend/src/components/SearchFilter.jsx`; replace CSS with tokens
    - `CommandPalette`: full-screen overlay; open via header button on any tab (web: also ⌘K); implement `CommandPaletteProps` interface from design doc
    - _Requirements: 4.8_

  - [x] 32.9 Create `src/components/ArchiveManager.tsx`
    - Port from `frontend/src/components/ArchiveManager.jsx`; replace Supabase calls with `archiveTask`, `restoreTask`, `deleteArchivedTask` from `useProgress`
    - _Requirements: 5.1_

  - [x] 32.10 Create `src/components/WidgetView.tsx` and `src/components/ShortcutsModal.tsx`
    - Port from existing JSX files; replace CSS with `StyleSheet` + tokens; remove all `var(--` references
    - _Requirements: 3.7, 3.8_

  - [x] 32.11 Create `src/components/TimerAlert.tsx`
    - Port from `frontend/src/components/TimerAlert.jsx`; replace CSS with tokens; wire to `usePomodoro.timerAlert` and `startNextPhase`
    - _Requirements: 11.4, 11.5_

  - [x] 32.12 Create `src/components/AboutModal.tsx`
    - Port from `frontend/src/components/AboutModal.jsx`; replace CSS with tokens; open from Settings
    - _Requirements: 3.7_

- [x] 33. Implement notifications: tap-to-navigate and task highlight
  - [x] 33.1 Add `addNotificationResponseReceivedListener` in `app/_layout.tsx`
    - When a notification is tapped, navigate to the Today screen and scroll to and visually highlight the corresponding task for 3 seconds (use `Animated.sequence` or `react-native-reanimated`)
    - _Requirements: 17.5_

- [x] 34. Checkpoint — all four tabs and modals render without errors on all three targets
  - Run on web, iOS simulator, and Android emulator. Confirm task add/complete/delete, navigation, Pomodoro timer, and Focus Mode all work end-to-end. Ask the user if questions arise.

---

### Phase 5: Accessibility, App Tour, Distribution Prep, and Cleanup

- [x] 35. Add accessibility attributes to all interactive components
  - [x] 35.1 Audit all `Pressable` and `TouchableOpacity` elements across the codebase
    - Set `accessible={true}` and a descriptive `accessibilityLabel` on every element that performs an action
    - Set `accessibilityRole` to `'button'`, `'checkbox'`, `'tab'`, or `'link'` as appropriate
    - Set `accessibilityState={{ checked: task.completed }}` on all task completion checkbox elements
    - _Requirements: 21.1, 21.2, 21.3_

  - [x] 35.2 Implement focus management for modal screens
    - In each modal screen (`add-task`, `settings`, `pomodoro`, `overdue-rollover`), call `AccessibilityInfo.setAccessibilityFocus` on the first interactive element when the modal opens, using a `ref` and a `useEffect`
    - _Requirements: 21.4_

- [x] 36. Implement the App Tour
  - [x] 36.1 Create `src/components/AppTour.tsx` — step-by-step onboarding overlay
    - Highlight in sequence: Today tab, Add Task button, Goal Setting card, Pomodoro Timer button, Settings entry point
    - Trigger automatically after a 600 ms delay when the app loads and `AsyncStorage` does not contain `app_tour_completed`
    - On complete: write `app_tour_completed: 'true'` to `AsyncStorage`
    - On skip/dismiss: write `app_tour_completed: 'true'` to `AsyncStorage`; do not show again
    - "Take the Tour" in Settings: delete `app_tour_completed` from `AsyncStorage` and restart from step 1
    - Accept `AppTourProps`: `isVisible`, `onComplete`, `onSkip`, `steps`
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 37. Replace placeholder assets with final distribution assets
  - [x] 37.1 Update app icon and splash screen to final dimensions
    - Replace `assets/icon.png` with a final 1024×1024 px PNG
    - Replace `assets/splash.png` with a final 1242×2688 px PNG
    - Verify `app.json` references are correct
    - _Requirements: 22.2_

- [x] 38. Final code hygiene — remove all web-only patterns
  - [x] 38.1 Verify no `var(--` CSS variable references remain anywhere in `src/` or `app/`
    - Search entire codebase for `var(--`; fix any remaining occurrences by replacing with `tokens.*` values
    - _Requirements: 3.8_

  - [x] 38.2 Verify no `recharts` imports remain in the codebase
    - Search for `from 'recharts'`; remove any remaining imports
    - _Requirements: 14.1, 2.3_

  - [x] 38.3 Verify no `lucide-react` imports remain (only `lucide-react-native`)
    - Search for `from 'lucide-react'` (exact, not `lucide-react-native`); replace any remaining with `lucide-react-native`
    - _Requirements: 2.4_

  - [x] 38.4 Remove the `frontend/` directory
    - Confirm that no file in `app/` or `src/` imports from `../frontend/` or `../../frontend/`; then delete the `frontend/` directory
    - _Requirements: 1.1_

- [x] 39. Final checkpoint — full end-to-end validation
  - Run all property tests with `npx vitest --run`. Run `npx expo-doctor`. Verify app builds (`npx expo export --platform web`) without errors. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for an MVP build
- Property tests require `fast-check` added as a dev dependency
- Each task references specific requirements for traceability
- Checkpoints (tasks 2, 11, 17, 34, 39) ensure each phase is stable before the next begins
- The `frontend/` directory is left untouched until Task 38.4 so the original app remains a running reference throughout
- Platform-specific file branching (`.web.tsx` / `.native.tsx`) is used for `Sidebar` and any component requiring substantially different implementations per platform; `Platform.OS` inline checks handle minor variations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.7", "1.8"] },
    { "id": 2, "tasks": ["1.6", "3.1"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 6, "tasks": ["6.6", "6.7", "8.1", "9.1"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["12.2"] },
    { "id": 10, "tasks": ["13.1"] },
    { "id": 11, "tasks": ["13.2", "13.3", "15.1", "15.2", "16.1"] },
    { "id": 12, "tasks": ["14.1", "14.2", "14.3", "14.4"] },
    { "id": 13, "tasks": ["18.1", "18.2", "18.3", "18.4"] },
    { "id": 14, "tasks": ["19.1", "20.1"] },
    { "id": 15, "tasks": ["21.1", "22.1", "25.1", "25.2", "25.3", "25.4"] },
    { "id": 16, "tasks": ["22.2", "22.3", "23.1", "24.1", "24.2", "26.1", "27.1", "28.1"] },
    { "id": 17, "tasks": ["26.2", "29.1", "29.2", "29.3", "29.4", "30.1", "31.1"] },
    { "id": 18, "tasks": ["32.1", "32.2", "32.3", "32.4", "32.5", "32.6", "32.7", "32.8", "32.9", "32.10", "32.11", "32.12"] },
    { "id": 19, "tasks": ["33.1"] },
    { "id": 20, "tasks": ["35.1", "35.2", "36.1"] },
    { "id": 21, "tasks": ["37.1"] },
    { "id": 22, "tasks": ["38.1", "38.2", "38.3"] },
    { "id": 23, "tasks": ["38.4"] }
  ]
}
```
