/**
 * Per-test control surface for the expo-router mock.
 *
 * Holds the navigation spies (stable across a test) plus the controllable
 * segments / params / pathname that the router hooks report.
 */
import { vi } from 'vitest'

export interface RouterSpies {
  push: ReturnType<typeof vi.fn>
  replace: ReturnType<typeof vi.fn>
  back: ReturnType<typeof vi.fn>
  setParams: ReturnType<typeof vi.fn>
}

interface RouterControlState {
  router: RouterSpies
  segments: string[]
  params: Record<string, unknown>
  pathname: string
  /** Spy recording hrefs passed to <Redirect>. */
  redirectSpy: RedirectSpy
}

/** Callable spy that records the href passed to <Redirect>. */
export type RedirectSpy = ReturnType<typeof vi.fn<(href: unknown) => void>>

function freshRouter(): RouterSpies {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    setParams: vi.fn(),
  }
}

function freshRedirectSpy(): RedirectSpy {
  return vi.fn<(href: unknown) => void>()
}

const state: RouterControlState = {
  router: freshRouter(),
  segments: [],
  params: {},
  pathname: '/',
  redirectSpy: freshRedirectSpy(),
}

/** Sets controllable navigation state (merged with current). */
export function setRouterMock(
  next: Partial<Pick<RouterControlState, 'segments' | 'params' | 'pathname'>>,
) {
  if (next.segments !== undefined) state.segments = next.segments
  if (next.params !== undefined) state.params = next.params
  if (next.pathname !== undefined) state.pathname = next.pathname
}

/** Exposes the router spy object for assertions on push/replace/back/setParams. */
export function getRouter(): RouterSpies {
  return state.router
}

/** Exposes the <Redirect> href spy for assertions. */
export function getRedirectSpy(): RedirectSpy {
  return state.redirectSpy
}

/** Restores defaults; run in the global afterEach. */
export function resetRouterControl() {
  state.router = freshRouter()
  state.segments = []
  state.params = {}
  state.pathname = '/'
  state.redirectSpy = freshRedirectSpy()
}

// ── Internal accessors used by the expo-router mock ─────────────────────────

export function __getRouter(): RouterSpies {
  return state.router
}
export function __getSegments(): string[] {
  return state.segments
}
export function __getParams(): Record<string, unknown> {
  return state.params
}
export function __getPathname(): string {
  return state.pathname
}
export function __getRedirectSpy(): RedirectSpy {
  return state.redirectSpy
}
