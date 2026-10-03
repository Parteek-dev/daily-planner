/**
 * NavigationBar.tsx — bottom tab bar for mobile and narrow-web viewports.
 *
 * Accepts the standard expo-router / React Navigation tab bar props and
 * renders a fully themed bottom navigation bar using only RN primitives and
 * theme tokens (no CSS, no `var(--` strings).
 *
 * Features:
 *  - Lucide icons for each tab (`lucide-react-native`)
 *  - Active tab highlight using accent color from theme tokens
 *  - Overdue badge on the "Today" tab (capped at 99)
 *  - Safe-area bottom inset via `useSafeAreaInsets`
 *  - Profile tab that opens the profile screen
 *
 * Requirements: 4.3, 4.5, 8.6
 */

import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
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
  LayoutDashboard,
  CalendarDays,
  Calendar,
  User,
  type LucideProps,
} from 'lucide-react-native';

import { useTheme } from '@/src/hooks/useTheme';

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
}

const TAB_CONFIGS: TabConfig[] = [
  { route: 'index', label: 'Dashboard', Icon: LayoutDashboard },
  { route: 'today', label: 'Today', Icon: CalendarDays },
  { route: 'calendar', label: 'Calendar', Icon: Calendar },
];

// ─── Badge component ─────────────────────────────────────────────────────────

function OverdueBadge({ count, color }: { count: number; color: string }) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <View
      style={[styles.badge, { backgroundColor: color }]}
      accessibilityLabel={`${count} overdue task${count === 1 ? '' : 's'}`}
    >
      <Text style={styles.badgeText}>{label}</Text>
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

  const containerStyle: ViewStyle = {
    backgroundColor: tokens.bgSecondary,
    borderTopColor: tokens.borderPrimary,
    paddingBottom: Math.max(insets.bottom, 8),
  };

  return (
    <View
      style={[styles.container, containerStyle]}
      accessibilityRole="tablist"
    >
      {TAB_CONFIGS.map((tab, index) => {
        const isFocused = state.index === index;
        const iconColor = isFocused ? tokens.accentPrimary : tokens.textMuted;
        const labelColor = isFocused ? tokens.accentPrimary : tokens.textMuted;
        const showBadge = tab.route === 'today' && overdueCount > 0;

        function onPress() {
          const nav = navigation as NavigationHelpers<ParamListBase> & {
            emit: (e: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
          };
          const event = nav.emit({
            type: 'tabPress',
            target: state.routes[index]?.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // navigate to the target route by name
            (navigation as { navigate: (name: string) => void }).navigate(tab.route);
          }
        }

        function onLongPress() {
          (navigation as NavigationHelpers<ParamListBase> & {
            emit: (e: { type: string; target?: string }) => void;
          }).emit({
            type: 'tabLongPress',
            target: state.routes[index]?.key,
          });
        }

        return (
          <Pressable
            key={tab.route}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.tabPressed,
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
          >
            {/* Icon + badge */}
            <View style={styles.iconWrapper}>
              <tab.Icon
                size={22}
                color={iconColor}
                strokeWidth={isFocused ? 2.5 : 2}
              />
              {showBadge && (
                <OverdueBadge
                  count={overdueCount}
                  color={tokens.accentRed}
                />
              )}
            </View>

            {/* Label */}
            <Text
              style={[styles.label, { color: labelColor }]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>

            {/* Active indicator dot */}
            {isFocused && (
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: tokens.accentPrimary },
                ]}
              />
            )}
          </Pressable>
        );
      })}

      {/* Profile tab — navigates to profile screen */}
      <Pressable
        onPress={() => router.push('/(modals)/profile')}
        style={({ pressed }) => [
          styles.tab,
          pressed && styles.tabPressed,
        ]}
        accessibilityRole="tab"
        accessibilityLabel="Profile"
      >
        <View style={styles.iconWrapper}>
          <User size={22} color={tokens.textMuted} strokeWidth={2} />
        </View>
        <Text
          style={[styles.label, { color: tokens.textMuted }]}
          numberOfLines={1}
        >
          Profile
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
