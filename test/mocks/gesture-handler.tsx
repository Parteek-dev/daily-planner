/**
 * react-native-gesture-handler mock — pass-through stubs.
 *
 * On the web branch `TaskItem` never constructs `Swipeable`, but the import is
 * resolved at module load, so it must not throw. All stubs render children.
 */
import React, { type ComponentType, type ReactNode } from 'react'
import { View } from 'react-native'

type Props = { children?: ReactNode;[k: string]: unknown }

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

/** GestureDetector renders its child; the composed gesture is a no-op on web. */
export const GestureDetector = PassThrough

/** Chainable gesture builder stub — every method returns the same builder. */
function makeGestureBuilder() {
  const builder: Record<string, unknown> = {}
  return new Proxy(builder, {
    get: (_t, prop) => {
      if (prop === 'then') return undefined
      return (..._args: unknown[]) => makeGestureBuilder()
    },
  })
}

/** `Gesture` factory object — Pan(), Tap(), etc. all return chainable stubs. */
export const Gesture = new Proxy(
  {},
  {
    get: () => () => makeGestureBuilder(),
  },
) as Record<string, (...args: unknown[]) => unknown>

export const Directions = { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 }
export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
}

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
  GestureDetector,
  Gesture,
  Directions,
  State,
  gestureHandlerRootHOC,
}
