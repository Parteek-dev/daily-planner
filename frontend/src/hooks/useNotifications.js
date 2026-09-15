import { useState, useEffect, useCallback, useRef } from 'react'

const NOTIFICATION_KEY = 'planner_notification_settings'
const REMINDER_MINUTES_DEFAULT = 5

export default function useNotifications(tasks = []) {
  const [permission, setPermission] = useState('default')
  const [enabled, setEnabled] = useState(false)
  const [reminderMinutes, setReminderMinutes] = useState(REMINDER_MINUTES_DEFAULT)
  const scheduledNotifications = useRef(new Map())
  const checkIntervalRef = useRef(null)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATION_KEY)
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setEnabled(settings.enabled ?? false)
        setReminderMinutes(settings.reminderMinutes ?? REMINDER_MINUTES_DEFAULT)
      } catch (e) {
        console.error('Failed to parse notification settings', e)
      }
    }

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Save settings
  const saveSettings = useCallback((newEnabled, newMinutes) => {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify({
      enabled: newEnabled,
      reminderMinutes: newMinutes,
    }))
  }, [])

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        setEnabled(true)
        saveSettings(true, reminderMinutes)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to request notification permission', error)
      return false
    }
  }, [reminderMinutes, saveSettings])

  // Toggle notifications
  const toggleNotifications = useCallback(async () => {
    if (!enabled) {
      // Turning on
      if (permission === 'granted') {
        setEnabled(true)
        saveSettings(true, reminderMinutes)
      } else {
        const granted = await requestPermission()
        if (granted) {
          setEnabled(true)
          saveSettings(true, reminderMinutes)
        }
      }
    } else {
      // Turning off
      setEnabled(false)
      saveSettings(false, reminderMinutes)
      // Clear scheduled notifications
      scheduledNotifications.current.clear()
    }
  }, [enabled, permission, reminderMinutes, requestPermission, saveSettings])

  // Update reminder minutes
  const updateReminderMinutes = useCallback((minutes) => {
    const mins = parseInt(minutes) || REMINDER_MINUTES_DEFAULT
    setReminderMinutes(mins)
    saveSettings(enabled, mins)
  }, [enabled, saveSettings])

  // Show notification
  const showNotification = useCallback((title, options = {}) => {
    if (permission !== 'granted') return

    try {
      const notification = new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true,
        ...options,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000)
    } catch (error) {
      console.error('Failed to show notification', error)
    }
  }, [permission])

  // Check for upcoming tasks
  const checkUpcomingTasks = useCallback(() => {
    if (!enabled || permission !== 'granted') return

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    tasks.forEach(task => {
      // Skip completed tasks or tasks without due time
      if (task.completed || !task.dueTime || task.date !== todayStr) return

      const taskKey = `${task.id}-${task.date}-${task.dueTime}`
      
      // Skip if already notified
      if (scheduledNotifications.current.has(taskKey)) return

      // Parse due time
      const [hours, minutes] = task.dueTime.split(':').map(Number)
      const dueDate = new Date(now)
      dueDate.setHours(hours, minutes, 0, 0)

      // Calculate time until due
      const msUntilDue = dueDate.getTime() - now.getTime()
      const minutesUntilDue = msUntilDue / (1000 * 60)

      // Check if within reminder window
      if (minutesUntilDue > 0 && minutesUntilDue <= reminderMinutes) {
        const roundedMinutes = Math.round(minutesUntilDue)
        showNotification(`Task in ${roundedMinutes} min: ${task.title}`, {
          body: task.description || `Scheduled for ${formatTime(task.dueTime)}`,
          tag: taskKey,
          data: { taskId: task.id },
        })
        scheduledNotifications.current.set(taskKey, true)
      }

      // Check if task is due now (within 1 minute)
      if (minutesUntilDue >= -1 && minutesUntilDue <= 1) {
        const nowKey = `${taskKey}-now`
        if (!scheduledNotifications.current.has(nowKey)) {
          showNotification(`Task due now: ${task.title}`, {
            body: task.description || 'Time to start!',
            tag: nowKey,
            data: { taskId: task.id },
          })
          scheduledNotifications.current.set(nowKey, true)
        }
      }
    })
  }, [enabled, permission, tasks, reminderMinutes, showNotification])

  // Set up periodic check
  useEffect(() => {
    if (enabled && permission === 'granted') {
      // Check immediately
      checkUpcomingTasks()
      
      // Check every minute
      checkIntervalRef.current = setInterval(checkUpcomingTasks, 60000)
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [enabled, permission, checkUpcomingTasks])

  // Clear old scheduled notifications at midnight
  useEffect(() => {
    const clearAtMidnight = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const msUntilMidnight = midnight.getTime() - now.getTime()

      setTimeout(() => {
        scheduledNotifications.current.clear()
        clearAtMidnight() // Schedule next clear
      }, msUntilMidnight)
    }

    clearAtMidnight()
  }, [])

  return {
    permission,
    enabled,
    reminderMinutes,
    requestPermission,
    toggleNotifications,
    updateReminderMinutes,
    showNotification,
    isSupported: 'Notification' in window,
  }
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}
