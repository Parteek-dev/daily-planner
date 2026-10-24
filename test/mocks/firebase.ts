/**
 * Firebase SDK + app-wrapper mocks.
 *
 * Provides fake `auth`/`db` sentinels and synchronous, controllable
 * implementations of the firebase/auth and firebase/firestore surface actually
 * used by the app (verified by grep — no query/where/orderBy/limit). The real
 * `Timestamp` class is re-exported via `vi.importActual` so `firestoreMappers`
 * round-trips unchanged.
 *
 * These factories are registered via `vi.mock(...)` in `test/setup.ts`.
 */
import { vi } from 'vitest'
import {
  __getAuthUser,
  __getDoc,
  __getCollection,
  type SeededDoc,
} from './firebase-control'

// ── Shared sentinels ────────────────────────────────────────────────────────

/** Fake Auth instance sentinel. */
export const auth = {}
/** Fake Firestore instance sentinel. */
export const db = {}

// ── firebase/app ──────────────────────────────────────────────────────────────

export function firebaseAppFactory() {
  return {
    initializeApp: vi.fn(() => ({})),
    getApps: vi.fn(() => [{}]),
    getApp: vi.fn(() => ({})),
  }
}

// ── firebase/auth ─────────────────────────────────────────────────────────────

export const authSpies = {
  signInWithEmailAndPassword: vi.fn(async () => ({ user: __getAuthUser() })),
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: __getAuthUser() })),
  sendEmailVerification: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  signInAnonymously: vi.fn(async () => ({ user: __getAuthUser() })),
  updateProfile: vi.fn(async () => {}),
  deleteUser: vi.fn(async () => {}),
  linkWithCredential: vi.fn(async () => ({ user: __getAuthUser() })),
  reload: vi.fn(async () => {}),
}

export function firebaseAuthFactory() {
  return {
    getAuth: vi.fn(() => auth),
    // Synchronously report the current user and return an unsubscribe fn.
    onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
      cb(__getAuthUser())
      return vi.fn()
    }),
    signInWithEmailAndPassword: authSpies.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: authSpies.createUserWithEmailAndPassword,
    sendEmailVerification: authSpies.sendEmailVerification,
    sendPasswordResetEmail: authSpies.sendPasswordResetEmail,
    signOut: authSpies.signOut,
    signInAnonymously: authSpies.signInAnonymously,
    updateProfile: authSpies.updateProfile,
    deleteUser: authSpies.deleteUser,
    linkWithCredential: authSpies.linkWithCredential,
    reload: authSpies.reload,
    EmailAuthProvider: {
      credential: vi.fn(() => ({ __credential: true })),
    },
  }
}

// ── firebase/firestore ──────────────────────────────────────────────────────

interface DocRef {
  __path: string
}

/** A single-doc snapshot matching how `docTo*` + `useProgress` read it. */
function makeDocSnapshot(path: string) {
  const data = __getDoc(path)
  const id = path.split('/').pop() ?? path
  return {
    id,
    exists: () => data !== undefined,
    data: () => data,
  }
}

/** A query snapshot matching how `useProgress` reads collections. */
function makeQuerySnapshot(path: string) {
  const docs = __getCollection(path).map((d: SeededDoc) => ({
    id: d.id,
    exists: () => true,
    data: () => d.data,
  }))
  return {
    docs,
    forEach: (cb: (doc: (typeof docs)[number]) => void) => docs.forEach(cb),
    size: docs.length,
    empty: docs.length === 0,
  }
}

export const firestoreSpies = {
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  addDoc: vi.fn(async () => ({ id: 'generated-id' })),
  getDocs: vi.fn(async (ref: DocRef) => makeQuerySnapshot(ref.__path)),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}

export async function firebaseFirestoreFactory() {
  // Re-export the REAL Timestamp so firestoreMappers round-trips work.
  const actual = await vi.importActual<typeof import('firebase/firestore')>(
    'firebase/firestore',
  )
  return {
    getFirestore: vi.fn(() => db),
    initializeFirestore: vi.fn(() => db),
    persistentLocalCache: vi.fn(() => ({})),
    persistentMultipleTabManager: vi.fn(() => ({})),
    collection: vi.fn((_db: unknown, ...segments: string[]) => ({
      __path: segments.join('/'),
    })),
    doc: vi.fn((_db: unknown, ...segments: string[]) => ({
      __path: segments.join('/'),
    })),
    onSnapshot: vi.fn(
      (
        ref: DocRef,
        next: (snap: unknown) => void,
        _err?: (e: unknown) => void,
      ) => {
        // A collection path has an odd number of segments; a doc path even.
        const segments = ref.__path.split('/')
        const snap =
          segments.length % 2 === 0
            ? makeDocSnapshot(ref.__path)
            : makeQuerySnapshot(ref.__path)
        next(snap)
        return vi.fn()
      },
    ),
    getDocs: firestoreSpies.getDocs,
    setDoc: firestoreSpies.setDoc,
    updateDoc: firestoreSpies.updateDoc,
    deleteDoc: firestoreSpies.deleteDoc,
    addDoc: firestoreSpies.addDoc,
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(async () => {}),
    })),
    serverTimestamp: firestoreSpies.serverTimestamp,
    Timestamp: actual.Timestamp,
  }
}

// ── @/src/lib/firebase wrapper ──────────────────────────────────────────────

export function firebaseWrapperFactory() {
  return { auth, db }
}
