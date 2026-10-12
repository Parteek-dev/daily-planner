# Dashboard UI/UX Refinement — Implementation Plan

Scope: visual/UX refinement only. No business logic, hooks, calculations, APIs, navigation, or data changes.

---

## FEAT-001 — `src/components/planner/WeeklyReport.tsx`

This file is a fully self-contained component with its own `makeStyles` factory. All changes are isolated here.

---

### 1. `weekSummary()` helper function

**Change**: Replace the current multi-part summary string with a two-line "Best day" format.

Old output pattern:
```
"Best day was Tuesday with 3 tasks · 1h 30m invested"
```

New output pattern:
```
"Best day · Tuesday\n3 tasks · 1h 30m focused"
```

Replace the body after the early-return for zero tasks:
```tsx
// Remove the old parts[] / join logic and replace with:
if (best && best.completed > 0) {
  const durationStr = best.minutes > 0 ? ` · ${fmtDuration(best.minutes)} focused` : ''
  return `Best day · ${dayLabel}\n${best.completed} task${best.completed !== 1 ? 's' : ''}${durationStr}`
}
return ''
```

Preserve both no-task early returns unchanged.

---

### 2. JSX: Header section

**Change** `sectionTitle` text:
```tsx
// Old
<Text style={[styles.sectionTitle, { color: tokens.textMuted }]}>Weekly Report</Text>
// New
<Text style={[styles.sectionTitle, { color: tokens.textSecondary }]}>Weekly report</Text>
```

Change color from `tokens.textMuted` → `tokens.textSecondary` (more visible heading).

---

### 3. JSX: Stats row — metric labels and colors

**Stat box 1 (tasks):**
- Change `statLabel` text: "Tasks Done" → "Tasks completed"
- Change `statValue` color: keep `tokens.textPrimary` (already has `tokens.accentGreen` icon — fine)
- Note: The icon `<CheckCircle2>` can stay, it provides hierarchy

**Stat box 2 (time):**
- Change `statLabel` text: "Time Spent" → "Time focused"
- `statValue` color: keep `tokens.textPrimary` (Clock icon is accentBlue)

**Stat box 3 (completion):**
- No text change, no color change needed

---

### 4. JSX: `summary` text

The `summary` element renders the string from `weekSummary()`. Add `lineHeight` to the style (see styles section below) so the `\n` newline renders cleanly with proper spacing.

---

### 5. JSX: Daily Breakdown chart section

**Heading text** (inside `chartSection`):
```tsx
// Old
<Text style={[styles.chartTitle, { color: tokens.textMuted }]}>Daily Breakdown</Text>
// New
<Text style={[styles.chartTitle, { color: tokens.textSecondary }]}>Daily activity</Text>
```

**Empty state**: Add before `barsContainer` mapping:
```tsx
{days.every(d => d.completed === 0) ? (
  <View style={styles.barEmptyState}>
    <Text style={[styles.barEmptyText, { color: tokens.textMuted }]}>No activity this week</Text>
  </View>
) : (
  <View style={styles.barsContainer}>
    {days.map((day, i) => {
      const barH = day.completed > 0
        ? Math.max(4, Math.round((day.completed / maxCompleted) * 46))
        : 3
      // … rest unchanged
    })}
  </View>
)}
```

Note: `maxCompleted` is already computed above (`Math.max(...days.map(d => d.completed), 1)`). Max bar height reduced from 88 → 46dp (matches `tokens.spacing.xxxl - 2 = 46`; note: 46 is between `xxxl=48` and `xxl=32`; use literal 46 and note this small gap in the spacing scale).

---

### 6. JSX: By Topic section

**Heading text**:
```tsx
// Old
<Text style={[styles.chartTitle, { color: tokens.textMuted }]}>By Topic</Text>
// New
<Text style={[styles.chartTitle, { color: tokens.textSecondary }]}>By topic</Text>
```

**Restructure** the topic list from chips to a vertical list with progress bars:

```tsx
{Object.keys(report.topicBreakdown).length > 0 && (
  <View>
    <Text style={[styles.chartTitle, { color: tokens.textSecondary }]}>By topic</Text>
    {(() => {
      const sorted = Object.entries(report.topicBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
      const maxCount = Math.max(...sorted.map(([, s]) => s.count), 1)
      return (
        <View style={styles.topicBarList}>
          {sorted.map(([topic, stats]) => {
            const color = getTopicColor(topic)
            const barPct = (stats.count / maxCount) * 100
            return (
              <View key={topic} style={styles.topicBarRow}>
                <View style={styles.topicBarHeader}>
                  <View style={[styles.topicDot, { backgroundColor: color }]} />
                  <Text
                    style={[styles.topicBarName, { color: tokens.textSecondary }]}
                    numberOfLines={1}
                  >
                    {topic}
                  </Text>
                  <Text style={[styles.topicBarCount, { color: tokens.textPrimary }]}>
                    {stats.count}
                  </Text>
                </View>
                <View style={[styles.topicBarTrack, { backgroundColor: tokens.borderPrimary }]}>
                  <View
                    style={[
                      styles.topicBarFill,
                      { width: `${barPct}%` as any, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>
            )
          })}
        </View>
      )
    })()}
  </View>
)}
```

Remove the old `topicList` / `topicChip` / `topicName` / `topicCount` JSX.

---

### 7. `makeStyles` — style keys to add/modify

Modify existing style keys in `makeStyles(tokens)`:

| Style key | Old | New | Token used |
|---|---|---|---|
| `card.borderWidth` | 1 | StyleSheet.hairlineWidth | — |
| `card.padding` | 16 | 16 | tokens.spacing.lg |
| `sectionTitle.fontSize` | 12 | 13 | — (no exact token; between caption=13 ✓ — use 13) |
| `sectionTitle.fontWeight` | '700' | '600' | — |
| `sectionTitle.textTransform` | 'uppercase' | _remove_ | — |
| `sectionTitle.letterSpacing` | 0.8 | 0.3 | — |
| `statValue.fontSize` | 18 | 22 | — (gap: typography scale jumps 17→20→24; use 22 as between heading and title) |
| `statValue.lineHeight` | — | 28 | — (tokens.typography.heading.lineHeight) |
| `statLabel.fontSize` | 10 | 11 | — |
| `summary.fontStyle` | 'italic' | _remove_ | — |
| `summary.lineHeight` | 18 | 22 | — |
| `chartTitle.fontSize` | 11 | 12 | — |
| `chartTitle.fontWeight` | — | '500' | — |
| `chartTitle.marginBottom` | 10 | 8 | tokens.spacing.sm |
| `barsContainer.height` | 96 | 72 | — (gap: spacing scale has 48/32; 72 = 48+24 = xxxl+xl; use literal 72 and note the gap) |

Add new style keys:

```ts
barEmptyState: {
  height: 72,
  alignItems: 'center',
  justifyContent: 'center',
},
barEmptyText: {
  fontSize: 12,
  lineHeight: 18,
},
topicBarList: {
  gap: 10,          // tokens.spacing.md = 12 is close; gap: 10 is between sm(8) and md(12); use 10 and note
},
topicBarRow: {
  gap: 4,           // tokens.spacing.xs = 4 ✓
},
topicBarHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,           // tokens.spacing.sm - 2 = 6; gap: 6 is between xs(4) and sm(8); use 6 and note
},
topicBarName: {
  fontSize: 12,
  flex: 1,
  lineHeight: 18,
},
topicBarCount: {
  fontSize: 12,
  fontWeight: '600',
  flexShrink: 0,
  lineHeight: 18,
},
topicBarTrack: {
  height: 4,
  borderRadius: 99,
  overflow: 'hidden',
},
topicBarFill: {
  height: '100%',
  borderRadius: 99,
},
```

Remove old style keys: `topicList`, `topicChip`, `topicName`, `topicCount` (no longer referenced).

**Token gap notes for FEAT-001:**
- `statValue.fontSize: 22` — typography scale has heading=20, title=24; 22 is not in tokens; acceptable as between-scale value
- `barsContainer.height: 72` — spacing scale has xxxl=48, xxl=32; 72 is not a direct token; acceptable
- `topicBarList.gap: 10` — spacing scale has sm=8, md=12; use literal 10
- `topicBarHeader.gap: 6` — spacing scale has xs=4, sm=8; use literal 6

---

## FEAT-002 — `app/(tabs)/index.tsx` + `src/components/planner/LineChart.tsx`

FEAT-002 is independent of FEAT-001 (different files). Apply after FEAT-001 commits.

---

### A. `app/(tabs)/index.tsx`

#### A1. Page header subtitle (in `DashboardScreen` JSX)

```tsx
// Old
<Text style={[st.pageSubtitle, { color: tokens.textSecondary }]}>Your productivity overview</Text>
// New
<Text style={[st.pageSubtitle, { color: tokens.textSecondary }]}>Your productivity at a glance</Text>
```

#### A2. Tab bar active treatment (in `DashboardScreen` JSX, tab bar map)

Change active tab label color from `tokens.textPrimary` → `tokens.accentBlue`:

```tsx
// Old
<Text style={[st.tabLabel, { color: active ? tokens.textPrimary : tokens.textMuted }]}>
// New
<Text style={[st.tabLabel, { color: active ? tokens.accentBlue : tokens.textMuted }]}>
```

Remove the `backgroundColor` from the active tab pill (currently passes `backgroundColor: tokens.bgSecondary`). Replace with a transparent accent:

```tsx
// Old inline style on Pressable
active && [st.tabBtnActive, { backgroundColor: tokens.bgSecondary }],
// New
active && [st.tabBtnActive, { backgroundColor: tokens.accentPrimaryLight }],
```

`tokens.accentPrimaryLight` = `#F5F3FF` (light) / `#1E1B4B` (dark) — a subtle purple-tinted background. This is the only muted-accent background token available that doesn't require constructing rgba from accentBlue. The visual effect is a very soft tinted pill, which is lighter than the current solid white.

**Token gap note**: No `accentBlueMuted` token exists. `accentPrimaryLight` (purple-tinted) is the closest available low-opacity tinted background. Acceptable since the label/icon is already accentBlue and the tint is very subtle.

#### A3. `s.sectionTitle` style (in the `s = StyleSheet.create({})` block)

```tsx
// Old
sectionTitle: {
  fontSize: 11,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  flex: 1,
},
// New
sectionTitle: {
  fontSize: 13,
  fontWeight: '600',
  lineHeight: 20,
  flex: 1,
},
```

Removes `textTransform: 'uppercase'` and `letterSpacing`. Changes weight from '700' to '600'. Adds `lineHeight: 20` for text-overflow safety.

**Important**: `s.statLabel` and `s.statCardLabel` are SEPARATE styles (they have `textTransform: 'uppercase', letterSpacing: 0.7`). Do NOT change those — TODAY/STREAK/TIME INVESTED/COMPLETED labels stay uppercase.

#### A4. Section heading string literals

In `BestHoursChartRN`:
```tsx
// Old
<Text style={[s.sectionTitle, ...] }>Best Hours</Text>
// New  
<Text style={[s.sectionTitle, ...] }>Most productive time</Text>
```

In `StatisticsTab` (30-day chart section):
```tsx
// Old
<Text style={[s.sectionTitle, { color: tokens.textMuted }]}>TASKS COMPLETED (LAST 30 DAYS)</Text>
// New
<Text style={[s.sectionTitle, { color: tokens.textSecondary }]}>Tasks completed</Text>
```
Also change color from `tokens.textMuted` → `tokens.textSecondary`.

In `ActivityTab` (first card):
```tsx
// Old
<Text style={[s.sectionTitle, { color: tokens.textMuted, marginBottom: 16 }]}>LAST 7 DAYS</Text>
// New
<Text style={[s.sectionTitle, { color: tokens.textSecondary, marginBottom: 16 }]}>Last 7 days</Text>
```

In `ActivityTab` (second card):
```tsx
// Old
<Text style={[s.sectionTitle, { color: tokens.textMuted, marginBottom: 14 }]}>RECENT ACTIVITY</Text>
// New
<Text style={[s.sectionTitle, { color: tokens.textSecondary, marginBottom: 14 }]}>Recent activity</Text>
```

#### A5. `StatisticsTab` — sparse data message

In `StatisticsTab`, before `<LineChart data={chartData30Days} />` add:

```tsx
{(() => {
  const activePoints = chartData30Days.filter((d: any) => d.count > 0).length
  return activePoints < 5 ? (
    <Text style={[s.sparseTrendMsg, { color: tokens.textMuted }]}>
      Complete a few more tasks to see your productivity trend.
    </Text>
  ) : null
})()}
```

Add style `s.sparseTrendMsg`:
```ts
sparseTrendMsg: {
  fontSize: 12,
  lineHeight: 18,
  textAlign: 'center',
  marginBottom: 8,   // tokens.spacing.sm
  fontStyle: 'italic',
},
```

#### A6. `BestHoursChartRN` — restructure period display

Add period time range mapping near top of component:
```tsx
const periodTimeRanges: Record<string, string> = {
  morning: '6 AM – 12 PM',
  afternoon: '12 PM – 6 PM',
  evening: '6 PM – 12 AM',
  night: '12 AM – 6 AM',
}
```

Change the `bhPeriodBox` section from:
```tsx
<View style={[s.bhPeriodBox, { backgroundColor: tokens.bgInput }]}>
  <Text style={[s.bhPeriodLabel, { color: tokens.textMuted }]}>Most Productive — all time</Text>
  <Text style={[s.bhPeriodValue, { color: tokens.accentPurple ?? '#a855f7' }]}>
    {mostProductivePeriod}
  </Text>
  {peakHours?.length > 0 && (
    <Text style={[s.bhPeakHours, { color: tokens.textMuted }]}>
      Peak:{' '}
      {(peakHours as number[]).slice(0, 3).map((h: number) => {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
        return `${h12} ${h < 12 ? 'AM' : 'PM'}`
      }).join(' · ')}
    </Text>
  )}
</View>
```

To:
```tsx
<View style={[s.bhPeriodBox, { backgroundColor: tokens.bgInput }]}>
  <Text style={[s.bhPeriodValue, { color: tokens.accentPurple ?? tokens.accentPrimary }]}>
    {mostProductivePeriod
      ? `${mostProductivePeriod.charAt(0).toUpperCase()}${mostProductivePeriod.slice(1)}`
      : '—'}
  </Text>
  {mostProductivePeriod && (
    <Text style={[s.bhPeriodRange, { color: tokens.textMuted }]}>
      {periodTimeRanges[mostProductivePeriod] ?? ''}
    </Text>
  )}
  {peakHours?.length > 0 && (() => {
    const ph = peakHours[0] as number
    const h12 = ph === 0 ? 12 : ph > 12 ? ph - 12 : ph
    const ampm = ph < 12 ? 'AM' : 'PM'
    return (
      <Text style={[s.bhPeakHours, { color: tokens.textMuted }]}>
        Peak activity: {h12} {ampm}
      </Text>
    )
  })()}
</View>
```

Change period breakdown to remove `% of total`:
```tsx
// Old per-period cell
<View key={period} style={[s.bhPeriodCell, { backgroundColor: `${color}18` }]}>
  <Text style={[s.bhPeriodCount, { color }]}>{pd.count}</Text>
  <Text style={[s.bhPeriodName, { color: tokens.textMuted }]}>{periodLabels[period]}</Text>
  <Text style={[s.bhPeriodPct, { color }]}>{pd.percent}% of total</Text>
</View>
// New — drop the bhPeriodPct line
<View key={period} style={[s.bhPeriodCell, { backgroundColor: `${color}18` }]}>
  <Text style={[s.bhPeriodCount, { color }]}>{pd.count}</Text>
  <Text style={[s.bhPeriodName, { color: tokens.textMuted }]}>{periodLabels[period]}</Text>
</View>
```

Change the chart sub-title in `bhChartWrap`:
```tsx
// Old
<Text style={[s.bhChartSub, { color: tokens.textMuted }]}>Based on all completed tasks</Text>
// New — remove this line entirely (redundant info)
```

Add `bhPeriodRange` style key:
```ts
bhPeriodRange: { fontSize: 11, lineHeight: 16, marginTop: 2 },
```

#### A7. `TopicBalanceRN` — simplify per-topic rows

In the `tbTopics` section, change each topic row's content:

```tsx
// Old tbTopicMeta text
{topic.taskCount} task{topic.taskCount !== 1 ? 's' : ''} · {fmtDuration(topic.totalTime)} · avg task {fmtDuration(topic.avgDuration)}
// New — remove avg task
{topic.taskCount} task{topic.taskCount !== 1 ? 's' : ''} · {fmtDuration(topic.totalTime)}
```

Remove the `tbProgressRow` block entirely from each `tbTopicRow`:
```tsx
// Remove this block from each topic row:
<View style={s.tbProgressRow}>
  <View style={[s.tbProgressTrack, { backgroundColor: tokens.borderPrimary }]}>
    <View style={[s.tbProgressFill, { ... }]} />
  </View>
  <Text style={[s.tbRatePct, { color: rateColor }]}>{topic.completionRate}% done</Text>
  <Text style={[s.tbRateCount, { color: tokens.textMuted }]}>{topic.completedCount}/{topic.taskCount}</Text>
</View>
```

Keep `tbTopicRow`, `tbTopicHeader`, `tbTopicName`, `tbTopicMeta` unchanged. The left border accent color remains.

Remove `rateColor` variable since `completionRate` is no longer displayed (it's unused then; remove to avoid TS warnings):
```tsx
// Remove:
const rateColor = topic.completionRate >= 70 ? tokens.accentGreen : ...
```

Remove `tbSuggestions` / `tbBalanced` blocks if present (these are shown after `tbTopics` based on `isBalanced` / `suggestions`). Check the JSX — if they exist, remove them.

#### A8. Card visual weight — style keys

In `s = StyleSheet.create({})`:

| Style key | Old | New | Token |
|---|---|---|---|
| `card.borderWidth` | 1 | StyleSheet.hairlineWidth | — |
| `statBar.borderWidth` | 1 | StyleSheet.hairlineWidth | — |
| `progressCard.borderWidth` | 1 | StyleSheet.hairlineWidth | — |
| `cardWrapper.marginBottom` | 14 | 16 | tokens.spacing.lg |
| `analyticsHeading.marginTop` | 4 | 24 | tokens.spacing.xl |

Note: `StyleSheet.hairlineWidth` is the correct React Native idiom for the thinnest available border (1px on high-DPI, sub-pixel on web). Import is already in scope via `StyleSheet`.

---

### B. `src/components/planner/LineChart.tsx`

#### B1. Today's dot — visual distinction in `WebLineChart`

In the dot-rendering map, the last point (today) should have a larger dot to be identifiable:

```tsx
// Old dot radius logic
const r = isHover ? 5 : 2.5
// New
const isToday = i === (data?.length ?? 1) - 1
const r = isHover ? 6 : isToday ? 4 : hasData ? 2.5 : 1.5
```

Also change the `opacity` for today's non-hover state: always 1 (not 0.45 for zero-value today):
```tsx
opacity: isHover ? 1 : (isToday || hasData) ? 1 : 0.35,
```

#### B2. Sparse data message in `LineChart` main export

After the `if (!data || data.length === 0)` empty check, add a `sparseTip` value:

```tsx
const activeCount = (data ?? []).filter(d => d.count > 0).length
const showSparseTip = activeCount < 5
```

Then in the return, wrap the platform chart in a `<View>` and conditionally show the tip below it:

```tsx
// Old main return when data exists
if (Platform.OS === 'web') {
  return <WebLineChart data={data} accentColor={accent} />
}
return <NativeLineChart data={data} accentColor={accent} />

// New
const chart = Platform.OS === 'web'
  ? <WebLineChart data={data} accentColor={accent} />
  : <NativeLineChart data={data} accentColor={accent} />

return (
  <View>
    {chart}
    {showSparseTip && (
      <Text style={[native.sparseTip, { color: tokens.textMuted }]}>
        Complete a few more tasks to see your productivity trend.
      </Text>
    )}
  </View>
)
```

Add `sparseTip` to the `native` StyleSheet at the bottom:
```ts
sparseTip: {
  fontSize: 12,
  lineHeight: 18,
  textAlign: 'center',
  marginTop: 8,
  fontStyle: 'italic',
},
```

Import `useTheme` is already in scope; `tokens` is available in the main `LineChart` function.

---

## Token reference (verified against `tokens.ts`)

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `tokens.textPrimary` | #111827 | #F9FAFB | Primary metric numbers |
| `tokens.textSecondary` | #6B7280 | #D1D5DB | Section headings, labels |
| `tokens.textMuted` | #9CA3AF | #9CA3AF | Sub-labels, empty states |
| `tokens.accentBlue` | #3B82F6 | #60A5FA | Tab active, time metric |
| `tokens.accentGreen` | #10B981 | #34D399 | Tasks metric, success |
| `tokens.accentPrimary` | #8B5CF6 | #A78BFA | BestHours period accent |
| `tokens.accentPrimaryLight` | #F5F3FF | #1E1B4B | Tab active pill bg |
| `tokens.bgInput` | #F3F4F6 | #1F2937 | Stat box backgrounds |
| `tokens.bgSecondary` | #F9FAFB | #1F2937 | Card backgrounds |
| `tokens.borderPrimary` | #E5E7EB | #374151 | Progress bar track |
| `tokens.spacing.lg` | 16 | — | Card padding, margins |
| `tokens.spacing.xl` | 24 | — | Section heading top margin |
| `tokens.spacing.sm` | 8 | — | Small gaps |
| `tokens.spacing.xs` | 4 | — | Tiny gaps |
| `StyleSheet.hairlineWidth` | ~0.33 | — | Thin card borders |

## Token gaps (values without exact token matches)

| Value | Used for | Closest token | Resolution |
|---|---|---|---|
| `fontSize: 22` | Primary metric numbers in WeeklyReport | typography.heading=20, title=24 | Use literal 22 |
| `height: 72` | barsContainer in WeeklyReport | spacing.xxxl=48, xxl+xl=56 | Use literal 72 |
| `gap: 10` | topicBarList gap | spacing.sm=8, md=12 | Use literal 10 |
| `gap: 6` | topicBarHeader gap | spacing.xs=4, sm=8 | Use literal 6 |
| `fontSize: 11` (bhPeriodRange) | Period time range | typography.label=11 | Use literal 11 |

## Verification commands

```bash
# TypeScript type check (no build output, just type errors)
cd /Users/parteek.kumar/Dev/common-tasks/daily-planner && npx tsc --noEmit

# Existing utility tests (property-based, no UI tests)
cd /Users/parteek.kumar/Dev/common-tasks/daily-planner && npx vitest --run
```

Both must pass after each FEAT.

## Do NOT change

- Any hook (`useProgress`, `useAuth`, `useTheme`, etc.)
- `OverviewTab` stats cards (TODAY/STREAK/TIME INVESTED/COMPLETED) — keep uppercase labels
- `ActivityTab` date group labels (`activityDate`) — these are small metadata, uppercase is fine
- Bottom navigation (not touched by these files)
- Any calculation, data structure, or Firestore interaction
- `BestHoursChart.tsx` (standalone component) and `TopicBalance.tsx` (standalone) are not used in the Statistics tab's RN view — their titles say "Tasks Completed by Hour" and "Topic Balance" but they appear to be dead imports; do not change them to avoid regression risk
- `TimeTrackingCard` heading "Time Tracking" — acceptable title case, no change needed
