/**
 * authErrors — pure, dependency-free helpers extracted from `useAuth`.
 *
 * `mapFirebaseError` and `extractErrorMessage` are moved here verbatim so the
 * hook can import and call them without any runtime behavior change. No
 * Firebase or other I/O is referenced here.
 */

// ── Error code → human-readable message map ──────────────────────────────────

export function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/credential-already-in-use':
      return 'This email is already linked to another account.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-up is not enabled. Please contact support.'
    case 'auth/admin-restricted-operation':
      return 'Sign-up is currently restricted. Please contact support.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return mapFirebaseError((err as { code: string }).code)
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred. Please try again.'
}
