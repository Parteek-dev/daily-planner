/**
 * app/(tabs)/_layout.tsx — Four-tab navigator with platform branching.
 *
 * Rendering rules (Requirements 4.2 – 4.5):
 *
 *   • iOS / Android             → Tabs + NavigationBar bottom tab bar
 *   • Web, viewport  > 768 px  → SidebarLayout (Sidebar.web.tsx wraps the Tabs)
 *   • Web, viewport ≤ 768 px   → Tabs + NavigationBar (same as mobile)
 *
 * The overdue-task badge on the Today tab is sourced from `useProgress`.
 * Because `useProgress` requires a Firebase Auth user (not yet wired up in
 * this navigation-skeleton phase), the count is safely defaulted to 0 here;
 * the full wiring happens when `useProgress` is integrated in Phase 4.
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */

import React, { useState, useEffect } from 'react'; import { Platform, useWindowDimensions, View, StyleSheet } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';

import Sidebar from '@/src/components/navigation/Sidebar.web';
import NavigationBar from '@/src/components/navigation/NavigationBar';
import { useTheme } from '@/src/hooks/useTheme';
import CommandPalette from '@/src/components/CommandPalette';
import VoiceInput from '@/src/components/VoiceInput';
import AddTaskModal from '@/src/components/task/AddTaskModal';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { MobileHeaderProvider, useMobileHeader } from '@/src/context/MobileHeaderContext';
import { AddTaskModalProvider, useAddTaskModal } from '@/src/context/AddTaskModalContext';
import { useWidget } from '@/src/context/WidgetContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_BREAKPOINT = 768;

// Tab route names must match the file names under app/(tabs)/
const TAB_ROUTES = ['index', 'today', 'analytics', 'calendar'] as const;
type TabRoute = typeof TAB_ROUTES[number];

const TAB_LABELS: Record<TabRoute, string> = {
  index: 'Home',
  today: 'Tasks',
  analytics: 'Analytics',
  calendar: 'Calendar',
};

// ─── Add Task Modal overlay component ─────────────────────────────────────────

function AddTaskModalOverlay() {
  const { isOpen, editTaskId, initialDate, closeAddTask } = useAddTaskModal();
  return (
    <AddTaskModal
      isOpen={isOpen}
      onClose={closeAddTask}
      editTaskId={editTaskId}
      initialDate={initialDate}
    />
  );
}

// ─── Sidebar layout wrapper (web ≥ 768 px) ────────────────────────────────────

/**
 * SidebarLayout renders the collapsible Sidebar alongside the main Tabs
 * content area using a horizontal flex row.  The Tabs component is rendered
 * with `tabBarStyle={{ display: 'none' }}` so the bottom bar is hidden —
 * navigation is driven exclusively by the Sidebar.
 */
function SidebarLayout({
  overdueCount,
  activeTab,
  onNavigate,
}: {
  overdueCount: number;
  activeTab: string;
  onNavigate: (tab: string) => void;
}) {
  const { tokens } = useTheme();
  const router = useRouter();
  const { user, signOut, exitGuestMode } = useAuth();
  const isGuest = user?.isAnonymous ?? false;

  // Unified sign-out — AuthGate in _layout.tsx handles the redirect when
  // user becomes null; we just await the operation here.
  const handleSignOut = React.useCallback(async () => {
    if (isGuest) {
      await exitGuestMode()
    } else {
      await signOut()
    }
    // AuthGate detects user===null and calls router.replace('/') automatically.
    // Do NOT call router.replace here — it races with AuthGate and breaks nav.
  }, [isGuest, exitGuestMode, signOut]);
  const { tasks, getTopicColor, topics, addTask, toggleTaskComplete, todayCompleted, todayTotal, streakData } = useProgress({ user });
  const [showSearch, setShowSearch] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const { open: openWidget, setTaskData } = useWidget();

  // Keep widget task data in sync whenever tasks change
  React.useEffect(() => {
    setTaskData({
      tasks: tasks as any,
      onToggleComplete: toggleTaskComplete,
      getTopicColor,
    });
  }, [tasks, toggleTaskComplete, getTopicColor, setTaskData]);

  return (
    <View style={[styles.sidebarRoot, { backgroundColor: tokens.bgPrimary }]}>
      {/* Left sidebar */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={onNavigate}
        taskCounts={{
          today: overdueCount,
        }}
        overdueCount={overdueCount}
        onOpenPomodoro={() => router.push('/(modals)/pomodoro')}
        onOpenVoiceInput={() => setShowVoiceInput(true)}
        onOpenCommandPalette={() => setShowSearch(true)}
        onOpenSettings={() => router.push('/(modals)/settings')}
        onOpenWidget={openWidget}
        user={user}
        todayProgress={{ completed: todayCompleted, total: todayTotal }}
        streakData={streakData}
        onSignOut={handleSignOut}
        onOpenFeedback={() => router.push('/(modals)/feedback')}
      />

      {/* Main content — Tabs with the bottom bar hidden */}
      <View style={styles.sidebarContent}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index" options={{ title: TAB_LABELS.index }} />
          <Tabs.Screen name="today" options={{ title: TAB_LABELS.today }} />
          <Tabs.Screen name="analytics" options={{ title: TAB_LABELS.analytics }} />
          <Tabs.Screen name="calendar" options={{ title: TAB_LABELS.calendar }} />
        </Tabs>
      </View>

      {/* Command palette overlay */}
      <CommandPalette
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        tasks={tasks as any}
        getTopicColor={getTopicColor}
      />

      {/* Voice Input overlay */}
      <VoiceInput
        isOpen={showVoiceInput}
        onClose={() => setShowVoiceInput(false)}
        onResult={(parsed) => {
          setShowVoiceInput(false)
          router.push({
            pathname: '/(modals)/add-task',
            params: {
              title: parsed.title,
              duration: parsed.duration ? String(parsed.duration) : undefined,
              date: parsed.date,
              dueTime: parsed.dueTime ?? undefined,
              priority: parsed.priority ?? undefined,
              topic: parsed.topic ?? undefined,
            },
          })
        }}
        topics={topics as any}
      />

      {/* Add Task Modal overlay */}
      <AddTaskModalOverlay />
    </View>
  );
}

// ─── Tab layout (mobile / narrow web) ────────────────────────────────────────

/**
 * Inner component — must be rendered inside MobileHeaderProvider so it can
 * subscribe to openSearch calls from the tab screens.
 */
function NativeTabLayoutInner({ overdueCount }: { overdueCount: number }) {
  const [showSearch, setShowSearch] = useState(false);
  const { _subscribe } = useMobileHeader();
  const { user } = useAuth();
  const { tasks, getTopicColor } = useProgress({ user });

  // Subscribe so any tab screen calling openSearch() triggers this overlay.
  useEffect(() => {
    return _subscribe(() => setShowSearch(true));
  }, [_subscribe]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <NavigationBar {...props} overdueCount={overdueCount} />
        )}
      >
        <Tabs.Screen name="index" options={{ title: TAB_LABELS.index }} />
        <Tabs.Screen name="today" options={{ title: TAB_LABELS.today }} />
        <Tabs.Screen name="analytics" options={{ title: TAB_LABELS.analytics }} />
        <Tabs.Screen name="calendar" options={{ title: TAB_LABELS.calendar }} />
      </Tabs>

      {/* Command palette overlay — shared across all mobile tab screens */}
      <CommandPalette
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        tasks={tasks as any}
        getTopicColor={getTopicColor}
      />

      {/* Add Task Modal overlay */}
      <AddTaskModalOverlay />
    </View>
  );
}

function NativeTabLayout({ overdueCount }: { overdueCount: number }) {
  return (
    <MobileHeaderProvider>
      <NativeTabLayoutInner overdueCount={overdueCount} />
    </MobileHeaderProvider>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const segments = useSegments();

  // Determine the current active tab from the URL segments.
  // Segments looks like ["(tabs)", "today"] when inside the tab group.
  const activeTab = ((segments as string[])[1] as TabRoute | undefined) ?? 'index';

  // Overdue count — placeholder (0) until useProgress is integrated in Phase 4.
  // Replace with: const { tasks } = useProgress(user); const overdueCount = …
  const overdueCount = 0;

  // Sidebar navigation handler: programmatically navigate to the chosen tab.
  function handleNavigate(tab: string) {
    const route = tab === 'index' ? '/(tabs)/' : `/(tabs)/${tab}`;
    router.push(route as never);
  }

  // Choose layout based on platform + viewport
  const useWebSidebar = Platform.OS === 'web' && width > SIDEBAR_BREAKPOINT;

  return (
    <AddTaskModalProvider>
      {useWebSidebar ? (
        <SidebarLayout
          overdueCount={overdueCount}
          activeTab={activeTab}
          onNavigate={handleNavigate}
        />
      ) : (
        <NativeTabLayout overdueCount={overdueCount} />
      )}
    </AddTaskModalProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sidebarRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContent: {
    flex: 1,
  },
});
