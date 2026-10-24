/**
 * Auth screen — matches legacy AuthPage.jsx design.
 *
 * Layout: centred glassmorphism card on gradient background.
 * Modes:  signin | signup | reset  (switched inline, no tab bar)
 *
 * Features:
 *   - Time-based greeting + rotating motivational quotes (sign-in only)
 *   - Input fields with leading icons
 *   - Gradient primary button
 *   - Password visibility toggle
 *   - Back button (top-left) + theme toggle (top-right) on the card
 *   - "Continue as Guest" with divider
 *
 * Requirements: 6.1 – 6.6
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  Mail, Lock, User, Eye, EyeOff, ClipboardList,
  Sun, Moon, SunMoon, CheckCircle2, AlertCircle,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { useAuth } from '@/src/hooks/useAuth'

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_MAX_LENGTH = 254
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Small daily improvements lead to stunning results.', author: 'Robin Sharma' },
  { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'The key is not to prioritize your schedule, but to schedule your priorities.', author: 'Stephen Covey' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

type Mode = 'signin' | 'signup' | 'reset'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: '☀️' }
  if (h < 17) return { text: 'Good afternoon', icon: '🌤️' }
  return { text: 'Good evening', icon: '🌙' }
}

function validateEmail(email: string): string | null {
  const t = email.trim()
  if (!t) return 'Email is required.'
  if (!t.includes('@')) return 'Please enter a valid email address.'
  if (t.length > EMAIL_MAX_LENGTH) return `Email must be at most ${EMAIL_MAX_LENGTH} characters.`
  return null
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.'
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`
  return null
}

// ── Input with leading icon ───────────────────────────────────────────────────

function IconInput({
  icon: Icon,
  rightIcon,
  onRightPress,
  tokens,
  isDark,
  hasError,
  nativeID,
  autoComplete,
  ...props
}: {
  icon: any
  rightIcon?: any
  onRightPress?: () => void
  tokens: ReturnType<typeof useTheme>['tokens']
  isDark: boolean
  hasError?: boolean
  nativeID?: string
  autoComplete?: string
  [key: string]: any
}) {
  const [focused, setFocused] = useState(false)
  const RightIcon = rightIcon

  return (
    <View style={[
      inputWrap.row,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        borderColor: hasError
          ? tokens.accentRed
          : focused
            ? 'rgba(99,102,241,0.7)'
            : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        ...Platform.select({
          web: focused ? { boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' } as any : {},
        }),
      },
    ]}>
      <View style={inputWrap.iconLeft}>
        <Icon size={15} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'} />
      </View>
      <TextInput
        nativeID={nativeID}
        autoComplete={autoComplete as any}
        style={[
          inputWrap.input,
          { color: isDark ? '#fff' : '#0f172a', paddingRight: rightIcon ? 40 : 14 },
        ]}
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {RightIcon && onRightPress && (
        <Pressable onPress={onRightPress} style={inputWrap.iconRight} hitSlop={8}>
          <RightIcon size={15} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
        </Pressable>
      )}
    </View>
  )
}

const inputWrap = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    height: 46,
  },
  iconLeft: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%' as any,
    // Remove native outline on web
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  iconRight: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// ── Main component ────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { tokens, theme, themeMode, toggleTheme } = useTheme()
  const { signIn, signUp, resetPassword, enterGuestMode } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ tab?: string }>()
  const { width } = useWindowDimensions()

  const isDark = theme === 'dark'

  function resolveMode(tab: string | undefined): Mode {
    if (tab === 'signup') return 'signup'
    if (tab === 'reset') return 'reset'
    return 'signin'
  }

  const [mode, setMode] = useState<Mode>(resolveMode(params.tab))

  // Shared fields (email persists across mode switches like legacy)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [verificationSentTo, setVerificationSentTo] = useState('')

  // Quote carousel
  const [quoteIdx, setQuoteIdx] = useState(0)
  const quoteOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(quoteOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        Animated.timing(quoteOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
      })
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // Card entrance
  const cardTranslate = useRef(new Animated.Value(24)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.spring(cardTranslate, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start()
    }, 60)
    return () => clearTimeout(t)
  }, [])

  const resetForm = () => { setError(''); setSuccess(''); setPassword(''); setConfirmPassword(''); setUnverifiedEmail(''); setVerificationSentTo('') }
  const switchMode = (m: Mode) => { resetForm(); setMode(m) }

  const greeting = getGreeting()
  const quote = QUOTES[quoteIdx]

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    setLoading(true); setError(''); setUnverifiedEmail('')
    const result = await signIn(email.trim(), password)
    setLoading(false)
    if (!result.success) {
      if (result.emailVerified === false) {
        setUnverifiedEmail(email.trim())
      }
      setError(result.error ?? 'Sign-in failed.')
    }
  }, [email, password, signIn])

  const handleResendVerification = useCallback(async () => {
    if (!unverifiedEmail) return
    setResendLoading(true)
    try {
      // Sign in temporarily to get the user object, send verification, then sign out
      const { signInWithEmailAndPassword: fbSignIn } = await import('firebase/auth')
      const { auth: fbAuth } = await import('@/src/lib/firebase')
      const { sendEmailVerification: fbSendVerification, signOut: fbSignOut } = await import('firebase/auth')
      const cred = await fbSignIn(fbAuth, unverifiedEmail, password)
      await fbSendVerification(cred.user)
      await fbSignOut(fbAuth)
      setSuccess('Verification email resent! Check your inbox.')
      setError('')
    } catch {
      setError('Could not resend verification email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }, [unverifiedEmail, password])

  const handleSignUp = useCallback(async () => {
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    const result = await signUp(email.trim(), password, displayName.trim())
    setLoading(false)
    if (!result.success) setError(result.error ?? 'Sign-up failed.')
    else {
      setVerificationSentTo(email.trim())
    }
  }, [email, password, confirmPassword, displayName, signUp])

  const handleReset = useCallback(async () => {
    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }
    setLoading(true); setError('')
    const result = await resetPassword(email.trim())
    setLoading(false)
    if (!result.success) setError(result.error ?? 'Could not send reset email.')
    else setSuccess('Password reset email sent! Check your inbox.')
  }, [email, resetPassword])

  const handleGuest = useCallback(async () => {
    setGuestLoading(true)
    const result = await enterGuestMode()
    if (!result.success) {
      setError(result.error ?? 'Could not start guest session.')
      setGuestLoading(false)
    }
  }, [enterGuestMode])

  // ── Styles ──────────────────────────────────────────────────────────────────

  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.15)'
  const btnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const btnBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  const isWeb = Platform.OS === 'web'
  const isMobile = !isWeb || width < 520

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Gradient background */}
      <View style={[
        s.bg,
        isWeb && ({
          backgroundImage: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)'
            : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 40%, #f0f4ff 100%)',
        } as any),
        !isWeb && { backgroundColor: isDark ? '#0f172a' : '#eef2ff' },
      ]}>

        <ScrollView
          contentContainerStyle={[s.scroll, { minHeight: '100%' as any }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated card */}
          <Animated.View style={[
            s.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              transform: [{ translateY: cardTranslate }],
              opacity: cardOpacity,
              width: isMobile ? '100%' : 420,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 40 },
                android: { elevation: 12 },
                web: {
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: isDark
                    ? '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : '0 16px 48px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
                } as any,
              }),
            },
          ]}>

            {/* Back button — top left */}
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              style={[s.cornerBtn, { backgroundColor: btnBg, borderColor: btnBorder, left: 16 }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>← Back</Text>
            </Pressable>

            {/* Theme toggle — top right */}
            <Pressable
              onPress={toggleTheme}
              style={[s.cornerBtn, s.cornerBtnIcon, { backgroundColor: btnBg, borderColor: btnBorder, right: 16 }]}
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
            >
              {themeMode === 'dark'
                ? <Moon size={15} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                : themeMode === 'light'
                  ? <Sun size={15} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                  : <SunMoon size={15} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />}
            </Pressable>

            {/* Greeting */}
            <Text style={[s.greeting, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>
              {greeting.icon} {greeting.text}
            </Text>

            {/* Logo + title */}
            <View style={s.logoWrap}>
              <View style={s.logoBox}>
                <ClipboardList size={26} color="#fff" />
              </View>
              <Text style={[s.title, { color: isDark ? '#fff' : '#0f172a' }]}>Daily Planner</Text>
              <Text style={[s.subtitle, { color: subtitleColor }]}>
                {mode === 'signin' && 'Sign in to access your tasks'}
                {mode === 'signup' && 'Create your free account'}
                {mode === 'reset' && 'Reset your password'}
              </Text>
            </View>

            {/* Quote — sign-in only */}
            {mode === 'signin' && (
              <Animated.View style={[
                s.quoteBox,
                {
                  backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)',
                  borderColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
                  opacity: quoteOpacity,
                },
              ]}>
                <Text style={[s.quoteText, { color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)' }]}>
                  "{quote.text}"
                </Text>
                <Text style={[s.quoteAuthor, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }]}>
                  — {quote.author}
                </Text>
              </Animated.View>
            )}

            {/* Error banner */}
            {!!error && (
              <View style={[s.banner, s.bannerError]}>
                <AlertCircle size={15} color="#f87171" />
                <Text style={s.bannerErrorText}>{error}</Text>
              </View>
            )}

            {/* Resend verification button — shown when sign-in is blocked due to unverified email */}
            {!!unverifiedEmail && !success && (
              <Pressable
                onPress={handleResendVerification}
                disabled={resendLoading}
                style={[s.resendBtn, { borderColor: isDark ? 'rgba(251,191,36,0.3)' : 'rgba(217,119,6,0.3)', backgroundColor: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.07)' }]}
                accessibilityRole="button"
                accessibilityLabel="Resend verification email"
              >
                {resendLoading
                  ? <ActivityIndicator size="small" color="#f59e0b" />
                  : <Text style={s.resendBtnText}>Resend verification email →</Text>}
              </Pressable>
            )}

            {/* Success banner */}
            {!!success && (
              <View style={[s.banner, s.bannerSuccess]}>
                <CheckCircle2 size={15} color="#4ade80" />
                <Text style={s.bannerSuccessText}>{success}</Text>
              </View>
            )}

            {/* ── Sign In ── */}
            {mode === 'signin' && (
              <View style={s.form}>
                <IconInput
                  nativeID="signin-email"
                  autoComplete="email"
                  icon={Mail}
                  tokens={tokens}
                  isDark={isDark}
                  hasError={!!error}
                  value={email}
                  onChangeText={(v: string) => { setEmail(v); setError('') }}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="next"
                  accessibilityLabel="Email address"
                />
                <IconInput
                  nativeID="signin-password"
                  autoComplete="current-password"
                  icon={Lock}
                  rightIcon={showPassword ? EyeOff : Eye}
                  onRightPress={() => setShowPassword(p => !p)}
                  tokens={tokens}
                  isDark={isDark}
                  hasError={!!error}
                  value={password}
                  onChangeText={(v: string) => { setPassword(v); setError('') }}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  accessibilityLabel="Password"
                />

                <GradientButton onPress={handleSignIn} loading={loading} label="Sign In" />

                <Pressable onPress={() => switchMode('reset')} style={s.linkBtn}>
                  <Text style={s.linkText}>Forgot password?</Text>
                </Pressable>

                <Text style={[s.switchText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }]}>
                  {"Don't have an account? "}
                  <Text style={s.switchLink} onPress={() => switchMode('signup')}>Sign up free</Text>
                </Text>
              </View>
            )}

            {/* ── Sign Up ── */}
            {mode === 'signup' && (
              <View style={s.form}>
                {verificationSentTo ? (
                  /* ── Email sent confirmation ── */
                  <View style={s.verifyBox}>
                    <View style={[s.verifyIconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }]}>
                      <Mail size={28} color="#6366f1" />
                    </View>
                    <Text style={[s.verifyTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
                      Check your inbox
                    </Text>
                    <Text style={[s.verifyBody, { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }]}>
                      We sent a verification link to
                    </Text>
                    <Text style={[s.verifyEmail, { color: isDark ? '#a5b4fc' : '#6366f1' }]}>
                      {verificationSentTo}
                    </Text>
                    <Text style={[s.verifyBody, { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', marginTop: 8 }]}>
                      Click the link in the email to verify your account, then come back and sign in.
                    </Text>
                    <GradientButton onPress={() => switchMode('signin')} loading={false} label="Go to Sign In" />
                    <Pressable
                      onPress={async () => {
                        setResendLoading(true)
                        try {
                          const { signInWithEmailAndPassword: fbSignIn, sendEmailVerification: fbSend, signOut: fbOut } = await import('firebase/auth')
                          const { auth: fbAuth } = await import('@/src/lib/firebase')
                          const cred = await fbSignIn(fbAuth, verificationSentTo, password)
                          await fbSend(cred.user)
                          await fbOut(fbAuth)
                          setSuccess('Verification email resent!')
                        } catch {
                          setError('Could not resend. Please try signing in and we\'ll prompt you again.')
                        } finally {
                          setResendLoading(false)
                        }
                      }}
                      disabled={resendLoading}
                      style={s.linkBtn}
                      accessibilityRole="button"
                    >
                      {resendLoading
                        ? <ActivityIndicator size="small" color="#818cf8" />
                        : <Text style={s.linkText}>Didn't receive it? Resend email</Text>}
                    </Pressable>
                  </View>
                ) : (
                  /* ── Sign up form ── */
                  <>
                    <IconInput
                      nativeID="signup-name"
                      autoComplete="name"
                      icon={User}
                      tokens={tokens}
                      isDark={isDark}
                      value={displayName}
                      onChangeText={(v: string) => { setDisplayName(v); setError('') }}
                      placeholder="Your name"
                      autoCapitalize="words"
                      textContentType="name"
                      returnKeyType="next"
                      accessibilityLabel="Display name"
                    />
                    <IconInput
                      nativeID="signup-email"
                      autoComplete="email"
                      icon={Mail}
                      tokens={tokens}
                      isDark={isDark}
                      value={email}
                      onChangeText={(v: string) => { setEmail(v); setError('') }}
                      placeholder="Email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      returnKeyType="next"
                      accessibilityLabel="Email address"
                    />
                    <IconInput
                      nativeID="signup-password"
                      autoComplete="new-password"
                      icon={Lock}
                      rightIcon={showPassword ? EyeOff : Eye}
                      onRightPress={() => setShowPassword(p => !p)}
                      tokens={tokens}
                      isDark={isDark}
                      value={password}
                      onChangeText={(v: string) => { setPassword(v); setError('') }}
                      placeholder={`Password (min ${PASSWORD_MIN_LENGTH} chars)`}
                      secureTextEntry={!showPassword}
                      textContentType="newPassword"
                      returnKeyType="next"
                      accessibilityLabel="Password"
                    />
                    <IconInput
                      nativeID="signup-confirm"
                      autoComplete="new-password"
                      icon={Lock}
                      rightIcon={showConfirm ? EyeOff : Eye}
                      onRightPress={() => setShowConfirm(p => !p)}
                      tokens={tokens}
                      isDark={isDark}
                      value={confirmPassword}
                      onChangeText={(v: string) => { setConfirmPassword(v); setError('') }}
                      placeholder="Confirm password"
                      secureTextEntry={!showConfirm}
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                      accessibilityLabel="Confirm password"
                    />
                    <GradientButton onPress={handleSignUp} loading={loading} label="Create Account" />
                    <Text style={[s.switchText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }]}>
                      {'Already have an account? '}
                      <Text style={s.switchLink} onPress={() => switchMode('signin')}>Sign in</Text>
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* ── Reset ── */}
            {mode === 'reset' && (
              <View style={s.form}>
                <Text style={[s.resetDesc, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                  Enter your email and we'll send you a reset link.
                </Text>
                <IconInput
                  nativeID="reset-email"
                  autoComplete="email"
                  icon={Mail}
                  tokens={tokens}
                  isDark={isDark}
                  value={email}
                  onChangeText={(v: string) => { setEmail(v); setError('') }}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleReset}
                  accessibilityLabel="Email address"
                />

                <GradientButton onPress={handleReset} loading={loading} label="Send Reset Link" />

                <Pressable onPress={() => switchMode('signin')} style={s.linkBtn}>
                  <Text style={s.switchLink}>← Back to sign in</Text>
                </Pressable>
              </View>
            )}

            {/* ── Or divider + Guest ── */}
            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: dividerColor }]} />
              <Text style={[s.dividerText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: dividerColor }]} />
            </View>

            <Pressable
              onPress={handleGuest}
              disabled={guestLoading}
              style={({ pressed }) => [
                s.guestBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                  opacity: pressed || guestLoading ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue as Guest"
            >
              {guestLoading
                ? <ActivityIndicator size="small" color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                : <>
                  <User size={15} color={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'} />
                  <Text style={[s.guestBtnText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)' }]}>
                    Continue as Guest
                  </Text>
                </>}
            </Pressable>

            <Text style={[s.guestNote, { color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)' }]}>
              No account needed · Data saved locally in your browser
            </Text>

          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Gradient button ───────────────────────────────────────────────────────────

function GradientButton({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        s.gradBtn,
        Platform.select({ web: { backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)' } as any }),
        !Platform.select({ web: true }) && { backgroundColor: '#6366f1' },
        { opacity: pressed || loading ? 0.8 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={s.gradBtnText}>{label}</Text>}
    </Pressable>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bg: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 40,
  },
  card: {
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 36,
    paddingHorizontal: 32,
    paddingBottom: 28,
    position: 'relative',
  },
  cornerBtn: {
    position: 'absolute',
    top: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  cornerBtnIcon: {
    paddingHorizontal: 7,
  },
  greeting: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 8 },
      web: { boxShadow: '0 8px 24px rgba(99,102,241,0.4)' } as any,
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  quoteBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 4,
  },
  quoteAuthor: {
    fontSize: 11,
    textAlign: 'right',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 11,
    paddingHorizontal: 13,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerError: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  bannerErrorText: { fontSize: 13, color: '#f87171', flex: 1, lineHeight: 20 },
  bannerSuccess: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  bannerSuccessText: { fontSize: 13, color: '#4ade80', flex: 1, lineHeight: 20 },
  form: {
    gap: 0,
  },
  gradBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 6, backgroundColor: '#6366f1' },
      web: { boxShadow: '0 4px 16px rgba(99,102,241,0.4)', cursor: 'pointer' } as any,
    }),
  },
  gradBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 12,
  },
  linkText: {
    color: '#818cf8',
    fontSize: 13,
  },
  switchText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 20,
  },
  switchLink: {
    color: '#818cf8',
    fontWeight: '600',
    fontSize: 13,
  },
  resetDesc: {
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  guestBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  guestNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  resendBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f59e0b',
  },
  verifyBox: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  verifyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifyBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  verifyEmail: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
})
