import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { setAuthUser } from '@/test/mocks/firebase-control'
import RootLayout from '@/app/_layout'

describe('app/_layout', () => {
  beforeEach(() => setAuthUser(null))

  it('mounts the provider tree and navigation stack without throwing', () => {
    // RootLayout supplies its own providers, so render it raw.
    expect(() => render(<RootLayout />)).not.toThrow()
  })
})
