/**
 * expo-av mock — Audio stubs for the pomodoro/timer sound.
 */
import { vi } from 'vitest'

const fakeSound = {
  playAsync: vi.fn(async () => {}),
  unloadAsync: vi.fn(async () => {}),
  setPositionAsync: vi.fn(async () => {}),
  stopAsync: vi.fn(async () => {}),
  replayAsync: vi.fn(async () => {}),
}

export const Audio = {
  Sound: {
    createAsync: vi.fn(async () => ({ sound: fakeSound })),
  },
  setAudioModeAsync: vi.fn(async () => {}),
}

export default { Audio }
