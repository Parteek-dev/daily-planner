/**
 * expo-file-system mock — used by useProgress ICS export.
 */
import { vi } from 'vitest'

export const documentDirectory = 'file:///test/'
export const cacheDirectory = 'file:///test-cache/'

export const writeAsStringAsync = vi.fn(async () => {})
export const readAsStringAsync = vi.fn(async () => '')
export const getInfoAsync = vi.fn(async () => ({ exists: true, isDirectory: false }))
export const deleteAsync = vi.fn(async () => {})
export const makeDirectoryAsync = vi.fn(async () => {})

export const EncodingType = { UTF8: 'utf8', Base64: 'base64' }

export default {
  documentDirectory,
  cacheDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  getInfoAsync,
  deleteAsync,
  makeDirectoryAsync,
  EncodingType,
}
