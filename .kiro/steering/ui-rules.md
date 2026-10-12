# UI Development Rules

This project is a cross-platform Daily Planner application built with:

- React Native
- Expo
- React Native Web
- TypeScript
- Expo Router

## Styling System

The project uses a custom `makeStyles(tokens)` factory pattern for all styling.

- All colors come from `useTheme().tokens` — **never hardcode hex values**
- All spacing uses token values — no magic numbers in `StyleSheet`
- `StyleSheet.create` via a `makeStyles(tokens)` factory function inside each component
- Theme tokens are defined in `src/theme/tokens.ts` as `DARK_TOKENS` / `LIGHT_TOKENS`

## Core UI Rules

1. `makeStyles(tokens)` is the primary styling pattern.

2. Do not introduce a UI component library unless explicitly requested.

3. Use `StyleSheet.create` with token values — no inline styles with hardcoded colors or sizes.

4. Do not use arbitrary hardcoded colors.

5. Do not use arbitrary spacing values — use token values from `useTheme().tokens`.

6. Use theme tokens for colors, typography, spacing, radius and shadows.

7. Components must work on:
   - iOS
   - Android
   - Web

8. Prefer reusable components over screen-specific UI implementations.

9. Keep business logic separate from presentation.

10. Do not duplicate UI code between mobile and web unless platform-specific behavior is required.

## Design System

Use a consistent design language throughout the application.

Theme tokens are in `src/theme/tokens.ts`:

- `bgPrimary`, `bgSecondary`, `bgInput` — backgrounds
- `borderPrimary`, `borderSecondary` — borders
- `textPrimary`, `textSecondary`, `textMuted` — text
- `accentBlue`, `accentGreen`, `accentOrange`, `accentRed`, `accentPurple` — accents
- `accentPrimary` — alias for current accent (user-customisable)

Support:

- Light mode
- Dark mode
- Responsive web layouts
- Touch-friendly mobile controls
- Keyboard/mouse interaction on web

## Responsive Design

Use responsive layouts rather than creating separate desktop and mobile screens.

Mobile:
- Bottom navigation
- Full-width cards
- Touch-friendly controls
- Compact spacing

Tablet:
- Two-column layouts where appropriate

Desktop:
- Sidebar navigation
- Wider content area
- Multi-column layouts
- Keyboard-friendly interactions

**Breakpoint**: `768px` (`SIDEBAR_BREAKPOINT = 768`) — above this, the web sidebar layout is shown.

**Mobile-only UI**: search icon, profile avatar, and Pomodoro button in screen headers must only render when `isMobile` is true (`!(Platform.OS === 'web' && width > 768)`).

## Accessibility

All interactive components must have:

- Accessible labels
- Appropriate accessibility roles
- Sufficient contrast
- Visible focus states on web
- Touch targets of at least 44×44 where practical

## Component Rules

Before creating a new component:

1. Check whether an existing component can be reused.
2. If similar functionality exists, extend the existing component.
3. Create reusable components for repeated patterns.
4. Avoid putting large amounts of UI logic directly inside screens.

## Code Quality

Use:

- TypeScript
- Functional components
- React hooks
- Strong typing
- Small reusable components

Avoid:

- `any`
- duplicated styles
- duplicated components
- inline magic numbers
- inline magic colors
- unnecessary platform-specific code
- `require('react-native')` inside JSX or StyleSheet — always use the imported `Platform` constant

## Visual Quality

The UI should feel:

- Modern
- Clean
- Minimal
- Premium
- Fast
- Calm
- Productivity-focused

Use whitespace, hierarchy and typography rather than excessive borders and colors.

## Important

When implementing a new screen:

1. Reuse the existing design tokens.
2. Reuse existing components.
3. Maintain visual consistency with the rest of the application.
4. Ensure mobile and desktop layouts both work.
5. Test responsive behavior.
