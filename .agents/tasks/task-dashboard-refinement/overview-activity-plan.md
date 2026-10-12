# Implementation Plan — Overview & Activity Tab Polish

**Branch**: `feat/dashboard-ui-refinement`  
**Scope**: UI/UX refinement only — no business logic, hooks, data, or API changes.  
**Approach**: smallest-diff edits that bring OverviewTab and ActivityTab up to the same visual standard as the already-refined StatisticsTab.

---

## Reference: what "done" looks like (Statistics tab pattern)

The Statistics tab established these conventions. Every change below matches them exactly:

- `sectionTitle`: `fontSize: 13, fontWeight: '600', lineHeight: 20` — no `textTransform`, no `letterSpacing`
- Card borders: `borderWidth: StyleSheet.hairlineWidth` (not `1`)
- Card backgrounds: `tokens.bgSecondary`
- Primary metrics: large + bold + colored accent token
- Secondary labels: `tokens.textMuted`, smaller
- All section heading text: sentence case (e.g. "Daily goals", not "DAILY GOALS")
- Small metadata labels (TODAY / STREAK / etc.): KEEP uppercase, keep `fontSize: 10, letterSpacing: 0.7`
- Every text style must carry an explicit `lineHeight` (fontSize 12 → min 18, fontSize 14 → min 20, fontSize 11 → min 16, fontSize 10 → min 14)

---

## File 1: `src/components/planner/ProductivityScore.tsx`

### makeStyles → `card`
| Property | Before | After |
|---|---|---|
| `borderWidth` | `1` | `StyleSheet.hairlineWidth` |

### makeStyles → `headerText`
| Property | Before | After | Reason |
|---|---|---|---|
| `fontSize` | `12` | `13` | Match sectionTitle scale |
| `fontWeight` | `'600'` | `'600'` | Already compliant ✓ |
| `lineHeight` | *(missing)* | `20` | Text-overflow compliance |
| `textTransform` | `'uppercase'` | *(remove)* | Sentence case per spec |
| `letterSpacing` | `0.8` | *(remove)* | Only for uppercase metadata |
| `color` | `tokens.textMuted` (inline JSX) | `tokens.textMuted` (inline JSX) | Already compliant ✓ |

**Rendered text**: "Productivity Score" — no style change needed, the existing JSX string is already sentence case. The uppercase treatment came from `textTransform: 'uppercase'` in the style.

### Already compliant — leave alone
- `scoreValue`: `fontSize: 24, fontWeight: '700'` — dominant number ✓
- `scoreMax`: `fontSize: 10` ✓ (small/muted)
- `levelBadge`: uses `levelColor` token ✓
- `breakdownLabel`: `color: tokens.textSecondary` ✓
- `breakdownValue`: `color: tokens.textPrimary` ✓

---

## File 2: `src/components/planner/GoalSetting.tsx`

### makeStyles → `card`
| Property | Before | After |
|---|---|---|
| `borderWidth` | `1` | `StyleSheet.hairlineWidth` |

### makeStyles → `sectionTitle`
| Property | Before | After | Reason |
|---|---|---|---|
| `fontSize` | `12` | `13` | Match Statistics sectionTitle |
| `lineHeight` | *(missing)* | `20` | Text-overflow compliance |
| `textTransform` | `'uppercase'` | *(remove)* | "Daily Goals" → "Daily goals" at render |
| `letterSpacing` | `0.8` | *(remove)* | Only for uppercase metadata labels |

**Note**: The `Target` icon next to the heading uses `color={tokens.textMuted}` — already compliant ✓.

### makeStyles → `addFormCard`
| Property | Before | After |
|---|---|---|
| `borderWidth` | `1` | `StyleSheet.hairlineWidth` |

Note: `addFormCard` has `backgroundColor: 'transparent'` — this is intentional (no fill), not a rule violation.

### Already compliant — leave alone
- Progress bar fill colors use `progressColor()` helper which returns token values ✓
- `goalRow`, `goalLabel`, `progressBarBg`, etc. — use tokens ✓
- All business logic, stepper logic, goal calculations — untouched

---

## File 3: `src/components/calendar/Heatmap.tsx`

### Mobile: `makeMobileStyles` → `title`
| Property | Before | After | Reason |
|---|---|---|---|
| `fontSize` | `11` | `13` | Match sectionTitle scale |
| `fontWeight` | `'700'` | `'600'` | Semibold per spec |
| `letterSpacing` | `0.6` | *(remove)* | Only for uppercase metadata |
| `lineHeight` | *(missing)* | `20` | Text-overflow compliance |
| `color` | `tokens.textMuted` (inline JSX) | unchanged | Already correct ✓ |

### Mobile: `MobileMonthHeatmap` — text string change
```
"ACTIVITY"  →  "Activity"
```
(single occurrence, in the `sectionHeader` View)

### Desktop: `styles.title`
| Property | Before | After |
|---|---|---|
| `fontWeight` | `'700'` | `'600'` |
| `letterSpacing` | `0.6` | *(remove)* |
| `lineHeight` | *(missing)* | `16` |

(fontSize 11 kept — fits the tight header row alongside stats text)

### Desktop: `styles.card`
| Property | Before | After |
|---|---|---|
| `borderWidth` | `1` | `StyleSheet.hairlineWidth` |

### Desktop: text string changes (two occurrences)
Both the regular path and the empty-state path render:
```
"ACTIVITY (LAST 12 MONTHS)"  →  "Activity (last 12 months)"
```

### Already compliant — leave alone
- `mStyles.monthLabel`: uses `tokens.textSecondary` ✓
- `mStyles.headerStats`: uses `tokens.textMuted` ✓
- COLORS ramp (hardcoded blues) — these are chart fill colors, not text/UI colors; acceptable per spec ✓
- All navigation, cell press, AsyncStorage logic — untouched

---

## File 4: `app/(tabs)/index.tsx`

### Shared `s = StyleSheet.create({})` — style changes

| Style key | Property | Before | After | Reason |
|---|---|---|---|---|
| `statCard` | `borderWidth` | `1` | `StyleSheet.hairlineWidth` | Match statBar (desktop) which already uses hairline |
| `statCardLabel` | `lineHeight` | *(missing)* | `14` | Text-overflow compliance (fontSize 10) |
| `statLabel` | `lineHeight` | *(missing)* | `14` | Text-overflow compliance (fontSize 10) |
| `statSub` | `lineHeight` | *(missing)* | `16` | Text-overflow compliance (fontSize 11) |
| `progressLabel` | `lineHeight` | *(missing)* | `18` | Text-overflow compliance (fontSize 12) |
| `sevenDow` | `lineHeight` | *(missing)* | `18` | Text-overflow compliance (fontSize 12) |
| `activityDate` | `fontWeight` | `'700'` | `'600'` | Sentence-case header needs semibold not bold |
| `activityDate` | `letterSpacing` | `0.4` | *(remove)* | Only for uppercase metadata |
| `activityDate` | `lineHeight` | *(missing)* | `16` | Text-overflow compliance (fontSize 11) |
| `activityCount` | `lineHeight` | *(missing)* | `16` | Text-overflow compliance (fontSize 11) |
| `emptyActivity` | `lineHeight` | *(missing)* | `20` | Text-overflow compliance (fontSize 14) |

### Shared `s = StyleSheet.create({})` — new style to add

```ts
emptyActivitySub: {
  fontSize: 12,
  lineHeight: 18,
  marginTop: 4,
  textAlign: 'center',
},
```

(Extracts the inline style `{ fontSize: 12, color: tokens.textMuted, marginTop: 4, textAlign: 'center' }` that currently violates the "no inline magic numbers" rule.)

### OverviewTab — JSX change

Location: progressCard, "Today's goal progress" label  
```jsx
// Before
<Text style={[s.progressLabel, { color: tokens.textMuted }]}>Today's goal progress</Text>

// After
<Text style={[s.progressLabel, { color: tokens.textSecondary }]}>Today's goal progress</Text>
```
Reason: "Today's goal progress" is a card label, not a muted hint — `textSecondary` is more appropriate.

### ActivityTab — JSX change 1: activityGroupHeader date text

Location: `activityGroups.map(...)` → `activityGroupHeader` View
```jsx
// Before
<Text style={[s.activityDate, {
  color: ds === today ? tokens.accentBlue : tokens.textSecondary,
}]}>
  {dayLabel(ds).toUpperCase()}
</Text>

// After
<Text style={[s.activityDate, {
  color: ds === today ? tokens.accentBlue : tokens.textSecondary,
}]}>
  {dayLabel(ds)}
</Text>
```
`dayLabel()` already returns "Today", "Yesterday", or "Sun, Oct 5" — sentence-case output. `.toUpperCase()` was the only thing making it ALL-CAPS.

### ActivityTab — JSX change 2: empty state wrapper

```jsx
// Before
<View style={s.emptyActivityWrap}>

// After
<View style={[s.emptyActivityWrap, { backgroundColor: tokens.bgInput, borderRadius: 12 }]}>
```

### ActivityTab — JSX change 3: empty state subtitle text

```jsx
// Before
<Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 4, textAlign: 'center' }}>
  Complete a task to see your activity here.
</Text>

// After
<Text style={[s.emptyActivitySub, { color: tokens.textMuted }]}>
  Complete a task to see your activity here.
</Text>
```

### Already compliant — leave alone in index.tsx
- `statBar` (desktop): already `borderWidth: StyleSheet.hairlineWidth` ✓
- `progressCard`: already `borderWidth: StyleSheet.hairlineWidth` ✓
- Stat label text strings "TODAY", "STREAK", "TIME INVESTED", "COMPLETED": KEEP uppercase per spec ✓
- Streak color `'#f97316'` on Flame icon/value: per spec "streak hints are fine" — leave alone
- ActivityTab `sectionTitle` texts "Last 7 days" and "Recent activity": already sentence case ✓
- Summary labels "Active days", "Tasks done", consistency label: already sentence case ✓
- All `activityTitle`, `activityDuration`, `topicPill` styles: already use tokens ✓
- StatisticsTab: DO NOT TOUCH (already complete per prior commits) ✓
- All hooks, calculations, data, business logic: untouched ✓

---

## Verification

```bash
cd /Users/parteek.kumar/Dev/common-tasks/daily-planner

# After each file change:
npx tsc --noEmit        # must exit 0
npx vitest --run        # must show 18 passed
```

---

## What this does NOT change

- Navigation structure, tab layout, routing
- `useProgress`, `useAuth`, `useTheme` hooks
- Firestore data, calculations, business logic
- StatisticsTab (already refined — leave alone)
- Accessibility roles/labels on any component
- `SIDEBAR_BREAKPOINT`, responsive breakpoint logic
- WeeklyReport.tsx, LineChart.tsx (already refined)
- The bottom navigation bar
