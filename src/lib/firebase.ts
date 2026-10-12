/**
 * Firebase initialization — single-instance module.
 *
 * Exports:
 *   db   — Firestore instance
 *   auth — Firebase Auth instance
 *
 * Requirements: 23.1, 23.6, 2.2
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
}

// Guard: initialize only once (safe across HMR reloads and module re-evaluations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Web: use persistent cache via the new API (replaces deprecated enableIndexedDbPersistence).
// Native: use default Firestore instance (offline cache is on by default).
export const db = typeof window !== 'undefined'
  ? initializeFirestore(app, {
    cache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  } as any)
  : getFirestore(app)

export const auth = getAuth(app)
