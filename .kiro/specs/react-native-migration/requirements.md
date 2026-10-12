# Requirements Document

## Introduction

This document covers the migration of the Daily Planner web application from a React 19 + Vite single-page app to a React Native + Expo application targeting iOS, Android, and Web from a single shared codebase. The existing `frontend/` directory is fully replaced by a new Expo project at the repository root (or in an `app/` directory at the root). The backend migrates from Supabase to Firebase: Firestore for data storage and Firebase Auth for authentication.

The existing app has ~30 UI components, 7 pages, 9 custom hooks, and a Supabase backend. The migration preserves complete feature parity while replacing all web-only APIs and libraries with React Native equivalents, and replacing all Supabase calls with Firebase SDK calls.

The resulting app must be distributable on the Apple App Store, Google Play Store, and remain accessible as a web app (Expo Web / React Native Web).

## Glossary

- **App**: The Daily Planner React Native + Expo application being created.
- **RN**: React Native — the cross-platform UI framework.
- **Expo**: The managed workflow and toolchain used to build and distribute the App.
- **Expo_Router**: The file-based navigation library (`expo-router`) replacing `react-router-dom`.
- **RN_Web**: React Native Web — the library that renders RN primitives in a browser.
- **Firebase**: The Google cloud platform providing Firebase Auth and Firestore used by the App.
- **Firestore**: Firebase Cloud Firestore — the NoSQL document database replacing the previous Supabase PostgreSQL backend.
- **Firebase_Auth**: The Firebase Authentication service replacing the previous Supabase Auth service.
- **Firebase_SDK**: The Firebase JavaScript SDK v10+ used in the App for both web and native targets.
- **Theme_Context**: The JS-based theme system replacing CSS variables (`var(--accent-blue)` etc.).
- **Theme_Token**: A named key in Theme_Context resolved to a concrete color or spacing value at runtime.
- **Navigation_Bar**: The bottom tab bar shown on mobile (iOS/Android), equivalent to the desktop sidebar's primary navigation.
- **Sidebar**: The collapsible left-side navigation panel rendered only on the web platform at wide viewports.
- **Task**: A user-created item with title, date, duration, topic, priority, subtasks, and recurrence.
- **Topic**: A user-defined category with a name and color, used to group Tasks.
- **Goal**: A daily target (task count, focus time, or all-tasks-by-priority) tracked against same-day Task completion.
- **Pomodoro_Timer**: The work/break interval timer feature.
- **Focus_Mode**: The fullscreen single-task view that persists across navigation.
- **Guest_Mode**: Offline-first mode where the user is signed in with Firebase Auth anonymous sign-in; data is written to Firestore under the anonymous UID and cached locally in AsyncStorage.
- **AsyncStorage**: The React Native key-value persistence library (`@react-native-async-storage/async-storage`), used as a local cache for offline resilience.
- **ICS**: iCalendar format used for calendar import/export.
- **Heatmap**: The contribution-graph-style completion calendar component.
- **Productivity_Score**: The composite score (0–100) derived from streak, completion rate, and goal attainment.
- **App_Root**: The single Expo project directory that replaces the previous `frontend/` directory; located at the repository root or in a top-level `app/` directory.

---

## Requirements

### Requirement 1: Project Scaffolding and Structure

**User Story:** As a developer, I want a single Expo project that replaces the existing `frontend/` Vite app, so that the codebase has one entry point targeting web, iOS, and Android without a parallel legacy project.

#### Acceptance Criteria

1. THE App SHALL be created as a new Expo SDK 52+ project at the App_Root using the `expo-router` template, fully replacing the `frontend/` directory.
2. THE App SHALL use `expo-router` v4 with the file-based routing convention under `app/` within the App_Root.
3. THE App_Root SHALL include a `package.json` that is independent of the previous `frontend/package.json`, with no dependency on the Vite build toolchain.
4. WHEN the `frontend/src/hooks/` directory contains at least one file, THE App SHALL copy all files from `frontend/src/hooks/` into `src/hooks/` at the App_Root such that every line not containing a `localStorage`, Supabase, or Firestore API call is byte-for-byte identical to the corresponding line in the source file.
5. WHEN the `frontend/src/lib/` directory contains at least one file, THE App SHALL copy all files from `frontend/src/lib/` into `src/lib/` at the App_Root such that every line not containing a `localStorage` or Supabase API call is byte-for-byte identical to the corresponding line in the source file.
6. WHERE a copied hook or lib file contains a `localStorage` call, THE App SHALL replace only that call with the equivalent AsyncStorage call, leaving all other lines unchanged.
7. WHERE a copied hook or lib file contains a Supabase client call, THE App SHALL replace only that call with the equivalent Firebase SDK call, leaving all other lines unchanged.
8. WHERE a copied hook or lib file contains no `localStorage` or Supabase calls, THE App SHALL copy the file without any modifications.
9. THE App_Root SHALL include a `.gitignore` that explicitly lists `node_modules/`, `.expo/`, `dist/`, `*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`, and `*.orig.*` as ignored paths.

---

### Requirement 2: Dependency Selection and Pinning

**User Story:** As a developer, I want all third-party dependencies pinned to exact versions compatible with the chosen Expo SDK, so that builds are reproducible and App Store submissions do not break on dependency drift.

#### Acceptance Criteria

1. THE App SHALL declare the following core dependencies in `package.json` at exact versions validated by `expo-doctor` for Expo SDK 52: `expo`, `react-native`, `expo-router`, `firebase`, `@react-native-async-storage/async-storage`, `expo-notifications`, `expo-av`, `expo-document-picker`, `expo-sharing`, `expo-speech`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, and `react-native-screens`, with no version range operators (no `^`, `~`, or `*`) in any of their version strings.
2. THE App SHALL use the Firebase JavaScript SDK v10+ (`firebase` npm package) as the sole Firebase client, initialised once in `src/lib/firebase.ts` using `initializeApp`, `getFirestore`, and `getAuth`.
3. THE App SHALL replace `recharts` with a single charting library — either `victory-native` or `react-native-gifted-charts` — selected based on which library's npm peer dependency list includes React Native at the version required by Expo SDK 52, applied consistently across all chart and heatmap components with no remaining imports from `recharts`.
4. THE App SHALL replace `lucide-react` with `lucide-react-native` for all icon usage, with no remaining imports from `lucide-react` anywhere in the App_Root codebase.
5. THE App SHALL NOT introduce any dependency whose installation requires running `expo eject`, `expo prebuild --no-install`, or any step that produces an `ios/` or `android/` native project directory.
6. WHEN `expo-doctor` or `npx expo install --check` reports a version mismatch, THE App SHALL update that library to the version specified by the Expo SDK 52 compatibility matrix and record the original version, resolved version, and reason in `DEPENDENCIES.md` at the App_Root.
7. IF a required dependency has no Expo SDK 52 compatible release, THEN THE App SHALL document the incompatibility in `DEPENDENCIES.md` and substitute a functionally equivalent compatible library, with the substitution recorded before any code referencing the incompatible library is committed.

---

### Requirement 3: JS-Based Theme System

**User Story:** As a user, I want the app to respect my light/dark mode preference and custom accent color, so that the visual experience is consistent with what I had in the web app.

#### Acceptance Criteria

1. THE Theme_Context SHALL expose `{ theme, themeMode, setThemeMode, toggleTheme, accentColor, setAccentColor }` matching the existing `useTheme` hook API.
2. WHEN `themeMode` is `'auto'` and the device returns a non-null color scheme from `Appearance.getColorScheme()`, THE Theme_Context SHALL resolve `theme` to `'dark'` if the device scheme is `'dark'`, and to `'light'` otherwise.
3. WHEN `themeMode` is `'auto'` and `Appearance.getColorScheme()` returns `null`, THE Theme_Context SHALL resolve `theme` to `'light'`.
4. WHEN the app starts, THE Theme_Context SHALL read `themeMode` from AsyncStorage under the key `ip_theme` and `accentColor` from AsyncStorage under the key `ip_accent_color`; IF no stored value is found for `themeMode`, THEN the default value SHALL be `'light'`; IF no stored value is found for `accentColor`, THEN the default SHALL be `'#3b82f6'`.
5. THE Theme_Context SHALL expose a `tokens` object that maps every token name used in the existing `frontend/src/App.css` (including `--bg-primary`, `--bg-secondary`, `--bg-input`, `--border-primary`, `--border-secondary`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-blue`, `--accent-green`, `--accent-orange`, `--accent-red`, `--accent-purple`) to a concrete color or style value for both `'dark'` and `'light'` theme values.
6. WHEN `accentColor` is changed, THE Theme_Context SHALL update the `--accent-blue` and `--accent-primary` token values within one render cycle (≤ 16 ms) without requiring an app restart.
7. THE App SHALL apply theme values via `StyleSheet.create()` objects or inline style props using `tokens` object values.
8. THE App_Root SHALL contain no CSS files and no string references matching the pattern `var\(--[a-z]`.

---

### Requirement 4: Navigation Architecture

**User Story:** As a user, I want smooth, platform-appropriate navigation between Dashboard, Today, Week, Calendar, and secondary screens, so that the app feels native on my device.

#### Acceptance Criteria

1. THE Expo_Router SHALL define a root layout at `app/_layout.tsx` within the App_Root that wraps all screens in `ThemeProvider`, `AccessibilityProvider`, and `GestureHandlerRootView`.
2. THE App SHALL implement a tab navigator at `app/(tabs)/_layout.tsx` with exactly four primary tabs: Dashboard, Today, Week, and Calendar.
3. WHEN the platform is `ios` or `android`, THE App SHALL render the Navigation_Bar at the bottom of the screen.
4. WHEN the platform is `web` and the viewport width is greater than 768px, THE App SHALL render the Sidebar instead of the Navigation_Bar.
5. WHEN the platform is `web` and the viewport width is 768px or less, THE App SHALL render the Navigation_Bar instead of the Sidebar.
6. THE App SHALL implement a stack navigator for the following modal-style screens: Add Task, Edit Task, Settings, Pomodoro Timer, Focus Mode, Overdue Rollover, and Auth.
7. WHEN the user presses the hardware back button on Android or performs the iOS swipe-back gesture, THE App SHALL dismiss the current modal screen, return to the previous tab, and preserve any unsaved field values entered in the dismissed screen.
8. WHEN the user activates the Search/Command Palette trigger (header button on any tab screen), THE App SHALL open the Command Palette overlay.

---

### Requirement 5: Data Persistence and Guest Mode

**User Story:** As a user, I want my tasks, topics, goals, and notes to be saved to Firestore when I am signed in (including as a guest), and available offline via a local cache, so that I never lose data regardless of network state.

#### Acceptance Criteria

1. WHEN the authenticated user creates, updates, or deletes a task, topic, goal, or note, THE App SHALL write the change to Firestore under `users/{userId}/tasks`, `users/{userId}/topics`, `users/{userId}/goals/daily`, or `users/{userId}/notes` respectively, and reflect the updated state in the UI within 2 seconds under normal network conditions.
2. WHEN the authenticated user opens the App, THE App SHALL subscribe to Firestore `onSnapshot` listeners on all five collections (`tasks`, `topics`, `goals`, `notes`, `templates`) and render the task list as soon as the first snapshot is received.
3. WHILE the device has no network connection, THE App SHALL serve all reads from the Firestore offline persistence cache and queue writes for delivery when connectivity is restored.
4. WHEN the authenticated user opens the App, THE App SHALL complete the initial data load and render the task list within 3 seconds for a dataset of up to 500 tasks on a network with a minimum download speed of 10 Mbps.
5. IF a Firestore write operation fails due to a non-offline error, THEN THE App SHALL retain the in-memory state, display an error message indicating the sync failure, and remain fully operable without crashing.
6. WHEN the user triggers an undo or redo action, THE App SHALL reverse or reapply the most recent add, edit, complete-toggle, or delete task operation, up to a maximum history depth of 50 operations.
7. WHEN the user changes the sidebar compact preference or dismisses the rollover modal, THE App SHALL persist that setting to AsyncStorage so that it is restored on the next app launch.
8. THE App SHALL use Firestore document IDs as task and resource IDs for all authenticated users (including anonymous users in Guest Mode).
9. THE App SHALL cache the most recent snapshot of each Firestore collection in AsyncStorage under keys prefixed with `cache_` so that the app can render stale data instantly on launch before the first `onSnapshot` update arrives.

---

### Requirement 6: Authentication

**User Story:** As a user, I want to sign in with email and password, sign up for a new account, reset my password, and use Guest Mode, so that I have full control over my data and account.

#### Acceptance Criteria

1. WHEN the user submits the sign-in form with a valid email (RFC 5321 format, maximum 254 characters) and password (minimum 8 characters, maximum 128 characters), THE App SHALL authenticate via Firebase Auth `signInWithEmailAndPassword` and navigate to the Home screen within 5 seconds.
2. WHEN the user submits the sign-up form with a valid email and a password between 8 and 128 characters, THE App SHALL create a new Firebase Auth account via `createUserWithEmailAndPassword` and display a confirmation message.
3. IF sign-in or sign-up fails, THEN THE App SHALL display an error message indicating the reason (invalid credentials, email already in use, or network error) and retain the submitted email in the input field.
4. WHEN the user submits the password reset form with a registered email address, THE App SHALL call `sendPasswordResetEmail` via Firebase Auth and display a confirmation message indicating that a reset email has been sent.
5. IF the password reset submission fails, THEN THE App SHALL display an error message indicating the failure and retain the submitted email in the input field.
6. WHEN the user selects Guest Mode entry, THE App SHALL sign the user in anonymously via Firebase Auth `signInAnonymously`, set `guest_mode: 'true'` in AsyncStorage, and navigate to the Home screen.
7. WHEN the user exits Guest Mode, THE App SHALL call `deleteUser` on the anonymous Firebase Auth account to remove the anonymous UID and its associated Firestore data, remove the `guest_mode` key from AsyncStorage, and navigate to the Auth screen.
8. WHILE the app is in Guest Mode, THE App SHALL display a Guest Mode banner on every primary screen.
9. WHEN the user signs out, THE App SHALL call `signOut` via Firebase Auth, remove the `guest_mode` key from AsyncStorage, and navigate to the Landing screen.
10. WHEN an unauthenticated user (no active Firebase Auth session) opens the app, THE App SHALL display the Landing screen.
11. WHEN a user in Guest Mode links their anonymous account to an email/password credential via Firebase Auth `linkWithCredential`, THE App SHALL retain all existing Firestore data under the same UID and remove the Guest Mode banner without requiring the user to re-enter their data.

---

### Requirement 7: Core Task Management UI

**User Story:** As a user, I want to add, edit, complete, delete, and reorder tasks from the Today and Calendar views, so that I can manage my day on my phone just as I do on the web.

#### Acceptance Criteria

1. THE App SHALL implement an Add/Edit Task bottom sheet or modal screen that accepts: title (required, 1–120 characters), description (optional, 0–500 characters), topic (optional), duration (optional, 1–480 minutes), date (optional, defaults to today), due time (optional), priority (optional, defaults to None), subtasks (optional, 0–20 subtasks each 1–120 characters), recurrence pattern (optional, defaults to none), recurrence end date (optional), and task dependencies (optional).
2. WHEN the task title field is empty and the user submits the form, THE App SHALL display an inline error message beneath the title field and prevent submission.
3. WHEN the task title exceeds 120 characters, THE App SHALL prevent further input and display an inline character-limit error message.
4. WHEN a task with the same title already exists on the same date, THE App SHALL display a duplicate warning with options to proceed or cancel.
5. THE App SHALL support all recurrence options: none, daily, weekdays, weekly, and custom day-of-week selection.
6. IF a recurrence pattern other than none is selected and no recurrence end date is provided, THEN THE App SHALL apply a default recurrence end date of 365 days from the task date.
7. THE App SHALL render topic selector chips and a "New topic" inline form with a color-picker.
8. THE App SHALL render priority selector buttons (None, High, Medium, Low) with color-coded borders.
9. THE App SHALL render a subtask list with add and remove controls, supporting up to 20 subtasks.
10. THE App SHALL implement task dependency selection showing only incomplete tasks from the same date range.
11. IF a selected dependency task is completed or deleted before the dependent task is saved, THEN THE App SHALL remove that dependency and display an inline warning.
12. WHEN a task is marked complete, THE App SHALL trigger a confetti animation that plays for 1–3 seconds and then automatically dismisses.
13. THE App SHALL implement swipe-to-complete and swipe-to-delete gestures on task list items, requiring a minimum swipe distance of 80 dp to trigger the action.

---

### Requirement 8: Today Page

**User Story:** As a user, I want to see all of today's tasks with progress, goals, notes, and quick-add functionality on the Today screen, so that I can manage my current day at a glance.

#### Acceptance Criteria

1. THE App SHALL render today's task list grouped by topic with completion checkboxes, priority indicators, due time, and duration badges; tasks without a topic SHALL appear in a group labelled "Uncategorized."
2. THE App SHALL render the Daily Goals card showing the primary task-count goal and any extra goals with progress bars.
3. THE App SHALL render a Quick Add bar that requires a non-empty title before saving.
4. THE App SHALL render the Daily Notes section supporting multi-line text input with auto-save after 800 ms of inactivity.
5. WHEN auto-save fails, THE App SHALL display an inline error indicator and retain the unsaved text in the input field.
6. WHEN there are incomplete tasks from past dates, THE App SHALL display a badge on the Today tab showing the overdue count, capped at 99.
7. WHEN the user opens the Today screen for the first time on a given calendar day and there are incomplete tasks from past dates, THE App SHALL show the Overdue Rollover modal.
8. THE App SHALL support drag-and-drop reordering of task items; WHEN the user drops a task at a new position, THE App SHALL persist the new order immediately.

---

### Requirement 9: Dashboard Page

**User Story:** As a user, I want to see my productivity metrics, streak, weekly report, heatmap, and topic breakdown on the Dashboard, so that I can review my overall progress.

#### Acceptance Criteria

1. THE App SHALL render the Productivity Score card with a numeric score (0–100), a level label, and a breakdown showing the streak, completion, and goal score components.
2. THE App SHALL render a contribution heatmap for the last 12 weeks where each cell represents the count of tasks completed on that calendar day.
3. THE App SHALL render the streak card showing current streak count, best streak count, and a studied-today indicator that is active when at least one task was completed on the current calendar day.
4. THE App SHALL render the Weekly Report card with daily completion bars for the current and previous week.
5. THE App SHALL render the Topic Balance chart showing percentage time distribution per topic.
6. THE App SHALL render the Best Hours chart showing task completion counts by hour of day.
7. THE App SHALL render the Goal Setting card displaying the current primary daily task target (a whole number between 1 and 99).
8. WHEN the user edits the primary daily task target, THE App SHALL save the new value immediately and update the goal progress bar on the same screen.
9. WHEN the user adds or removes an extra goal, THE App SHALL update the goal list immediately, supporting up to 10 extra goals.
10. WHEN the viewport width is less than 768px, THE App SHALL render dashboard cards in a single-column vertical scroll layout.
11. WHEN the viewport width is 768px or greater, THE App SHALL render dashboard cards in a two-column grid layout.

---

### Requirement 10: Week and Calendar Pages

**User Story:** As a user, I want to browse tasks by week and by calendar month, so that I can plan ahead and review past days.

#### Acceptance Criteria

1. THE App SHALL implement the Week screen displaying 7 day columns (Mon–Sun) with the current day selected by default; WHEN the device viewport width is less than 360 dp, THE App SHALL enable horizontal scrolling across the 7 columns.
2. WHEN a day column is tapped, THE App SHALL expand that day's task list inline; WHEN a second day column is tapped, THE App SHALL collapse the previously expanded column and expand the new one.
3. THE App SHALL implement the Calendar screen with a monthly grid showing each day's completion as "completed/total" (e.g., "2/5").
4. WHEN a calendar day is tapped, THE App SHALL open a day detail bottom sheet listing all tasks for that date with incomplete tasks shown before completed tasks.
5. WHEN the user performs a left swipe on the Week or Calendar screen, THE App SHALL navigate to the next week or month.
6. WHEN the user performs a right swipe on the Week or Calendar screen, THE App SHALL navigate to the previous week or month.
7. WHEN a day is selected in Week or Calendar view, THE App SHALL display an "Add task" button that opens the Add Task form with that date pre-filled.

---

### Requirement 11: Pomodoro Timer

**User Story:** As a user, I want to run Pomodoro work/break intervals linked to a specific task, so that I can use focused time-boxing on my phone.

#### Acceptance Criteria

1. THE App SHALL implement the Pomodoro Timer as a modal screen accessible from the Navigation_Bar action button and from individual task items.
2. THE Pomodoro_Timer SHALL support configurable work intervals (default 25 min), short breaks (default 5 min), and long breaks (default 15 min); the long break SHALL trigger after every 4 completed work intervals; the interval count SHALL reset to 0 when the modal is opened.
3. THE App SHALL display the remaining time in MM:SS format, the current phase name ("Work", "Short Break", or "Long Break"), and the current interval count at all times while the Timer modal is open.
4. WHEN a Pomodoro interval completes, THE App SHALL pause and wait for the user to confirm starting the next interval before advancing.
5. WHEN a Pomodoro interval completes and the app is in the foreground, THE App SHALL play an alert sound via `expo-av` and display a TimerAlert overlay.
6. WHEN the Pomodoro_Timer is running and the app is backgrounded, THE App SHALL continue the countdown and fire a local notification when the interval ends identifying which phase (work or break) has ended.
7. WHEN the user closes the Timer modal while a session is running, THE App SHALL stop the timer, cancel any pending interval notification, and discard the current interval count.
8. WHEN the user links the Timer to a task, THE App SHALL display that task's title for the duration of the session; IF today's list has no incomplete tasks, THE App SHALL disable the task-link option.

---

### Requirement 12: Focus Mode

**User Story:** As a user, I want a fullscreen focus view for a single task that persists as I switch tabs, so that I stay aware of my current focus task while navigating the app.

#### Acceptance Criteria

1. THE App SHALL implement Focus Mode as a persistent overlay rendering above tab content but below modals, using an Expo Router layout component.
2. WHEN Focus Mode is active and not minimized, THE App SHALL display the task title (truncated at 60 characters with ellipsis), elapsed time in MM:SS format updating every second, a complete button, and a next-task button.
3. WHEN the user minimizes Focus Mode, THE App SHALL display a compact pill overlay at the bottom of the screen showing the task title (truncated at 30 characters) and elapsed time.
4. WHEN the focused task is marked complete and at least one other incomplete task exists for today, THE App SHALL offer to advance to the next incomplete task or close Focus Mode; WHEN no other incomplete task exists, THE App SHALL offer only to close Focus Mode.
5. WHEN Focus Mode is active, THE App SHALL pass the active focus task reference to the Pomodoro Timer if the Timer modal is opened.

---

### Requirement 13: Time Block View

**User Story:** As a user, I want to see today's tasks laid out on an hourly timeline, so that I can visualize how my day is allocated.

#### Acceptance Criteria

1. THE App SHALL implement the Time Block View as a scrollable hourly timeline from 06:00 to 23:00.
2. WHEN a task has a `dueTime` within 06:00–23:00, THE App SHALL render it as a colored block at the corresponding time slot with height proportional to `duration` and a minimum height of 24 dp; WHEN `duration` is not set, THE App SHALL render the block at the minimum height of 24 dp.
3. WHEN a task has a `dueTime` outside 06:00–23:00, THE App SHALL render it in an "Unscheduled" section below the timeline, sorted by task title alphabetically.
4. WHEN a task does not have a `dueTime`, THE App SHALL render it in the "Unscheduled" section.
5. WHEN today's date is selected, THE App SHALL render a horizontal current-time indicator line across the timeline.
6. WHEN a task block is tapped, THE App SHALL open the Edit Task modal for that task.

---

### Requirement 14: Charts and Analytics

**User Story:** As a user, I want all charts to render correctly on iOS, Android, and Web, so that my analytics are available regardless of platform.

#### Acceptance Criteria

1. THE App SHALL replace all `recharts` components with equivalents from the RN-compatible chart library chosen in Requirement 2, with no remaining imports from `recharts`.
2. THE App SHALL implement the `BestHoursChart` as a bar chart showing task completion counts per hour of day (0–23), with the peak hour highlighted in the accent color.
3. THE App SHALL implement the `LineChart` showing daily task completion count as a line over the last 30 days.
4. THE App SHALL implement the `Heatmap` as a grid of colored squares for the last 12 weeks; WHEN a cell is tapped, THE App SHALL navigate to the Calendar screen with that date selected.
5. THE App SHALL implement the `TopicBalance` chart showing percentage time per topic, displaying at most 5 topics with the remainder grouped as "Other."
6. WHEN any chart's data set is empty, THE App SHALL render an empty-state message in place of the chart.

---

### Requirement 15: ICS Import and Export

**User Story:** As a user, I want to import calendar events from an ICS file and export my tasks as an ICS file, so that I can sync with external calendar apps on mobile.

#### Acceptance Criteria

1. THE App SHALL implement ICS import via `expo-document-picker` allowing the user to select a file with the `.ics` extension from local or cloud storage.
2. THE App SHALL reuse the existing `importFromIcs` and `confirmImportFromIcs` functions from `useProgress` without modification.
3. THE App SHALL implement ICS export by writing the ICS string to a temporary file via `expo-file-system` and sharing it via `expo-sharing`.
4. THE App SHALL render the IcsImportPreview modal allowing the user to review and selectively import events before confirming.
5. WHEN the user cancels the document picker without selecting a file, THE App SHALL return to the previous screen without displaying an error.
6. WHEN `importFromIcs` returns `success: false`, THE App SHALL display an error toast containing the error message returned by `importFromIcs`.

---

### Requirement 16: Voice Input

**User Story:** As a user, I want to add a task by speaking its title, date, duration, and topic, so that I can capture tasks hands-free on mobile.

#### Acceptance Criteria

1. THE App SHALL implement Voice Input using a speech-to-text library compatible with Expo SDK 52 for recognition and `expo-speech` for text-to-speech confirmation feedback.
2. WHEN voice recognition returns a transcript with a non-empty title, THE App SHALL parse it using the same natural-language parsing logic as the existing `VoiceInput` component and display a confirmation preview showing the parsed fields before adding the task.
3. WHEN voice recognition returns a transcript with an empty or unrecognizable title, THE App SHALL display an error message and prompt the user to try again without creating a task.
4. WHEN voice recognition fails due to a service error, THE App SHALL display an error message describing the failure and offer a retry option.
5. WHEN the user denies microphone permission, THE App SHALL display an informational message explaining why the permission is needed and provide a button that opens the device's app permission settings.

---

### Requirement 17: Notifications

**User Story:** As a user, I want to receive local notifications reminding me of due tasks, so that I don't miss important items when the app is in the background.

#### Acceptance Criteria

1. THE App SHALL implement local notifications via `expo-notifications`.
2. WHEN the user grants notification permission, THE App SHALL schedule a local notification for each task that has a `dueTime` on the current day, firing at `dueTime` minus the user-configured lead time (range: 1–60 minutes, default: 5 minutes).
3. WHEN the user revokes notification permission, THE App SHALL cancel all pending notifications and disable further scheduling.
4. THE App SHALL implement a Notification Settings screen with a toggle to enable or disable notifications and a lead time selector (1–60 minutes).
5. WHEN a notification is tapped, THE App SHALL navigate to the Today screen and scroll to and visually highlight the corresponding task for 3 seconds.
6. WHEN a task with a scheduled notification is edited to change its `dueTime` or deleted, THE App SHALL cancel the existing notification and, if the task still has a future `dueTime`, reschedule a new notification.

---

### Requirement 18: Task Templates

**User Story:** As a user, I want to save tasks as reusable templates and create new tasks from them, so that I can quickly add recurring work without re-entering details.

#### Acceptance Criteria

1. THE App SHALL implement a Templates screen accessible from Settings showing all saved templates with their title, topic, duration, description, and subtasks.
2. WHEN the user creates a task from a template, THE App SHALL open the Add Task form pre-filled with the template's title, topic, duration, description, and subtasks, with the date field defaulting to today.
3. WHEN the user deletes a template, THE App SHALL display a confirmation dialog before deleting; WHEN confirmed, THE App SHALL remove the template from the list and from Firestore immediately.
4. WHEN the user saves a task as a template, THE App SHALL prompt for a non-empty template name; IF the name field is empty, THE App SHALL display an inline validation error and prevent saving.

---

### Requirement 19: Settings

**User Story:** As a user, I want to access all app settings from a single Settings screen, so that I can configure themes, notifications, data management, and account options.

#### Acceptance Criteria

1. WHEN the user opens the Settings screen, THE App SHALL display sections for: Appearance, Notifications, Data, Templates, Account, and App Tour.
2. THE Appearance section SHALL include a theme mode toggle (Light / Dark / Auto) and an accent color picker showing the 10 ACCENT_COLORS defined in `useTheme`.
3. WHEN the user initiates Reset All Data, THE App SHALL display a confirmation dialog; WHEN the user confirms, THE App SHALL delete all documents in `users/{userId}/tasks`, `users/{userId}/topics`, `users/{userId}/goals`, `users/{userId}/notes`, and `users/{userId}/templates` from Firestore and reset the UI to the initial empty state.
4. WHEN the user triggers JSON export, THE App SHALL call the existing `exportData` function and share the resulting file via `expo-sharing`.
5. WHEN the user triggers JSON import, THE App SHALL open `expo-document-picker`, pass the selected file content to the existing `importData` function, and display a success or error toast based on the result.

---

### Requirement 20: App Tour and Onboarding

**User Story:** As a first-time user, I want a guided walkthrough of the app's key features, so that I can learn the interface quickly.

#### Acceptance Criteria

1. WHEN the app finishes loading data for the first time and AsyncStorage does not contain the key `app_tour_completed`, THE App SHALL start the App Tour after a 600 ms delay.
2. THE App Tour SHALL highlight in sequence: Today tab, Add Task button, Goal Setting card, Pomodoro Timer button, and Settings entry point.
3. WHEN the user completes the final tour step, THE App SHALL write `app_tour_completed: 'true'` to AsyncStorage.
4. WHEN the user dismisses the tour before completing all steps, THE App SHALL write `app_tour_completed: 'true'` to AsyncStorage and not show the tour again on subsequent launches.
5. WHEN the user selects "Take the Tour" from the account menu, THE App SHALL delete the `app_tour_completed` key from AsyncStorage and restart the tour from step 1.

---

### Requirement 21: Accessibility

**User Story:** As a user with accessibility needs, I want all interactive elements to be reachable by screen reader and keyboard, so that I can use the app with VoiceOver or TalkBack.

#### Acceptance Criteria

1. THE App SHALL set `accessible={true}` and a descriptive `accessibilityLabel` on every `Pressable` and `TouchableOpacity` element that performs an action.
2. THE App SHALL set `accessibilityRole` to the appropriate value (`'button'`, `'checkbox'`, `'tab'`, or `'link'`) on all interactive elements.
3. THE App SHALL set `accessibilityState={{ checked: task.completed }}` on all task completion checkbox elements.
4. WHEN a modal screen opens, THE App SHALL move focus to the modal's first interactive element using `AccessibilityInfo.setAccessibilityFocus`.
5. WHEN the device has reduced motion enabled (`AccessibilityInfo.isReduceMotionEnabled()` returns `true`), THE App SHALL disable confetti, slide-in, and transition animations.

---

### Requirement 22: Platform Distribution

**User Story:** As a developer, I want the app configured for App Store and Play Store submission, so that users can download it from official stores.

#### Acceptance Criteria

1. THE App SHALL include `app.json` at the App_Root with `name`, `slug`, `version`, `ios.bundleIdentifier`, `android.package`, `android.versionCode`, `icon` (path to a 1024×1024 px PNG), `splash.image` (path to a 1242×2688 px PNG), and `scheme` fields.
2. THE App SHALL include app icon assets at exactly 1024×1024 px and splash screen assets at exactly 1242×2688 px under `assets/` at the App_Root.
3. THE App SHALL configure `expo-notifications` in `app.json` with iOS permission strings `NSUserNotificationUsageDescription`, and Android permissions `RECEIVE_BOOT_COMPLETED` and `SCHEDULE_EXACT_ALARM`.
4. THE App SHALL include `eas.json` at the App_Root with `development`, `preview`, and `production` build profiles targeting the Expo managed workflow.
5. WHEN built for iOS, THE App SHALL declare `ios.minimumOsVersion: "16.0"` in `app.json`.
6. WHEN built for Android, THE App SHALL declare `android.minSdkVersion: 26` in `app.json`.

---

### Requirement 23: Firestore Data Layer

**User Story:** As a developer, I want a clean data access layer over Firestore, so that UI components are decoupled from Firestore SDK calls and the migration from the previous Supabase client is contained to one place.

#### Acceptance Criteria

1. THE App SHALL implement a `src/lib/firebase.ts` module that initialises the Firebase app exactly once via `initializeApp` and exports `db` (Firestore instance) and `auth` (Firebase Auth instance).
2. THE App SHALL implement document mapping functions `docToTask(snapshot)` and `taskToDoc(task)` that convert between Firestore `DocumentSnapshot` objects and the camelCase task schema used in the existing `useProgress` hook, preserving all fields defined in the task schema.
3. THE App SHALL implement equivalent mapping functions `docToTopic`, `docToNote`, `docToGoals`, and `docToTemplate` for all other Firestore collections.
4. WHEN a task document is created or updated in Firestore, THE App SHALL use a Firestore `batch` write when the operation affects more than one document in the same request, so that partial writes do not leave data in an inconsistent state.
5. WHEN the App writes a task document to Firestore, THE App SHALL use the existing JS-generated `id` field as the Firestore document ID so that IDs are stable across offline/online transitions.
6. THE App SHALL enable Firestore offline persistence via `enableIndexedDbPersistence` on web or the default RN offline cache on iOS and Android, so that all reads succeed without a network connection after the first successful sync.

---

### Requirement 24: Parser Utilities (ICS and Duration)

**User Story:** As a developer, I want the ICS and duration parsing utilities to be reliably correct, so that imported calendar data and user-entered durations are never silently corrupted.

#### Acceptance Criteria

1. THE App SHALL reuse the existing `parseDuration` function from `AddTaskModal` without modification.
2. THE App SHALL expose a `formatDuration` pure function such that `parseDuration(formatDuration(n)) === n` for all integers `n` in the range 1–480 inclusive.
3. FOR ALL valid ICS strings produced by `exportAsIcs`, parsing the exported ICS with `importFromIcs` SHALL return task objects where each task's `title`, `date`, and `duration` are equal to the original task's values (round-trip property).
4. WHEN `parseDuration` receives an input string that does not match any supported format, THE App SHALL return `null` without throwing an exception.
