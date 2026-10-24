/**
 * lucide-react-native mock.
 *
 * Every named icon import resolves (via the Proxy `get` trap) to a RNW `View`
 * stub carrying `testID="icon-<Name>"` and `accessibilityRole="image"`, so icon
 * presence is assertable with `getByTestId('icon-Check')`. `__esModule` reports
 * true so the ESM interop layer treats the Proxy as a module namespace.
 *
 * The RN primitive is imported statically from 'react-native' here, so the
 * web-project alias (react-native -> react-native-web) is applied at transform
 * time and the stub renders real DOM.
 */
import React from 'react'
import { View } from 'react-native'

const makeIcon = (name: string) => (props: Record<string, unknown>) =>
  React.createElement(View, {
    accessibilityRole: 'image',
    testID: `icon-${name}`,
    ...props,
  })

/**
 * Lazily materialises icon stubs onto a backing object so Vitest's ESM-interop
 * layer (which validates named imports against the namespace via `has` /
 * `getOwnPropertyDescriptor` / `ownKeys`) resolves every `import { X }` while
 * still supporting the open-ended set of lucide icon names.
 */
function isIconName(name: string | symbol): name is string {
  return (
    typeof name === 'string' &&
    name !== '__esModule' &&
    name !== 'then' &&
    name !== 'default' &&
    name !== '$$typeof'
  )
}

export function lucideFactory() {
  const target: Record<string, unknown> = { __esModule: true }
  const ensure = (name: string) => {
    if (!(name in target)) target[name] = makeIcon(name)
    return target[name]
  }
  return new Proxy(target, {
    get: (_t, name: string | symbol) => {
      if (name === '__esModule') return true
      if (!isIconName(name)) return undefined
      return ensure(name)
    },
    has: (_t, name: string | symbol) =>
      name === '__esModule' || isIconName(name),
    getOwnPropertyDescriptor: (_t, name: string | symbol) => {
      if (name === '__esModule') {
        return { configurable: true, enumerable: false, value: true }
      }
      if (!isIconName(name)) return undefined
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: ensure(name),
      }
    },
  })
}
