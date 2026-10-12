/**
 * Profile screen — mobile-only fullscreen modal
 *
 * Shows user info and provides quick access to:
 * - Settings
 * - Feedback
 * - Sign Out / Exit Guest Mode
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Settings,
  MessageSquare,
  LogOut,
  ChevronRight,
} from 'lucide-react-native'

import { useAuth } from '@/src/hooks/useAuth'
import { useTheme } from '@/src/hooks/useTheme'

export default function ProfileScreen() {
  const { tokens } = useTheme()
  const router = useRouter()
  const { user, signOut, exitGuestMode } = useAuth()

  const isGuest = user?.isAnonymous ?? true
  const email = user?.email ?? null
  const initial = email ? email[0].toUpperCase() : 'G'
  const displayName = email ? email.split('@')[0] : 'Guest User'

  const handleSignOut = useCallback(async () => {
    if (isGuest) {
      await exitGuestMode()
    } else {
      await signOut()
    }
    // Navigate to auth/sign-in page after signing out
    router.replace('/auth')
  }, [isGuest, exitGuestMode, signOut, router])

  const handleClose = useCallback(() => {
    if (router.canDismiss?.()) {
      router.dismiss()
    } else if (router.canGoBack?.()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }, [router])

  const styles = makeStyles(tokens)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgTertiary }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header — breadcrumb style matching settings/feedback */}
      <View style={[styles.header, { backgroundColor: tokens.bgTertiary }]}>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: tokens.bgSecondary },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close profile"
        >
          <ChevronLeft size={18} color={tokens.textSecondary} />
        </Pressable>
        <View style={styles.breadcrumbRow}>
          <Text style={[styles.breadcrumbCurrent, { color: tokens.textPrimary }]}>Profile</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User info card */}
        <View style={[styles.userCard, styles.cardElevated]}>
          <View style={[styles.avatarLarge, { backgroundColor: tokens.accentBlue }]}>
            <Text style={styles.avatarInitialLarge}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: tokens.textPrimary }]}>{displayName}</Text>
            {email && (
              <Text style={[styles.userEmail, { color: tokens.textMuted }]}>{email}</Text>
            )}
            {isGuest && (
              <View style={[styles.guestBadge, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                <Text style={[styles.guestBadgeText, { color: '#f97316' }]}>Guest</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu items */}
        <View style={[styles.menuSection, styles.cardElevated]}>
          {/* Settings */}
          <Pressable
            onPress={() => router.push('/(modals)/settings')}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: tokens.bgInput },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: `${tokens.accentBlue}15` }]}>
              <Settings size={18} color={tokens.accentBlue} />
            </View>
            <Text style={[styles.menuLabel, { color: tokens.textPrimary }]}>Settings</Text>
            <ChevronRight size={18} color={tokens.textMuted} />
          </Pressable>

          <View style={[styles.menuDivider, { backgroundColor: tokens.borderPrimary }]} />

          {/* Feedback */}
          <Pressable
            onPress={() => router.push('/(modals)/feedback')}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: tokens.bgInput },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Feedback"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: `${tokens.accentGreen}15` }]}>
              <MessageSquare size={18} color={tokens.accentGreen} />
            </View>
            <Text style={[styles.menuLabel, { color: tokens.textPrimary }]}>Feedback</Text>
            <ChevronRight size={18} color={tokens.textMuted} />
          </Pressable>
        </View>

        {/* Sign Out */}
        <View style={[styles.menuSection, styles.cardElevated]}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: tokens.bgInput },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isGuest ? 'Exit guest mode' : 'Sign out'}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: `${tokens.accentRed}15` }]}>
              <LogOut size={18} color={tokens.accentRed} />
            </View>
            <Text style={[styles.menuLabel, { color: tokens.accentRed }]}>
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Text>
            <ChevronRight size={18} color={tokens.accentRed} style={{ opacity: 0.5 }} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    // Elevated card style (white background + shadow)
    cardElevated: {
      backgroundColor: tokens.bgPrimary,
      borderWidth: 1,
      borderColor: tokens.borderPrimary,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as object,
      }),
    },
    // Header — breadcrumb style matching settings/feedback
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        web: { cursor: 'pointer', outlineStyle: 'none' } as any,
      }),
    },
    breadcrumbRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    breadcrumbCurrent: {
      fontSize: 15,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    // User card
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      gap: 14,
    },
    avatarLarge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitialLarge: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '700',
    },
    userInfo: {
      flex: 1,
      gap: 4,
    },
    userName: {
      fontSize: 18,
      fontWeight: '600',
    },
    userEmail: {
      fontSize: 14,
    },
    guestBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginTop: 4,
    },
    guestBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    // Menu section
    menuSection: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    menuIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    menuDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 60,
    },
  })
}
