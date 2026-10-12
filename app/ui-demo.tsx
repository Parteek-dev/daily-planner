/**
 * UI Demo Screen — showcases all design system primitives.
 *
 * Use this screen to validate:
 * - Gradient surfaces (hero, accent, surface, glass)
 * - Glass effect (blur on native, backdrop-filter on web)
 * - Card elevations (sm, md, lg, glow)
 * - Typography scale (display, title, heading, body, caption, label)
 * - Motion primitives (FadeInView, PressableScale, AnimatedGlow)
 * - Theme switching (light/dark/auto)
 * - Accent color customization
 *
 * Navigate to: /ui-demo
 */

import React, { useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, Sun, Moon, Smartphone, Flame, CheckCircle2, Clock, Sparkles } from 'lucide-react-native'

import { useTheme, ACCENT_COLORS } from '@/src/hooks/useTheme'
import { applyElevation, type Tokens } from '@/src/theme/tokens'
import GradientSurface from '@/src/components/GradientSurface'
import GlassSurface from '@/src/components/GlassSurface'
import Card from '@/src/components/Card'
import AppText from '@/src/components/AppText'
import { FadeInView, PressableScale, AnimatedGlow } from '@/src/components/motion'

// ─── Theme Toggle Button ──────────────────────────────────────────────────────

function ThemeToggle() {
  const { themeMode, toggleTheme, tokens, theme } = useTheme()
  
  const Icon = themeMode === 'dark' ? Moon : themeMode === 'light' ? Sun : Smartphone
  const label = themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Auto'
  
  return (
    <PressableScale onPress={toggleTheme}>
      <View style={[styles.themeToggle, { backgroundColor: tokens.bgTertiary }]}>
        <Icon size={16} color={tokens.accentPrimary} />
        <AppText role="label" color={tokens.textSecondary}>{label}</AppText>
      </View>
    </PressableScale>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, delay = 0 }: { title: string; delay?: number }) {
  const { tokens } = useTheme()
  
  return (
    <FadeInView delay={delay} style={styles.sectionHeader}>
      <View style={[styles.sectionDivider, { backgroundColor: tokens.borderPrimary }]} />
      <AppText role="label" style={styles.sectionTitle}>{title}</AppText>
      <View style={[styles.sectionDivider, { backgroundColor: tokens.borderPrimary }]} />
    </FadeInView>
  )
}

// ─── Hero Gradient Card ───────────────────────────────────────────────────────

function HeroCard() {
  const { tokens } = useTheme()
  const [streakGlowing, setStreakGlowing] = useState(true)
  
  return (
    <FadeInView delay={100}>
      <Card variant="gradient" gradientVariant="hero" elevation="lg" style={styles.heroCard}>
        {/* Stats Row */}
        <View style={styles.heroStatsRow}>
          {/* Today Progress */}
          <View style={styles.heroStat}>
            <AppText role="label" color={tokens.textMuted}>TODAY</AppText>
            <AppText role="display" color={tokens.accentPrimary}>87%</AppText>
            <View style={styles.heroStatMeta}>
              <CheckCircle2 size={12} color={tokens.accentGreen} />
              <AppText role="caption" color={tokens.textSecondary}>13 of 15 tasks</AppText>
            </View>
          </View>
          
          {/* Streak with Glow */}
          <Pressable onPress={() => setStreakGlowing(!streakGlowing)}>
            <AnimatedGlow active={streakGlowing} color={tokens.glow.warning} rounded="lg">
              <View style={[styles.heroStat, styles.streakStat, { backgroundColor: tokens.bgTertiary + '40' }]}>
                <AppText role="label" color={tokens.textMuted}>STREAK</AppText>
                <View style={styles.streakRow}>
                  <Flame size={24} color={tokens.accentOrange} />
                  <AppText role="display" color={tokens.accentOrange}>12</AppText>
                </View>
                <AppText role="caption" color={tokens.textSecondary}>Best: 18 days</AppText>
              </View>
            </AnimatedGlow>
          </Pressable>
          
          {/* Time Invested */}
          <View style={styles.heroStat}>
            <AppText role="label" color={tokens.textMuted}>TIME</AppText>
            <View style={styles.timeRow}>
              <AppText role="display" color={tokens.textPrimary}>4</AppText>
              <AppText role="heading" color={tokens.textMuted}>h</AppText>
              <AppText role="display" color={tokens.textPrimary}>32</AppText>
              <AppText role="heading" color={tokens.textMuted}>m</AppText>
            </View>
            <AppText role="caption" color={tokens.textSecondary}>Today</AppText>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <AppText role="caption" color={tokens.textSecondary}>Daily goal progress</AppText>
            <AppText role="caption" color={tokens.accentGreen}>Almost there!</AppText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: tokens.borderPrimary }]}>
            <GradientSurface variant="accent" rounded="full" style={[styles.progressFill, { width: '87%' }]} />
          </View>
        </View>
      </Card>
    </FadeInView>
  )
}

// ─── Glass Card Demo ──────────────────────────────────────────────────────────

function GlassCardDemo() {
  const { tokens, theme } = useTheme()
  
  return (
    <FadeInView delay={200}>
      {/* Background with content to show through glass */}
      <GradientSurface variant="accent" rounded="xl" style={styles.glassBackground}>
        <View style={styles.glassBackgroundContent}>
          <Sparkles size={48} color={tokens.textInverse} style={{ opacity: 0.3 }} />
        </View>
        
        {/* Glass overlay */}
        <GlassSurface rounded="lg" style={styles.glassOverlay}>
          <View style={styles.glassContent}>
            <Sparkles size={20} color={tokens.accentPrimary} />
            <View style={styles.glassTextContent}>
              <AppText role="heading">Glass Surface</AppText>
              <AppText role="caption" color={tokens.textSecondary}>
                Frosted glass effect with blur on native, backdrop-filter on web
              </AppText>
            </View>
          </View>
        </GlassSurface>
      </GradientSurface>
    </FadeInView>
  )
}

// ─── Typography Scale Demo ────────────────────────────────────────────────────

function TypographyDemo() {
  const { tokens } = useTheme()
  
  return (
    <FadeInView delay={300}>
      <Card elevation="sm" style={styles.typographyCard}>
        <AppText role="display">Display 32px</AppText>
        <AppText role="title">Title 24px</AppText>
        <AppText role="heading">Heading 18px</AppText>
        <AppText role="body">Body 16px — default text style for paragraphs and content.</AppText>
        <AppText role="caption">Caption 14px — secondary information</AppText>
        <AppText role="label">LABEL 12PX — BADGES & SMALL LABELS</AppText>
      </Card>
    </FadeInView>
  )
}

// ─── Elevation Cards Demo ─────────────────────────────────────────────────────

function ElevationDemo() {
  const { tokens } = useTheme()
  const [glowActive, setGlowActive] = useState(true)
  
  return (
    <FadeInView delay={400}>
      <View style={styles.elevationGrid}>
        <Card elevation="none" style={styles.elevationCard}>
          <AppText role="label" color={tokens.textMuted}>NONE</AppText>
          <AppText role="caption">No shadow</AppText>
        </Card>
        
        <Card elevation="sm" style={styles.elevationCard}>
          <AppText role="label" color={tokens.textMuted}>SM</AppText>
          <AppText role="caption">Subtle lift</AppText>
        </Card>
        
        <Card elevation="md" style={styles.elevationCard}>
          <AppText role="label" color={tokens.textMuted}>MD</AppText>
          <AppText role="caption">Card default</AppText>
        </Card>
        
        <Card elevation="lg" style={styles.elevationCard}>
          <AppText role="label" color={tokens.textMuted}>LG</AppText>
          <AppText role="caption">Modal/popup</AppText>
        </Card>
      </View>
      
      {/* Glow elevation */}
      <Pressable onPress={() => setGlowActive(!glowActive)} style={styles.glowCardContainer}>
        <AnimatedGlow active={glowActive} rounded="lg">
          <Card elevation="glow" style={styles.glowCard}>
            <View style={styles.glowCardContent}>
              <Sparkles size={20} color={tokens.accentPrimary} />
              <View>
                <AppText role="heading" color={tokens.accentPrimary}>Glow Elevation</AppText>
                <AppText role="caption" color={tokens.textSecondary}>Tap to toggle pulse animation</AppText>
              </View>
            </View>
          </Card>
        </AnimatedGlow>
      </Pressable>
    </FadeInView>
  )
}

// ─── Interactive Demo ─────────────────────────────────────────────────────────

function InteractiveDemo() {
  const { tokens } = useTheme()
  const [pressCount, setPressCount] = useState(0)
  
  return (
    <FadeInView delay={500}>
      <View style={styles.interactiveRow}>
        <PressableScale
          onPress={() => setPressCount(c => c + 1)}
          style={[styles.interactiveButton, { backgroundColor: tokens.accentPrimary }]}
        >
          <AppText role="body" color={tokens.textInverse}>Press Me ({pressCount})</AppText>
        </PressableScale>
        
        <PressableScale
          scale={0.95}
          onPress={() => setPressCount(0)}
          style={[styles.interactiveButtonOutline, { borderColor: tokens.accentPrimary }]}
        >
          <AppText role="body" color={tokens.accentPrimary}>Reset</AppText>
        </PressableScale>
      </View>
      
      <AppText role="caption" color={tokens.textMuted} style={styles.interactiveHint}>
        Buttons scale down on press with spring animation
      </AppText>
    </FadeInView>
  )
}

// ─── Accent Color Picker ──────────────────────────────────────────────────────

function AccentPicker() {
  const { accentColor, setAccentColor, tokens } = useTheme()
  
  return (
    <FadeInView delay={600}>
      <Card elevation="sm">
        <AppText role="heading" style={styles.accentTitle}>Accent Color</AppText>
        <AppText role="caption" color={tokens.textSecondary} style={styles.accentSubtitle}>
          Changes glow, gradients, and primary accent throughout the app
        </AppText>
        
        <View style={styles.accentGrid}>
          {ACCENT_COLORS.map((color) => (
            <PressableScale
              key={color.value}
              onPress={() => setAccentColor(color.value)}
              style={styles.accentButtonContainer}
            >
              <View
                style={[
                  styles.accentButton,
                  { backgroundColor: color.value },
                  accentColor === color.value && styles.accentButtonActive,
                ]}
              >
                {accentColor === color.value && (
                  <CheckCircle2 size={16} color="#fff" />
                )}
              </View>
              <AppText role="label" color={tokens.textMuted}>{color.name}</AppText>
            </PressableScale>
          ))}
        </View>
      </Card>
    </FadeInView>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UIDemoScreen() {
  const { tokens, theme } = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const isWide = width >= 768
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: tokens.borderPrimary }]}>
        <PressableScale onPress={() => router.back()}>
          <View style={[styles.backButton, { backgroundColor: tokens.bgTertiary }]}>
            <ArrowLeft size={20} color={tokens.textPrimary} />
          </View>
        </PressableScale>
        
        <AppText role="title">UI Demo</AppText>
        
        <ThemeToggle />
      </View>
      
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Gradient Card */}
        <SectionHeader title="GRADIENT HERO" />
        <HeroCard />
        
        {/* Glass Effect */}
        <SectionHeader title="GLASS SURFACE" delay={150} />
        <GlassCardDemo />
        
        {/* Typography */}
        <SectionHeader title="TYPOGRAPHY SCALE" delay={250} />
        <TypographyDemo />
        
        {/* Elevations */}
        <SectionHeader title="ELEVATION & GLOW" delay={350} />
        <ElevationDemo />
        
        {/* Interactive */}
        <SectionHeader title="PRESS INTERACTIONS" delay={450} />
        <InteractiveDemo />
        
        {/* Accent Colors */}
        <SectionHeader title="ACCENT COLORS" delay={550} />
        <AccentPicker />
        
        {/* Footer */}
        <View style={styles.footer}>
          <AppText role="caption" color={tokens.textMuted}>
            All components use token-driven styling
          </AppText>
          <AppText role="caption" color={tokens.textMuted}>
            {theme === 'dark' ? '🌙' : '☀️'} {theme.charAt(0).toUpperCase() + theme.slice(1)} Mode
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  contentWide: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  sectionDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Hero Card
  heroCard: {
    padding: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroStat: {
    alignItems: 'center',
    gap: 4,
  },
  streakStat: {
    padding: 12,
    borderRadius: 12,
  },
  heroStatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  progressContainer: {
    gap: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  
  // Glass Card
  glassBackground: {
    padding: 16,
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  glassBackgroundContent: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  glassOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 16,
  },
  glassContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glassTextContent: {
    flex: 1,
    gap: 2,
  },
  
  // Typography
  typographyCard: {
    gap: 8,
  },
  
  // Elevation
  elevationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  elevationCard: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    gap: 4,
  },
  glowCardContainer: {
    marginTop: 12,
  },
  glowCard: {
    padding: 16,
  },
  glowCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Interactive
  interactiveRow: {
    flexDirection: 'row',
    gap: 12,
  },
  interactiveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  interactiveButtonOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  interactiveHint: {
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Accent Picker
  accentTitle: {
    marginBottom: 4,
  },
  accentSubtitle: {
    marginBottom: 16,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accentButtonContainer: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  accentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentButtonActive: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 24,
  },
})
