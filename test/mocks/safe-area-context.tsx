/**
 * react-native-safe-area-context mock.
 *
 * Returns zero insets and pass-through providers so components that read
 * `useSafeAreaInsets` (e.g. NavigationBar) render without a real provider.
 */
import React, { type ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }
const FRAME = { x: 0, y: 0, width: 0, height: 0 }

export function useSafeAreaInsets() {
  return ZERO_INSETS
}

export function useSafeAreaFrame() {
  return FRAME
}

export function SafeAreaProvider({
  children,
  ...props
}: { children?: ReactNode } & ViewProps) {
  return <View {...props}>{children}</View>
}

export function SafeAreaView({
  children,
  ...props
}: { children?: ReactNode } & ViewProps) {
  return <View {...props}>{children}</View>
}

export const SafeAreaInsetsContext = React.createContext(ZERO_INSETS)
export const initialWindowMetrics = { insets: ZERO_INSETS, frame: FRAME }
