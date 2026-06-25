import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Transform component JSX with the automatic runtime so `.tsx` tests don't
  // need React in scope (the app's tsconfig uses jsx: "preserve" for Next).
  esbuild: { jsx: 'automatic' },
  test: {
    // Run test files sequentially. The Postgres contract suites share one CI
    // database and isolate themselves by truncating tables per test; running
    // files in parallel forks lets one file's truncate wipe another's freshly
    // seeded rows mid-test (foreign-key violations). The suite is small, so the
    // cost is negligible.
    fileParallelism: false,
    // Default to node; component (`.tsx`) tests opt into a DOM via the glob
    // below, so the pure-logic suites stay fast and DOM-free.
    environment: 'node',
    environmentMatchGlobs: [['tests/**/*.test.tsx', 'jsdom']],
    setupFiles: ['./tests/setup/dom.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
})
