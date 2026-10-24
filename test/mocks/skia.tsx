/**
 * @shopify/react-native-skia mock factory.
 *
 * No component under test renders Skia on the web branch, but transitive
 * imports must resolve. The factory (registered via vi.mock in setup.ts)
 * returns a Proxy resolving every export to a render-null component / no-op
 * and reporting __esModule: true.
 */

export function skiaFactory() {
  return new Proxy(
    {},
    {
      get: (_target, prop: string | symbol) => {
        if (prop === '__esModule') return true
        return () => null
      },
    },
  )
}
