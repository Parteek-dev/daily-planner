/**
/**
 * ProfileMenu
 *
 * A compact avatar button that opens a dropdown menu.
 * On web: uses a React Portal rendered into document.body so the dropdown
 *         appears above all page content regardless of stacking contexts.
 * On native: uses React Native Modal.
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native'
import { Settings, LogOut } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import type { User as FirebaseUser } from 'firebase/auth'

import { useTheme } from '@/src/hooks/useTheme'

// Portal helper — renders children into document.body on web to escape
// all stacking contexts (ScrollView overflow, transforms, etc.)
let createPortal: ((el: React.ReactElement, container: Element) => React.ReactElement) | null = null
if (Platform.OS === 'web') {
  try { createPortal = require('react-dom').createPortal } catch { /* ignore */ }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(user: FirebaseUser | null): string {
  if (!user) return '?'
  if (user.isAnonymous) return 'G'
  const name = user.displayName ?? user.email ?? ''
  const parts = name.split(/[\s@]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getDisplayLabel(user: FirebaseUser | null): string {
  if (!user) return 'Not signed in'
  if (user.isAnonymous) return 'Guest'
  return user.displayName ?? user.email ?? 'Account'
}

// ── Shared menu card ───────────────────────────────────────────────────────────

interface MenuCardProps {
  initials: string
  displayLabel: string
  isGuest: boolean
  email: string | null | undefined
  tokens: ReturnType<typeof useTheme>['tokens']
  styles: ReturnType<typeof makeStyles>
  onSettings: () => void
  onSignOut: () => void
}

function MenuCard({
  initials,
  displayLabel,
  isGuest,
  email,
  tokens,
  styles,
  onSettings,
  onSignOut,
}: MenuCardProps) {
  return (
    <View style={[styles.menu, { backgroundColor: tokens.bgSecondary, borderColor: tokens.borderPrimary }]}>
      {/* User info */}
      <View style={[styles.infoRow, { borderBottomColor: tokens.borderPrimary }]}>
        <View style={[styles.menuAvatar, { backgroundColor: tokens.accentBlue }]}>
          <Text style={styles.menuAvatarText}>{initials}</Text>
        </View>
        <View style={styles.infoText}>
          <Text style={[styles.displayName, { color: tokens.textPrimary }]} numberOfLines={1}>
            {displayLabel}
          </Text>
          {!isGuest && email ? (
            <Text style={[styles.emailText, { color: tokens.textMuted }]} numberOfLines={1}>
              {email}
            </Text>
          ) : isGuest ? (
            <Text style={[styles.emailText, { color: tokens.textMuted }]}>Guest mode</Text>
          ) : null}
        </View>
      </View>

      {/* Settings */}
      <Pressable
        onPress={onSettings}
        style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: tokens.bgPrimary }]}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Settings size={16} color={tokens.textSecondary} />
        <Text style={[styles.menuItemText, { color: tokens.textPrimary }]}>Settings</Text>
      </Pressable>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: tokens.borderPrimary }]} />

      {/* Sign out */}
      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: tokens.bgPrimary }]}
        accessibilityRole="button"
        accessibilityLabel={isGuest ? 'Exit guest mode' : 'Sign out'}
      >
        <LogOut size={16} color={tokens.accentRed} />
        <Text style={[styles.menuItemText, { color: tokens.accentRed }]}>
          {isGuest ? 'Exit guest mode' : 'Sign out'}
        </Text>
      </Pressable>
    </View>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ProfileMenuProps {
  user: FirebaseUser | null
  onSignOut: () => void
}

export default function ProfileMenu({ user, onSignOut }: ProfileMenuProps) {
  const { tokens } = useTheme()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const initials = getInitials(user)
  const displayLabel = getDisplayLabel(user)
  const isGuest = user?.isAnonymous === true
  const styles = makeStyles(tokens)

  const handleSettings = useCallback(() => {
    setOpen(false)
    setTimeout(() => router.push('/(modals)/settings'), 50)
  }, [router])

  const handleSignOut = useCallback(() => {
    setOpen(false)
    setTimeout(() => onSignOut(), 50)
  }, [onSignOut])

  const menuCard = (
    <MenuCard
      initials={initials}
      displayLabel={displayLabel}
      isGuest={isGuest}
      email={user?.email}
      tokens={tokens}
      styles={styles}
      onSettings={handleSettings}
      onSignOut={handleSignOut}
    />
  )

  return (
    // 'position: relative' container so the web overlay is anchored here
    <View style={styles.container}>
      {/* Avatar button */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open profile menu"
        hitSlop={8}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </Pressable>

      {Platform.OS === 'web' ? (
        // ── Web: Portal into document.body — escapes all stacking contexts ────
        open ? (
          (() => {
            const overlay = (
              <View style={styles.portalRoot as any}>
                {/* Backdrop */}
                <Pressable
                  onPress={() => setOpen(false)}
                  style={StyleSheet.absoluteFillObject}
                  accessibilityLabel="Close menu"
                />
                {/* Card — fixed top-right */}
                <View style={styles.webMenuFixed as any}>
                  {menuCard}
                </View>
              </View>
            )
            return createPortal && typeof document !== 'undefined'
              ? createPortal(overlay, document.body)
              : overlay
          })()
        ) : null
      ) : (
        // ── Native: Modal floats above everything ────────────────────────────
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
          statusBarTranslucent
        >
          {/* Pressable backdrop — no TouchableWithoutFeedback (avoids findDOMNode) */}
          <Pressable
            style={styles.nativeBackdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close menu"
          />
          {menuCard}
        </Modal>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(tokens: ReturnType<typeof useTheme>['tokens']) {
  return StyleSheet.create({
    container: {
      position: 'relative',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: tokens.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarPressed: {
      opacity: 0.75,
    },
    avatarText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    // Native Modal backdrop (full screen, transparent)
    nativeBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    // Web: portal root — covers the entire viewport
    portalRoot: {
      position: 'fixed' as any,
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      // transparent — only the backdrop pressable + card are inside
    },
    // Web: fixed full-screen backdrop (kept for compat, now inside portalRoot)
    webBackdrop: {
      position: 'fixed' as any,
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9998,
    } as any,
    // Web: fixed to viewport top-right — escapes all stacking contexts
    webMenuFixed: {
      position: 'absolute' as any,
      top: 72,
      right: 12,
      width: 230,
    },
    // The floating menu card — shared by web + native
    menu: {
      // On native inside Modal: positioned absolutely; on web: parent webMenuFixed handles position
      position: Platform.OS === 'web' ? 'relative' : 'absolute',
      top: Platform.OS === 'web' ? undefined : (Platform.OS === 'ios' ? 100 : 72),
      right: Platform.OS === 'web' ? undefined : 16,
      width: 220,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
      borderBottomWidth: 1,
    },
    menuAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    menuAvatarText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    infoText: {
      flex: 1,
    },
    displayName: {
      fontSize: 14,
      fontWeight: '600',
    },
    emailText: {
      fontSize: 12,
      marginTop: 1,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    menuItemText: {
      fontSize: 14,
      fontWeight: '500',
    },
    divider: {
      height: 1,
      marginHorizontal: 14,
    },
  })
}
