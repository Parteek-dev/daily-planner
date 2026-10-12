/**
 * Sidebar.web.tsx — collapsible left-sidebar navigation (web-only).
 *
 * Rendered on web viewports wider than 768 px in place of the bottom
 * NavigationBar.  Built exclusively with RN View / Pressable / Text
 * primitives and theme tokens — zero CSS, no `var(--` strings.
 *
 * Props:
 *   activeTab             — currently focused tab route name
 *   onNavigate            — callback when a nav item is tapped
 *   taskCounts            — optional badge counts per tab key
 *   onOpenSettings        — opens the Settings modal
 *   onOpenCommandPalette  — opens the Command Palette overlay
 *   onUndo                — calls undo action
 *   onRedo                — calls redo action
 *   onOpenPomodoro        — opens the Pomodoro timer modal
 *   onOpenVoiceInput      — opens the Voice Input modal/overlay
 *   onOpenWidget          — opens the Widget View
 *   user                  — current authenticated user
 *   overdueCount          — badge count for the Today tab
 *
 * Requirements: 4.4
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Timer,
  Mic,
  PanelTop,
  Flame,
  LogOut,
  MessageSquare,
  User,
  BarChart2,
  Home,
  type LucideProps,
} from 'lucide-react-native';

import { useTheme } from '@/src/hooks/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  taskCounts?: Record<string, number>;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenPomodoro?: () => void;
  onOpenVoiceInput?: () => void;
  onOpenWidget?: () => void;
  user?: { email?: string | null; isAnonymous?: boolean } | null;
  overdueCount?: number;
  /** Today's completion progress for the sidebar header bar */
  todayProgress?: { completed: number; total: number };
  /** Streak data for the sidebar header */
  streakData?: { current: number; best: number; studiedToday: boolean };
  /** Called when user taps Sign Out */
  onSignOut?: () => void;
  /** Called when user taps Feedback */
  onOpenFeedback?: () => void;
}

interface NavItem {
  route: string;
  label: string;
  Icon: React.ComponentType<LucideProps>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { route: 'index', label: 'Home', Icon: Home },
  { route: 'today', label: 'Tasks', Icon: CalendarDays },
  { route: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { route: 'calendar', label: 'Calendar', Icon: Calendar },
  { route: 'search', label: 'Search', Icon: Search },
];

const COLLAPSED_KEY = 'sidebar_collapsed';
const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 60;

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface BadgeProps {
  count: number;
  bgColor: string;
}

function CountBadge({ count, bgColor }: BadgeProps) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sidebar({
  activeTab,
  onNavigate,
  taskCounts = {},
  onOpenSettings,
  onOpenCommandPalette,
  onOpenPomodoro,
  onOpenVoiceInput,
  onOpenWidget,
  user,
  overdueCount = 0,
  todayProgress,
  streakData,
  onSignOut,
  onOpenFeedback,
}: SidebarProps) {
  const { tokens } = useTheme();

  // Collapsed state is persisted in AsyncStorage so it survives reloads.
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Hydrate persisted collapse state once on mount.
  React.useEffect(() => {
    AsyncStorage.getItem(COLLAPSED_KEY)
      .then((val) => {
        if (val === 'true') setCollapsed(true);
      })
      .catch(() => {/* non-critical */ });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      AsyncStorage.setItem(COLLAPSED_KEY, String(next)).catch(() => { });
      return next;
    });
  }, []);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const containerStyle: ViewStyle = {
    width: sidebarWidth,
    backgroundColor: tokens.bgSecondary,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: tokens.borderPrimary,
  };

  // User profile data
  const email = user?.email ?? null;
  const isAnon = user?.isAnonymous ?? true;
  const initial = email ? email[0].toUpperCase() : 'G';
  const displayEmail = email ?? null;

  return (
    <View style={[styles.container, containerStyle]} accessibilityRole="none">

      {/* ── Logo / brand area ───────────────────────────────────────── */}
      <View style={styles.header}>
        {!collapsed && (
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: tokens.textPrimary }]} numberOfLines={1}>
              Daily Planner
            </Text>
            <Text style={[styles.brandSub, { color: tokens.textMuted }]} numberOfLines={1}>
              Track your progress
            </Text>
          </View>
        )}
        <Pressable
          onPress={toggleCollapsed}
          style={({ pressed }) => [
            styles.collapseBtn,
            { backgroundColor: pressed ? tokens.bgInput : 'transparent' },
          ]}
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          accessibilityRole="button"
        >
          {collapsed
            ? <ChevronRight size={18} color={tokens.textSecondary} />
            : <ChevronLeft size={18} color={tokens.textSecondary} />
          }
        </Pressable>
      </View>

      {/* ── Today's progress bar — only shown when tasks exist ──────── */}
      {todayProgress && !collapsed && todayProgress.total > 0 && (
        <View style={progressStyles.container}>
          {/* Label row */}
          <View style={progressStyles.labelRow}>
            <Text style={[progressStyles.pctLabel, { color: tokens.accentBlue }]}>
              {todayProgress.total > 0
                ? `${Math.round((todayProgress.completed / todayProgress.total) * 100)}%`
                : '—'
              } today
            </Text>
            <View style={progressStyles.statusRight}>
              {streakData && streakData.current > 0 && (
                <View style={progressStyles.streakBadge}>
                  <Flame size={11} color={tokens.accentOrange} />
                  <Text style={[progressStyles.streakNum, { color: tokens.accentOrange }]}>
                    {streakData.current}
                  </Text>
                </View>
              )}
              <Text style={[progressStyles.statusLabel, {
                color: todayProgress.completed === todayProgress.total && todayProgress.total > 0
                  ? tokens.accentGreen
                  : tokens.textSecondary,
              }]}>
                {todayProgress.total === 0
                  ? 'no tasks'
                  : todayProgress.completed === todayProgress.total
                    ? 'all done'
                    : `${todayProgress.total - todayProgress.completed} left`
                }
              </Text>
            </View>
          </View>
          {/* Bar — always visible since total > 0 is guaranteed by outer condition */}
          {(() => {
            const pct = Math.round((todayProgress.completed / todayProgress.total) * 100)
            return (
              <View style={[progressStyles.track, { backgroundColor: tokens.borderPrimary }]}>
                <View style={[
                  progressStyles.fill,
                  {
                    width: `${pct}%` as any,
                    backgroundColor: pct === 100 ? tokens.accentGreen : tokens.accentBlue,
                  },
                ]} />
              </View>
            )
          })()}
        </View>
      )}

      {/* ── Primary nav items ───────────────────────────────────────── */}
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.route;
          // Search is handled as a command palette overlay, not a route
          const isSearchItem = item.route === 'search';
          // Use overdueCount prop for Today tab badge
          const badgeCount = item.route === 'today'
            ? overdueCount
            : (taskCounts[item.route] ?? 0);

          const rowBg: ViewStyle = {
            backgroundColor: isActive ? tokens.bgInput : 'transparent',
          };
          const iconColor = isActive ? tokens.accentPrimary : tokens.textSecondary;
          const labelColor: TextStyle = {
            color: isActive ? tokens.accentPrimary : tokens.textSecondary,
          };

          return (
            <Pressable
              key={item.route}
              onPress={() => {
                if (isSearchItem) {
                  onOpenCommandPalette?.();
                } else {
                  onNavigate(item.route);
                }
              }}
              style={({ pressed }) => [
                styles.navItem,
                rowBg,
                pressed && { opacity: 0.7 },
                isActive && styles.navItemActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              {/* Active accent bar */}
              {isActive && (
                <View
                  style={[
                    styles.activeBar,
                    { backgroundColor: tokens.accentPrimary },
                  ]}
                />
              )}

              {/* Icon + badge */}
              <View style={styles.iconWrapper}>
                <item.Icon
                  size={20}
                  color={iconColor}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badgeCount > 0 && collapsed && (
                  <CountBadge count={badgeCount} bgColor={tokens.accentRed} />
                )}
              </View>

              {/* Label + expanded badge */}
              {!collapsed && (
                <View style={styles.labelRow}>
                  <Text style={[styles.navLabel, labelColor]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {badgeCount > 0 && (
                    <CountBadge count={badgeCount} bgColor={tokens.accentRed} />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Utility section ─────────────────────────────────────────── */}
      <View style={styles.utilSection}>
        {/* Pomodoro Timer */}
        <Pressable
          onPress={onOpenPomodoro}
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Pomodoro Timer"
        >
          <View style={styles.iconWrapper}>
            <Timer size={20} color={tokens.textSecondary} />
          </View>
          {!collapsed && (
            <View style={styles.labelRow}>
              <Text style={[styles.navLabel, { color: tokens.textSecondary }]}>Pomodoro Timer</Text>
            </View>
          )}
        </Pressable>

        {/* Voice Input */}
        <Pressable
          onPress={onOpenVoiceInput}
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Voice Input"
        >
          <View style={styles.iconWrapper}>
            <Mic size={20} color={tokens.textSecondary} />
          </View>
          {!collapsed && (
            <View style={styles.labelRow}>
              <Text style={[styles.navLabel, { color: tokens.textSecondary }]}>Voice Input</Text>
            </View>
          )}
        </Pressable>

        {/* Widget View */}
        <Pressable
          onPress={onOpenWidget}
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Widget View"
        >
          <View style={styles.iconWrapper}>
            <PanelTop size={20} color={tokens.textSecondary} />
          </View>
          {!collapsed && (
            <View style={styles.labelRow}>
              <Text style={[styles.navLabel, { color: tokens.textSecondary }]}>Widget View</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Bottom utilities ────────────────────────────────────────── */}
      <View
        style={[styles.footer, { borderTopColor: tokens.borderPrimary }]}
      >
        {/* Settings */}
        {onOpenSettings && (
          <Pressable
            onPress={onOpenSettings}
            style={({ pressed }) => [
              styles.navItem,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <View style={styles.iconWrapper}>
              <Settings size={20} color={tokens.textSecondary} />
            </View>
            {!collapsed && (
              <View style={styles.labelRow}>
                <Text style={[styles.navLabel, { color: tokens.textSecondary }]}>
                  Settings
                </Text>
              </View>
            )}
          </Pressable>
        )}

        {/* User profile row — tappable to open dropdown menu */}
        <View style={[styles.divider, { backgroundColor: tokens.borderPrimary, marginVertical: 4 }]} />
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setShowUserMenu(p => !p)}
            style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Open profile menu"
          >
            {/* User icon */}
            <View style={styles.iconWrapper}>
              <User size={20} color={tokens.textSecondary} />
            </View>
            {!collapsed && (
              <View style={styles.labelRow}>
                <Text style={[styles.navLabel, { color: tokens.textSecondary }]} numberOfLines={1}>
                  Profile
                </Text>
              </View>
            )}
          </Pressable>

          {/* Dropdown menu */}
          {showUserMenu && !collapsed && (
            <>
              {/* Backdrop — tap outside to dismiss */}
              <Pressable
                onPress={() => setShowUserMenu(false)}
                style={styles.menuBackdrop as any}
                accessibilityLabel="Close menu"
              />
              <View style={[styles.menuCard, {
                backgroundColor: tokens.bgSecondary,
                borderColor: tokens.borderPrimary,
              }]}>
                {/* User info */}
                <View style={[styles.menuInfo, { borderBottomColor: tokens.borderPrimary }]}>
                  <Text style={[styles.menuName, { color: tokens.textPrimary }]} numberOfLines={1}>
                    {displayEmail
                      ? displayEmail.split('@')[0]
                      : 'Guest User'}
                  </Text>
                  {displayEmail && (
                    <Text style={[styles.menuEmail, { color: tokens.textMuted }]} numberOfLines={1}>
                      {displayEmail}
                    </Text>
                  )}
                </View>

                {/* Feedback */}
                <Pressable
                  onPress={() => { setShowUserMenu(false); onOpenFeedback?.() }}
                  style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: tokens.bgInput }]}
                  accessibilityRole="button"
                  accessibilityLabel="Feedback"
                >
                  <MessageSquare size={15} color={tokens.textSecondary} />
                  <Text style={[styles.menuItemText, { color: tokens.textSecondary }]}>Feedback</Text>
                </Pressable>

                {/* Sign Out */}
                <Pressable
                  onPress={() => { setShowUserMenu(false); onSignOut?.() }}
                  style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: tokens.bgInput }]}
                  accessibilityRole="button"
                  accessibilityLabel={isAnon ? 'Exit guest mode' : 'Sign out'}
                >
                  <LogOut size={15} color={tokens.accentRed} />
                  <Text style={[styles.menuItemText, { color: tokens.accentRed }]}>
                    {isAnon ? 'Exit Guest Mode' : 'Sign Out'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%' as unknown as number,
    overflow: 'hidden' as unknown as undefined,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  brandSub: {
    fontSize: 12,
    marginTop: 1,
  },
  collapseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navList: {
    paddingTop: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
    overflow: 'hidden' as unknown as undefined,
    position: 'relative',
  },
  navItemActive: {
    // handled via backgroundColor in inline style
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  labelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 6,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: -6,
    right: -8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  utilSection: {
    paddingVertical: 2,
    gap: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    gap: 2,
    marginTop: 'auto' as unknown as number,
  },
  utilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  utilLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profileEmail: {
    fontSize: 12,
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // User dropdown menu
  menuBackdrop: {
    position: 'fixed' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 998,
  },
  menuCard: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 999,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
  } as any,
  menuInfo: {
    padding: 12,
    borderBottomWidth: 1,
  },
  menuName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuEmail: {
    fontSize: 11,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

const progressStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakNum: {
    fontSize: 12,
    fontWeight: '600',
  },
  pctLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
