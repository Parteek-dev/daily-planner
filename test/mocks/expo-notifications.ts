/**
 * expo-notifications mock — permission + scheduling stubs.
 * Used by NotificationSettings and useNotifications.
 */
import { vi } from 'vitest'

export const getPermissionsAsync = vi.fn(async () => ({ status: 'granted' }))
export const requestPermissionsAsync = vi.fn(async () => ({ status: 'granted' }))
export const scheduleNotificationAsync = vi.fn(async () => 'notification-id')
export const cancelAllScheduledNotificationsAsync = vi.fn(async () => {})
export const cancelScheduledNotificationAsync = vi.fn(async () => {})
export const getAllScheduledNotificationsAsync = vi.fn(async () => [])
export const setNotificationHandler = vi.fn(() => {})
export const addNotificationReceivedListener = vi.fn(() => ({ remove: vi.fn() }))
export const addNotificationResponseReceivedListener = vi.fn(() => ({ remove: vi.fn() }))

export const AndroidImportance = { DEFAULT: 3, HIGH: 4, MAX: 5 }
export const SchedulableTriggerInputTypes = { DATE: 'date', TIME_INTERVAL: 'timeInterval' }

export default {
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  AndroidImportance,
  SchedulableTriggerInputTypes,
}
