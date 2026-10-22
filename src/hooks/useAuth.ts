/**
 * useAuth — Firebase Auth adapter hook.
 *
 * Replaces the Supabase-based `frontend/src/hooks/useAuth.js`.
 * All platform I/O (auth state, sign-in/out) is routed through the
 * Firebase Auth SDK; guest mode state is persisted in AsyncStorage.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10, 6.11
 */

import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInAnonymously,
  deleteUser,
  linkWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/src/lib/firebase'
import { extractErrorMessage } from '@/src/lib/authErrors'

// ── Constants ────────────────────────────────────────────────────────────────

const GUEST_MODE_KEY = 'guest_mode'

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Derived: true when the current user is an anonymous Firebase user (Req 6.6)
  const isGuest = user?.isAnonymous === true

  // On mount: subscribe to Firebase Auth state changes (replaces supabase.auth.getSession +
  // supabase.auth.onAuthStateChange). The listener fires immediately with the current user
  // (or null), which handles page reload / persisted login equivalent. (Req 6.10)
  useEffect(() => {
    // Safety timeout: if Firebase never responds (e.g. invalid credentials / offline),
    // stop blocking the app after 5 seconds and treat the user as unauthenticated.
    const timeout = setTimeout(() => {
      setAuthLoading(false)
    }, 5000)

    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          clearTimeout(timeout)
          console.log('[useAuth] onAuthStateChanged fired:', {
            uid: firebaseUser?.uid,
            isAnonymous: firebaseUser?.isAnonymous,
            emailVerified: firebaseUser?.emailVerified,
            email: firebaseUser?.email,
          })
          // Treat unverified email accounts as unauthenticated.
          // Anonymous (guest) users skip this check — they have no email to verify.
          if (firebaseUser && !firebaseUser.isAnonymous && !firebaseUser.emailVerified) {
            console.log('[useAuth] Blocking unverified user — signing out')
            // Sign them out silently — the signup flow already sent the verification email.
            firebaseSignOut(auth).catch(() => { })
            setUser(null)
          } else {
            setUser(firebaseUser)
          }
          setAuthLoading(false)
        },
        (error) => {
          // Auth error (e.g. invalid API key) — treat as unauthenticated
          console.warn('[useAuth] onAuthStateChanged error:', (error as any).code ?? error.message)
          clearTimeout(timeout)
          setAuthLoading(false)
        },
      )
    } catch (e) {
      clearTimeout(timeout)
      setAuthLoading(false)
    }

    return () => {
      clearTimeout(timeout)
      unsubscribe?.()
    }
  }, [])

  // ── Sign In ─────────────────────────────────────────────────────────────────
  // Replaces: supabase.auth.signInWithPassword (Req 6.1)
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; emailVerified?: boolean; error?: string }> => {
      try {
        console.log('[useAuth] Attempting sign in for:', email)
        const credential = await signInWithEmailAndPassword(auth, email, password)
        // Block access if email hasn't been verified yet
        if (!credential.user.emailVerified) {
          await firebaseSignOut(auth)
          return { success: false, emailVerified: false, error: 'Please verify your email before signing in. Check your inbox for the verification link.' }
        }
        console.log('[useAuth] Sign in successful')
        return { success: true, emailVerified: true }
      } catch (err) {
        console.error('[useAuth] Sign in error:', err)
        return { success: false, error: extractErrorMessage(err) }
      }
    },
    [],
  )

  // ── Sign Up ─────────────────────────────────────────────────────────────────
  // Replaces: supabase.auth.signUp (Req 6.2)
  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName?.trim()) {
          await updateProfile(credential.user, { displayName: displayName.trim() })
        }
        // Send verification email, then immediately sign out so the user
        // cannot access the app until they click the link in their inbox.
        await sendEmailVerification(credential.user)
        await firebaseSignOut(auth)
        console.log('[useAuth] Sign up successful, user signed out pending email verification')
        return { success: true }
      } catch (err) {
        console.error('[useAuth] Sign up error:', err)
        return { success: false, error: extractErrorMessage(err) }
      }
    },
    [],
  )

  // ── Sign Out ────────────────────────────────────────────────────────────────
  // Replaces: supabase.auth.signOut; also clears guest_mode flag (Req 6.9)
  const signOut = useCallback(async (): Promise<void> => {
    await firebaseSignOut(auth)
    await AsyncStorage.removeItem(GUEST_MODE_KEY)
  }, [])

  // ── Password Reset ──────────────────────────────────────────────────────────
  // Replaces: supabase.auth.resetPasswordForEmail (Req 6.4, 6.5)
  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await sendPasswordResetEmail(auth, email)
        return { success: true }
      } catch (err) {
        return { success: false, error: extractErrorMessage(err) }
      }
    },
    [],
  )

  // ── Guest Mode Entry ────────────────────────────────────────────────────────
  // New: anonymous sign-in via Firebase Auth (Req 6.6)
  const enterGuestMode = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        await signInAnonymously(auth)
        await AsyncStorage.setItem(GUEST_MODE_KEY, 'true')
        return { success: true }
      } catch (err) {
        return { success: false, error: extractErrorMessage(err) }
      }
    },
    [],
  )

  // ── Guest Mode Exit ─────────────────────────────────────────────────────────
  // New: delete the anonymous Firebase account and clear AsyncStorage (Req 6.7)
  const exitGuestMode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      return { success: false, error: 'No active session to exit.' }
    }
    try {
      await deleteUser(currentUser)
      await AsyncStorage.removeItem(GUEST_MODE_KEY)
      return { success: true }
    } catch (err) {
      return { success: false, error: extractErrorMessage(err) }
    }
  }, [])

  // ── Guest Account Upgrade ───────────────────────────────────────────────────
  // New: link anonymous account to email/password credential (Req 6.11)
  // Preserves all Firestore data under the same UID after linking.
  const upgradeGuestAccount = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return { success: false, error: 'No active guest session to upgrade.' }
      }
      try {
        const credential = EmailAuthProvider.credential(email, password)
        await linkWithCredential(currentUser, credential)
        await AsyncStorage.removeItem(GUEST_MODE_KEY)
        return { success: true }
      } catch (err) {
        return { success: false, error: extractErrorMessage(err) }
      }
    },
    [],
  )

  return {
    user,
    isGuest,
    authLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    enterGuestMode,
    exitGuestMode,
    upgradeGuestAccount,
  }
}
