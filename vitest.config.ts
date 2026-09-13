import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.frag', '**/*.vert', '**/*.glsl'],
  test: {
    environment: 'jsdom',
    // Needed so @testing-library/react's auto-cleanup (which checks
    // `typeof afterEach === 'function'` as a global) actually registers —
    // T8 is the first suite to render components across multiple `it`s in
    // one file.
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'api/**/*.test.ts'],
  },
})
