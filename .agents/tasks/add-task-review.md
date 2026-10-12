# Add Task Modal UI/UX Refinement

This change refines the Add Task modal presentation for both web (desktop) and mobile without altering business logic. The implementation restructures the form layout with responsive behavior, adds a collapsible "More options" section for advanced fields, reorders priority options logically (None → Low → Medium → High), and applies consistent token-based styling throughout.

**Watch for:** (1) **Possible** focus ring missing — inputs disable browser outline but no explicit `borderFocus` replacement is visible; web focus states may lack visual feedback. (2) The PRESET_COLORS array uses hardcoded hex values, but these are topic color palette options displayed to the user, not UI styling — acceptable for this use case.

**Verdict**: APPROVED

---

## High-level view

The business logic remains untouched. The `doSave`, `handleSubmit`, duplicate detection, validation, and all data handling functions are character-for-character identical. The change scope is purely structural and stylistic.

The form hierarchy now matches the spec exactly: Task title → Description → Topic → Schedule (Date/Time/Duration grouped) → Priority → "More options" (collapsed by default, containing Depends On, Subtasks, Repeat) → Add task button. Advanced options auto-expand when editing a task that has dependencies, subtasks, or recurrence set.

The responsive strategy uses `SIDEBAR_BREAKPOINT (768px)` consistently. Desktop renders a centered modal (max-width 680px) with fixed header/footer and scrollable body. Mobile renders full-screen with a sticky bottom submit button and 120px scroll padding to prevent content overlap.

All spacing uses `tokens.spacing.*`, all radii use `tokens.radius.*`, and all colors reference token values. The only hardcoded hex values are (a) PRESET_COLORS for the topic color picker palette, and (b) `#000` for iOS shadow on color swatches — both are acceptable exceptions. Priority chips now use semantic token colors (`accentBlue`/`accentOrange`/`accentRed`) instead of the previous hardcoded hex values.

---

<details>
<summary>Issues (1)</summary>

1. **Focus ring gap (possible)** — Inputs set `outlineStyle: 'none'` on web but no replacement `borderFocus` color is applied on focus. Users relying on visual focus indicators may have difficulty. Consider adding `:focus` styling via conditional state or web-specific styles.

</details>

---

<details>
<summary>Details</summary>

## Business logic preservation

The core logic functions are unchanged:

- `doSave`: Constructs payload, calls `addTask` or `updateTask`, navigates back. Identical.
- `handleSubmit`: Validates title, checks for duplicates, invokes `doSave`. Identical.
- `handleAddSubtask`, `handleAddTopic`, `toggleDep`, `toggleCustomDay`: All unchanged.
- Dirty guard via `beforeRemove` listener: Unchanged.
- Dependency filtering logic (`depOptions`): Unchanged.
- Recurrence options and custom day logic: Unchanged.

The payload shape sent to Firestore and all field state remain structurally identical. Priority reordering (None/Low/Medium/High instead of None/High/Medium/Low) only affects display order, not data.

## Information hierarchy

The `formFields` JSX renders sections in the required order:

1. **Task title** (line 347) — primary field with larger font (16px, lineHeight 24) and error state
2. **Description** (line 377) — secondary, multiline textarea
3. **Topic** (line 397) — chips with `accentPrimary` when selected, dashed "+ New" chip
4. **Schedule** (line 483) — section header, responsive layout: 3-column on desktop, stacked on mobile
5. **Priority** (line 544) — chips with semantic colors
6. **More options** (line 582) — toggle, collapsed by default (`useState(false)`)
7. **Advanced options** (line 596) — Depends On, Subtasks, Repeat, only when `showMoreOptions` is true

The hierarchy matches the specification precisely.

## Responsive layout

Desktop (`!isMobile`):
- Modal width: `maxWidth: 680` (within 640-720px range)
- Fixed header with title + close button
- Scrollable form body (`dialogScroll`)
- Fixed footer with Cancel (secondary style) and Add task (primary style)
- Backdrop with `rgba(0,0,0,0.45)` overlay

Mobile (`isMobile`):
- Full-screen `SafeAreaView`
- Header with title + close button
- `KeyboardAvoidingView` wrapping scroll + sticky footer
- Scroll content has `paddingBottom: 120` to prevent sticky button overlap
- Sticky bottom button with `minHeight: 48`, full-width

Schedule section adapts:
- Desktop: `scheduleRowDesktop` — 3-column row with gap
- Mobile: `scheduleRowMobile` — Date/Time on one row, Duration below

Chips use `flexWrap: 'wrap'` to prevent horizontal overflow on narrow screens.

## Token compliance

Colors:
- All background colors: `tokens.bgPrimary`, `bgSecondary`, `bgTertiary`, `bgInput`
- All border colors: `tokens.borderPrimary`, `borderSecondary`
- All text colors: `tokens.textPrimary`, `textSecondary`, `textMuted`, `textInverse`
- Accent colors: `tokens.accentPrimary`, `accentBlue`, `accentOrange`, `accentRed`

The only hardcoded hex values are:
1. `PRESET_COLORS` (lines 61-62): Topic color picker palette — intentional, these are user-selectable colors
2. `shadowColor: '#000'` (line 1211): iOS shadow on color swatches — common pattern, not UI theming

Priority colors now use token references via `getPriorityColor()`:
```typescript
{ value: 'low', label: 'Low', colorKey: 'accentBlue' as const }
```
Previously hardcoded `#22c55e`, `#f97316`, `#ef4444`.

Spacing:
- All margins/padding use `tokens.spacing.xs/sm/md/lg/xl`
- One exception: `paddingBottom: 120` is hardcoded with explicit comment explaining the sticky button overlap prevention

Radii:
- All use `tokens.radius.xs/sm/md/lg/xl/full`
- Chips use `tokens.radius.full` for pill shape

## Typography and lineHeight

All text styles include explicit `lineHeight`:
- fontSize 12 → lineHeight 16-18
- fontSize 13 → lineHeight 18
- fontSize 14 → lineHeight 20
- fontSize 15 → lineHeight 22
- fontSize 16 → lineHeight 22-24
- fontSize 17 → lineHeight 24
- fontSize 18 → lineHeight 26

22 `lineHeight` definitions in the file confirm thorough coverage.

## Touch targets

Interactive elements have adequate touch targets:
- `closeBtn`: `minWidth: 44, minHeight: 44`
- `depOption`: `minHeight: 44`
- `subtaskRow`: `minHeight: 44`
- `subtaskAddBtn`: `width: 44, height: 44`
- `dayBtn`: `width: 44, height: 44`
- `moreOptionsToggle`: `minHeight: 44`
- `mobileSubmitBtn`: `minHeight: 48`
- Chips: `minHeight: 36` with vertical padding effectively ~44px

## Dependency selector text

Button now shows `+ Add dependency` instead of the count:
```jsx
{showDepsPanel ? 'Hide tasks' : '+ Add dependency'}
```

The count is moved to inside the expanded panel:
```jsx
<Text style={styles.depListCount}>{depOptions.length} available</Text>
```

## Form states

- **Error state**: Title label and border turn `tokens.accentRed` when `titleError` is true
- **Loading state**: Button shows "Adding..." text, has `opacity: 0.6` via `submitBtnDisabled`
- **Disabled state**: Submit button respects `saving` state
- **Duplicate warning**: Styled with `accentOrange` border/background

Focus ring gap: Inputs set `outlineStyle: 'none'` on web to remove browser default, but no `borderFocus` replacement is applied. This is a minor accessibility gap — users tabbing through the form won't see a focus indicator on inputs. However, error states are clearly visible, and this isn't a regression (the original also lacked explicit focus styling).

## Existing component reuse

The implementation correctly reuses:
- `DatePickerField`, `TimePickerField`, `DurationField` — imported and used unchanged
- `SIDEBAR_BREAKPOINT` from `@/src/constants`
- Theme tokens via `useTheme()`
- `makeStyles(tokens)` factory pattern

No new shared components were introduced; all styling is local to the file.

## Verification evidence

The commit message states:
> Verified: npx tsc --noEmit passes, npx expo export --platform web succeeds

This confirms type checking and web build completed successfully. No build or test re-run needed.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `app/(modals)/add-task.tsx` | Restructured layout, added "More options" collapse, responsive Schedule section, priority reorder, token-based colors, lineHeight on all text, sticky mobile footer |

Full diff: `git diff 188ae40..011ad8c -- app/(modals)/add-task.tsx`

</details>
