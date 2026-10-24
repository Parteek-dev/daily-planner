/**
 * Per-test control surface for the firebase mock.
 *
 * Holds the mutable state the firebase/auth and firebase/firestore mocks read:
 *   - the current auth user (what `onAuthStateChanged` reports)
 *   - seeded firestore snapshots keyed by collection / document path
 *
 * Tests seed data with RAW Firestore field names (snake_case) and the real
 * `firestoreMappers` convert them, so screen tests exercise the genuine
 * mapping path.
 */

export interface FakeUser {
  uid: string
  email: string | null
  displayName?: string | null
  emailVerified?: boolean
  isAnonymous?: boolean
  [key: string]: unknown
}

export interface SeededDoc {
  id: string
  data: Record<string, unknown>
}

interface FirebaseControlState {
  authUser: FakeUser | null
  /** Single-document snapshots keyed by doc path. */
  docs: Map<string, Record<string, unknown>>
  /** Collection snapshots keyed by collection path. */
  collections: Map<string, SeededDoc[]>
}

const state: FirebaseControlState = {
  authUser: null,
  docs: new Map(),
  collections: new Map(),
}

/** Sets the current auth user reported by onAuthStateChanged / credential resolutions. */
export function setAuthUser(user: FakeUser | null) {
  state.authUser = user
}

/** Seeds a single-document snapshot at `path` (e.g. `goals/daily`). */
export function setFirestoreDoc(path: string, data: Record<string, unknown>) {
  state.docs.set(path, data)
}

/** Seeds a collection snapshot at `path` (e.g. `tasks`). */
export function setFirestoreDocs(path: string, docs: SeededDoc[]) {
  state.collections.set(path, docs)
}

/** Clears auth user and all seeded docs. Run in the global afterEach. */
export function resetFirebaseControl() {
  state.authUser = null
  state.docs.clear()
  state.collections.clear()
}

// ── Internal accessors used by the firebase mock ────────────────────────────

export function __getAuthUser(): FakeUser | null {
  return state.authUser
}

export function __getDoc(path: string): Record<string, unknown> | undefined {
  return state.docs.get(path)
}

export function __getCollection(path: string): SeededDoc[] {
  return state.collections.get(path) ?? []
}
