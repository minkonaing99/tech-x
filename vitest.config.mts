import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside a React Server Component. Stub it so
      // server-side modules (admin-orders, site-info) are importable in tests.
      'server-only': path.resolve(import.meta.dirname, 'src/test/server-only-stub.ts'),
      '@': path.resolve(import.meta.dirname, 'src'),
      '@emails': path.resolve(import.meta.dirname, 'emails'),
    },
  },
  // tsconfig says `jsx: preserve` because Next does its own transform. Vitest
  // has no such downstream step, so component tests need one named here.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    // Node stays the default - it suits the pure logic that most of this suite
    // is. The handful of component tests opt into a DOM with a
    // `@vitest-environment jsdom` docblock rather than slowing down the rest.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Only files a test actually imports. Reporting on every untested file
      // turns the number into noise while the suite is still growing.
      include: ['src/lib/**', 'src/app/api/**', 'src/components/product/**'],
      exclude: ['**/*.test.{ts,tsx}', 'src/test/**', '**/*.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})
