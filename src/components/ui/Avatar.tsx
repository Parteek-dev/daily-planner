/**
 * Avatar — user avatar circle with fallback initial.
 *
 * Matches the reference design's avatar circles with:
 * - Circular shape
 * - Image support
 * - Initial fallback
 * - Multiple sizes
 *
 * Props:
 *   source    — image source (optional)
 *   name      — user name for initial fallback
 *   size      — 'sm' | 'md' | 'lg' (default: 'md')
 *   style     — additional ViewStyle
 */

import React from 'react'
import { View, Image, StyleSheet, type ViewStyle, type StyleProp, type ImageSourcePropType } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { type Tokens } from '@/src/theme/tokens'
import AppText from '../AppText'

export interface AvatarProps {
  source?: ImageSourcePropType
  name?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  style?: StyleProp<ViewStyle>
}

const SIZES = {
  sm: { container: 32, fontSize: 'label' as const },
  md: { container: 40, fontSize: 'caption' as const },
  lg: { container: 52, fontSize: 'body' as const },
}

export default function Avatar({
  source,
  name,
  size = 'md',
  color,
  style,
}: AvatarProps) {
  const { tokens } = useTheme()
  
  const sizeConfig = SIZES[size]
  const bgColor = color ?? tokens.accentPrimary
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  
  const containerStyle: ViewStyle = {
    width: sizeConfig.container,
    height: sizeConfig.container,
    borderRadius: sizeConfig.container / 2,
    backgroundColor: bgColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }
  
  if (source) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={source}
          style={{
            width: sizeConfig.container,
            height: sizeConfig.container,
          }}
        />
      </View>
    )
  }
  
  return (
    <View style={[containerStyle, style]}>
      <AppText
        role={sizeConfig.fontSize}
        color={tokens.textInverse}
        style={{ fontWeight: '600' }}
      >
        {initial}
      </AppText>
    </View>
  )
}
