# Design — Component Test Infrastructure & Coverage

## Overview

This design adds React Native component-testing infrastructure to the Daily Planner app and specifies a test for every component, screen, and context file under `src/components/`, `app/`, and `src/context/`. The app is React Native 0.76.9 + Expo 52 + React Native Web 0.19 + TypeScript 5.3 + Expo Router 4, tested with Vitest 5.0.2. There are currently 11 test files (~130 assertions) that run in the `node` environment and test pure logic (`src/lib`, `src/utils`, `src/hooks` stat helpers). Those must keep passing unchanged.

Components render through the **react-native-web** path: `react-native` resolves to `react-native-web` in a browser-like environment, so RN primitives (`View`, `Text`, `Pressable`, `StyleSheet`, `Platform`) become DOM nodes we can render and query. The strategy is therefore: run component tests in a `jsdom` environment against the RNW render path, provide a shared mock layer for the native dependency surface that RNW does not cover (Expo modules, Firebase, Reanimated, Skia, victory, lucide, expo-router, AsyncStorage), and wrap every render in the **real** `ThemeProvider` so token usage is exercised rather than stubbed.

The single hard constraint driving most decisions: **`npx vitest --run` must end with every test green — the ~130 existing logic tests AND the new component tests in one run.** Pure-logic tests must not pay the cost of jsdom + RNW. This is solved with Vitest **projects** (workspace) so the two suites run in different environments within one invocation.

The five design goals are resolved in the numbered sections below.

---

## Goal 1 — Component testing approach

### Decision: jsdom environment + react-native-web render path + `@testing-library/react` + `@testing-library/user-event`

We render components in `jsdom`, let `react-native` alias to `react-native-web`, and drive/query the resulting DOM with `@testing-library/react`. We do **not** use `@testing-library/react-native`.

**Why `@testing-library/react` and not `@testing-library/react-native`:**

- `@testing-library/react-native` is built around the Jest/Metro preset and the `react-test-renderer` + `react-native` (native) module graph. It expects a Jest runtime (`jest.mock`, the RN Jest preset, Flow-typed RN internals) and a Metro resolver that honors `.native.tsx`/`.web.tsx` platform extensions. Vitest provides none of that cleanly, so integrating it means fighting the runner.
- The app is explicitly cross-platform and already ships `react-native-web`. Rendering through RNW in jsdom is the same path the production web build uses, so tests exercise real behavior (DOM output, `accessibilityLabel` → `aria-label`, `accessibilityRole` → `role`, `Pressable` → clickable element). Queries like `getByRole('button', { name: ... })` and `getByText(...)` work directly against RNW output.
- `@testing-library/react` + `user-event` + `@testing-library/jest-dom` matchers are framework-agnostic and run natively on Vitest with zero preset coupling.

**Platform note (`Platform.OS`):** under RNW, `Platform.OS === 'web'`. So component tests exercise the **web branch** of any `Platform.select` / `Platform.OS === 'web'` code (e.g. `TaskItem` renders the hover-action web row, not the native `Swipeable`; `LineChart` renders the web SVG, not victory-native). This is acceptable and in fact desirable — it matches the RNW production target — but each per-file test note states which branch it covers, and native-only branches are documented as out of scope for component tests (they belong to manual/device testing). This keeps the gesture-handler/Reanimated surface mostly out of the render path on web.

### devDependencies to install (pinned)

| Package | Version | Purpose |
|---|---|---|
| `jsdom` | `25.0.1` | Browser-like DOM for the component project (Vitest's built-in jsdom provider) |
| `@testing-library/react` | `16.1.0` | `render`, `screen`, `fireEvent`, `renderHook`, `cleanup` for React 18 |
| `@testing-library/dom` | `10.4.0` | Peer dependency of `@testing-library/react` 16 (query engine) |
| `@testing-library/user-event` | `14.5.2` | Realistic user interaction (typing, click, tab/keyboard) for `TextInput` and keyboard-shortcut tests |
| `@testing-library/jest-dom` | `6.6.3` | DOM matchers (`toBeInTheDocument`, `toHaveAttribute`, `toBeDisabled`); registered for Vitest's `expect` in setup |

All pinned exact (no `^`), consistent with the project's pinned-dependency policy (`DEPENDENCIES.md`). `react-native-web@~0.19.13`, `react@18.3.1`, `react-dom@18.3.1`, and `fast-check@4.10.2` are already present (verified: `react-dom@18.3.1` is installed) and are reused. No UI component library is added (ui-rule 2).

> Install happens in the implementation step, not here. `@testing-library/react@16` requires `react`/`react-dom@18` as peers — both are already present. `@testing-library/react@16` exports `renderHook`, used for the context tests.

Final install list (implementation step):
```
jsdom@25.0.1
@testing-library/react@16.1.0
@testing-library/dom@10.4.0
@testing-library/user-event@14.5.2
@testing-library/jest-dom@6.6.3
```

---

## Goal 2 — Keep the ~130 logic tests green (split config)

### Decision: Vitest **projects** (`test.projects`) with two configs — one `node`, one `jsdom`

A global switch to `jsdom` would (a) slow the pure-logic suite, and (b) risk behavioral drift (e.g. `typeof window !== 'undefined'` in `src/lib/firebase.ts` flips to the web branch under jsdom, and `datetime`/timezone code is sensitive to environment). The existing logic tests were written for `node` and must stay there. Per-file `// @vitest-environment jsdom` docblocks were considered but rejected: ~70 new files would each need the pragma, it is easy to forget on a new file, and it does not let us scope setup files or the RNW alias to only the component suite. Projects give a clean, declarative split and still run under one `npx vitest --run`.

### Config shape

Replace the single `vitest.config.ts` with a root config that defines two projects. The existing `node` project keeps the current `include` and `environment`; the new `web` project owns the component tests, jsdom, setup file, and the RNW alias.

```ts
// vitest.config.ts  (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': '.' } }, // shared '@' alias (unchanged)
  test: {
    projects: [
      {
        // 1) Existing pure-logic tests — unchanged behavior
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],           // .ts only — logic
          exclude: ['src/**/*.component.test.tsx'],
        },
      },
      {
        // 2) New component/screen/context tests
        extends: true,
        test: {
          name: 'web',
          environment: 'jsdom',
          include: [
            'src/**/*.component.test.tsx',
            'app/**/*.component.test.tsx',
            // Safety net: catch any bare *.test.tsx a future contributor adds
            // under src/ so it is never silently skipped by both projects.
            'src/**/__tests__/**/*.test.tsx',
          ],
          setupFiles: ['./test/setup.ts'],
        },
        resolve: {
          alias: {
            '@': '.',
            // RNW render path for the component project only
            'react-native': 'react-native-web',
          },
        },
      },
    ],
  },
})
```

**Naming decision — `*.component.test.tsx`:** new component tests use the `.component.test.tsx` suffix (not bare `.test.tsx`). Reason: it gives the two projects a clean, non-overlapping `include`/`exclude` without path gymnastics, and makes it obvious which suite a file belongs to. The one subtlety this resolves: the existing `node` project currently globs `src/**/*.test.tsx`, but there are **zero** `.test.tsx` files today (verified: all 11 are `.test.ts`), so narrowing the node project to `*.test.ts` + explicit exclude loses nothing. This deviates slightly from the steering doc's `<subject>.test.tsx` convention; it is a deliberate, documented choice to keep the split robust, and is called out in the per-file list.

**Orphan-file guard (addresses review NIT 8):** because the node project excludes `.test.tsx` and the web project's primary globs match only `*.component.test.tsx`, a future bare `*.test.tsx` under `src/` could be matched by neither project and silently skipped. The web project therefore also includes `src/**/__tests__/**/*.test.tsx` as a safety net, so any co-located `.test.tsx` runs in the web (jsdom) project even without the `.component` infix.

**Setup file path:** `./test/setup.ts` at the worktree root (new top-level `test/` dir holds setup + the mock layer + `renderWithProviders`). This keeps infra out of `src/` so it is not picked up by the node project's `src/**` glob.

**End state:** `npx vitest --run` runs both projects; logic tests run in node exactly as today, component tests run in jsdom. One command, all green.

---

## Goal 3 — Shared mock layer (`test/setup.ts` + `test/mocks/`)

`test/setup.ts` runs before each component test file (via `setupFiles`). It (a) registers `@testing-library/jest-dom` matchers, (b) runs RNW/jsdom shims, (c) calls `vi.mock(...)` for every native module, and (d) wires `afterEach(cleanup)`. Mocks that need per-test control (Firebase, expo-router) expose helpers from `test/mocks/` so individual tests can set return values.

**RN primitives inside mocks (addresses review MEDIUM 3).** Every mock file that needs to render DOM imports its primitives from `'react-native'` — for example `import { View, Text } from 'react-native'`. Within the **web** project the `resolve.alias` maps `'react-native' → 'react-native-web'`, and that alias is project-scoped: it applies to the entire web-project module graph, which includes files under `test/`. So inside every mock, `View`/`Text`/etc. resolve to the RNW DOM-producing primitives, never the native ones. This is the mechanism by which stub components (`lucide`, `reanimated`'s `Animated.View`, `svg`, `gesture-handler`, `expo-linear-gradient`) render real DOM in jsdom. All mock files rely on this alias; none import from `react-native-web` directly, so the single alias is the one source of truth.

### Global setup (`test/setup.ts`)

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetFirebaseControl } from './mocks/firebase-control'
import { resetRouterControl } from './mocks/expo-router-control'
import { resetAsyncStorage } from './mocks/async-storage'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  resetFirebaseControl()
  resetRouterControl()
  resetAsyncStorage()
})

// jsdom shims RNW expects
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
}
// requestAnimationFrame is used by LineChart draw animation and the Reanimated stub
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id)
}
```

### Mock-by-mock specification

Each entry: what module, why it needs mocking, and the mock behavior. Mocks live in `test/mocks/<name>.ts(x)` and are registered via `vi.mock('<module>', factory)` in `setup.ts`.

1. **`lucide-react-native`** — hundreds of icon exports that render native SVG, consumed via **named imports** (`import { Check, Mail } from 'lucide-react-native'`). **Single mechanism (addresses review HIGH 2):** a `vi.mock` factory that returns a `Proxy` directly, whose `get` trap resolves *every* property access (i.e. every named import) to a stub icon component, and reports `__esModule: true` so the ESM interop layer treats it as a module namespace. There is no default-export file and no CJS `module.exports` variant — the factory-returned Proxy is the only approach.
   ```ts
   // registered in setup.ts
   vi.mock('lucide-react-native', () => {
     const React = require('react')
     const { View } = require('react-native') // → react-native-web via web-project alias
     const makeIcon = (name: string) => (props: any) =>
       React.createElement(View, {
         accessibilityRole: 'image', testID: `icon-${name}`, ...props,
       })
     return new Proxy({}, {
       get: (_t, name: string) =>
         name === '__esModule' ? true : makeIcon(String(name)),
     })
   })
   ```
   The stub renders a RNW `View` with `testID`/`accessibilityRole="image"` derived from the icon name, so icon presence is assertable (`getByTestId('icon-Check')`). Any named import — present or future — resolves to a stub, so the mock never needs maintenance when new icons are used.

2. **`react-native-reanimated`** — worklets, `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`, `Animated.createAnimatedComponent`, `Animated.View`. Reanimated ships `react-native-reanimated/mock`, but it targets Jest and RN native. We use a **manual stub** that is synchronous and web-safe:
   - `useSharedValue(v)` → `{ value: v }` (plain object).
   - `useAnimatedStyle(fn)` → `fn()` (evaluated once at render).
   - `withTiming/withSpring/withDelay/withSequence/withRepeat` → identity (return the target value synchronously).
   - `Easing` → object of identity functions.
   - `Animated.createAnimatedComponent(C)` → `C` unchanged.
   - `Animated.View/Text/ScrollView` → the corresponding RNW primitive, obtained via `require('react-native').View` etc. (resolves to react-native-web through the web-project alias).
   - `runOnJS(fn)` → `fn`; `cancelAnimation` → no-op.
   This makes `PressableScale`, `FadeInView`, `CrossfadeView`, `AnimatedGlow`, and the Reanimated usage inside screens render deterministically. Lives in `test/mocks/reanimated.tsx`.
   **Assertion limitation (addresses review NIT 10):** because `useAnimatedStyle(fn)` is evaluated once and `useSharedValue` returns a plain object, mutating `.value` does not trigger a React re-render, so **computed/interpolated animated-style values are NOT assertable** under this stub. DEEP motion tests therefore assert *behavior* — that press callbacks (`onPress`/`onPressIn`/`onPressOut`) fire, that `disabled` blocks press, that keyed children swap — never the numeric style output of an animation.

3. **`react-native-gesture-handler`** and **`react-native-gesture-handler/ReanimatedSwipeable`** — `TaskItem` statically imports `Swipeable` from `react-native-gesture-handler/ReanimatedSwipeable` (verified) and branches on `Platform.OS === 'web'`. On web it returns the plain hover row and never constructs `Swipeable`, but the **import** is resolved at module load, so it must not throw. Mock `Swipeable` as a pass-through rendering `children`, and mock `GestureHandlerRootView`/`PanGestureHandler`/`gestureHandlerRootHOC` as pass-throughs. `test/mocks/gesture-handler.tsx`.

4. **`@shopify/react-native-skia`** — heavy native canvas. No component under test renders Skia on the web branch, but any transitive import must resolve. Mock every export (`Canvas`, `Path`, `Group`, `Skia`, `useValue`, etc.) via a `vi.mock` factory returning a Proxy whose `get` yields `() => null` for component-like exports and no-op objects otherwise, with `__esModule: true`. `test/mocks/skia.tsx`.

5. **`victory-native`** — **two different usages, verified against source (addresses review HIGH 1):**
   - `LineChart.tsx` does `const v = require('victory-native')` **lazily, inside the native branch only** (`Platform.OS !== 'web'`). On the web/jsdom path this require is never reached, so `LineChart`'s web SVG branch is victory-free.
   - `BestHoursChart.tsx` does a **static top-level** `import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native'` and renders `<VictoryChart><VictoryBar .../></VictoryChart>` on **all** platforms (there is no `Platform` branch). So victory IS loaded and rendered on the web path for this component; the mock is mandatory and is on the render path.

   **Mock decision — inspectable stubs, not render-null.** Because `BestHoursChart` is classified DEEP with a "highlights peak hour" assertion, a render-null victory mock would leave nothing to assert. The victory mock therefore renders **inspectable** stubs:
   - `VictoryChart` / `VictoryAxis` → a RNW `View` pass-through that renders `children` (so the tree mounts).
   - `VictoryBar` → a RNW `View testID="victory-bar"` that serializes the inputs the DEEP test needs into queryable attributes: it JSON-encodes the `data` prop into a `data-victory-bar` attribute (via `dataSet`/`accessibilityLabel`) so the test can read back the 24 `{x,y,fill}` data points, and so the peak bar's `fill` (accent color) is inspectable. The stub does not draw anything; it only records props.
   - `VictoryTheme` → a plain object (`{ material: {} }`).

   This lets the `BestHoursChart` DEEP test assert: (a) the empty-state `Text` renders when all counts are zero (plain RN `Text`, trivially assertable), and (b) for non-empty data the serialized `data` array buckets completions into the correct hour slots and the datum at the peak hour carries `fill === tokens.accentPrimary` while others carry the subdued `accentBlue+'99'`. `test/mocks/victory.tsx`.

6. **`react-native-svg`** — mock `Svg`, `Path`, `Circle`, `Rect`, `G`, `Defs`, `LinearGradient`, `Stop`, etc. as RNW `View`-based stubs (render children, forward `testID`). Used by `LineChart`'s web branch and ring components. `test/mocks/svg.tsx`.

7. **`expo-linear-gradient`** — `LinearGradient` wraps children with a gradient. Mock as a RNW `View` that renders `children` and forwards `style`/`testID`/`colors` (so `GradientSurface` still lays out and the passed token colors are inspectable). `test/mocks/expo-linear-gradient.tsx`.

8. **`expo-blur`** — `BlurView` → RNW `View` pass-through rendering children. Inline stub.

9. **`@react-native-async-storage/async-storage`** — **hand-written in-memory mock (addresses review MEDIUM 4).** The vendor mock at `@react-native-async-storage/async-storage/jest/async-storage-mock` was inspected in the installed 1.23.1 package and **uses `jest.fn(...)` on every method** (`setItem`, `getItem`, `multiGet`, `clear`, …). Under Vitest `jest` is undefined, so importing it throws at setup — which, per this design's fatal-setup rule, would break the entire web suite. We therefore do **not** use the vendor mock. Instead `test/mocks/async-storage.ts` provides a tiny deterministic in-memory implementation whose methods are `vi.fn()` wrappers (so calls are spyable) over a `Map`:
   ```ts
   // test/mocks/async-storage.ts
   import { vi } from 'vitest'
   const store = new Map<string, string>()
   const mock = {
     getItem:    vi.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
     setItem:    vi.fn(async (k: string, v: string) => { store.set(k, v) }),
     removeItem: vi.fn(async (k: string) => { store.delete(k) }),
     multiGet:   vi.fn(async (ks: string[]) => ks.map(k => [k, store.has(k) ? store.get(k)! : null])),
     multiSet:   vi.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => store.set(k, v)) }),
     multiRemove:vi.fn(async (ks: string[]) => { ks.forEach(k => store.delete(k)) }),
     clear:      vi.fn(async () => { store.clear() }),
     getAllKeys: vi.fn(async () => [...store.keys()]),
   }
   export function resetAsyncStorage() { store.clear() }
   export default mock
   ```
   Registered as `vi.mock('@react-native-async-storage/async-storage', () => ({ default: (await import('./mocks/async-storage')).default }))` (factory form). This guarantees `ThemeProvider.multiGet(['ip_theme','ip_accent_color'])` resolves to `[['ip_theme', null], ['ip_accent_color', null]]`, so the provider falls back to its documented defaults (`light`, `#8B5CF6`). `resetAsyncStorage()` runs in the global `afterEach`.

10. **`expo-notifications`** — mock `getPermissionsAsync`/`requestPermissionsAsync` → `{ status: 'granted' }`, `scheduleNotificationAsync`/`cancelAllScheduledNotificationsAsync`/`setNotificationHandler` → resolved no-ops, `addNotificationReceivedListener` → `{ remove(){} }`. Used by `NotificationSettings` and `useNotifications`. `test/mocks/expo-notifications.ts`.

11. **`expo-av`** — mock `Audio.Sound.createAsync` → `{ sound: { playAsync: vi.fn(), unloadAsync: vi.fn(), setPositionAsync: vi.fn() } }`, `Audio.setAudioModeAsync` → resolved. Used by `TimerAlert`/pomodoro sound. `test/mocks/expo-av.ts`.

12. **`expo-speech`** — `speak`/`stop`/`isSpeakingAsync` → no-ops/resolved. Used by `VoiceInput`. Inline stub.

13. **`expo-file-system`** — `documentDirectory` → `'file:///test/'`, `writeAsStringAsync`/`readAsStringAsync`/`getInfoAsync` → resolved stubs. Used by `useProgress` ICS export. `test/mocks/expo-file-system.ts`.

14. **`expo-document-picker`** — `getDocumentAsync` → `{ canceled: true }` by default (overridable per test). Used by `ArchiveManager`/ICS import. Inline stub.

15. **`expo-sharing`** — `isAvailableAsync` → `true`, `shareAsync` → resolved. Inline stub.

16. **`expo-router`** — the key controllable UI mock. `test/mocks/expo-router.tsx` exports:
    - `useRouter` → a stable object `{ push: vi.fn(), replace: vi.fn(), back: vi.fn(), setParams: vi.fn() }`.
    - `useSegments` → returns controllable segments (default `[]`).
    - `useLocalSearchParams` → returns controllable params (default `{}`).
    - `usePathname` → controllable (default `'/'`).
    - `useFocusEffect` → runs its callback once via `useEffect`.
    - `Link`/`Redirect`/`Stack`/`Tabs`/`Slot` → pass-through components rendering `children`; `Redirect` additionally records its `href` on a spy so `app/index.tsx` redirect logic is assertable.
    - Control helpers live in `test/mocks/expo-router-control.ts`: `setRouterMock({ segments, params, pathname })` sets navigation state, `getRouter()` exposes the spy object for assertions on `push`/`replace`, and `resetRouterControl()` restores defaults (run in `afterEach`).

17. **`firebase/app`, `firebase/auth`, `firebase/firestore`, and `@/src/lib/firebase`** — mock both the SDK entry points and the app's firebase wrapper so no real network/init happens. **Export surface verified against source:** `useProgress.ts` imports `{ collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, getDocs }`; `app/(modals)/feedback.tsx` imports `{ collection, addDoc, serverTimestamp }`; `firestoreMappers.ts` imports `{ DocumentSnapshot, Timestamp }`. **No code under test uses `query`/`where`/`orderBy`/`limit`** (verified by grep), so those are intentionally omitted — if a future caller adds them, the mock will surface an undefined-export error, which is the desired signal.

    - **`@/src/lib/firebase`** → export fake `auth` and `db` sentinel objects (`{}`), plus `isGuestMode`/helpers if referenced. `collection(db, path)`/`doc(db, path)` from the firestore mock just capture the `path` string.
    - **`firebase/auth`**: `onAuthStateChanged(auth, cb)` → synchronously calls `cb(currentUser)` and returns an unsubscribe fn; `signInWithEmailAndPassword`/`createUserWithEmailAndPassword`/`sendEmailVerification`/`sendPasswordResetEmail`/`signOut`/`signInAnonymously` → controllable `vi.fn()` spies resolving to fake credentials (`{ user: currentUser }`); export `EmailAuthProvider`, `updateProfile`, `deleteUser`, `linkWithCredential`, `reload` as spies; export a `User` type shim.
    - **`firebase/firestore`**: `collection(db, path)` → `{ __path: path }`; `doc(db, path)` → `{ __path: path }`; `onSnapshot(ref, next, err?)` → immediately invokes `next(makeSnapshot(ref.__path))` with a controllable snapshot (default empty) and returns an unsubscribe `vi.fn()`; `getDocs(ref)` → resolves a QuerySnapshot; `setDoc`/`updateDoc`/`deleteDoc`/`addDoc` → resolved `vi.fn()` spies; `writeBatch(db)` → `{ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) }`; `serverTimestamp` → `vi.fn(() => ({ __serverTimestamp: true }))`; `Timestamp` → re-export the **real** `Timestamp` class from the actual `firebase/firestore` (via `await vi.importActual`) so `firestoreMappers` round-trips work unchanged. Note: `firestoreMappers.ts` imports `DocumentSnapshot` only as a parameter type (type-only), so it is erased at compile time and never referenced as a runtime value; the mock therefore does not export it, and `Timestamp` is the only value export needed from that import.

    **Snapshot shape (pinned, verified against `firestoreMappers.ts` + `useProgress.ts`).** Two shapes, matching exactly how consumers read them:
    - **DocumentSnapshot** (single doc; used for `goals/daily`, `settings/deletedRecurringInstances`): `{ id: string, exists(): boolean, data(): Record<string, unknown> | undefined }`. `docToGoals`/`docToNote`/`docToTask` all call `snap.data() ?? {}` and `snap.id`; `useProgress` guards single-doc snapshots with `snap.exists()` before reading. The mock's `data()` returns the seeded object (raw Firestore field names like `daily_task_target`, `extra_goals`) or `undefined` when absent; `exists()` returns whether a doc was seeded at that path.
    - **QuerySnapshot** (collections: tasks, topics, notes, templates): `{ docs: DocumentSnapshot[], forEach(cb), size: number, empty: boolean }`. Consumers use `snap.docs.map(docToX)`, `snap.docs.forEach(...)`, and `snap.docs.length` — all satisfied by `docs` being an array of the DocumentSnapshot shape above.

    - **Control module** `test/mocks/firebase-control.ts` exposes: `setAuthUser(user | null)` (sets the `currentUser` that `onAuthStateChanged` reports and that credential resolutions return), `setFirestoreDoc(path, data)` (seed a single-doc snapshot), `setFirestoreDocs(path, Array<{ id, data }>)` (seed a collection; stored by the `collection` path so the matching `onSnapshot` emits them), and `resetFirebaseControl()` (clears auth user and all seeded docs; run in `afterEach`). A test seeds data with raw Firestore field names and the real mappers convert them, so screen tests exercise the genuine mapping path. `test/mocks/firebase.ts` + `test/mocks/firebase-control.ts`.

18. **`expo-font` / `expo-constants` / `expo-linking`** (transitive via expo-router/AppText) — `expo-font`: `useFonts` → `[true]`, `loadAsync` → resolved, `isLoaded` → `true`. `expo-constants`: default export with `expoConfig: {}`. `expo-linking`: `createURL`/`useURL` stubs. Inline stubs grouped in `test/mocks/expo-misc.ts`.

19. **`react-native` extras** — RNW covers `View/Text/Pressable/StyleSheet/Platform/ScrollView/TextInput/Appearance/useWindowDimensions`. Two gaps patched in setup if RNW's own versions are insufficient (an implementation-time check): `Appearance.getColorScheme()` → `'light'` and `addChangeListener` → `{ remove(){} }`; `AccessibilityInfo.isReduceMotionEnabled()` → `Promise.resolve(false)` and `addEventListener` → `{ remove(){} }` (used by `useMotion`). RNW generally supports both; override only if a test observes otherwise.

All controllable mocks reset between tests in the global `afterEach` (see setup): `vi.clearAllMocks()`, `resetFirebaseControl()`, `resetRouterControl()`, `resetAsyncStorage()`.

---

## Goal 4 — Per-file classification (DEEP vs SMOKE)

**DEEP** = test real behavior: user interaction, conditional rendering driven by props/state, parsing/formatting logic, context state transitions, navigation side effects, accessibility wiring. **SMOKE** = render-only: mounts without throwing inside providers, renders expected text/children, forwards `style`/`testID`, respects a visible prop. Every file gets at least a smoke test; DEEP files get behavior assertions on top.

**Provider requirement column (addresses review MEDIUM 5).** `renderWithProviders` defaults to **ThemeProvider only**. Any component that calls a context hook which *throws outside its provider* — `useAddTaskModal`, `useSettingsModal`, `usePomodoroModal`, `usePomodoroMini` (verified: these throw; `useMobileHeader` and `useWidget` no-op instead) — MUST be rendered with `withContexts: true`. The **Ctx** column below marks `Y` where a test must pass `withContexts: true`; blank means ThemeProvider-only is sufficient. This makes the requirement explicit per file so no default render throws a "must be used within Provider" error.

Classification is based on the source read during exploration. Reminder: on RNW, `Platform.OS === 'web'`, so tests cover the web branch; native-only branches are noted as not covered by component tests.

### `src/context/` (6 files) — all DEEP (state machines), tested via `renderHook` with their own provider

| File | Class | Ctx | What the deep test asserts |
|---|---|---|---|
| `AddTaskModalContext.tsx` | DEEP | — | `openAddTask({editTaskId,initialDate})` sets `isOpen`/params; `closeAddTask` clears params after the 300ms `setTimeout` (fake timers); `useAddTaskModal` throws outside provider. |
| `SettingsModalContext.tsx` | DEEP | — | `openSettings`/`closeSettings` toggle `isOpen`; throws outside provider. |
| `PomodoroModalContext.tsx` | DEEP | — | open/close/minimize state transitions; throws outside provider. |
| `PomodoroMiniContext.tsx` | DEEP | — | provides `usePomodoro` return + `isMinimized`/`pipTaskTitle` setters; throws outside provider. (usePomodoro timers via fake timers.) |
| `MobileHeaderContext.tsx` | DEEP | — | `openSearch` invokes subscribed callback; `_subscribe` returns working unsubscribe; no-op fallback when used without provider (does NOT throw). |
| `WidgetContext.tsx` | DEEP | — | `open`/`close` toggle `isOpen`; `setTaskData` stores tasks and wraps callbacks correctly; default context values are no-ops (does NOT throw). |

(These render each provider directly in the `renderHook` wrapper, so the table's Ctx column is N/A — the test supplies the specific provider under test.)

### `src/components/ui/` (9 primitives + barrel)

| File | Class | Ctx | Note |
|---|---|---|---|
| `StatCard.tsx` | SMOKE | — | Renders value/label + icon badge; forwards `style`; token-driven. |
| `CountCard.tsx` | SMOKE | — | Renders count + label. |
| `StatusBadge.tsx` | DEEP | — | Maps each `status` prop → correct label/color/role; assert per-status output. |
| `IconBadge.tsx` | SMOKE | — | Renders icon in colored badge. |
| `Avatar.tsx` | DEEP | — | Initials derivation from name; image vs fallback branch. |
| `ProgressBar.tsx` | DEEP | — | Clamps/represents `value` fraction (0/0.5/1 → width); a11y value. |
| `DateStrip.tsx` | DEEP | — | Renders date range; selected-day highlighting; `onSelect` press. |
| `PillTabs.tsx` | DEEP | — | Renders tabs + counts; press calls `onChange(id)`; active styling on `activeId`. |
| `TaskListItem.tsx` | DEEP | — | Renders title/meta; press + complete callbacks; completed styling. |
| `index.ts` | — | — | Barrel; no test (covered by members). |

### `src/components/motion/` (4 + barrel)

| File | Class | Ctx | Note |
|---|---|---|---|
| `PressableScale.tsx` | DEEP | — | With Reanimated stub: `onPress`/`onPressIn`/`onPressOut` fire; `disabled` blocks press; renders children. Asserts callbacks, not animated style values. |
| `FadeInView.tsx` | SMOKE | — | Renders children (animation stubbed to identity). |
| `CrossfadeView.tsx` | DEEP | — | Swaps content when the keyed child changes (asserts child swap, not style). |
| `AnimatedGlow.tsx` | SMOKE | — | Renders children/overlay. |
| `index.ts` | — | — | Barrel; no test. |

### `src/components/navigation/` (NavigationBar + Sidebar variants/barrel)

| File | Class | Ctx | Note |
|---|---|---|---|
| `NavigationBar.tsx` | DEEP | — | Renders nav items; active route highlight (router mock `pathname`); press → `router.push`. |
| `Sidebar.web.tsx` | DEEP | — | The branch RNW exercises: renders sidebar items; active state; press → navigation; respects breakpoint/width. Imported by explicit path. |
| `Sidebar.native.tsx` | SMOKE | — | Documented native no-op; smoke-render returns null/empty without throwing. |
| `Sidebar.ts` | — | — | Platform barrel; **no direct test**. Note: Vitest has no Metro platform-extension resolver, so `Sidebar.ts` resolves to its literal `./Sidebar.native` re-export; web-UI tests therefore import `Sidebar.web.tsx` by explicit path. |

### `src/components/task/` (7 files)

| File | Class | Ctx | Note |
|---|---|---|---|
| `TaskItem.tsx` | DEEP | — | Web branch: renders title/badges/priority stripe/subtask chip; checkbox press → `onComplete`; row press → `onEdit`; hover reveals actions → `onStartFocus`/`onStartPomodoro`/`onDelete`; a11y labels/`accessibilityState`. Native `Swipeable` branch not covered. |
| `UnifiedTaskItem.tsx` | DEEP | — | Variant rendering + completion/edit callbacks. |
| `QuickAdd.tsx` | DEEP | — | Exercise `parseQuickInput` **through the UI** (it is a module-private function, see tech-stack note): type `"Review docs tomorrow at 2pm for 30m #work !high"`, assert preview chips (topic/date/time/duration/priority); submit → `onAdd` with parsed payload; duplicate-warning flow (type existing title+date → warning → "Add anyway" commits); empty input disables add. Highest-value test. |
| `TaskTemplates.tsx` | DEEP | — | Lists templates; select → callback; create/delete template interactions. |
| `AddTaskModal.tsx` | DEEP | — | Form fields render; validation (title required); save → callback with task; edit mode pre-fills. (Takes props directly; does not itself call the modal context hook.) |
| `DayTimeline.tsx` | DEEP | — | Positions tasks by time; empty state; task press callback. |
| `OverdueRolloverModal.tsx` | DEEP | — | Lists overdue tasks; "roll over"/"dismiss" actions call callbacks with selected ids. |

### `src/components/calendar/` (2)

| File | Class | Ctx | Note |
|---|---|---|---|
| `Heatmap.tsx` | DEEP | — | Maps activity data → cell intensity buckets; day press → callback; empty data. |
| `TimeBlockView.tsx` | DEEP | — | Renders blocks at correct slots; block press/edit callbacks. |

### `src/components/planner/` (7)

| File | Class | Ctx | Note |
|---|---|---|---|
| `LineChart.tsx` | DEEP | — | Web SVG branch (svg mocked): empty-data message; sparse-tip when `<5` active days; renders Y/X labels and today marker. Native `require('victory-native')` branch not reached on web, not covered. |
| `BestHoursChart.tsx` | DEEP | — | Victory renders on web (static import). Empty state: all-zero data → "Complete some tasks…" `Text`. Non-empty: via the inspectable `victory-bar` stub, assert the serialized 24-point `data` buckets counts into the right hour slots and the peak-hour datum's `fill === tokens.accentPrimary` (others subdued). See Goal 3 item 5. |
| `ProductivityScore.tsx` | DEEP | — | Score → ring/label rendering; thresholds (low/med/high) produce expected label/color. |
| `TimeTrackingStats.tsx` | DEEP | — | Aggregates durations into displayed totals. |
| `TopicBalance.tsx` | DEEP | — | Topic distribution → bars/percentages; empty state. |
| `GoalSetting.tsx` | DEEP | — | Renders goal inputs; edit + save → callback; validation. |
| `WeeklyReport.tsx` | DEEP | — | Summarizes week stats; renders sections for provided data; empty week. |

### `src/components/` flat (30 files)

| File | Class | Ctx | Note |
|---|---|---|---|
| `AppText.tsx` | DEEP | — | Role → fontSize/weight mapping; default color per role; `color` override; convenience exports (`TitleText` etc.). |
| `Card.tsx` | SMOKE | — | Renders children; forwards style; elevation variant. |
| `GlassSurface.tsx` | SMOKE | — | Renders children (blur stubbed). |
| `GradientSurface.tsx` | DEEP | — | Chooses gradient by `variant`; `rounded` → radius; passes token colors to mocked `LinearGradient` (inspectable via `colors`); renders children. |
| `ProgressRing.tsx` | DEEP | — | `progress` → stroke/arc fraction; label; clamps 0..1. |
| `SegmentedToggle.tsx` | DEEP | — | Renders segments; press → `onChange`; active segment styling. |
| `ConfirmModal.tsx` | DEEP | — | Visible/hidden by `visible`; confirm/cancel buttons call callbacks; title/message render. |
| `AboutModal.tsx` | SMOKE | — | Renders app info when visible. |
| `ShortcutsModal.tsx` | SMOKE | — | Renders shortcut list when visible. |
| `CommandPalette.tsx` | DEEP | — | Opens on `visible`; typing filters commands (`user-event`); select → action/navigation; keyboard nav (arrows/enter). Receives tasks via props. |
| `SearchFilter.tsx` | DEEP | — | Query input filters; filter chips toggle; emits filter state. |
| `DatePickerField.tsx` | DEEP | — | Opens picker; selecting a date → `onChange`; displays formatted value. |
| `TimePickerField.tsx` | DEEP | — | Opens picker; select time → `onChange`; formatted display. |
| `DurationField.tsx` | DEEP | — | Parses/steps duration; `onChange` with minutes; min/max bounds. |
| `WheelTimePicker.tsx` | DEEP | — | Scroll/select changes value → callback. |
| `CalendarPicker.tsx` | DEEP | — | Month grid; day select → callback; month navigation. |
| `DailyNotes.tsx` | DEEP | — | Renders/edits note text; save → callback (debounced via timers). |
| `ArchiveManager.tsx` | DEEP | — | Lists archived items (via props); restore/delete actions; import via mocked document-picker. |
| `IcsImportPreview.tsx` | DEEP | — | Renders parsed events; select/confirm import → callback with chosen events. |
| `NotificationSettings.tsx` | DEEP | — | Toggles call permission request (mocked `expo-notifications`); reflects granted/denied state. |
| `ThemeCustomizer.tsx` | DEEP | — | Selecting accent calls `setAccentColor` (real ThemeProvider); theme-mode toggle calls `setThemeMode`; renders preset swatches. ThemeProvider only. |
| `ProfileMenu.tsx` | DEEP | — | Renders user info; menu actions (sign out via mocked auth, navigation); open/close. Uses `useAuth` (firebase-controlled), not a modal context. |
| `FocusMode.tsx` | DEEP | — | Start/stop focus session; timer display (fake timers); exit callback. |
| `PomodoroModal.tsx` | DEEP | — | Start/pause/reset drive timer (fake timers); phase transitions; close callback. Receives state via props. |
| `TimerAlert.tsx` | DEEP | — | Fires sound (mocked `expo-av`) and renders alert when triggered; dismiss. |
| `VoiceInput.tsx` | DEEP | — | Start listening → mocked speech; transcript → `onResult`; unsupported-platform fallback. |
| `SettingsModal.tsx` | DEEP | — | Renders settings sections; toggles persist via ThemeProvider/AsyncStorage; close callback. ThemeProvider only. |
| `AppTour.tsx` | DEEP | — | Step progression (next/prev/skip); renders current step; completion callback. |
| `Confetti.tsx` | SMOKE | — | Renders when `active`; nothing when inactive. |
| `WidgetView.tsx` | DEEP | — | Renders task list from props; toggle-complete → callback; `getTopicColor` applied; close. |

(Flat components take their data via props, so most need ThemeProvider only. If, at implementation, a flat component is found to call `useAddTaskModal`/`useSettingsModal`/`usePomodoroModal` directly, its test flips to `withContexts: true` — the implementer verifies each import list before writing the test.)

### `app/` (16 files)

Screens pull data from `useProgress`/`useAuth` (Firebase-backed, controlled via `setAuthUser`/`setFirestoreDocs`/`setFirestoreDoc`) and navigation from expo-router (mocked/controllable). Many call the modal context hooks (`openAddTask`, `openSettings`, `openPomodoro`), so they render with `withContexts: true`.

| File | Class | Ctx | Note |
|---|---|---|---|
| `app/_layout.tsx` | SMOKE | Y | Mounts provider tree (Theme/Auth/Focus/Widget) without throwing; renders `Slot`. Itself supplies providers, so render raw. |
| `app/(tabs)/_layout.tsx` | DEEP | Y | Web branch (width>768) renders Sidebar layout; narrow renders tab layout; mobile-only header elements gated by `isMobile`. |
| `app/(modals)/_layout.tsx` | SMOKE | — | Renders modal stack (router `Stack` mocked). |
| `app/(tabs)/index.tsx` | DEEP | Y | Dashboard: given controlled `useProgress` data, renders stat cards (Tasks/In Progress/Completed/Overdue/Streak), today's schedule, goals; time-period toggle; task press → edit modal/navigation (calls `openAddTask`). |
| `app/(tabs)/today.tsx` | DEEP | Y | Renders today's tasks from data; complete/edit interactions; empty state. |
| `app/(tabs)/analytics.tsx` | DEEP | Y | Renders planner charts with controlled data; period switching; empty state. |
| `app/(tabs)/calendar.tsx` | DEEP | Y | Renders calendar/heatmap with data; day select; add-task entry (`openAddTask`). |
| `app/auth.tsx` | DEEP | — | Sign-in/sign-up/reset mode switching; submit calls mocked auth fns; **email-verification message** shown after sign-up ("We sent a verification link to {email}", gated by `verificationSentTo`, resend button) — ties directly to the original request; error display from `authErrors`. Does not use modal contexts. The resend-verification handler uses a dynamic `await import('firebase/auth')`; `vi.mock` intercepts dynamic imports too, so `sendEmailVerification` resolves to the same spy and is assertable. |
| `app/index.tsx` | DEEP | — | Redirect logic: authed → tabs, unauthed → auth, loading → spinner (router `replace`/`Redirect.href` assertions). |
| `app/(modals)/add-task.tsx` | DEEP | Y | Hosts AddTaskModal; reads `editTaskId`/`initialDate` from mocked `useLocalSearchParams`; save → `useProgress` + `router.back`; reads `useAddTaskModal`. |
| `app/(modals)/settings.tsx` | DEEP | Y | Hosts settings content; toggles persist; back/close navigation; `useSettingsModal`. |
| `app/(modals)/profile.tsx` | DEEP | — | Renders profile; edit/sign-out via mocked auth; navigation. |
| `app/(modals)/pomodoro.tsx` | DEEP | Y | Hosts PomodoroModal; minimize wires `PomodoroMiniContext`/`usePomodoroModal`; close → `router.back`. |
| `app/(modals)/overdue-rollover.tsx` | DEEP | Y | Hosts OverdueRolloverModal with overdue data; actions mutate via `useProgress`; back. |
| `app/(modals)/feedback.tsx` | DEEP | — | Form fields; submit → mocked `addDoc`/`serverTimestamp`; validation; back. |
| `app/ui-demo.tsx` | SMOKE | Y | Dev-only playground; smoke-render that the gallery mounts without throwing (renders many context-consuming components). |

**Counts:** context 6 (6 DEEP) · ui 9 (+barrel) · motion 4 (+barrel) · navigation 3 (+barrel) · task 7 · calendar 2 · planner 7 · flat 30 · app 16 = **84 testable files** (plus 2 barrels and `Sidebar.ts` excluded). Roughly 18 SMOKE / 66 DEEP. The screens/modal hosts and `ui-demo` (10 files) plus `app/_layout`/`(tabs)/_layout` render with `withContexts: true`.

---

## Goal 5 — `renderWithProviders` test util

A single helper wraps components in the **real** provider tree so token usage, theme state, and context behavior are exercised (never mock `useTheme`). It lives at `test/renderWithProviders.tsx`.

```tsx
// test/renderWithProviders.tsx
import React, { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/src/hooks/useTheme'
import { AddTaskModalProvider } from '@/src/context/AddTaskModalContext'
import { SettingsModalProvider } from '@/src/context/SettingsModalContext'
import { PomodoroModalProvider } from '@/src/context/PomodoroModalContext'
import { PomodoroMiniProvider } from '@/src/context/PomodoroMiniContext'
import { MobileHeaderProvider } from '@/src/context/MobileHeaderContext'
import { WidgetProvider } from '@/src/context/WidgetContext'

export interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Opt into the full context stack (modal/pomodoro/widget). Default: ThemeProvider only. */
  withContexts?: boolean
}

function AllProviders({ children }: { children: ReactNode }) {
  // PomodoroMiniProvider consumes usePomodoro (timers); tests that mount it use fake timers.
  return (
    <ThemeProvider>
      <MobileHeaderProvider>
        <AddTaskModalProvider>
          <SettingsModalProvider>
            <PomodoroModalProvider>
              <PomodoroMiniProvider>
                <WidgetProvider>{children}</WidgetProvider>
              </PomodoroMiniProvider>
            </PomodoroModalProvider>
          </SettingsModalProvider>
        </AddTaskModalProvider>
      </MobileHeaderProvider>
    </ThemeProvider>
  )
}

function ThemeOnly({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

export function renderWithProviders(
  ui: ReactElement,
  { withContexts = false, ...options }: ProviderOptions = {},
) {
  const Wrapper = withContexts ? AllProviders : ThemeOnly
  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from RTL so tests import from one place.
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
```

**Design points:**

- **Real `ThemeProvider` always.** Tokens are produced by the real `buildTokens`, so a component that reads `tokens.accentPrimary`, `tokens.spacing.lg`, etc. is exercised against real values. This satisfies Goal 5 and ui-rule enforcement (token usage is live, not stubbed). `ThemeProvider` reads AsyncStorage on mount via `multiGet`; with the in-memory AsyncStorage mock returning `null` for both keys, it falls back to the documented defaults (`light`, `#8B5CF6`). The hydration `useEffect` resolves on a microtask; tests that assert post-hydration state use `await screen.findBy...` / `waitFor`.
- **Two tiers via `withContexts` (ties to the Ctx column in Goal 4).** Leaf primitives and prop-driven components need theme only → `ThemeOnly` (the default, fast). Any component whose source calls `useAddTaskModal`/`useSettingsModal`/`usePomodoroModal`/`usePomodoroMini` — all of which throw outside their provider — passes `withContexts: true`; the Goal 4 tables mark exactly which files these are (`Y`). This removes the "default render throws" hazard flagged in review: the requirement is explicit per file rather than left to chance.
- **`useProgress`/`useAuth` are NOT providers** (they are hooks backed by Firebase). Screens consume them directly, so they are controlled through the **firebase mock control** (`setAuthUser`, `setFirestoreDoc`, `setFirestoreDocs`) rather than a provider — the design does not introduce a fake provider for them, keeping production code paths intact. A thin `test/fixtures/tasks.ts` supplies sample `Task`/`Topic`/`Goals` objects (with raw Firestore field names for seeding) for screen tests.
- **Single import surface.** Tests import `render`/`screen`/`fireEvent`/`userEvent`/`renderWithProviders` from `@/test/renderWithProviders`, so a test file reads cleanly and consistently.

**Timers:** components with intervals (`PomodoroModal`, `FocusMode`, `DailyNotes` debounce, `AddTaskModalContext` 300ms close delay, `PomodoroMiniContext`) use `vi.useFakeTimers()` in the relevant `describe`, consistent with the existing `usePomodoro`/`pomodoro.test.ts` pattern.

---

## Error handling, edge cases, and validation

- **Mock resolution failures (fatal, at setup):** if a `vi.mock` factory throws or a module path is wrong, the component project fails fast at setup — desirable (a broken mock must not silently pass). This is precisely why the AsyncStorage vendor mock is rejected (it calls `jest.fn` at import and would crash the whole web suite) in favor of the hand-written in-memory mock. Setup order: jsdom shims → AsyncStorage → firebase → router → native stubs, so later mocks can rely on earlier ones.
- **Async hydration (recoverable):** `ThemeProvider`'s AsyncStorage `multiGet` resolves after mount. Tests asserting default tokens render synchronously; tests asserting persisted values use `waitFor`/`findBy`.
- **Native-only branches (out of scope for component tests):** `TaskItem` `Swipeable`, `LineChart`'s lazy `require('victory-native')` native branch, `Sidebar.native`. The jsdom/RNW runtime always takes `Platform.OS === 'web'`. (Note: `BestHoursChart` victory IS on the web path and IS covered — see Goal 3 item 5.) Each affected per-file note says so explicitly.
- **Firestore snapshot shape (validated by the mock):** `setFirestoreDocs(path, [{id,data}])` yields a QuerySnapshot `{ docs: [{ id, data(), exists() }], forEach, size, empty }`; `setFirestoreDoc(path, data)` yields a DocumentSnapshot `{ id, exists(), data() }`. These match exactly how `firestoreMappers` (`snap.data() ?? {}`, `snap.id`) and `useProgress` (`snap.docs.map/forEach/length`, single-doc `snap.exists()`) read them (verified). The real `Timestamp` class is re-exported from the actual SDK so mapper round-trips are genuine. A malformed seeded doc surfaces as a failing in-test assertion — the intended signal.
- **Firestore query surface completeness:** the mock exports exactly the functions used in production (`collection`, `doc`, `onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `getDocs`, `addDoc`, `serverTimestamp`, `Timestamp`). `query`/`where`/`orderBy`/`limit` are confirmed unused and omitted; adding one later would raise an undefined-export error at call time rather than passing silently.
- **User input validation in components:** forms (`QuickAdd`, `AddTaskModal`, `auth`, `feedback`, `DurationField`) have DEEP tests covering required/empty/invalid input and the resulting disabled/error UI, so validation rules live in the test suite, not just prose.
- **Invariant ownership:** token correctness is owned by `ThemeProvider` (exercised live, never mocked). Navigation side effects are owned by the router mock spies (asserted per screen). Data invariants (task shape) are owned by `firestoreMappers`, already unit-tested in the node suite and re-exercised indirectly by screen tests.

## Testability summary

- **Unit-testable in isolation (theme-only render):** all `ui/`, `motion/`, most flat primitives, `AppText`, `GradientSurface`, `ProgressRing`, `SegmentedToggle`.
- **Interaction-tested (full providers + user-event):** `QuickAdd`, `CommandPalette`, `TaskItem`, form fields, `ThemeCustomizer`, modals.
- **Integration-tested (controlled firebase/router):** every `app/` screen and modal host.
- **Context unit tests:** all six `src/context/` providers via `renderHook` + a wrapping provider, asserting state transitions and the throw-/no-op-outside-provider guard.
- A design red-flag check: nothing here requires real network, real native modules, or a device — everything resolves through the mock layer, which is the signal the design is testable.

---

## Technology stack (locked on approval)

React Native 0.76.9 · Expo 52 · react-native-web ~0.19.13 · React 18.3.1 · react-dom 18.3.1 (already installed) · TypeScript 5.3 · Expo Router 4 · **Vitest 5.0.2 with `test.projects` (node + jsdom)** · **jsdom 25.0.1** · **@testing-library/react 16.1.0 + @testing-library/dom 10.4.0 + @testing-library/user-event 14.5.2 + @testing-library/jest-dom 6.6.3** · fast-check 4.10.2 (already present). No UI component library introduced. Mock layer and helpers live under a new top-level `test/` directory; component test files are co-located in `__tests__/` folders with the `*.component.test.tsx` suffix.

**fast-check note (addresses review NIT 7):** `fast-check` remains available for property-based tests of the *exported* pure helpers in the node suite (`src/lib/progressStats.ts`, `firestoreMappers.ts`, `utils.ts` — several already use it). It is NOT applied to `parseQuickInput`, which is a module-private function inside `QuickAdd.tsx` taking a `topics` argument; that parser is covered indirectly through the `QuickAdd` DEEP UI test. This design does not propose exporting `parseQuickInput` (out of scope for a test-infra change); if a future task wants direct property tests of it, it should first be extracted to a pure exported helper.

---

## Responses to design review findings

- **Finding 1 (HIGH — BestHoursChart victory import).** Fixed. Corrected the rationale: `BestHoursChart.tsx` statically imports `victory-native` and renders it on **all** platforms (only `LineChart.tsx` is lazy/native-only). Chose option (b): the victory mock now renders an **inspectable** `VictoryBar` stub that serializes its `data`/`fill` props, so the DEEP "buckets by hour / highlights peak" assertions are achievable. Updated both the Goal 3 item 5 mock spec and the Goal 4 planner per-file note.
- **Finding 2 (HIGH — lucide mock contradiction).** Fixed. Specified exactly one mechanism: a `vi.mock` factory returning a `Proxy` directly whose `get` trap resolves every named import to a stub icon and handles `__esModule`. Removed the default-export and `module.exports` variants.
- **Finding 3 (MEDIUM — RN primitives via alias).** Fixed. Added an explicit paragraph in Goal 3 stating all mock files import RN primitives from `'react-native'` and rely on the web project's project-scoped `react-native → react-native-web` alias (which covers `test/`), so stubs render DOM.
- **Finding 4 (MEDIUM — AsyncStorage mock).** Fixed. Verified the installed 1.23.1 vendor mock uses `jest.fn(...)` throughout and would throw under Vitest. Replaced it with a hand-written in-memory mock exposing `getItem/setItem/removeItem/multiGet/multiSet/multiRemove/clear/getAllKeys` plus `resetAsyncStorage()`; documented its exact shape and reset wiring.
- **Finding 5 (MEDIUM — renderWithProviders default crashes).** Fixed. Added a **Ctx** column to every Goal 4 table marking which files require `withContexts: true` (screens/modal hosts/`ui-demo`/layouts), kept the ThemeOnly default for leaf/prop-driven components, and tied the column to the Goal 5 explanation. Verified which context hooks throw vs no-op.
- **Finding 6 (MEDIUM — firestore mock surface + snapshot shape).** Fixed. Enumerated the full `firebase/firestore` surface actually used (verified by grep: no `query`/`where`/`orderBy`/`limit`), pinned the QuerySnapshot and DocumentSnapshot shapes against `firestoreMappers.ts`/`useProgress.ts`, and specified re-exporting the real `Timestamp`.
- **Finding 7 (NIT — parseQuickInput fast-check).** Fixed. Dropped `parseQuickInput` from the fast-check example and clarified it is module-private/covered via the UI test; noted the extract-to-helper path as out of scope.
- **Finding 8 (NIT — orphan .test.tsx).** Fixed. Added `src/**/__tests__/**/*.test.tsx` to the web project's `include` as a safety net and documented the guard.
- **Finding 9 (NIT — Sidebar.ts barrel).** Fixed. Reworded to state Metro platform-extension resolution is absent under Vitest, so `Sidebar.ts` resolves to its literal `.native` re-export and web-UI tests import `Sidebar.web.tsx` by explicit path.
- **Finding 10 (NIT — reanimated style values).** Fixed. Added a note that animated-style *values* are not assertable under the once-evaluated `useAnimatedStyle` + plain `useSharedValue` stub; DEEP motion tests assert callbacks and keyed child swaps instead.
