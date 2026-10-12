import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Initialize from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((item) => {
        if (item !== null) {
          try {
            setStoredValue(JSON.parse(item) as T)
          } catch (err) {
            console.warn(`useLocalStorage: failed to parse key "${key}"`, err)
          }
        }
      })
      .catch((err) => {
        console.warn(`useLocalStorage: failed to read key "${key}"`, err)
      })
  }, [key])

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value
      setStoredValue(valueToStore)
      AsyncStorage.setItem(key, JSON.stringify(valueToStore)).catch((err) => {
        console.warn(`useLocalStorage: failed to write key "${key}"`, err)
      })
    } catch (err) {
      console.warn(`useLocalStorage: failed to write key "${key}"`, err)
    }
  }

  return [storedValue, setValue]
}
