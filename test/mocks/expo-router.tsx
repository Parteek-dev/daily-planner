/**
 * expo-router mock — controllable navigation hooks + pass-through components.
 *
 * RN primitives are imported from 'react-native', which resolves to
 * react-native-web via the web project's project-scoped alias, so the
 * pass-through components render real DOM.
 */
import React, { type ReactNode, useEffect } from 'react'
import { View } from 'react-native'
import {
  __getRouter,
  __getSegments,
  __getParams,
  __getPathname,
  __getRedirectSpy,
} from './expo-router-control'

export function useRouter() {
  return __getRouter()
}

export function useSegments() {
  return __getSegments()
}

export function useLocalSearchParams() {
  return __getParams()
}

export function usePathname() {
  return __getPathname()
}

/** Runs the callback once via useEffect (web-safe approximation). */
export function useFocusEffect(cb: () => void | (() => void)) {
  useEffect(() => {
    const cleanup = cb()
    return typeof cleanup === 'function' ? cleanup : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// ── Pass-through components ─────────────────────────────────────────────────

export function Link({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) {
  return <View {...props}>{children}</View>
}

export function Redirect({ href }: { href: unknown }) {
  __getRedirectSpy()(href)
  return null
}

export function Stack({ children }: { children?: ReactNode }) {
  return <View>{children}</View>
}
Stack.Screen = function StackScreen() {
  return null
}

export function Tabs({ children }: { children?: ReactNode }) {
  return <View>{children}</View>
}
Tabs.Screen = function TabsScreen() {
  return null
}

export function Slot({ children }: { children?: ReactNode }) {
  return <View>{children}</View>
}
