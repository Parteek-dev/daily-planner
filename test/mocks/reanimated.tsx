/**
 * react-native-reanimated mock — synchronous, web-safe.
 *
 * Shared values are plain objects and animated styles are evaluated once, so
 * computed/interpolated style values are NOT assertable; tests assert behavior
 * (callbacks fire, children swap) instead.
 */
import React, { type ComponentType } from 'react'
import { View, Text, ScrollView } from 'react-native'

export function useSharedValue<T>(initial: T): { value: T } {
  return { value: initial }
}

export function useAnimatedStyle<T>(fn: () => T): T {
  return fn()
}

export function useDerivedValue<T>(fn: () => T): { value: T } {
  return { value: fn() }
}

const identity = <T,>(target: T): T => target

export const withTiming = identity
export const withSpring = identity
export const withDelay = <T,>(_delay: number, target: T): T => target
export const withSequence = <T,>(...targets: T[]): T => targets[targets.length - 1]
export const withRepeat = <T,>(target: T): T => target

export const Easing = new Proxy(
  {},
  { get: () => (v: unknown) => v },
) as Record<string, (v: unknown) => unknown>

export function runOnJS<F extends (...args: unknown[]) => unknown>(fn: F): F {
  return fn
}

export function cancelAnimation() {
  // no-op
}

export function interpolate(value: number): number {
  return value
}

export function interpolateColor(): string {
  return 'transparent'
}

function createAnimatedComponent<P>(Component: ComponentType<P>): ComponentType<P> {
  return Component
}

const Animated = {
  createAnimatedComponent,
  View,
  Text,
  ScrollView,
}

export default Animated
