# Animations Implementation Plan

This plan implements comprehensive animations throughout the Daily Planner app (React Native + Expo + TypeScript). All animations use `react-native-reanimated` (already in dependencies), respect the existing `useMotion()` hook for reduced motion accessibility, and follow the project's `makeStyles(tokens)` styling pattern.

---

## Prerequisites

- `react-native-reanimated@3.16.7` already installed
- Existing motion components: `src/components/motion/FadeInView.tsx`, `PressableScale.tsx`, `AnimatedGlow.tsx`
- Existing `useMotion()` hook provides spring/timing configs and reduced motion detection
- `babel-preset-expo` automatically includes Reanimated babel plugin

---

## Implementation Plan

- [ ] 1. **Task Completion Animation (HIGH)**
      Add scale bounce on checkbox and opacity change on title when toggling task completion.
      Files: `src/components/task/UnifiedTaskItem.tsx`
      
      Implementation:
      - Import `Animated, useSharedValue, useAnimatedStyle, withSpring, withTiming` from `react-native-reanimated`
      - Import `useMotion` from `@/src/hooks/useMotion`
      - Add `checkboxScale` shared value (default 1)
      - Create animated checkbox wrapper using `Animated.createAnimatedComponent(Pressable)`
      - On toggle (if not reduced motion): animate scale to 1.2 with `withSpring(bouncy)`, then back to 1
      - Animate title opacity to 0.6 when completed
      - Preserve existing `numberOfLines={2}` and `lineHeight` styles
      
      Verify: Manual test on iOS, Android, web — checkbox bounces, title fades on completion

- [ ] 2. **Task Delete Animation (MEDIUM)**
      Add slide-out-left animation when deleting a task.
      Files: `src/components/task/UnifiedTaskItem.tsx`
      
      Implementation:
      - Add shared values: `itemTranslateX` (default 0), `itemOpacity` (default 1)
      - Create animated container style with transform and opacity
      - On delete: animate `translateX` to -300 and `opacity` to 0 with `withTiming(200ms)`
      - Use `runOnJS` to call actual `onDelete` callback after animation completes
      - Wrap outer View with `Animated.View`
      - Skip animation if `motion.reducedMotion` is true
      
      Verify: Manual test — delete task shows slide-out animation before removal

- [ ] 3. **Create CrossfadeView Component**
      Create reusable crossfade wrapper for view toggle animations.
      Files: `src/components/motion/CrossfadeView.tsx`, `src/components/motion/index.ts`
      
      Implementation:
      - Create `CrossfadeView` component that crossfades children when `viewKey` prop changes
      - Use Reanimated `FadeIn` and `FadeOut` entering/exiting layout animations
      - Duration 200ms, respect `useMotion().reducedMotion`
      - Export from `src/components/motion/index.ts` barrel
      
      Verify: Component exists and exports correctly

- [ ] 4. **View Toggle Animation — Today Screen (MEDIUM)**
      Add crossfade when switching between list and timeline views.
      Files: `app/(tabs)/today.tsx`
      
      Implementation:
      - Import `CrossfadeView` from `@/src/components/motion`
      - Wrap the `viewMode === 'timeline' ? <DayTimeline /> : <TaskList />` conditional with `<CrossfadeView viewKey={viewMode}>`
      - Ensure both branches are wrapped as direct children
      
      Verify: Toggle list/timeline on Today screen — smooth crossfade transition

- [ ] 5. **View Toggle Animation — Home Screen (MEDIUM)**
      Add crossfade for Today's Schedule card view toggle.
      Files: `app/(tabs)/index.tsx`
      
      Implementation:
      - Import `CrossfadeView` from `@/src/components/motion`
      - Wrap the `scheduleViewMode === 'timeline' ? ... : ...` conditional in Today's Schedule card
      
      Verify: Toggle list/timeline in Today's Schedule card — smooth crossfade

- [ ] 6. **View Toggle Animation — Calendar Screen (MEDIUM)**
      Add crossfade for DayPanel view toggle.
      Files: `app/(tabs)/calendar.tsx`
      
      Implementation:
      - Import `CrossfadeView` from `@/src/components/motion`
      - In `DayPanel` component, wrap the `panelViewMode === 'timeline' ? ... : ...` conditional
      
      Verify: Toggle list/timeline in calendar day panel — smooth crossfade

- [ ] 7. **Progress Bar Animation (LOW)**
      Animate the Focus card progress bar width when value changes.
      Files: `app/(tabs)/index.tsx`
      
      Implementation:
      - Add `progressWidth` shared value initialized to `todayProgress.percent`
      - Use `useEffect` to animate `progressWidth` to new value with `withTiming(250ms)` when `todayProgress.percent` changes
      - Apply animated style to `focusProgressFill` View with `width: progressWidth.value + '%'`
      - Wrap the fill View with `Animated.View`
      
      Verify: Complete tasks — Focus card progress bar animates smoothly

- [ ] 8. **Button Press Feedback — DailyNotes (MEDIUM)**
      Add subtle press scale to expand/collapse button.
      Files: `src/components/DailyNotes.tsx`
      
      Implementation:
      - Import `PressableScale` from `@/src/components/motion`
      - Replace the expand button `Pressable` with `PressableScale` (scale 0.97)
      - Preserve existing `hitSlop`, `accessibilityRole`, `accessibilityLabel`, and styles
      
      Verify: Tap DailyNotes expand button — subtle scale-down feedback

- [ ] 9. **Button Press Feedback — NavigationBar (MEDIUM)**
      Add subtle press scale to bottom navigation tabs.
      Files: `src/components/navigation/NavigationBar.tsx`
      
      Implementation:
      - Import `PressableScale` from `@/src/components/motion`
      - Replace `Pressable` in `TabItem` component with `PressableScale`
      - Preserve existing pressed state styling and accessibility props
      
      Verify: Tap navigation tabs — subtle scale-down press feedback

- [ ] 10. **Tab Transition Animation (HIGH)**
       Add fade transitions when switching between tabs.
       Files: `app/(tabs)/_layout.tsx`
       
       Implementation:
       - In `SidebarLayout`, add `animation: 'fade'` to Tabs screenOptions
       - In `NativeTabLayout`, add `animation: 'fade'` to Tabs screenOptions
       - Test on all platforms; if built-in animation doesn't work consistently, wrap each screen's content in `FadeInView` with `direction='none'` as fallback
       
       Verify: Navigate between tabs — subtle fade transition (not instant switch)

- [ ] 11. **Modal Animations — Enhance Existing (MEDIUM)**
       Verify and enhance modal slide/fade animations.
       Files: `app/(modals)/_layout.tsx`
       
       Implementation:
       - add-task and settings already have `animation: 'fade'` — verify working
       - Update pomodoro: `presentation: 'transparentModal'`, `animation: 'slide_from_bottom'`
       - Update overdue-rollover: `presentation: 'transparentModal'`, `animation: 'slide_from_bottom'`
       - Update feedback/profile: add `animation: 'slide_from_right'` or `'slide_from_bottom'`
       - Test modal open/close on iOS, Android, and web
       
       Verify: Open each modal — appropriate entrance animation; close — smooth exit animation

---

## Technical Notes

### Reanimated Imports
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
```

### Reduced Motion Pattern
```typescript
const motion = useMotion()

const handleAnimation = () => {
  if (motion.reducedMotion) {
    // Skip animation, execute immediately
    return
  }
  // Perform animation
  scale.value = withSpring(1.2, motion.spring.bouncy)
}
```

### Duration Guidelines
- Press feedback: 100ms (fast, snappy)
- Crossfade/transitions: 200-250ms (smooth but not slow)
- Task delete slide-out: 200ms
- Progress bar: 250ms
- Modal animations: 250-300ms (varies by platform)

### Platform Considerations
- iOS: Native animations work well
- Android: May need higher damping for springs
- Web: CSS-based animations as fallback; Reanimated web support is good but test thoroughly

---

## Verification Checklist

1. Run `npx vitest --run` — all tests pass
2. Test on iOS simulator — all animations smooth
3. Test on Android emulator — all animations smooth  
4. Test on web browser — all animations work (may use CSS fallbacks)
5. Enable "Reduce Motion" in system settings — verify all animations skip/instant
6. Verify no text clipping during animations (preserve lineHeight, numberOfLines)
7. Verify no layout jumps or visual glitches
