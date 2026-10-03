/**
 * AppText — typography component with role-based styling.
 *
 * Maps semantic roles to typography tokens from the design system.
 * Replaces ad-hoc fontSize/fontWeight with consistent type scale.
 *
 * Roles:
 *   - display: 32px, bold — hero numbers, big stats
 *   - title: 24px, bold — screen titles
 *   - heading: 18px, semibold — section headers
 *   - body: 16px, regular — default text
 *   - caption: 14px, medium — secondary info
 *   - label: 12px, semibold — small labels, badges
 *
 * Props:
 *   role     — typography role (default: 'body')
 *   color    — optional override (defaults to textPrimary for display/title/heading/body, textSecondary for caption, textMuted for label)
 *   style    — additional TextStyle
 *   ...rest  — all standard Text props including accessibility
 */

import React from 'react'
import { Text, StyleSheet, Platform, type TextProps, type TextStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import type { Tokens, TypographyScale } from '@/src/theme/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypographyRole = keyof TypographyScale

export interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: TypographyRole
  color?: string
  style?: StyleProp<TextStyle>
  children?: React.ReactNode
}

// ─── Default colors per role ──────────────────────────────────────────────────

function getDefaultColor(role: TypographyRole, tokens: Tokens): string {
  switch (role) {
    case 'display':
    case 'title':
    case 'heading':
    case 'subheading':
    case 'body':
      return tokens.textPrimary
    case 'caption':
      return tokens.textSecondary
    case 'label':
      return tokens.textMuted
    default:
      return tokens.textPrimary
  }
}

// ─── Font weight mapping for native ───────────────────────────────────────────

function getFontFamily(
  weight: '400' | '500' | '600' | '700',
  fontsLoaded: boolean
): string {
  if (Platform.OS === 'web') {
    // Web uses CSS font-family with weight
    return '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  if (!fontsLoaded) {
    return 'System'
  }

  // Native: use specific font file for each weight
  switch (weight) {
    case '400':
      return 'Manrope_400Regular'
    case '500':
      return 'Manrope_500Medium'
    case '600':
      return 'Manrope_600SemiBold'
    case '700':
      return 'Manrope_700Bold'
    default:
      return 'Manrope_400Regular'
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppText({
  role = 'body',
  color,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { tokens } = useTheme()

  const typography = tokens.typography[role]
  const textColor = color ?? getDefaultColor(role, tokens)
  const fontFamily = getFontFamily(typography.fontWeight, Platform.OS === 'web')

  const textStyle: TextStyle = {
    fontFamily,
    fontSize: typography.fontSize,
    fontWeight: Platform.OS === 'web' ? typography.fontWeight : undefined, // Web needs fontWeight, native uses font file
    lineHeight: typography.lineHeight,
    letterSpacing: typography.letterSpacing,
    color: textColor,
  }

  return (
    <Text style={[textStyle, style]} {...rest}>
      {children}
    </Text>
  )
}

// ─── Convenience exports ──────────────────────────────────────────────────────

export function DisplayText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="display" {...props} />
}

export function TitleText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="title" {...props} />
}

export function HeadingText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="heading" {...props} />
}

export function SubheadingText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="subheading" {...props} />
}

export function BodyText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="body" {...props} />
}

export function CaptionText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="caption" {...props} />
}

export function LabelText(props: Omit<AppTextProps, 'role'>) {
  return <AppText role="label" {...props} />
}
