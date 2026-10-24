import { defineConfig } from 'vitest/config'

const atAlias = { find: /^@\//, replacement: new URL('./', import.meta.url).pathname }

export default defineConfig({
  // Shared '@' alias (unchanged behavior for the node project).
  resolve: { alias: [atAlias] },
  test: {
    projects: [
      {
        // 1) Existing pure-logic tests — unchanged behavior (node environment)
        extends: true,
        resolve: { alias: [atAlias] },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.component.test.tsx'],
        },
      },
      {
        // 2) New component/screen/context tests (jsdom + react-native-web)
        extends: true,
        resolve: {
          alias: [
            // RNW render path for the component project only
            { find: /^react-native$/, replacement: 'react-native-web' },
            atAlias,
          ],
        },
        test: {
          name: 'web',
          environment: 'jsdom',
          include: [
            'src/**/*.component.test.tsx',
            'app/**/*.component.test.tsx',
            // Safety net: catch any bare *.test.tsx a future contributor adds
            // under src/ so it is never silently skipped by both projects.
            'src/**/__tests__/**/*.test.tsx',
          ],
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
})
