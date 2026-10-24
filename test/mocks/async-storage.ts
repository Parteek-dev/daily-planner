/**
 * Hand-written in-memory AsyncStorage mock.
 *
 * The vendor jest mock (`@react-native-async-storage/async-storage/jest/...`)
 * calls `jest.fn(...)` on every method, which throws under Vitest where `jest`
 * is undefined. This tiny in-memory implementation uses `vi.fn()` wrappers over
 * a `Map`, so calls are spyable and deterministic.
 */
import { vi } from 'vitest'

const store = new Map<string, string>()

const mock = {
  getItem: vi.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
  setItem: vi.fn(async (k: string, v: string) => {
    store.set(k, v)
  }),
  removeItem: vi.fn(async (k: string) => {
    store.delete(k)
  }),
  multiGet: vi.fn(async (ks: string[]) =>
    ks.map((k) => [k, store.has(k) ? store.get(k)! : null] as [string, string | null]),
  ),
  multiSet: vi.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => store.set(k, v))
  }),
  multiRemove: vi.fn(async (ks: string[]) => {
    ks.forEach((k) => store.delete(k))
  }),
  clear: vi.fn(async () => {
    store.clear()
  }),
  getAllKeys: vi.fn(async () => [...store.keys()]),
}

/** Clears the backing store. Run in the global afterEach. */
export function resetAsyncStorage() {
  store.clear()
}

export default mock
