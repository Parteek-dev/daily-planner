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
│   │   ├── profile.tsx
│   │   └── settings.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← SidebarLayout (web ≥768px) / NativeTabLayout (mobile)
│   │   ├── index.tsx            ← Dashboard screen
│   │   ├── today.tsx
│   │   ├── analytics.tsx
│   │   └── calendar.tsx
│   ├── _layout.tsx              ← Root layout (ThemeProvider, AuthGate, FocusProvider)
│   ├── auth.tsx                 ← Sign-in / sign-up / reset / email verification
│   ├── index.tsx                ← Landing / redirect screen
│   └── ui-demo.tsx              ← Component playground (dev only)
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
│   │   │   ├── AddTaskModal.tsx
│   │   │   ├── DayTimeline.tsx
│   │   │   ├── OverdueRolloverModal.tsx
│   │   │   ├── QuickAdd.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskTemplates.tsx
│   │   │   └── UnifiedTaskItem.tsx
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
│   │   ├── motion/              ← Animation primitives
│   │   │   ├── AnimatedGlow.tsx
│   │   │   ├── CrossfadeView.tsx
│   │   │   ├── FadeInView.tsx
│   │   │   ├── PressableScale.tsx
│   │   │   └── index.ts         ← Re-exports all motion components
│   │   │
│   │   ├── ui/                  ← Primitive UI building blocks
│   │   │   ├── Avatar.tsx
│   │   │   ├── CountCard.tsx
│   │   │   ├── DateStrip.tsx
│   │   │   ├── IconBadge.tsx
│   │   │   ├── PillTabs.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── TaskListItem.tsx
│   │   │   └── index.ts         ← Re-exports all ui components
│   │   │
│   │   └── (shared — flat)      ← Generic / cross-domain components
│   │       ├── AboutModal.tsx
│   │       ├── AppText.tsx
│   │       ├── AppTour.tsx
│   │       ├── ArchiveManager.tsx
│   │       ├── CalendarPicker.tsx
│   │       ├── Card.tsx
│   │       ├── CommandPalette.tsx
│   │       ├── Confetti.tsx
│   │       ├── ConfirmModal.tsx
│   │       ├── DailyNotes.tsx
│   │       ├── DatePickerField.tsx
│   │       ├── DurationField.tsx
│   │       ├── FocusMode.tsx
│   │       ├── GlassSurface.tsx
│   │       ├── GradientSurface.tsx
│   │       ├── IcsImportPreview.tsx
│   │       ├── NotificationSettings.tsx
│   │       ├── PomodoroModal.tsx
│   │       ├── ProfileMenu.tsx
│   │       ├── ProgressRing.tsx
│   │       ├── SearchFilter.tsx
│   │       ├── SegmentedToggle.tsx
│   │       ├── SettingsModal.tsx
│   │       ├── ShortcutsModal.tsx
│   │       ├── ThemeCustomizer.tsx
│   │       ├── TimePickerField.tsx
│   │       ├── TimerAlert.tsx
│   │       ├── VoiceInput.tsx
│   │       ├── WheelTimePicker.tsx
│   │       └── WidgetView.tsx
│   │
│   ├── context/                 ← React contexts (lightweight pub/sub, modal state)
│   │   ├── AddTaskModalContext.tsx
│   │   ├── MobileHeaderContext.tsx
│   │   ├── PomodoroMiniContext.tsx
│   │   ├── PomodoroModalContext.tsx
│   │   ├── SettingsModalContext.tsx
│   │   └── WidgetContext.tsx
│   │
│   ├── hooks/                   ← Custom React hooks
│   │   ├── __tests__/           ← Tests for non-trivial hook logic
│   │   ├── useAccessibility.ts
│   │   ├── useAuth.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMotion.ts
│   │   ├── useNotifications.ts
│   │   ├── usePomodoro.ts
│   │   ├── useProgress.ts
│   │   └── useTheme.tsx
│   │
│   ├── theme/                   ← Design tokens
│   │   └── tokens.ts            ← DARK_TOKENS / LIGHT_TOKENS (Tokens interface)
│   │
│   ├── lib/                     ← External service wrappers + mappers
│   │   ├── __tests__/           ← Tests for mappers and utils
│   │   ├── datetime.ts          ← Date/time helpers
│   │   ├── firebase.ts          ← Firebase single-instance init + persistence
│   │   ├── firestoreMappers.ts  ← Firestore ↔ app type converters
│   │   └── utils.ts             ← fmtDuration, parseDuration, general helpers
│   │
│   ├── types/                   ← Shared TypeScript interfaces
│   │   └── index.ts             ← Re-exports Task and other shared types
│   │
│   ├── utils/                   ← Pure, side-effect-free helper functions
│   │   ├── __tests__/           ← Tests for clamp, isHexColor, etc.
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
│
├── .env                         ← Firebase config (gitignored)
├── .env.example                 ← Documented env vars template
├── app.json                     ← Expo configuration
├── babel.config.js
├── eas.json                     ← EAS Build profiles
├── expo-env.d.ts
├── tsconfig.json                ← TypeScript + path aliases (@/*)
├── vitest.config.ts             ← Vitest test runner configuration
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
| Animation primitives | `src/components/motion/` |
| Primitive UI building blocks | `src/components/ui/` |
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
- `useAuth` owns Firebase Auth state (email verification enforced — unverified users are blocked).
- Screens receive data via hooks — no prop-drilling through navigation params except for IDs.
- `MobileHeaderContext` provides a lightweight pub/sub for the mobile search overlay.
- `PomodoroMiniContext` keeps the Pomodoro timer running when the modal is minimized.
- `WidgetContext` drives the floating widget overlay from the root layout.
- `AddTaskModalContext` / `SettingsModalContext` / `PomodoroModalContext` manage modal open state globally.

### Testing

#### Test runner
[Vitest](https://vitest.dev/) — configured in `vitest.config.ts` at the project root.

Run all tests once:
```bash
npx vitest --run
```

Run in watch mode during development:
```bash
npx vitest
```

Run a specific file:
```bash
npx vitest --run src/lib/__tests__/utils.test.ts
```

#### File placement convention

| What you're testing | Test file location |
|---|---|
| Pure utility / helper functions | `src/utils/__tests__/<name>.test.ts` |
| Library wrappers (Firestore mappers, utils, datetime) | `src/lib/__tests__/<name>.test.ts` |
| Custom hooks | `src/hooks/__tests__/<name>.test.ts` |
| Shared components | `src/components/__tests__/<name>.test.tsx` |
| Domain-specific components | co-located `__tests__/` inside the component folder, e.g. `src/components/task/__tests__/TaskItem.test.tsx` |
| Screen-level integration | `app/__tests__/<screen>.test.tsx` |
| Constants / config | `src/constants/__tests__/<name>.test.ts` |

#### Naming convention
- Test files: `<subject>.test.ts` or `<subject>.test.tsx`
- Describe blocks: name of the module or function under test
- It blocks: plain English describing the behaviour — `it('returns 0 for an empty list')`

#### What to test
- **Always test:** pure functions in `src/utils/`, `src/lib/utils.ts`, `src/lib/datetime.ts`, `src/lib/firestoreMappers.ts`
- **Test when logic is non-trivial:** custom hooks (`usePomodoro`, `useProgress` helpers), date arithmetic, score calculations
- **Skip:** render-only presentational components, simple wrappers, one-liner helpers

#### Example structure for a utility test
```ts
// src/utils/__tests__/clamp.test.ts
import { describe, it, expect } from 'vitest'
import { clamp } from '@/src/utils'

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to min', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
  })
  it('clamps to max', () => {
    expect(clamp(11, 0, 10)).toBe(10)
  })
})
```

#### Example structure for a hook test
```ts
// src/hooks/__tests__/usePomodoro.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'
import { usePomodoro } from '@/src/hooks/usePomodoro'

describe('usePomodoro', () => {
  beforeEach(() => vi.useFakeTimers())

  it('starts in idle state', () => {
    const { result } = renderHook(() => usePomodoro())
    expect(result.current.isRunning).toBe(false)
  })
})
```
