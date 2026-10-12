/**
 * Landing screen — dual layout:
 *
 *   Web  → full marketing page (navbar, hero, features, steps, stats, CTA)
 *   Mobile → 3-slide paged onboarding carousel with dots + Skip + CTA
 *
 * Requirements: 6.10
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  CheckCircle2, Flame, BarChart2, Timer, Target, Calendar,
  ArrowRight, Sparkles, Zap, ClipboardList, Sun, Moon, SunMoon,
  ListTodo, TrendingUp,
} from 'lucide-react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { useAuth } from '@/src/hooks/useAuth'

// ── Shared data ───────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: CheckCircle2, color: '#22c55e', title: 'Task Tracking', desc: 'Organize your day with priorities, topics, and due times. Never lose track of what matters.' },
  { icon: Flame, color: '#f97316', title: 'Streak System', desc: 'Build momentum with daily streaks. Stay consistent and watch your productivity compound.' },
  { icon: Timer, color: '#6366f1', title: 'Focus Timer', desc: 'Built-in Pomodoro timer tracks actual time spent. Know exactly where your hours go.' },
  { icon: BarChart2, color: '#3b82f6', title: 'Insights & Reports', desc: 'Weekly reports, activity heatmaps, and productivity scores reveal your patterns.' },
  { icon: Target, color: '#a855f7', title: 'Daily Goals', desc: 'Set custom completion targets and track progress toward them every single day.' },
  { icon: Calendar, color: '#14b8a6', title: 'Multi-view Calendar', desc: 'Switch between Today, Week, and Calendar views. Plan ahead or focus on the now.' },
]

const STEPS = [
  { n: '01', title: 'Add your tasks', desc: 'Create tasks with topics, durations, and priorities in seconds.' },
  { n: '02', title: 'Track your day', desc: 'Use the focus timer, check off tasks, and build your streak.' },
  { n: '03', title: 'Review & improve', desc: 'See your heatmap, reports, and score. Get better every week.' },
]

const STATS = [
  { label: 'Tasks tracked', to: 50000, suffix: '+' },
  { label: 'Active streaks', to: 1200, suffix: '+' },
  { label: 'Focus hours logged', to: 8000, suffix: '+' },
  { label: 'Always free', to: 100, suffix: '%' },
]

const PILLS = ['Free forever', 'No credit card', 'Works offline', 'Your data stays yours']

// ── Slide definitions for mobile carousel ─────────────────────────────────────

const SLIDES = [
  {
    key: 'hero',
    icon: Zap,
    iconColor: '#6366f1',
    badge: 'FREE · NO CREDIT CARD REQUIRED',
    title: 'Your day,',
    titleAccent: 'perfectly planned',
    sub: 'Track tasks, build streaks, and stay focused — all in one beautifully simple planner that works the way you think.',
  },
  {
    key: 'features',
    icon: ListTodo,
    iconColor: '#3b82f6',
    badge: '6 POWERFUL FEATURES',
    title: 'Everything you need to',
    titleAccent: 'stay on track',
    sub: 'Built for people who want to get things done without the complexity.',
  },
  {
    key: 'cta',
    icon: TrendingUp,
    iconColor: '#22c55e',
    badge: 'READY TO START?',
    title: 'Take control of',
    titleAccent: 'your day',
    sub: "Join thousands of people who plan smarter with Daily Planner. It's free, always.",
  },
]

// ── Animated counter ──────────────────────────────────────────────────────────

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let cur = 0
    const step = Math.ceil(to / 40)
    const id = setInterval(() => {
      cur += step
      if (cur >= to) { setVal(to); clearInterval(id) }
      else setVal(cur)
    }, 30)
    return () => clearInterval(id)
  }, [to])
  return <>{val.toLocaleString()}{suffix}</>
}

// ── Hoverable card (web only) ─────────────────────────────────────────────────

function HoverCard({ style, hoverBorderColor, children }: { style: any; hoverBorderColor?: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  const translateY = useRef(new Animated.Value(0)).current

  const onEnter = () => {
    setHovered(true)
    Animated.spring(translateY, { toValue: -4, useNativeDriver: true, speed: 30, bounciness: 0 }).start()
  }
  const onLeave = () => {
    setHovered(false)
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 0 }).start()
  }

  return (
    <Animated.View
      style={[style, { transform: [{ translateY }] }, hovered && hoverBorderColor ? { borderColor: `${hoverBorderColor}40` } : {}]}
      // @ts-ignore — web-only
      onMouseEnter={Platform.OS === 'web' ? onEnter : undefined}
      onMouseLeave={Platform.OS === 'web' ? onLeave : undefined}
    >
      {children}
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE ONBOARDING CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────

function MobileOnboarding({
  onGetStarted,
  onGuestMode,
  guestLoading,
  guestError,
  tokens,
  themeMode,
  toggleTheme,
}: {
  onGetStarted: () => void
  onGuestMode: () => void
  guestLoading: boolean
  guestError: string | null
  tokens: ReturnType<typeof useTheme>['tokens']
  themeMode: string
  toggleTheme: () => void
}) {
  const { width, height } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const [slide, setSlide] = useState(0)
  const dotAnim = useRef(SLIDES.map(() => new Animated.Value(0))).current
  const TOTAL = SLIDES.length

  // Animate dots when slide changes
  useEffect(() => {
    dotAnim.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === slide ? 1 : 0,
        useNativeDriver: false,
        speed: 20,
        bounciness: 4,
      }).start()
    })
  }, [slide])

  const goTo = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true })
    setSlide(index)
  }, [width])

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const idx = Math.round(x / width)
    if (idx !== slide) setSlide(idx)
  }, [slide, width])

  const ms = mobileStyles(tokens, width, height)

  return (
    <View style={ms.root}>
      {/* ── Top bar ── */}
      <View style={ms.topBar}>
        {/* Theme toggle */}
        <Pressable onPress={toggleTheme} style={ms.themeBtn} accessibilityLabel="Toggle theme">
          {themeMode === 'dark'
            ? <Moon size={16} color={tokens.textSecondary} />
            : themeMode === 'light'
              ? <Sun size={16} color={tokens.textSecondary} />
              : <SunMoon size={16} color={tokens.textSecondary} />}
        </Pressable>

        {/* Skip — hidden on last slide */}
        {slide < TOTAL - 1 ? (
          <Pressable onPress={() => goTo(TOTAL - 1)} style={ms.skipBtn} accessibilityLabel="Skip to get started">
            <Text style={ms.skipText}>Skip</Text>
          </Pressable>
        ) : <View style={ms.skipBtn} />}
      </View>

      {/* ── Slides ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: width * TOTAL }}
      >
        {/* Slide 0 — Hero */}
        <View style={[ms.slide, { width }]}>
          <View style={[ms.slideIconBox, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <Zap size={40} color="#6366f1" />
          </View>
          <View style={ms.badgeRow}>
            <Sparkles size={12} color="#818cf8" />
            <Text style={ms.badgeText}>FREE · NO CREDIT CARD REQUIRED</Text>
          </View>
          <Text style={ms.slideTitle}>Your day,{'\n'}<Text style={ms.slideTitleAccent}>perfectly planned</Text></Text>
          <Text style={ms.slideSub}>Track tasks, build streaks, and stay focused — all in one beautifully simple planner that works the way you think.</Text>

          {/* Trust pills — 2x2 on mobile */}
          <View style={ms.pillGrid}>
            {PILLS.map(p => (
              <View key={p} style={ms.pill}>
                <CheckCircle2 size={11} color="#22c55e" />
                <Text style={ms.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Slide 1 — Features */}
        <View style={[ms.slide, { width }]}>
          <View style={[ms.slideIconBox, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <ListTodo size={40} color="#3b82f6" />
          </View>
          <View style={ms.badgeRow}>
            <Sparkles size={12} color="#818cf8" />
            <Text style={ms.badgeText}>6 POWERFUL FEATURES</Text>
          </View>
          <Text style={ms.slideTitle}>Everything you need to{'\n'}<Text style={ms.slideTitleAccent}>stay on track</Text></Text>
          <Text style={ms.slideSub}>Built for people who want to get things done without the complexity.</Text>

          {/* 2-column mini feature grid */}
          <View style={ms.featureMiniGrid}>
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <View key={f.title} style={[ms.featureMiniCard, { borderColor: tokens.borderPrimary }]}>
                  <View style={[ms.featureMiniIcon, { backgroundColor: `${f.color}18` }]}>
                    <Icon size={18} color={f.color} />
                  </View>
                  <Text style={ms.featureMiniTitle}>{f.title}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Slide 2 — CTA */}
        <View style={[ms.slide, { width }]}>
          <View style={[ms.slideIconBox, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
            <TrendingUp size={40} color="#22c55e" />
          </View>
          <View style={ms.badgeRow}>
            <Sparkles size={12} color="#818cf8" />
            <Text style={ms.badgeText}>READY TO START?</Text>
          </View>
          <Text style={ms.slideTitle}>Take control of{'\n'}<Text style={ms.slideTitleAccent}>your day</Text></Text>
          <Text style={ms.slideSub}>{"Join thousands of people who plan smarter with Daily Planner. It's free, always."}</Text>

          {/* Stats mini grid */}
          <View style={ms.statsMini}>
            {STATS.map(stat => (
              <View key={stat.label} style={ms.statMini}>
                <Text style={ms.statMiniValue}><Counter to={stat.to} suffix={stat.suffix} /></Text>
                <Text style={ms.statMiniLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom area — dots + CTA ── */}
      <View style={ms.bottom}>
        {/* Dots */}
        <View style={ms.dots}>
          {SLIDES.map((_, i) => {
            const w = dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [8, 24] })
            const opacity = dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })
            return (
              <Pressable key={i} onPress={() => goTo(i)} hitSlop={10} accessibilityLabel={`Go to slide ${i + 1}`}>
                <Animated.View style={[ms.dot, { width: w, opacity, backgroundColor: '#6366f1' }]} />
              </Pressable>
            )
          })}
        </View>

        {/* CTA buttons */}
        {slide < TOTAL - 1 ? (
          // Next button on slides 0 & 1
          <Pressable
            onPress={() => goTo(slide + 1)}
            style={({ pressed }) => [ms.primaryBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Next"
          >
            <Text style={ms.primaryBtnText}>Continue</Text>
            <ArrowRight size={18} color="#fff" />
          </Pressable>
        ) : (
          // Final slide — show real CTAs
          <>
            <Pressable
              onPress={onGetStarted}
              style={({ pressed }) => [ms.primaryBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Start planning for free"
            >
              <Text style={ms.primaryBtnText}>Start planning for free</Text>
              <ArrowRight size={18} color="#fff" />
            </Pressable>
            <Pressable
              onPress={onGuestMode}
              disabled={guestLoading}
              style={({ pressed }) => [ms.ghostBtn, pressed && { opacity: 0.8 }, guestLoading && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Try as Guest"
            >
              {guestLoading
                ? <ActivityIndicator size="small" color={tokens.textSecondary} />
                : <Text style={ms.ghostBtnText}>Try as Guest</Text>}
            </Pressable>
            {guestError && <Text style={ms.errorText}>{guestError}</Text>}
          </>
        )}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB LANDING PAGE (unchanged from before)
// ─────────────────────────────────────────────────────────────────────────────

function WebLanding({
  onGetStarted,
  onGuestMode,
  onSignIn,
  onFeedback,
  guestLoading,
  guestError,
  tokens,
  themeMode,
  toggleTheme,
  width,
}: {
  onGetStarted: () => void
  onGuestMode: () => void
  onSignIn: () => void
  onFeedback: () => void
  guestLoading: boolean
  guestError: string | null
  tokens: ReturnType<typeof useTheme>['tokens']
  themeMode: string
  toggleTheme: () => void
  width: number
}) {
  const isMobile = width < 640
  const s = makeWebStyles(tokens, width, themeMode === 'dark')

  return (
    <View style={s.root}>
      {/* ── Fixed Navbar ── */}
      <View style={s.navbar}>
        <View style={s.navLogo}>
          <View style={s.navLogoBox}><ClipboardList size={17} color="#fff" /></View>
          <Text style={s.navLogoText}>Daily Planner</Text>
        </View>
        <View style={s.navRight}>
          <Pressable onPress={toggleTheme} style={({ pressed }) => [s.navThemeBtn, pressed && { opacity: 0.7 }]} accessibilityLabel="Toggle theme">
            {themeMode === 'dark' ? <Moon size={15} color={tokens.textSecondary} />
              : themeMode === 'light' ? <Sun size={15} color={tokens.textSecondary} />
                : <SunMoon size={15} color={tokens.textSecondary} />}
          </Pressable>
          {!isMobile && (
            <Pressable onPress={onFeedback} style={({ pressed }) => [s.navGhostBtn, pressed && { opacity: 0.7 }]}>
              <Text style={s.navGhostText}>Feedback</Text>
            </Pressable>
          )}
          {!isMobile && (
            <Pressable onPress={onSignIn} style={({ pressed }) => [s.navGhostBtn, pressed && { opacity: 0.7 }]}>
              <Text style={s.navGhostText}>Sign in</Text>
            </Pressable>
          )}
          <Pressable onPress={onGetStarted} style={({ pressed }) => [s.navCta, pressed && { opacity: 0.85 }]}>
            <Text style={s.navCtaText}>{isMobile ? 'Get started' : 'Start planning free'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.badge}>
            <Sparkles size={13} color="#818cf8" />
            <Text style={s.badgeText}>FREE · NO CREDIT CARD REQUIRED</Text>
          </View>
          <Text style={s.heroHeadline}>
            {'Your day, '}
            {/* @ts-ignore */}
            <Text style={s.heroAccent}>{'perfectly\nplanned'}</Text>
          </Text>
          <Text style={s.heroSub}>
            Track tasks, build streaks, and stay focused — all in one beautifully simple planner that works the way you think.
          </Text>
          <View style={s.heroCtaRow}>
            <Pressable onPress={onGetStarted} style={({ pressed }) => [s.primaryBtn, pressed && s.btnPressed]}>
              <Text style={s.primaryBtnText}>Start planning for free</Text>
              <ArrowRight size={18} color="#fff" />
            </Pressable>
            <Pressable onPress={onGuestMode} disabled={guestLoading} style={({ pressed }) => [s.ghostBtn, pressed && s.btnPressed, guestLoading && s.btnDisabled]}>
              {guestLoading
                ? <ActivityIndicator size="small" color={tokens.textSecondary} />
                : <Text style={s.ghostBtnText}>Try as Guest</Text>}
            </Pressable>
          </View>
          {guestError && <Text style={s.errorText}>{guestError}</Text>}
          <View style={s.pillRow}>
            {PILLS.map(p => (
              <View key={p} style={s.pill}>
                <CheckCircle2 size={12} color="#22c55e" />
                <Text style={s.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {'Everything you need to '}
              {/* @ts-ignore */}
              <Text style={s.gradientText}>stay on track</Text>
            </Text>
            <Text style={s.sectionSub}>Built for people who want to get things done without the complexity.</Text>
          </View>
          <View style={s.featuresGrid}>
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <HoverCard key={f.title} hoverBorderColor={f.color} style={[s.featureCard, { borderColor: tokens.borderPrimary }]}>
                  <View style={[s.featureIconBox, { backgroundColor: `${f.color}18`, borderColor: `${f.color}30` }]}>
                    <Icon size={22} color={f.color} />
                  </View>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </HoverCard>
              )
            })}
          </View>
        </View>

        {/* How it works */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {'Up and running in '}
              {/* @ts-ignore */}
              <Text style={s.gradientText}>3 steps</Text>
            </Text>
          </View>
          <View style={s.stepsCol}>
            {STEPS.map((step, idx) => (
              <View key={step.n} style={[s.stepCard, { borderColor: tokens.borderPrimary }]}>
                <Text style={s.stepNum}>{step.n}</Text>
                <View style={s.stepBody}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.desc}</Text>
                </View>
                {idx < STEPS.length - 1 && <View style={s.stepLine} />}
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsSection}>
          <View style={s.statsGrid}>
            {STATS.map(stat => (
              <View key={stat.label} style={[s.statCard, { borderColor: tokens.borderPrimary }]}>
                {/* @ts-ignore */}
                <Text style={s.statValue}><Counter to={stat.to} suffix={stat.suffix} /></Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Final CTA */}
        <View style={s.finalSection}>
          <View style={[s.finalCard, { borderColor: tokens.borderPrimary, backgroundColor: tokens.bgSecondary }]}>
            <View style={s.finalIconBox}><Zap size={26} color="#fff" /></View>
            <Text style={s.finalTitle}>Ready to take control of your day?</Text>
            <Text style={s.finalSub}>Join thousands of people who plan smarter with Daily Planner. It's free, always.</Text>
            <Pressable onPress={onGetStarted} style={({ pressed }) => [s.primaryBtn, { alignSelf: 'center', marginBottom: 12 }, pressed && s.btnPressed]}>
              <Text style={s.primaryBtnText}>Start planning for free</Text>
              <ArrowRight size={18} color="#fff" />
            </Pressable>
            <View style={s.finalGuestRow}>
              <Text style={s.finalGuestLabel}>No account? </Text>
              <Pressable onPress={onGuestMode} disabled={guestLoading}>
                <Text style={s.finalGuestLink}>Try as guest →</Text>
              </Pressable>
            </View>
          </View>
          <Text style={s.footer}>© {new Date().getFullYear()} Daily Planner · Made with ♥</Text>
        </View>

      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — switches between mobile carousel and web landing
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingScreen() {
  const { tokens, themeMode, toggleTheme } = useTheme()
  const { enterGuestMode } = useAuth()
  const router = useRouter()
  const { width } = useWindowDimensions()

  const [guestLoading, setGuestLoading] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  async function handleGuestMode() {
    setGuestLoading(true)
    setGuestError(null)
    const result = await enterGuestMode()
    if (!result.success) {
      setGuestError(result.error ?? 'Could not start guest session.')
      setGuestLoading(false)
    }
  }

  const handleGetStarted = () => router.push({ pathname: '/auth', params: { tab: 'signup' } })
  const handleSignIn = () => router.push({ pathname: '/auth', params: { tab: 'signin' } })
  const handleFeedback = () => router.push('/(modals)/feedback' as never)

  const isWeb = Platform.OS === 'web'

  if (!isWeb) {
    return (
      <MobileOnboarding
        onGetStarted={handleGetStarted}
        onGuestMode={handleGuestMode}
        guestLoading={guestLoading}
        guestError={guestError}
        tokens={tokens}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      />
    )
  }

  return (
    <WebLanding
      onGetStarted={handleGetStarted}
      onGuestMode={handleGuestMode}
      onSignIn={handleSignIn}
      onFeedback={handleFeedback}
      guestLoading={guestLoading}
      guestError={guestError}
      tokens={tokens}
      themeMode={themeMode}
      toggleTheme={toggleTheme}
      width={width}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE STYLES
// ─────────────────────────────────────────────────────────────────────────────

function mobileStyles(tokens: ReturnType<typeof useTheme>['tokens'], width: number, height: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.bgPrimary },

    // Top bar
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    themeBtn: {
      padding: 8, borderRadius: 10, borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgSecondary,
    },
    skipBtn: { paddingHorizontal: 12, paddingVertical: 8 },
    skipText: { fontSize: 14, fontWeight: '600', color: tokens.accentPrimary },

    // Slide
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: 24,
    },
    slideIconBox: {
      width: 88, height: 88, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 28,
    },
    badgeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(99,102,241,0.08)',
      borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
      marginBottom: 24,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#818cf8', letterSpacing: 0.6 },
    slideTitle: {
      fontSize: 32, fontWeight: '800',
      color: tokens.textPrimary,
      textAlign: 'center',
      lineHeight: 40, marginBottom: 16,
    },
    slideTitleAccent: {
      fontSize: 32, fontWeight: '800',
      color: tokens.accentPrimary,
      lineHeight: 40,
    },
    slideSub: {
      fontSize: 15, color: tokens.textSecondary,
      textAlign: 'center', lineHeight: 24,
      marginBottom: 28, maxWidth: 320,
    },

    // Trust pills 2x2
    pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 320 },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 20, borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgSecondary,
    },
    pillText: { fontSize: 11, color: tokens.textMuted },

    // Mini feature grid
    featureMiniGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      gap: 10, justifyContent: 'center',
      maxWidth: 340,
    },
    featureMiniCard: {
      width: (width - 64 - 10) / 2,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      padding: 12, borderRadius: 14, borderWidth: 1,
      backgroundColor: tokens.bgSecondary,
    },
    featureMiniIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    featureMiniTitle: { fontSize: 12, fontWeight: '600', color: tokens.textPrimary, flex: 1 },

    // Stats mini
    statsMini: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 320 },
    statMini: {
      width: (width - 64 - 10) / 2,
      alignItems: 'center', padding: 16,
      borderRadius: 16, borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgSecondary,
    },
    statMiniValue: { fontSize: 22, fontWeight: '800', color: tokens.accentPrimary, marginBottom: 4 },
    statMiniLabel: { fontSize: 11, color: tokens.textSecondary, textAlign: 'center' },

    // Bottom area
    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 16,
      alignItems: 'center',
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.borderPrimary,
    },
    dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
    dot: { height: 8, borderRadius: 4 },

    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#6366f1',
      paddingHorizontal: 28, paddingVertical: 15,
      borderRadius: 14, width: '100%' as any,
      justifyContent: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    ghostBtn: {
      paddingHorizontal: 24, paddingVertical: 14,
      borderRadius: 14, borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: tokens.bgSecondary,
      width: '100%' as any,
      alignItems: 'center',
    },
    ghostBtnText: { fontSize: 15, fontWeight: '500', color: tokens.textSecondary },
    errorText: { fontSize: 13, color: tokens.accentRed, textAlign: 'center' },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB STYLES
// ─────────────────────────────────────────────────────────────────────────────

function makeWebStyles(tokens: ReturnType<typeof useTheme>['tokens'], width: number, isDark: boolean) {
  const isMobile = width < 640
  const cardBg = tokens.bgSecondary

  const gradientTextStyle: any = {
    backgroundImage: 'linear-gradient(135deg, #6366f1, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tokens.bgPrimary,
      ...({ backgroundImage: `linear-gradient(135deg, ${tokens.bgPrimary} 0%, ${tokens.bgSecondary} 50%, ${tokens.bgPrimary} 100%)` } as any),
    },
    navbar: {
      position: 'absolute' as any,
      top: 12, left: 12, right: 12, zIndex: 100,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 52, paddingHorizontal: 16,
      borderRadius: 20,
      // Legacy liquid-glass: fully transparent bg + strong backdrop blur
      backgroundColor: isDark ? 'rgba(15,23,42,0.15)' : 'rgba(180,195,255,0.35)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.18)',
      ...({
        backdropFilter: 'blur(80px) saturate(240%) brightness(1.15)',
        WebkitBackdropFilter: 'blur(80px) saturate(240%) brightness(1.15)',
        boxShadow: isDark
          ? '0 2px 16px rgba(0,0,0,0.3)'
          : '0 2px 16px rgba(99,102,241,0.08)',
      } as any),
    },
    navLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    navLogoBox: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: '#6366f1',
      alignItems: 'center', justifyContent: 'center',
      ...({ boxShadow: '0 4px 12px rgba(99,102,241,0.4)' } as any),
    },
    navLogoText: { fontSize: 15, fontWeight: '700', color: tokens.textPrimary },
    navRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    navThemeBtn: {
      padding: 7, borderRadius: 8, borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.18)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center', justifyContent: 'center',
    },
    navGhostBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    navGhostText: { fontSize: 13, color: tokens.textSecondary },
    navCta: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
      backgroundColor: '#6366f1',
      ...({ boxShadow: '0 4px 14px rgba(99,102,241,0.4)' } as any),
    },
    navCtaText: { fontSize: 13, fontWeight: '600', color: '#fff' },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    hero: {
      minHeight: 680, alignItems: 'center', justifyContent: 'center',
      paddingTop: 120, paddingBottom: 60,
      paddingHorizontal: isMobile ? 20 : 40,
    },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(99,102,241,0.08)',
      borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
      marginBottom: 28,
    },
    badgeText: { fontSize: 12, fontWeight: '600', color: '#818cf8', letterSpacing: 0.5 },
    heroHeadline: {
      fontSize: isMobile ? 38 : 64, fontWeight: '800',
      color: tokens.textPrimary, textAlign: 'center',
      lineHeight: isMobile ? 46 : 72, marginBottom: 24, maxWidth: 760,
    },
    heroAccent: {
      fontSize: isMobile ? 38 : 64, fontWeight: '800',
      lineHeight: isMobile ? 46 : 72,
      ...gradientTextStyle,
    } as any,
    heroSub: {
      fontSize: isMobile ? 16 : 18, color: tokens.textSecondary,
      textAlign: 'center', lineHeight: 28,
      maxWidth: 480, marginBottom: 40,
    },
    heroCtaRow: {
      flexDirection: isMobile ? 'column' : 'row', gap: 12,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 40, width: '100%' as any, maxWidth: 480,
    },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#6366f1',
      paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
      ...({ boxShadow: '0 8px 28px rgba(99,102,241,0.45)' } as any),
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    ghostBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 24, paddingVertical: 14,
      borderRadius: 14, borderWidth: 1,
      borderColor: tokens.borderPrimary,
      backgroundColor: cardBg,
      minWidth: 120, justifyContent: 'center',
    },
    ghostBtnText: { fontSize: 16, fontWeight: '500', color: tokens.textSecondary },
    btnPressed: { opacity: 0.8 },
    btnDisabled: { opacity: 0.5 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: 20, borderWidth: 1,
      borderColor: tokens.borderPrimary, backgroundColor: cardBg,
    },
    pillText: { fontSize: 12, color: tokens.textMuted },
    errorText: { fontSize: 14, color: tokens.accentRed, textAlign: 'center', marginTop: 8 },

    section: {
      paddingVertical: 72, paddingHorizontal: isMobile ? 16 : 24,
      maxWidth: 1100, width: '100%' as any, alignSelf: 'center' as any,
    },
    sectionHeader: { alignItems: 'center', marginBottom: 48 },
    sectionTitle: {
      fontSize: isMobile ? 26 : 40, fontWeight: '800',
      color: tokens.textPrimary, textAlign: 'center',
      marginBottom: 12, lineHeight: isMobile ? 34 : 50,
    },
    gradientText: {
      fontSize: isMobile ? 26 : 40, fontWeight: '800',
      lineHeight: isMobile ? 34 : 50,
      ...gradientTextStyle,
    } as any,
    sectionSub: { fontSize: 15, color: tokens.textSecondary, textAlign: 'center', maxWidth: 480, lineHeight: 24 },

    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
    featureCard: {
      width: isMobile ? ('100%' as any) : Math.min((width - (isMobile ? 32 : 64) - 32) / (width > 900 ? 3 : 2), 340) as any,
      padding: 24, borderRadius: 20, borderWidth: 1,
      backgroundColor: cardBg,
      ...({ backdropFilter: 'blur(12px)' } as any),
    },
    featureIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 14 },
    featureTitle: { fontSize: 17, fontWeight: '700', color: tokens.textPrimary, marginBottom: 8 },
    featureDesc: { fontSize: 14, color: tokens.textSecondary, lineHeight: 22 },

    stepsCol: { gap: 4, maxWidth: 720, width: '100%' as any, alignSelf: 'center' as any },
    stepCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 20,
      padding: 24, paddingHorizontal: 28,
      borderRadius: 20, borderWidth: 1,
      backgroundColor: cardBg, position: 'relative' as any,
    },
    stepLine: { position: 'absolute' as any, left: 46, top: 0, bottom: -4, width: 2, backgroundColor: 'rgba(99,102,241,0.15)' },
    stepNum: { fontSize: 13, fontWeight: '800', color: '#6366f1', minWidth: 28, paddingTop: 2, opacity: 0.8 },
    stepBody: { flex: 1 },
    stepTitle: { fontSize: 17, fontWeight: '700', color: tokens.textPrimary, marginBottom: 5 },
    stepDesc: { fontSize: 14, color: tokens.textSecondary, lineHeight: 22 },

    statsSection: { paddingVertical: 48, paddingHorizontal: isMobile ? 16 : 24, maxWidth: 900, width: '100%' as any, alignSelf: 'center' as any },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
    statCard: { flex: 1, minWidth: isMobile ? 140 : 170, alignItems: 'center', padding: 24, borderRadius: 20, borderWidth: 1, backgroundColor: cardBg },
    statValue: { fontSize: 34, fontWeight: '800', marginBottom: 6, ...gradientTextStyle } as any,
    statLabel: { fontSize: 13, color: tokens.textSecondary },

    finalSection: { paddingVertical: 72, paddingHorizontal: 24, alignItems: 'center' },
    finalCard: {
      width: '100%' as any, maxWidth: 600,
      padding: isMobile ? 32 : 48,
      borderRadius: 28, borderWidth: 1, alignItems: 'center',
      ...({ backdropFilter: 'blur(16px)', boxShadow: '0 16px 48px rgba(99,102,241,0.12)' } as any),
    },
    finalIconBox: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: '#6366f1',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
      ...({ boxShadow: '0 8px 24px rgba(99,102,241,0.4)' } as any),
    },
    finalTitle: { fontSize: isMobile ? 22 : 30, fontWeight: '800', color: tokens.textPrimary, textAlign: 'center', marginBottom: 12 },
    finalSub: { fontSize: 15, color: tokens.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 28, maxWidth: 420 },
    finalGuestRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    finalGuestLabel: { fontSize: 12, color: tokens.textMuted },
    finalGuestLink: { fontSize: 12, fontWeight: '600', color: '#818cf8' },
    footer: { marginTop: 36, fontSize: 12, color: tokens.textMuted, textAlign: 'center' },
  })
}
