import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bangers', 'cursive'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      // Colors are intentionally omitted — use var(--universe-*) custom
      // properties so universe switching is automatic.
    },
  },
  plugins: [],
} satisfies Config
