---
inclusion: always
---

# Project Structure

This document describes the actual directory layout of the Daily Planner cross-platform app.

## Overview

```
daily-planner/
├── app/
│   ├── (modals)/
│   │   ├── _layout.tsx
│   │   ├── add-task.tsx
│   │   ├── feedback.tsx
│   │   ├── overdue-rollover.tsx
│   │   ├── pomodoro.tsx
│   │   └── settings.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← SidebarLayout (web ≥768px) / NativeTabLayout (mobile)
│   │   ├── index.tsx            ← Dashboard screen
│   │   ├── today.tsx
│   │   ├── week.tsx
│   │   └── calendar.tsx
│   ├── _layout.tsx              ← Root layout (ThemeProvider, AuthGate, FocusProvider)
│   ├── auth.tsx                 ← Sign-in / sign-up / reset
│   └── index.tsx                ← Landing / redirect screen
│
├── src/
│   ├── components/
│   │   ├── navigation/          ← Navigation chrome
│   │   │   ├── NavigationBar.tsx
│   │   │   ├── Sidebar.ts       ← Platform barrel (resolves .web / .native)
│   │   │   ├── Sidebar.web.tsx
│   │   │   └── Sidebar.native.tsx
│   │   │
│   │   ├── task/                ← Task-domain components
│   │   │   ├── OverdueRolloverModal.tsx
│   │   │   ├── QuickAdd.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   └── TaskTemplates.tsx
│   │   │
│   │   ├── calendar/            ← Calendar / timeline components
│   │   │   ├── Heatmap.tsx
│   │   │   └── TimeBlockView.tsx
│   │   │
│   │   ├── planner/             ← Dashboard / analytics components
│   │   │   ├── BestHoursChart.tsx
│   │   │   ├── GoalSetting.tsx
│   │   │   ├── LineChart.tsx
│   │   │   ├── ProductivityScore.tsx
│   │   │   ├── TimeTrackingStats.tsx
│   │   │   ├── TopicBalance.tsx
│   │   │   └── WeeklyReport.tsx
│   │   │
│   │   └── (shared — flat)      ← Generic / cross-domain components
│   │       ├── AboutModal.tsx
│   │       ├── AppTour.tsx
│   │       ├── ArchiveManager.tsx
│   │       ├── CommandPalette.tsx
│   │       ├── Confetti.tsx
│   │       ├── DailyNotes.tsx
│   │       ├── DatePickerField.tsx
│   │       ├── DurationField.tsx
│   │       ├── FocusMode.tsx
│   │       ├── IcsImportPreview.tsx
│   │       ├── NotificationSettings.tsx
│   │       ├── ProfileMenu.tsx
│   │       ├── ProgressRing.tsx
│   │       ├── SearchFilter.tsx
│   │       ├── ShortcutsModal.tsx
│   │       ├── ThemeCustomizer.tsx
│   │       ├── TimePickerField.tsx
│   │       ├── TimerAlert.tsx
│   │       ├── VoiceInput.tsx
│   │       └── WidgetView.tsx
│   │
│   ├── context/                 ← React contexts (non-hook providers)
│   │   └── MobileHeaderContext.tsx
│   │
│   ├── hooks/                   ← Custom React hooks
│   │   ├── useAccessibility.ts
│   │   ├── useAuth.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useNotifications.ts
│   │   ├── usePomodoro.ts
│   │   ├── useProgress.ts
│   │   └── useTheme.tsx
│   │
│   ├── theme/                   ← Design tokens
│   │   └── tokens.ts            ← DARK_TOKENS / LIGHT_TOKENS (Tokens interface)
│   │
│   ├── lib/                     ← External service wrappers + mappers
│   │   ├── __tests__/
│   │   ├── firebase.ts          ← Firebase single-instance init + persistence
│   │   ├── firestoreMappers.ts  ← Firestore ↔ app type converters
│   │   └── utils.ts             ← fmtDuration, parseDuration, date helpers
│   │
│   ├── types/                   ← Shared TypeScript interfaces
│   │   └── index.ts             ← Re-exports Task and other shared types
│   │
│   ├── utils/                   ← Pure, side-effect-free helper functions
│   │   └── index.ts             ← clamp, isHexColor, …
│   │
│   ├── constants/               ← App-wide literal constants
│   │   └── index.ts             ← SIDEBAR_BREAKPOINT, OVERDUE_BADGE_MAX, …
│   │
│   └── services/                ← Future: external service adapters (analytics, etc.)
│
├── assets/
│   ├── icon.png                 ← 1024×1024 app icon
│   └── splash.png               ← 1242×2688 splash screen
│
├── .kiro/
│   ├── steering/
│   │   ├── PROJECT_STRUCTURE.md ← This file (always injected)
│   │   └── ui-rules.md          ← UI development rules (always injected)
│   └── specs/
│       └── react-native-migration/
│
├── _legacy_frontend/            ← ⚠️ DEPRECATED — original React/Vite/Supabase web app (reference only)
│
├── .env                         ← Firebase config (gitignored)
├── .env.example                 ← Documented env vars template
├── app.json                     ← Expo configuration
├── babel.config.js
├── eas.json                     ← EAS Build profiles
├── expo-env.d.ts
├── tsconfig.json                ← TypeScript + path aliases (@/*)
└── DEPENDENCIES.md              ← Pinned dependency rationale
```

## Key Conventions

### Path aliases
All imports use `@/` to resolve from the project root:
```ts
import { useTheme } from '@/src/hooks/useTheme'
import { fmtDuration } from '@/src/lib/utils'
import NavigationBar from '@/src/components/navigation/NavigationBar'
import TaskItem from '@/src/components/task/TaskItem'
```

### Component placement
| Category | Location |
|---|---|
| Navigation chrome (sidebar, tab bar) | `src/components/navigation/` |
| Task-related components | `src/components/task/` |
| Calendar / timeline components | `src/components/calendar/` |
| Dashboard / analytics components | `src/components/planner/` |
| Generic shared / cross-domain components | `src/components/` (flat) |
| One-off screen-specific pieces | co-located in the `app/` screen file |

### Platform-specific files
Use the `.web.tsx` / `.native.tsx` extension convention for platform variants,
with a `.ts` barrel that Metro resolves automatically:
```
Sidebar.ts          ← barrel: export default from './Sidebar.native'
Sidebar.web.tsx     ← rendered on web wide viewport
Sidebar.native.tsx  ← no-op on iOS/Android
```

### Styling
- All colors come from `useTheme().tokens` — never hardcode hex values.
- Spacing uses token values — no magic numbers in `StyleSheet`.
- `StyleSheet.create` via a `makeStyles(tokens)` factory function inside each component.
- `makeStyles(tokens)` is the established pattern; use it for all new components.

### makeStyles migration policy
See `ui-rules.md` for the full styling policy. Summary:
- All new components use `makeStyles(tokens)` with values from `useTheme().tokens`.
- No component should hardcode colors or spacing values.
- When a component is refactored, clean up any hardcoded values as part of that work.

### State and data
- `useProgress` owns all task/topic/goal data and Firestore subscriptions.
- `useAuth` owns Firebase Auth state.
- Screens receive data via hooks — no prop-drilling through navigation params except for IDs.
- `MobileHeaderContext` (`src/context/`) provides a lightweight pub/sub for the mobile search overlay.

### Testing
Property-based tests live in `src/**/__tests__/` and run with:
```bash
npx vitest --run
```
