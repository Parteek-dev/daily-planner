/**
 * IconBadge — rounded square icon container.
 *
 * Matches the reference design's icon badges with:
 * - Rounded square background
 * - Centered icon
 * - Multiple size variants
 *
 * Props:
 *   icon      — Lucide icon component
 *   color     — icon color (defaults to accentPrimary)
 *   bgColor   — background color (defaults to accentPrimaryMuted)
 *   size      — 'sm' | 'md' | 'lg' (default: 'md')
 *   style     — additional ViewStyle
 */

import React from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { type Tokens } from '@/src/theme/tokens'
import type { LucideIcon } from 'lucide-react-native'

export interface IconBadgeProps {
  icon: LucideIcon
  color?: string
  bgColor?: string
  size?: 'sm' | 'md' | 'lg'
  style?: StyleProp<ViewStyle>
}

const SIZES = {
  sm: { container: 32, icon: 16, radius: 'sm' as const },
  md: { container: 40, icon: 20, radius: 'md' as const },
  lg: { container: 52, icon: 26, radius: 'lg' as const },
}

export default function IconBadge({
  icon: Icon,
  color,
  bgColor,
  size = 'md',
  style,
}: IconBadgeProps) {
  const { tokens } = useTheme()
  
  const sizeConfig = SIZES[size]
  const resolvedColor = color ?? tokens.accentPrimary
  const resolvedBg = bgColor ?? tokens.accentPrimaryMuted
  
  return (
    <View
      style={[
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          borderRadius: tokens.radius[sizeConfig.radius],
          backgroundColor: resolvedBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon size={sizeConfig.icon} color={resolvedColor} />
    </View>
  )
}
