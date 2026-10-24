/**
 * react-native-gesture-handler mock — pass-through stubs.
 *
 * On the web branch `TaskItem` never constructs `Swipeable`, but the import is
 * resolved at module load, so it must not throw. All stubs render children.
 */
import React, { type ComponentType, type ReactNode } from 'react'
import { View } from 'react-native'

type Props = { children?: ReactNode; [k: string]: unknown }

function PassThrough({ children, ...props }: Props) {
  return <View {...props}>{children}</View>
}

export const Swipeable = PassThrough
export const GestureHandlerRootView = PassThrough
export const PanGestureHandler = PassThrough
export const TapGestureHandler = PassThrough
export const LongPressGestureHandler = PassThrough
export const RectButton = PassThrough
export const BorderlessButton = PassThrough

export function gestureHandlerRootHOC<P>(Component: ComponentType<P>): ComponentType<P> {
  return Component
}

export default {
  Swipeable,
  GestureHandlerRootView,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  RectButton,
  BorderlessButton,
  gestureHandlerRootHOC,
}
