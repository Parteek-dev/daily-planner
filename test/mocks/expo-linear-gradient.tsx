/**
 * expo-linear-gradient mock.
 *
 * `LinearGradient` renders children and forwards style/testID/colors so
 * `GradientSurface` still lays out and the passed token colors are inspectable.
 */
import React, { type ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

type LinearGradientProps = ViewProps & {
  children?: ReactNode
  colors?: unknown
}

export function LinearGradient({ children, colors: _colors, ...props }: LinearGradientProps) {
  return <View {...props}>{children}</View>
}

export default { LinearGradient }
