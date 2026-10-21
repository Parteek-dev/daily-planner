# Implementation Plan — Themed, reusable cross-platform Date & Time pickers

## Context (verified against the repo)

- `DatePickerField` (`src/components/DatePickerField.tsx`) and `TimePickerField` (`src/components/TimePickerField.tsx`) today branch per platform: web renders a `TextInput` with `type=date/time`; native lazily `require('@react-native-community/datetimepicker')` and falls back to a validated text field. That dependency is **NOT** in `package.json`, so native always hits the text fallback → no visible picker. Web shows a bare styled input. Both must be replaced.
- Both pickers are consumed with the exact prop shapes in the brief by three call sites — `app/(modals)/add-task.tsx`, `src/components/task/AddTaskModal.tsx` (the shared add/edit modal), and `src/components/task/TaskTemplates.tsx`. None pass extra props. **Keep the exported names and prop interfaces identical** and these call sites need zero changes.
- `lucide-react-native@1.48.0` is a dependency → `ChevronLeft`, `ChevronRight`, `Check`, `X` icons are available. Do **not** add `@react-native-community/datetimepicker`.
- `react-native` `Modal`, `Pressable`, `ScrollView`, `Platform` are already used throughout (see `TaskTemplates.tsx` modal for the established backdrop/overlay pattern).

### Token shape (verified in `src/theme/tokens.ts`) — use these EXACT keys

All brief-named tokens exist; no renames needed.
- Backgrounds: `tokens.bgInput`, `tokens.bgElevated`, `tokens.bgPrimary`, `tokens.bgSecondary`, `tokens.bgTertiary`, `tokens.bgAccentSoft`.
- Borders: `tokens.borderPrimary`, `tokens.borderSecondary`, `tokens.borderFocus`.
- Text: `tokens.textPrimary`, `tokens.textSecondary`, `tokens.textMuted`, `tokens.textInverse`.
- Accents: `tokens.accentPrimary`, `tokens.accentPrimaryMuted`, `tokens.accentRed`.
- Spacing (numbers): `tokens.spacing.xs|sm|md|lg|xl|xxl|xxxl` = 4/8/12/16/24/32/48.
- Radius (numbers): `tokens.radius.xs|sm|md|lg|xl|xxl|full` = 4/8/12/16/20/24/9999.
- Typography objects (each has `fontFamily/fontSize/fontWeight/lineHeight`, some `letterSpacing`): `tokens.typography.body` (15/22), `tokens.typography.caption` (13/18), `tokens.typography.label` (11/14), `tokens.typography.subheading` (17/24), `tokens.typography.heading` (20/28). Spread these into text styles so `lineHeight` is always set (satisfies the text-overflow steering).
- Elevation: `tokens.elevation.md` / `tokens.elevation.lg` / `tokens.elevation.glow`; apply cross-platform with the exported `applyElevation(elevationStyle)` helper from `src/theme/tokens.ts` (it returns `boxShadow` on web, native shadow props otherwise). Prefer `applyElevation(tokens.elevation.lg)` for the popover/sheet card.

### makeStyles signature to match the codebase

Use the project pattern: a module-level `function makeStyles(tokens: Tokens) { return StyleSheet.create({ ... }) }` and in the component `const styles = useMemo(() => makeStyles(tokens), [tokens])`. Import `type { Tokens } from '@/src/theme/tokens'`. No hardcoded hex, no magic numbers — every color/space/radius/line-height comes from tokens. (Icon `size` numeric props and `hitSlop` are not StyleSheet values and are acceptable as literals, matching existing components.)

### Build / test tooling (verified)

- `npm test` → `vitest --run`. `vitest.config.ts` uses `environment: 'node'` and includes only `src/**/*.test.ts(x)`. There is **no jsdom/RTL**, so component-render tests are out of scope; pure-function tests are the supported form. Existing tests live in `src/lib/__tests__/*.test.ts` using `vitest` + `fast-check` (see `src/lib/__tests__/utils.test.ts`).
- Type check: no `tsc` script, but `typescript@^5.3.3` is installed and `tsconfig.json` is strict with `@/*` alias. Use `npx tsc --noEmit`.
- Lint: `npm run lint` (`expo lint`).

### Design decisions (made here, not deferred)

1. **Extract pure helpers into `src/lib/datetime.ts`.** The 24h↔12h conversion, YMD parse/format, month-grid builder, and display formatters are pure and live in `src/lib/` so they get real node unit tests. The RN components import from there and stay presentation-only (keeps business logic out of presentation, per UI rules). Rationale: the existing vitest setup can only test pure modules, and this is the only way to give the conversion logic the verification the brief calls for.
2. **One themed implementation on all platforms** — no `<input type=date/time>`, no text fallback, no native module. A `Pressable` trigger opens an overlay containing the custom picker. Rationale: the brief requires identical behavior on iOS/Android/Web with no native dependency, and removing the platform branches removes the "no picker" bug at its root.
3. **Overlay strategy:** use RN `Modal` (`transparent`, `animationType="fade"`, `onRequestClose`, `statusBarTranslucent`) on all platforms, mirroring the working pattern already in `TaskTemplates.tsx`/`AddTaskModal.tsx`. Layout differs by a single `isMobile` flag (`!(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)` via `useWindowDimensions`): mobile → bottom-sheet card (full width, rounded top corners, `justifyContent: 'flex-end'`); web/wide → centered card (`maxWidth`, `justifyContent: 'center'`). Rationale: one Modal primitive avoids a web-popover/native-sheet split and the fragile anchoring that a true web popover needs, while still giving the sheet-vs-centered feel the brief asks for. This is one deliberate, contained platform branch (allowed — it is genuine platform behavior).
4. **Time entry UI:** +/- steppers for hour (1–12), minute (step 5 via steppers, wrapping), plus an AM/PM segmented toggle and a Clear button. Rationale: steppers are simpler, fully accessible, and avoid a native scroll-wheel module; minute step 5 matches the brief while wrap-around keeps every value reachable.

### 24h↔12h conversion contract (to implement in `src/lib/datetime.ts`)

- `to12h(hhmm: string | null): { hour12: number; minute: number; period: 'AM' | 'PM' } | null` — `'00:xx'`→12 AM, `'12:xx'`→12 PM, `'13:00'`→1 PM; returns `null` for `null`/invalid.
- `to24h(hour12: number, minute: number, period: 'AM'|'PM'): string` — inverse; 12 AM→`'00'`, 12 PM→`'12'`; zero-pads to `HH:MM`. Round-trips with `to12h`.
- `formatTime12h(hhmm: string | null): string` — display string e.g. `'2:05 PM'`; `''` when null/invalid.
- `formatDateDisplay(ymd: string): string` — nice display e.g. `'Jan 31, 2025'`; returns `''` for empty/invalid (reuse local `parseYMD`).
- Keep existing `parseYMD`/`toYMD`/`parseHHMM`/`toHHMM`/`isValidYMD`/`isValidHHMM` logic; move the reusable ones into this module and import them in the components.
- `buildMonthGrid(year: number, monthIndex0: number): Array<Array<{ ymd: string; day: number; inMonth: boolean }>>` — weeks x 7 cells, leading/trailing days from adjacent months flagged `inMonth: false`, week starts Sunday (matches `DAYS_OF_WEEK` Sun-first ordering already used in the app).

---

## Steps

- [ ] 1. Create pure datetime helpers module `src/lib/datetime.ts`.
      Implement and export: `parseYMD`, `toYMD`, `isValidYMD`, `parseHHMM`, `toHHMM`, `isValidHHMM`, `to12h`, `to24h`, `formatTime12h`, `formatDateDisplay`, `buildMonthGrid` and the `Period`/cell types, matching the conversion contract above. No React/RN imports — pure TS only.
      Files: `src/lib/datetime.ts`
      Verify: `npx tsc --noEmit` passes.

- [ ] 2. Add unit tests for the datetime helpers following the existing `src/lib/__tests__/utils.test.ts` style (`vitest` + optional `fast-check`).
      Cover: `to12h`/`to24h` round-trip over all 24 hours (property test), the 00:00→12 AM and 12:00→12 PM edge cases, `formatTime12h`/`formatDateDisplay` on valid + empty + malformed input, `buildMonthGrid` returns full weeks of 7 and flags out-of-month days (spot-check a known month, e.g. Feb 2025).
      Files: `src/lib/__tests__/datetime.test.ts`
      Verify: `npm test` — the new `datetime` suite passes and the existing suites still pass.

- [ ] 3. Create the themed `CalendarPicker` presentation component.
      Month-grid calendar: weekday header row (Sun–Sat), weeks from `buildMonthGrid`, a header with month + year and prev/next `Pressable`s using `ChevronLeft`/`ChevronRight` from `lucide-react-native`. Today gets a subtle `tokens.borderFocus` ring; the selected day fills with `tokens.accentPrimary` and `tokens.textInverse` text; out-of-month days use `tokens.textMuted`. Internal `viewMonth` state seeds from `value` (or today when empty). Day cells are `Pressable` with `minWidth/minHeight: 44`, `accessibilityRole="button"`, an `accessibilityLabel` of the full date, and on web `focusable` with an `onKeyDown` Enter/Space handler plus a `tokens.borderFocus` focus style. Props: `{ value: string; onSelect: (ymd: string) => void; onClose?: () => void }`. All styling via `makeStyles(tokens)` + `useMemo`; spread `tokens.typography.*` into every text style.
      Files: `src/components/CalendarPicker.tsx`
      Verify: `npx tsc --noEmit` passes; `npm run lint` reports no new errors.

- [ ] 4. Create the themed `WheelTimePicker` presentation component.
      Columns/steppers for hour (1–12, wraps), minute (00–59, +/- step 5, wraps), and an AM/PM segmented toggle; a Clear button that calls `onChange(null)`; a Done button that calls `onClose`. Seed internal state from `to12h(value)` (default to a sensible time like 9:00 AM when null). Every value change recomputes `to24h(...)` and calls `onChange(hhmm)`. Stepper and toggle controls are `Pressable` with `minWidth/minHeight: 44`, `accessibilityRole="button"`/`"adjustable"` as appropriate, accessible labels, and on web keyboard support (Enter/Space, and Arrow up/down on the steppers) with a `tokens.borderFocus` focus style. Props: `{ value: string | null; onChange: (hhmm: string | null) => void; onClose?: () => void }`. `makeStyles(tokens)` + `useMemo`; spread `tokens.typography.*` so digits never clip.
      Files: `src/components/WheelTimePicker.tsx`
      Verify: `npx tsc --noEmit` passes; `npm run lint` reports no new errors.

- [ ] 5. Rewrite `DatePickerField` to a single themed trigger + overlay on all platforms.
      Replace the whole file body: keep `export interface DatePickerFieldProps` and `export function DatePickerField` with the identical signature `{ value: string; onChange: (date: string) => void; label?: string; placeholder?: string }`. Render optional `label` then a `Pressable` trigger (border `tokens.borderPrimary`, bg `tokens.bgInput`, radius `tokens.radius.sm`) showing `formatDateDisplay(value)` or the placeholder in `tokens.textMuted`; `accessibilityRole="button"`, `accessibilityLabel` from `label ?? 'Date'`, web-focusable with a `tokens.borderFocus` focus style. Local `open` state renders a `Modal` (per decision 3) hosting `CalendarPicker` in a `tokens.bgElevated` card with `applyElevation(tokens.elevation.lg)`; backdrop `Pressable` and Done close it; `onSelect` emits YMD via `onChange` and closes. Remove the `@react-native-community/datetimepicker` require block and the text fallbacks. Import helpers from `src/lib/datetime.ts`. `makeStyles(tokens)` + `useMemo`.
      Files: `src/components/DatePickerField.tsx`
      Verify: `npx tsc --noEmit` passes.

- [ ] 6. Rewrite `TimePickerField` to a single themed trigger + overlay on all platforms.
      Same pattern as step 5: keep `export interface TimePickerFieldProps` and `export function TimePickerField` with the identical signature `{ value: string | null; onChange: (time: string | null) => void; label?: string; placeholder?: string }`. Trigger shows `formatTime12h(value)` (12-hour AM/PM) or placeholder in `tokens.textMuted`. Overlay Modal hosts `WheelTimePicker`; its `onChange` passes through to the field's `onChange` (still emitting 24-hour `HH:MM` or `null`). Remove the datetimepicker require and text fallbacks. Import helpers from `src/lib/datetime.ts`. `makeStyles(tokens)` + `useMemo`.
      Files: `src/components/TimePickerField.tsx`
      Verify: `npx tsc --noEmit` passes.

- [ ] 7. Confirm the three call sites still typecheck and behave against the unchanged public API (no edits expected).
      Re-read `app/(modals)/add-task.tsx`, `src/components/task/AddTaskModal.tsx`, `src/components/task/TaskTemplates.tsx` and confirm they only use the preserved props (`value`/`onChange`/`placeholder`). Make no changes unless the type check surfaces a break.
      Files: none (verification only)
      Verify: `npx tsc --noEmit` passes with zero errors referencing these files.

- [ ] 8. Full verification pass.
      Files: none
      Verify: `npm test` (all vitest suites pass, including the new `datetime` suite), `npx tsc --noEmit` (clean), and `npm run lint` (no new errors). Note: component rendering is not unit-testable under the current node/vitest setup, so UI behavior is verified via type-check + lint + the pure-helper tests; flag this residual gap in the step report.

## Notes / assumptions

- Web uses RN `Modal` rather than a DOM-anchored popover (decision 3). An anchored popover would need layout measurement and portal handling that RN-Web's `Modal` does not provide cleanly; a centered card is the pragmatic, consistent choice and still reads as a popup. If a true anchored popover is later required, it can be layered on without changing the public API.
- `applyElevation` is already exported from `src/theme/tokens.ts`; reuse it rather than re-deriving shadow props, to stay token-driven on both web and native.
- The current vitest environment is `node` with no RTL — component tests are intentionally omitted; the pure-helper module (steps 1–2) is what carries the automated verification of the conversion logic that is the correctness-critical part of this task.

---

## Verification record (iteration 1)

Ran from the project root:

- `npx tsc --noEmit` → **clean, 0 errors.** The two new components (`CalendarPicker`, `WheelTimePicker`), the new helper module (`src/lib/datetime.ts`), the two rewired fields (`DatePickerField`, `TimePickerField`), and all three call sites compile with no new errors. No pre-existing errors surfaced either.
  - One RN/RN-Web type gap handled: `PressableStateCallbackType` in `@types/react-native` does not declare `focused` (it exists only at runtime on react-native-web). Resolved with a local `type PressableState = PressableStateCallbackType & { focused?: boolean }` in each component — no `any`.
- `npx vitest --run` → **5 files, 34 tests, all passing**, including the new `src/lib/__tests__/datetime.test.ts` suite. It covers the 24h↔12h round-trip over all 24 hours (property test), the 00:00→12 AM / 12:00→12 PM edges, `formatTime12h`/`formatDateDisplay` on valid/empty/malformed input, and `buildMonthGrid` (full weeks of 7, out-of-month flags for Feb 2025). The brief's round-trip check is covered: `14:30` → `formatTime12h` = `2:30 PM`; picking 2:30 PM → `to24h(2,30,'PM')` = `14:30`; clearing → `null`.
- `npm run lint` → **not run to completion.** The script is `expo lint` and the repo has no ESLint config, so it tries to bootstrap one interactively and hangs. Lint is effectively not set up in this project; `tsc` + the unit tests are the reliable gates and both pass.
- Hardcoded-hex grep `#[0-9a-fA-F]{3,6}` over the four picker files + `datetime.ts` → **no matches.** All colors/spacing/radius/typography come from `tokens`. The only literal color is the modal backdrop `rgba(0,0,0,0.5)`, which matches the established scrim used by `ConfirmModal.tsx` and other modals (no scrim token exists); it is not a hex value and is not flagged by the grep.
- Call sites (`app/(modals)/add-task.tsx`, `src/components/task/AddTaskModal.tsx`, `src/components/task/TaskTemplates.tsx`) use only the preserved `value` / `onChange` / `placeholder` props and needed **zero edits**; confirmed by reading them and by the clean type-check.

Could **not** be verified here: live visual rendering / interaction on iOS, Android, and Web (device/simulator and real focus-ring behavior) — the node/vitest setup has no RTL/jsdom, so UI rendering is validated indirectly via type-check + the pure-helper tests.
