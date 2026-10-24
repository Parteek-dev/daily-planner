/**
 * Grouped inline stubs for expo-font / expo-constants / expo-linking / expo-blur.
 * These are pulled in transitively via expo-router / AppText / GlassSurface.
 */
import React from 'react'
import { View } from 'react-native'
import { vi } from 'vitest'

// ── expo-blur ───────────────────────────────────────────────────────────────

export function expoBlurFactory() {
  const BlurView = ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(View, props as object, children as React.ReactNode)
  return { BlurView, default: { BlurView } }
}

// ── expo-font ───────────────────────────────────────────────────────────────

export function expoFontFactory() {
  return {
    useFonts: vi.fn(() => [true]),
    loadAsync: vi.fn(async () => { }),
    isLoaded: vi.fn(() => true),
    isLoading: vi.fn(() => false),
  }
}

// ── expo-constants ────────────────────────────────────────────────────────────

export function expoConstantsFactory() {
  return {
    default: {
      expoConfig: {},
      manifest: {},
      manifest2: {},
    },
  }
}

// ── expo-linking ──────────────────────────────────────────────────────────────

export function expoLinkingFactory() {
  return {
    createURL: vi.fn((path: string) => `exp://test/${path}`),
    useURL: vi.fn(() => null),
    openURL: vi.fn(async () => { }),
    canOpenURL: vi.fn(async () => true),
    parse: vi.fn(() => ({ path: '', queryParams: {} })),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  }
}
