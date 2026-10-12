---
inclusion: auto
name: text-overflow-rules
description: Rules for preventing text clipping and overflow issues in React Native components
---

# Text Overflow and Clipping Prevention Rules

When writing or modifying UI components, follow these rules to prevent text clipping and overflow issues.

## Container Padding Rules

1. **Always add sufficient bottom padding to containers with text labels**
   - Cards or containers with text at the bottom edge need at least 20px bottom padding
   - Use `paddingBottom: 20` or `tokens.spacing.xl` when text labels are near container edges
   - Never rely on the default card padding when text is at the edge

2. **Account for lineHeight in text elements**
   - Text with `fontSize: 12` should have `lineHeight: 18` minimum
   - Text with `fontSize: 14` should have `lineHeight: 20` minimum
   - Descenders (g, j, p, q, y) need extra vertical space

3. **Container math**: When calculating container heights or padding:
   ```
   Minimum bottom padding = largest text fontSize + marginTop + 4px safety buffer
   ```

## Text Component Rules

1. **Never clip text** — If text might overflow:
   - Use `numberOfLines={1}` with `ellipsizeMode="tail"` for single-line truncation
   - Or use `flexShrink: 1` on the text container to allow wrapping

2. **Label text minimum requirements**:
   ```tsx
   // Good — includes lineHeight for proper rendering
   labelStyle: { fontSize: 12, lineHeight: 18, marginTop: 4 }
   
   // Bad — missing lineHeight, may clip descenders
   labelStyle: { fontSize: 12, marginTop: 4 }
   ```

3. **Summary/stat labels pattern**:
   ```tsx
   // Container needs extra bottom padding when labels are at the edge
   <View style={{ padding: 16, paddingBottom: 20 }}>
     <Text style={{ fontSize: 24 }}>42</Text>
     <Text style={{ fontSize: 12, lineHeight: 18, marginTop: 4 }}>Tasks done</Text>
   </View>
   ```

## Mobile-Specific Considerations

1. **Use separate cards for stats on mobile** — Instead of cramming multiple stats into one row:
   ```tsx
   // Bad — stats get cramped and text clips on narrow screens
   <View style={{ flexDirection: 'row' }}>
     <StatCell label="TODAY" />
     <StatCell label="STREAK" />
     <StatCell label="TIME INVESTED" />
     <StatCell label="COMPLETED" />
   </View>
   
   // Good — 2x2 grid of separate cards on mobile
   {isMobile ? (
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
       <StatCard label="TODAY" style={{ width: '47%' }} />
       <StatCard label="STREAK" style={{ width: '47%' }} />
       <StatCard label="TIME INVESTED" style={{ width: '47%' }} />
       <StatCard label="COMPLETED" style={{ width: '47%' }} />
     </View>
   ) : (
     /* Desktop: single row layout */
   )}
   ```

2. **Test on actual devices or accurate simulators** — Web browser mobile simulation may render text differently than native iOS/Android.

3. **Safe areas**: On mobile, always account for:
   - Bottom tab bar height (~50-80px depending on device)
   - Safe area insets on notched devices
   - System font scaling (users may have larger text enabled)

4. **Flexbox overflow**: When using `flex: 1` on containers, ensure child content has room to render:
   ```tsx
   // Good — explicit minHeight prevents collapse
   <View style={{ flex: 1, minHeight: 80 }}>
     <Text>Content</Text>
   </View>
   ```

## Responsive Layout Patterns

1. **Use `isMobile` checks** for layout variations:
   ```tsx
   const isMobile = !(Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT)
   ```

2. **Pass `isMobile` to child components** that need responsive layouts.

3. **Prefer separate cards over cramped rows** on mobile for better readability.

## Checklist Before Committing UI Changes

- [ ] All text labels have sufficient container padding (especially bottom)
- [ ] Text near container edges has 4px+ safety buffer
- [ ] `lineHeight` is defined for all text styles
- [ ] Tested on narrow mobile viewport (320px width)
- [ ] Tested with system font scaling at 1.5x
- [ ] No hardcoded heights that could clip text
- [ ] Stats/metrics use 2x2 grid on mobile, not cramped single row
