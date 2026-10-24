/**
 * NavigationBar.tsx — Modern floating bottom navigation for mobile viewports.
 *
 * Accepts the standard expo-router / React Navigation tab bar props and
 * renders a premium floating navigation bar using RN primitives and theme tokens.
 *
 * Features:
 *  - Floating bar with side margins, rounded corners, and subtle shadow
 *  - White/translucent background (theme-aware for dark mode)
 *  - Central floating "+" FAB for quick add task (uses theme accent color)
 *  - Subtle pill indicator for active tab (uses theme accent color)
 *  - Lucide icons for each tab (`lucide-react-native`)
 *  - Overdue badge on the "Today" tab (capped at 99)
 *  - Safe-area bottom inset via `useSafeAreaInsets`
 *
 * Navigation order: Home | Today | + | Calendar | Profile
 *
 * Requirements: 4.3, 4.5, 8.6
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type {
  ParamListBase,
  TabNavigationState,
  NavigationHelpers,
} from '@react-navigation/native';
import type { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';

// BottomTabDescriptorMap is not re-exported from the public API; use Record<string, any> as a compatible alias.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BottomTabDescriptorMap = Record<string, any>;
import {
  Home,
  CalendarDays,
  Calendar,
  User,
  BarChart2,
  type LucideProps,
} from 'lucide-react-native';

import { useTheme } from '@/src/hooks/useTheme';
import type { Tokens } from '@/src/theme/tokens';
import { PressableScale } from '@/src/components/motion';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NavigationBarProps {
  state: TabNavigationState<ParamListBase>;
  descriptors: BottomTabDescriptorMap;
  navigation: NavigationHelpers<ParamListBase>;
  /** Overdue task count; displayed as a badge on the Today tab, capped at 99. */
  overdueCount?: number;
}

// ─── Tab configuration ────────────────────────────────────────────────────────

interface TabConfig {
  /** The route name as registered in (tabs)/_layout.tsx */
  route: string;
  label: string;
  Icon: React.ComponentType<LucideProps>;
  /** Whether this is a special tab (not part of regular navigation) */
  isSpecial?: boolean;
}

// Left side tabs (before the FAB)
const LEFT_TABS: TabConfig[] = [
  { route: 'index', label: 'Home', Icon: Home },
  { route: 'today', label: 'Tasks', Icon: CalendarDays },
];

// Right side tabs (after the FAB)
const RIGHT_TABS: TabConfig[] = [
  { route: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { route: 'calendar', label: 'Calendar', Icon: Calendar },
];

// ─── Style factory ────────────────────────────────────────────────────────────

const makeStyles = (tokens: Tokens) =>
  StyleSheet.create({
    // Outer wrapper — provides safe area spacing and positions everything
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    // The floating bar container
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radius.xxl,
      backgroundColor: tokens.bgElevated,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.sm,
      position: 'relative',
      // Shadow for floating effect
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
        web: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    // Individual tab button
    tab: {
      flex: 1,
      borderRadius: tokens.radius.lg,
      minHeight: 48,
    },
    // Inner pressable area
    tabPressable: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.spacing.xs,
    },
    // Sliding indicator (animated background pill)
    slidingIndicator: {
      position: 'absolute',
      top: tokens.spacing.sm,
      bottom: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
    },
    // Active pill indicator background (kept for reference, not used with sliding)
    tabActive: {
      backgroundColor: `${tokens.accentPrimary}15`,
    },
    // Icon wrapper for positioning badge
    iconWrapper: {
      position: 'relative',
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Tab label text
    label: {
      fontSize: 10,
      fontWeight: '500',
      letterSpacing: 0.2,
      marginTop: 2,
    },
    // Overdue badge
    badge: {
      position: 'absolute',
      top: -6,
      right: -10,
      minWidth: 16,
      height: 16,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: tokens.accentRed,
    },
    badgeText: {
      color: tokens.textInverse,
      fontSize: 9,
      fontWeight: '700',
      lineHeight: 12,
    },
  });

// ─── Badge component ─────────────────────────────────────────────────────────

function OverdueBadge({
  count,
  styles,
}: {
  count: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <View
      style={styles.badge}
      accessibilityLabel={`${count} overdue task${count === 1 ? '' : 's'}`}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ─── Tab Item component ───────────────────────────────────────────────────────

function TabItem({
  tab,
  isFocused,
  onPress,
  onLongPress,
  overdueCount,
  tokens,
  styles,
}: {
  tab: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  overdueCount: number;
  tokens: Tokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  const iconColor = isFocused ? tokens.accentPrimary : tokens.textMuted;
  const labelColor = isFocused ? tokens.accentPrimary : tokens.textMuted;
  const showBadge = tab.route === 'today' && overdueCount > 0;

  return (
    <View style={styles.tab}>
      <PressableScale
        style={styles.tabPressable}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={tab.label}
      >
        <View style={styles.iconWrapper}>
          <tab.Icon
            size={22}
            color={iconColor}
            strokeWidth={isFocused ? 2.5 : 2}
          />
          {showBadge && <OverdueBadge count={overdueCount} styles={styles} />}
        </View>
        <Text
          style={[styles.label, { color: labelColor }]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </PressableScale>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NavigationBar({
  state,
  navigation,
  overdueCount = 0,
}: NavigationBarProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = makeStyles(tokens);

  // Calculate bottom spacing: 12-16px + safe area
  const bottomSpacing = Math.max(insets.bottom, tokens.spacing.md) + tokens.spacing.md;

  // All navigable tabs (excluding Profile which is a modal)
  const ALL_TABS = [...LEFT_TABS, ...RIGHT_TABS];
  const TAB_COUNT = ALL_TABS.length;

  // Track container width and calculate tab width
  const [containerWidth, setContainerWidth] = useState(0);
  const padding = tokens.spacing.sm;
  // Account for Profile tab (5 total tabs displayed)
  const tabWidth = containerWidth > 0 ? (containerWidth - padding * 2) / 5 : 0;

  // Get active tab index in our array (0-3 for the 4 navigable tabs)
  const activeRouteName = state.routes[state.index]?.name;
  const activeTabIndex = ALL_TABS.findIndex(t => t.route === activeRouteName);

  // Animated value for sliding indicator position
  const indicatorLeft = useRef(new Animated.Value(0)).current;

  // Animate indicator when tab changes
  useEffect(() => {
    if (tabWidth > 0 && activeTabIndex >= 0) {
      const targetLeft = padding + (activeTabIndex * tabWidth);
      Animated.spring(indicatorLeft, {
        toValue: targetLeft,
        useNativeDriver: false,
        tension: 300,
        friction: 30,
      }).start();
    }
  }, [activeTabIndex, tabWidth, indicatorLeft, padding]);

  // Handle container layout to get width
  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    // Initialize indicator position
    if (activeTabIndex >= 0) {
      const targetLeft = padding + (activeTabIndex * ((width - padding * 2) / 5));
      indicatorLeft.setValue(targetLeft);
    }
  };

  // Navigation handlers
  const createPressHandler = (tab: TabConfig, navIndex: number) => () => {
    const nav = navigation as NavigationHelpers<ParamListBase> & {
      emit: (e: {
        type: string;
        target?: string;
        canPreventDefault?: boolean;
      }) => { defaultPrevented: boolean };
    };
    const event = nav.emit({
      type: 'tabPress',
      target: state.routes[navIndex]?.key,
      canPreventDefault: true,
    });

    if (state.index !== navIndex && !event.defaultPrevented) {
      (navigation as { navigate: (name: string) => void }).navigate(tab.route);
    }
  };

  const createLongPressHandler = (navIndex: number) => () => {
    (
      navigation as NavigationHelpers<ParamListBase> & {
        emit: (e: { type: string; target?: string }) => void;
      }
    ).emit({
      type: 'tabLongPress',
      target: state.routes[navIndex]?.key,
    });
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomSpacing }]}>
      {/* Floating navigation bar */}
      <View
        style={styles.container}
        accessibilityRole="tablist"
        onLayout={handleContainerLayout}
      >
        {/* Sliding indicator background */}
        {tabWidth > 0 && activeTabIndex >= 0 && (
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                left: indicatorLeft,
                width: tabWidth,
                backgroundColor: `${tokens.accentPrimary}15`,
              },
            ]}
          />
        )}

        {/* Left tabs: Home, Tasks */}
        {LEFT_TABS.map((tab) => {
          const navIndex = state.routes.findIndex((r) => r.name === tab.route);
          const isFocused = state.index === navIndex;

          return (
            <TabItem
              key={tab.route}
              tab={tab}
              isFocused={isFocused}
              onPress={createPressHandler(tab, navIndex)}
              onLongPress={createLongPressHandler(navIndex)}
              overdueCount={overdueCount}
              tokens={tokens}
              styles={styles}
            />
          );
        })}

        {/* Right tabs: Analytics, Calendar */}
        {RIGHT_TABS.map((tab) => {
          const navIndex = state.routes.findIndex((r) => r.name === tab.route);
          const isFocused = state.index === navIndex;

          return (
            <TabItem
              key={tab.route}
              tab={tab}
              isFocused={isFocused}
              onPress={createPressHandler(tab, navIndex)}
              onLongPress={createLongPressHandler(navIndex)}
              overdueCount={overdueCount}
              tokens={tokens}
              styles={styles}
            />
          );
        })}

        {/* Profile tab */}
        <PressableScale
          onPress={() => router.push('/(modals)/profile')}
          style={styles.tab}
          accessibilityRole="tab"
          accessibilityLabel="Profile"
        >
          <View style={styles.tabPressable}>
            <View style={styles.iconWrapper}>
              <User size={22} color={tokens.textMuted} strokeWidth={2} />
            </View>
            <Text
              style={[styles.label, { color: tokens.textMuted }]}
              numberOfLines={1}
            >
              Profile
            </Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}
