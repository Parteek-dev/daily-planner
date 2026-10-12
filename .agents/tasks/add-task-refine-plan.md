# Implementation Plan: Add Task Form UI/UX Refinement

This is a UI-only refinement of the existing Add Task modal (`app/(modals)/add-task.tsx`). The goal is a consistent, modern task-creation experience across desktop and mobile with responsive layouts optimized for each screen size.

## Constraints — DO NOT CHANGE

These items must remain untouched:
- Task creation logic (`doSave`, `handleSubmit`)
- Form validation (`titleError`, duplicate detection)
- APIs and hooks (`useProgress`, `addTask`, `updateTask`)
- Task model and all field state (`title`, `description`, `topic`, `duration`, `date`, `dueTime`, `priority`, `dependsOn`, `subtasks`, `recurrence`, `customDays`, `recurrenceEndDate`)
- Topic creation logic (`handleAddTopic`, `addTopic`)
- Dependency logic (`depOptions`, `toggleDep`)
- Subtask logic (`handleAddSubtask`, subtask state)
- Priority logic (the 4 options, selection)
- Recurrence logic (all options, custom days picker)
- Date/time/duration logic (field components, format conversion)

## Existing Components & Tokens to Reuse

### Theme Tokens (from `src/theme/tokens.ts`)
- **Backgrounds**: `bgPrimary`, `bgSecondary`, `bgTertiary`, `bgInput`, `bgElevated`
- **Borders**: `borderPrimary`, `borderSecondary`, `borderFocus`
- **Text**: `textPrimary`, `textSecondary`, `textMuted`, `textInverse`
- **Accents**: `accentPrimary`, `accentBlue`, `accentGreen`, `accentOrange`, `accentRed`, `accentPurple`
- **Spacing**: `tokens.spacing.xs/sm/md/lg/xl/xxl/xxxl` (4/8/12/16/24/32/48)
- **Radius**: `tokens.radius.xs/sm/md/lg/xl/xxl/full` (4/8/12/16/20/24/9999)
- **Typography**: `tokens.typography.body/caption/label/heading/subheading`
- **Elevation**: `tokens.elevation.sm/md/lg` for shadows

### Existing Field Components (keep using as-is)
- `DatePickerField` — date picker with human-readable display
- `TimePickerField` — time picker with cross-platform support
- `DurationField` — text-based duration input with validation

### Breakpoint Constant
- `SIDEBAR_BREAKPOINT = 768` from `src/constants/index.ts`
- Mobile detection: `const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)`

### Styling Pattern
Use the existing `makeStyles(tokens)` factory pattern already in the file.

---

## Implementation Plan

- [ ] 1. **Add mobile detection and update breakpoint logic**
      
      Currently uses `isWebWide = Platform.OS === 'web' && width > 640`. Change to standard breakpoint:
      ```typescript
      import { SIDEBAR_BREAKPOINT } from '@/src/constants'
      const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)
      ```
      
      Files: `app/(modals)/add-task.tsx`
      Verify: `npx expo start --web` — renders correctly at different viewport sizes.

- [ ] 2. **Restructure form into semantic sections with "More options" collapse**
      
      Reorganize `formFields` JSX into a clear information hierarchy:
      1. **Task title** (primary field — visually prominent)
      2. **Description** (optional, smaller visual weight)
      3. **Topic** (chips)
      4. **Schedule** section header with Date/Time/Duration grouped
      5. **Priority** (chips with semantic colors)
      6. **"More options" collapsible** containing:
         - Depends On
         - Subtasks
         - Repeat (recurrence)
      
      Add new state: `const [showMoreOptions, setShowMoreOptions] = useState(false)`
      
      Move Depends On, Subtasks, and Repeat sections into a collapsible container that's hidden by default. Add a "More options ˅/˄" toggle button.
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Form renders with collapsed advanced options; toggle expands them.

- [ ] 3. **Refine Task Title field styling — make it the primary field**
      
      Increase visual prominence:
      - Larger font size (17-18px instead of 15px)
      - Slightly more padding
      - Label: "Task title" (sentence case) with asterisk
      - Placeholder: "What do you need to do?"
      - Ensure proper `lineHeight` (≥24 for fontSize 17)
      
      Files: `app/(modals)/add-task.tsx` (styles within `makeStyles`)
      Verify: Title input is visually distinct from other fields.

- [ ] 4. **Refine Description field styling**
      
      Reduce visual weight vs title:
      - Label: "Description" (sentence case, no "(optional)" suffix)
      - Placeholder: "Add details..."
      - Standard 15px font, 3-line height on mobile, can be taller on desktop
      - Proper `lineHeight: 22`
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Description field is clearly secondary to title.

- [ ] 5. **Refine Topic chips — compact styling with wrap**
      
      Update topic chip styles:
      - Compact padding: `paddingHorizontal: 12, paddingVertical: 6`
      - Use `tokens.radius.full` (pill shape)
      - Selected: `backgroundColor: accentPrimaryMuted`, `borderColor: accentPrimary`, text color `accentPrimary`
      - Unselected: `backgroundColor: bgInput`, `borderColor: borderPrimary`, text color `textSecondary`
      - Ensure chips wrap naturally with `flexWrap: 'wrap'` (already present)
      - Label: "Topic" (sentence case)
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Chips are compact, wrap on mobile, don't overflow viewport.

- [ ] 6. **Create Schedule section with responsive Date/Time/Duration layout**
      
      Add "Schedule" section header. Restructure the existing 3-column row:
      
      **Desktop (≥768px)**: Date, Time, Duration in a single row (existing behavior, but with section header)
      ```
      Schedule
      Date          Time          Duration
      [Oct 4, 2026] [10:30 AM]    [30m]
      ```
      
      **Mobile (<768px)**: Stack vertically
      ```
      Schedule
      
      Date              Time
      [Oct 4, 2026]     [10:30 AM]
      
      Duration
      [15m] [30m] [1h] [Custom]
      ```
      
      The existing `DatePickerField`, `TimePickerField`, `DurationField` components are kept as-is. Only the layout wrapper changes.
      
      For Time field placeholder when no time selected: show "Add time" as muted placeholder text.
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Schedule section displays correctly on both desktop and mobile viewports.

- [ ] 7. **Refine Priority chips with semantic colors**
      
      Update priority chip colors to match design:
      - None: neutral (`textMuted` text, `bgTertiary` background when selected)
      - Low: `accentBlue`
      - Medium: `accentOrange`
      - High: `accentRed`
      
      Currently uses hardcoded hex colors in `PRIORITY_OPTIONS`. Replace with token-based dynamic styling:
      - Selected state: background uses `${color}20` (20% opacity), border uses the accent color, text uses the accent color
      - Unselected: neutral border/background like topic chips
      
      Note: Keep the priority order as None / Low / Medium / High (current order is None / High / Medium / Low — reorder to None / Low / Medium / High for logical progression).
      
      Label: "Priority" (sentence case, no icon needed).
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Priority chips use semantic colors; selection state is clear but not overpowering.

- [ ] 8. **Refine Dependency selector — hide "available" count from button text**
      
      Current button shows: `+ Add dependency (89 available)`
      
      Change to just: `+ Add dependency`
      
      The count can be shown inside the expanded list or as secondary metadata, but not as primary button text.
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Button text is cleaner; count still visible when panel is expanded.

- [ ] 9. **Refine Recurrence (Repeat) chips layout**
      
      - Label: "Repeat" (sentence case)
      - Desktop: single row if space permits
      - Mobile: allow wrapping (`flexWrap: 'wrap'`) — already present, but ensure no horizontal overflow
      - Chip styling consistent with topic/priority chips
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Recurrence chips don't cause horizontal scroll on mobile.

- [ ] 10. **Refine desktop modal layout**
      
      Update the web dialog container:
      - Max width: 640-720px (currently 560px, increase slightly)
      - Comfortable padding: `tokens.spacing.xl` (24px)
      - Rounded corners: `tokens.radius.xl` (20px)
      - Subtle shadow: `tokens.elevation.lg`
      - Light border: `borderColor: borderPrimary`
      - Clear header with "Add task" / "Edit task" title and close button
      - **Scrollable form body** with fixed header and footer
      - Fixed footer with Cancel (secondary) + Add task (primary) buttons
      
      Ensure the modal doesn't become unnecessarily tall — content should scroll.
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Desktop modal is visually refined, scrolls when content exceeds viewport.

- [ ] 11. **Refine mobile layout — full-screen with sticky bottom button**
      
      Mobile should use near-full-screen layout (current behavior), with:
      - Header with "Add task" / "Edit task" title and close button
      - Scrollable form content with proper padding
      - **Sticky bottom "Add task" button** — always visible, doesn't scroll with content
      - Button height: ~48-52px, full width with horizontal padding
      - Sufficient bottom padding in scroll content (~100px) so sticky button doesn't cover the last form field
      
      Restructure mobile render:
      ```tsx
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>...</View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
            {formFields}
          </ScrollView>
          <View style={styles.stickyFooter}>
            <Pressable style={styles.mobileSubmitBtn} onPress={handleSubmit}>
              <Text>Add task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      ```
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Mobile has sticky bottom button that doesn't cover content; keyboard avoidance works.

- [ ] 12. **Apply consistent typography and spacing**
      
      All labels should use:
      - Sentence case: "Task title", "Description", "Topic", "Schedule", "Duration", "Priority", "More options", "Repeat", "Depends on", "Subtasks"
      - Font size 13px, weight 500, `lineHeight: 18`
      - Color: `tokens.textSecondary`
      - Bottom margin: `tokens.spacing.sm` (8px) before the input
      
      Field spacing:
      - Between fields: `marginBottom: tokens.spacing.lg` (16px)
      - Section padding consistent
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Labels are consistent, no ALL CAPS except section headers if desired.

- [ ] 13. **Add focus states and form states**
      
      - Focus ring: `borderColor: tokens.borderFocus` when input is focused
      - Error state: `borderColor: tokens.accentRed` with error message below
      - Loading state: Button shows "Adding..." and is disabled
      - Disabled state: Reduced opacity on submit button when `saving` is true
      
      Most of this is already implemented; verify consistency across all inputs.
      
      Files: `app/(modals)/add-task.tsx`
      Verify: Focus, error, and loading states work correctly.

- [ ] 14. **Ensure touch targets are at least 44×44 on mobile**
      
      Verify all interactive elements (chips, buttons, close button, toggles) have minimum 44×44 touch targets on mobile. Use `minHeight: 44, minWidth: 44` or equivalent padding.
      
      The chip styles may need padding adjustments to meet accessibility requirements.
      
      Files: `app/(modals)/add-task.tsx`
      Verify: All touch targets pass accessibility audit.

- [ ] 15. **Final cleanup and style consolidation**
      
      - Remove any hardcoded hex colors — all should come from tokens
      - Remove magic numbers — all spacing should use `tokens.spacing.*`
      - Ensure all text has proper `lineHeight` to prevent clipping
      - Remove any duplicate style definitions
      - Verify `Platform.OS` imports are correct (use the imported constant, not `require('react-native')`)
      
      Files: `app/(modals)/add-task.tsx`
      Verify: `npx expo start --web` and `npx expo start` both work; no console warnings about styles.

---

## Verification Commands

After each step:
```bash
# Start the dev server
npx expo start --web

# Check TypeScript
npx tsc --noEmit

# Run tests if available
npx vitest run src/
```

## Summary

This plan refines the Add Task modal's presentation layer only. All business logic, validation, and data handling remain unchanged. The key changes are:

1. **Information hierarchy** — title is primary, description secondary, advanced options collapsed
2. **Responsive layout** — desktop modal (centered, scrollable) vs mobile full-screen (sticky button)
3. **Consistent design tokens** — all colors, spacing, radius from tokens
4. **Semantic priority colors** — None=neutral, Low=blue, Medium=orange, High=red
5. **Typography** — sentence case labels, proper lineHeight
6. **Accessibility** — 44×44 touch targets, focus states, proper labels
