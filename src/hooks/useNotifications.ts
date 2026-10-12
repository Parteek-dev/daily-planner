import { useState, useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { PermissionStatus } from 'expo-modules-core'

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_KEY = 'planner_notification_settings'
const REMINDER_MINUTES_DEFAULT = 5

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  title: string
  description?: string
  date: string     // 'YYYY-MM-DD'
  dueTime?: string // 'HH:MM'
  completed?: boolean
  [key: string]: unknown
}

export interface NotificationSettings {
  enabled: boolean
  reminderMinutes: number
}

export interface UseNotificationsReturn {
  /** Current permission status: 'granted' | 'denied' | 'undetermined' */
  permission: PermissionStatus
  /** Whether the user has notifications turned on in app settings */
  enabled: boolean
  /** Lead time (minutes) before dueTime at which the reminder fires */
  reminderMinutes: number
  /** Request OS-level notification permission */
  requestPermission: () => Promise<boolean>
  /** Toggle notifications on/off (requests permission if not yet granted) */
  toggleNotifications: () => Promise<void>
  /** Persist a new lead-time value (1–60 minutes) */
  updateReminderMinutes: (minutes: number) => Promise<void>
  /**
   * Map of taskKey → notificationId for all currently scheduled reminders.
   * Read-only; use scheduleTaskReminder / cancelTaskReminder to mutate.
   */
  scheduledNotifications: React.MutableRefObject<Map<string, string>>
  /**
   * Schedule a reminder for `task` and return the Expo notification ID.
   * Returns null if the task has no dueTime, is in the past, or notifications
   * are not enabled/granted.
   * Requirements: 17.2, 17.6
   */
  scheduleTaskReminder: (task: Task) => Promise<string | null>
  /**
   * Cancel a previously scheduled notification by its Expo notification ID.
   * Requirements: 17.3, 17.6
   */
  cancelTaskReminder: (notificationId: string) => Promise<void>
  /** True on native; true on web only if the Notification API is present */
  isSupported: boolean
}

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Returns true when notifications are supported on the current platform.
 * Native is always supported; web requires the browser Notification API.
 */
function checkIsSupported(): boolean {
  if (Platform.OS !== 'web') return true
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Build a Date for the notification trigger: `dueTime` minus `leadMinutes`.
 * Returns null when the resulting moment is in the past.
 */
function buildTriggerDate(
  dateStr: string,
  dueTime: string,
  leadMinutes: number
): Date | null {
  const [hours, minutes] = dueTime.split(':').map(Number)
  const base = new Date(dateStr)
  base.setHours(hours, minutes, 0, 0)
  const triggerMs = base.getTime() - leadMinutes * 60 * 1000
  if (triggerMs <= Date.now()) return null
  return new Date(triggerMs)
}

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const h = Number.parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export default function useNotifications(tasks: Task[] = []): UseNotificationsReturn {
  const [permission, setPermission] = useState<PermissionStatus>(PermissionStatus.UNDETERMINED)
  const [enabled, setEnabled] = useState(false)
  const [reminderMinutes, setReminderMinutes] = useState(REMINDER_MINUTES_DEFAULT)

  /**
   * Map of taskKey → Expo notification ID.
   * taskKey format: `${task.id}-${task.date}-${task.dueTime}`
   */
  const scheduledNotifications = useRef<Map<string, string>>(new Map())

  const isSupported = checkIsSupported()

  // ── Load persisted settings ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadSettings() {
      try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_KEY)
        if (raw) {
          const settings: NotificationSettings = JSON.parse(raw)
          setEnabled(settings.enabled ?? false)
          setReminderMinutes(settings.reminderMinutes ?? REMINDER_MINUTES_DEFAULT)
        }
      } catch (e) {
        console.error('useNotifications: failed to load settings', e)
      }

      // Sync current OS permission state
      if (isSupported) {
        try {
          const { status } = await Notifications.getPermissionsAsync()
          setPermission(status as PermissionStatus)
        } catch (e) {
          console.error('useNotifications: failed to read permission', e)
        }
      }
    }

    loadSettings()
  }, [isSupported])

  // ── Persist settings ─────────────────────────────────────────────────────────

  const saveSettings = useCallback(
    async (newEnabled: boolean, newMinutes: number) => {
      try {
        const settings: NotificationSettings = {
          enabled: newEnabled,
          reminderMinutes: newMinutes,
        }
        await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(settings))
      } catch (e) {
        console.error('useNotifications: failed to save settings', e)
      }
    },
    []
  )

  // ── Request permission ────────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('useNotifications: notifications not supported on this platform')
      return false
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      })
      const ps = status as PermissionStatus
      setPermission(ps)
      return ps === PermissionStatus.GRANTED
    } catch (error) {
      console.error('useNotifications: failed to request permission', error)
      return false
    }
  }, [isSupported])

  // ── Schedule a single task reminder ──────────────────────────────────────────

  const scheduleTaskReminder = useCallback(
    async (task: Task): Promise<string | null> => {
      if (!enabled || permission !== PermissionStatus.GRANTED) return null
      if (!task.dueTime) return null

      const triggerDate = buildTriggerDate(task.date, task.dueTime, reminderMinutes)
      if (!triggerDate) return null

      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Task in ${reminderMinutes} min: ${task.title}`,
            body: task.description
              ? String(task.description)
              : `Scheduled for ${formatTime(task.dueTime)}`,
            data: { taskId: task.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        })
        return notificationId
      } catch (error) {
        console.error('useNotifications: failed to schedule notification', error)
        return null
      }
    },
    [enabled, permission, reminderMinutes]
  )

  // ── Cancel a scheduled reminder ───────────────────────────────────────────────

  const cancelTaskReminder = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId)
    } catch (error) {
      console.error('useNotifications: failed to cancel notification', error)
    }
  }, [])

  // ── Sync task list: schedule new / cancel changed reminders ──────────────────
  //
  // Requirements 17.2, 17.6:
  // - Schedule a notification for each uncompleted task with a future dueTime today.
  // - When a task's dueTime changes or the task is deleted, cancel the old
  //   notification and (re-)schedule if applicable.

  useEffect(() => {
    if (!enabled || permission !== PermissionStatus.GRANTED) return

    const todayStr = new Date().toISOString().split('T')[0]

    async function sync() {
      const currentTaskKeys = new Set<string>()

      for (const task of tasks) {
        if (task.completed || !task.dueTime || task.date !== todayStr) continue

        const taskKey = `${task.id}-${task.date}-${task.dueTime}`
        currentTaskKeys.add(taskKey)

        // Already scheduled for this exact key — nothing to do
        if (scheduledNotifications.current.has(taskKey)) continue

        // Cancel any stale notification for the same task ID with a different dueTime
        for (const [existingKey, existingId] of scheduledNotifications.current.entries()) {
          if (existingKey.startsWith(`${task.id}-`)) {
            await cancelTaskReminder(existingId)
            scheduledNotifications.current.delete(existingKey)
            break
          }
        }

        const notificationId = await scheduleTaskReminder(task)
        if (notificationId) {
          scheduledNotifications.current.set(taskKey, notificationId)
        }
      }

      // Cancel notifications for tasks that have been removed or completed
      for (const [key, id] of scheduledNotifications.current.entries()) {
        if (!currentTaskKeys.has(key)) {
          await cancelTaskReminder(id)
          scheduledNotifications.current.delete(key)
        }
      }
    }

    sync()
  }, [enabled, permission, tasks, scheduleTaskReminder, cancelTaskReminder])

  // ── Cancel all when permission is revoked ────────────────────────────────────

  useEffect(() => {
    if (permission === PermissionStatus.DENIED) {
      Notifications.cancelAllScheduledNotificationsAsync().catch((e) =>
        console.error('useNotifications: failed to cancel all', e)
      )
      scheduledNotifications.current.clear()
      if (enabled) {
        setEnabled(false)
        saveSettings(false, reminderMinutes)
      }
    }
  }, [permission, enabled, reminderMinutes, saveSettings])

  // ── toggleNotifications ───────────────────────────────────────────────────────

  const toggleNotifications = useCallback(async (): Promise<void> => {
    if (!enabled) {
      // Turning on
      if (permission === PermissionStatus.GRANTED) {
        setEnabled(true)
        await saveSettings(true, reminderMinutes)
      } else {
        const granted = await requestPermission()
        if (granted) {
          setEnabled(true)
          await saveSettings(true, reminderMinutes)
        }
      }
    } else {
      // Turning off — cancel all pending notifications
      setEnabled(false)
      await saveSettings(false, reminderMinutes)
      await Notifications.cancelAllScheduledNotificationsAsync()
      scheduledNotifications.current.clear()
    }
  }, [enabled, permission, reminderMinutes, requestPermission, saveSettings])

  // ── updateReminderMinutes ─────────────────────────────────────────────────────

  const updateReminderMinutes = useCallback(
    async (minutes: number): Promise<void> => {
      // Clamp to 1–60 per Req 17.4
      const clamped = Math.max(1, Math.min(60, Math.round(minutes) || REMINDER_MINUTES_DEFAULT))
      setReminderMinutes(clamped)
      await saveSettings(enabled, clamped)

      // Re-schedule all existing notifications with the new lead time
      if (enabled && permission === PermissionStatus.GRANTED) {
        for (const [, id] of scheduledNotifications.current.entries()) {
          await cancelTaskReminder(id)
        }
        scheduledNotifications.current.clear()
        // The sync effect will re-schedule on next render with the updated reminderMinutes
      }
    },
    [enabled, permission, saveSettings, cancelTaskReminder]
  )

  return {
    permission,
    enabled,
    reminderMinutes,
    requestPermission,
    toggleNotifications,
    updateReminderMinutes,
    scheduledNotifications,
    scheduleTaskReminder,
    cancelTaskReminder,
    isSupported,
  }
}
