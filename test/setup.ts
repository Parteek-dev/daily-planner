/**
 * Global setup for the `web` (jsdom + react-native-web) Vitest project.
 *
 * Order: jsdom shims -> async-storage -> firebase -> router -> native stubs.
 * All vi.mock factories are hoisted; they load the mock modules lazily via
 * `await import(...)` so they never reference out-of-scope bindings.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetFirebaseControl } from './mocks/firebase-control'
import { resetRouterControl } from './mocks/expo-router-control'
import { resetAsyncStorage } from './mocks/async-storage'

// ── jsdom shims RNW expects ─────────────────────────────────────────────────

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id)) as typeof cancelAnimationFrame
}

// ── async-storage ───────────────────────────────────────────────────────────

vi.mock('@react-native-async-storage/async-storage', async () => ({
  default: (await import('./mocks/async-storage')).default,
}))

// ── firebase (app / auth / firestore) + app wrapper ─────────────────────────

vi.mock('firebase/app', async () => {
  const m = await import('./mocks/firebase')
  return m.firebaseAppFactory()
})

vi.mock('firebase/auth', async () => {
  const m = await import('./mocks/firebase')
  return m.firebaseAuthFactory()
})

vi.mock('firebase/firestore', async () => {
  const m = await import('./mocks/firebase')
  return m.firebaseFirestoreFactory()
})

vi.mock('@/src/lib/firebase', async () => {
  const m = await import('./mocks/firebase')
  return m.firebaseWrapperFactory()
})

// ── expo-router ─────────────────────────────────────────────────────────────

vi.mock('expo-router', async () => {
  const m = await import('./mocks/expo-router')
  return m
})

// ── react-native-safe-area-context ──────────────────────────────────────────

vi.mock('react-native-safe-area-context', async () => {
  const m = await import('./mocks/safe-area-context')
  return m
})

// ── animation / gesture / native graphics ───────────────────────────────────

vi.mock('react-native-reanimated', async () => {
  const m = await import('./mocks/reanimated')
  return { ...m, default: m.default }
})

vi.mock('react-native-gesture-handler', async () => {
  const m = await import('./mocks/gesture-handler')
  return { ...m, default: m.default }
})

// TaskItem imports `Swipeable` as the DEFAULT export of this subpath.
vi.mock('react-native-gesture-handler/ReanimatedSwipeable', async () => {
  const m = await import('./mocks/gesture-handler')
  return { default: m.Swipeable }
})

vi.mock('@shopify/react-native-skia', async () => {
  const m = await import('./mocks/skia')
  return m.skiaFactory()
})

vi.mock('victory-native', async () => {
  const m = await import('./mocks/victory')
  return m
})

vi.mock('react-native-svg', async () => {
  const m = await import('./mocks/svg')
  return m
})

vi.mock('expo-linear-gradient', async () => {
  const m = await import('./mocks/expo-linear-gradient')
  return m
})

// ── expo native modules ─────────────────────────────────────────────────────

vi.mock('expo-notifications', async () => {
  const m = await import('./mocks/expo-notifications')
  return { ...m, default: m.default }
})

vi.mock('expo-av', async () => {
  const m = await import('./mocks/expo-av')
  return { ...m, default: m.default }
})

vi.mock('expo-file-system', async () => {
  const m = await import('./mocks/expo-file-system')
  return { ...m, default: m.default }
})

// ── lucide-react-native (single Proxy mechanism) ────────────────────────────

vi.mock('lucide-react-native', async () => {
  const m = await import('./mocks/lucide')
  return m.lucideFactory()
})

// ── inline expo stubs (blur / speech / document-picker / sharing) ────────────

vi.mock('expo-blur', async () => {
  const m = await import('./mocks/expo-misc')
  return m.expoBlurFactory()
})

vi.mock('expo-speech', () => ({
  speak: vi.fn(),
  stop: vi.fn(),
  isSpeakingAsync: vi.fn(async () => false),
  getAvailableVoicesAsync: vi.fn(async () => []),
}))

vi.mock('expo-document-picker', () => ({
  getDocumentAsync: vi.fn(async () => ({ canceled: true, assets: null })),
}))

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => { }),
}))

// ── expo-font / expo-constants / expo-linking ───────────────────────────────

vi.mock('expo-font', async () => {
  const m = await import('./mocks/expo-misc')
  return m.expoFontFactory()
})

vi.mock('expo-constants', async () => {
  const m = await import('./mocks/expo-misc')
  return m.expoConstantsFactory()
})

vi.mock('expo-linking', async () => {
  const m = await import('./mocks/expo-misc')
  return m.expoLinkingFactory()
})

// ── per-test reset ──────────────────────────────────────────────────────────

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  resetFirebaseControl()
  resetRouterControl()
  resetAsyncStorage()
})
