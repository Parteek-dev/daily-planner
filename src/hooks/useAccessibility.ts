import { createContext, useContext, useState, useEffect, createElement, type ReactNode } from 'react'
import { AccessibilityInfo } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Font size options — multipliers applied via style scaling
const FONT_SIZES = [
  { id: 'small', label: 'Small', scale: 0.9 },
  { id: 'medium', label: 'Medium', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.15 },
]

export { FONT_SIZES }

export interface AccessibilityContextValue {
  reduceMotion: boolean
  setReduceMotion: (value: boolean) => void
  fontSize: string
  setFontSize: (value: string) => void
  isScreenReaderEnabled: boolean
  isReduceMotionEnabled: boolean
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotionState] = useState(false)
  const [fontSize, setFontSizeState] = useState('medium')
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false)
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false)

  // Initialize persisted preferences from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('ip_a11y_reduce_motion').then((stored) => {
      if (stored !== null) {
        setReduceMotionState(stored === 'true')
      } else {
        // Fall back to OS-level reduce motion preference
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
          setReduceMotionState(enabled)
        })
      }
    })

    AsyncStorage.getItem('ip_a11y_font_size').then((stored) => {
      if (stored !== null) setFontSizeState(stored)
    })
  }, [])

  // Subscribe to screen reader changes
  useEffect(() => {
    // Read initial screen reader state
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled)

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled,
    )

    return () => subscription.remove()
  }, [])

  // Subscribe to OS reduce motion changes
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled)

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled,
    )

    return () => subscription.remove()
  }, [])

  const setReduceMotion = (value: boolean) => {
    setReduceMotionState(value)
    AsyncStorage.setItem('ip_a11y_reduce_motion', String(value)).catch((err) => {
      console.warn('useAccessibility: failed to persist reduce_motion', err)
    })
  }

  const setFontSize = (value: string) => {
    setFontSizeState(value)
    AsyncStorage.setItem('ip_a11y_font_size', value).catch((err) => {
      console.warn('useAccessibility: failed to persist font_size', err)
    })
  }

  const contextValue: AccessibilityContextValue = {
    reduceMotion,
    setReduceMotion,
    fontSize,
    setFontSize,
    isScreenReaderEnabled,
    isReduceMotionEnabled,
  }

  return createElement(AccessibilityContext.Provider, { value: contextValue }, children)
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
