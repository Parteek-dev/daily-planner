/**
 * renderWithProviders — wraps components in the REAL provider tree so token
 * usage, theme state, and context behavior are exercised (never mock useTheme).
 *
 * Two tiers:
 *   - ThemeOnly (default): leaf primitives and prop-driven components.
 *   - AllProviders (withContexts: true): components that call a context hook
 *     which throws outside its provider (useAddTaskModal / useSettingsModal /
 *     usePomodoroModal / usePomodoroMini).
 */
import React, { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/src/hooks/useTheme'
import { AddTaskModalProvider } from '@/src/context/AddTaskModalContext'
import { SettingsModalProvider } from '@/src/context/SettingsModalContext'
import { PomodoroModalProvider } from '@/src/context/PomodoroModalContext'
import { PomodoroMiniProvider } from '@/src/context/PomodoroMiniContext'
import { MobileHeaderProvider } from '@/src/context/MobileHeaderContext'
import { WidgetProvider } from '@/src/context/WidgetContext'

export interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Opt into the full context stack (modal/pomodoro/widget). Default: ThemeProvider only. */
  withContexts?: boolean
}

function AllProviders({ children }: { children: ReactNode }) {
  // PomodoroMiniProvider consumes usePomodoro (timers); tests that mount it use fake timers.
  return (
    <ThemeProvider>
      <MobileHeaderProvider>
        <AddTaskModalProvider>
          <SettingsModalProvider>
            <PomodoroModalProvider>
              <PomodoroMiniProvider>
                <WidgetProvider>{children}</WidgetProvider>
              </PomodoroMiniProvider>
            </PomodoroModalProvider>
          </SettingsModalProvider>
        </AddTaskModalProvider>
      </MobileHeaderProvider>
    </ThemeProvider>
  )
}

function ThemeOnly({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

export function renderWithProviders(
  ui: ReactElement,
  { withContexts = false, ...options }: ProviderOptions = {},
) {
  const Wrapper = withContexts ? AllProviders : ThemeOnly
  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from RTL so tests import from one place.
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
