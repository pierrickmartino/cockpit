import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Globals are disabled, so React Testing Library can't auto-register cleanup;
// do it explicitly. Harmless for node-environment suites (nothing is mounted).
afterEach(() => {
  cleanup()
})
