import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseMisconfigured } from '../lib/supabase'

/**
 * useAuth — wraps Supabase auth.
 * Provides: user, session, loading, signUp, signIn, signOut, resetPassword
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!supabaseMisconfigured)

  // On mount: get existing session, then subscribe to auth state changes
  useEffect(() => {
    if (supabaseMisconfigured) return
    // Get the current session (handles page reload / persisted login)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for login / logout / token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Sign Up ─────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || '' },
      },
    })
    if (error) return { success: false, error: error.message }
    // Supabase sends a confirmation email by default.
    // If email confirmations are disabled in your project, the user is
    // immediately signed in and data.session will be non-null.
    return {
      success: true,
      needsConfirmation: !data.session, // true = check email
    }
  }, [])

  // ── Sign In ─────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }, [])

  // ── Sign Out ────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // ── Password Reset ──────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }, [])

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }
}
