import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GLSL shaders are imported as raw strings.
  assetsInclude: ['**/*.frag', '**/*.vert', '**/*.glsl'],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Bumped: the loader/transition/cursor are async-loaded but Three.js
    // can still push a single chunk a hair over Vite's default 500 kB warn.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: each library upgrades independently and
        // browsers can cache them across deploys.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/three/')) return 'three'
          if (id.includes('/gsap/') || id.includes('/@gsap/')) return 'gsap'
          if (id.includes('/react-router')) return 'router'
          if (id.includes('/lenis/')) return 'lenis'
          if (id.includes('/howler/')) return 'howler'
          if (id.includes('/zustand/')) return 'state'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
