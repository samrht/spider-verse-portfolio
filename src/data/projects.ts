import type { Universe } from '../store/universeStore'

export interface Project {
  id: string
  title: string
  description: string
  tags: string[]
  universe: Universe
  link?: string
  repoLink?: string
  image?: string
  featured: boolean
}

// Phase 1 scaffold: placeholder projects to prove the layout.
// Swap with real entries before ship.
export const projects: Project[] = [
  // —— Earth-1610 · Miles Morales · Dev ——————————————————————————————
  {
    id: 'e1610-halftone-renderer',
    title: 'Halftone Renderer',
    description:
      'A WebGL2 halftone shader playground for testing dot patterns, channel splits, and the comic-book look.',
    tags: ['TypeScript', 'WebGL', 'GLSL'],
    universe: 'earth-1610',
    featured: true,
  },
  {
    id: 'e1610-web-slinger',
    title: 'Web-Slinger CLI',
    description:
      'A batch deploy tool that swings releases across environments in one command, with rollback hooks.',
    tags: ['Node', 'CLI', 'DX'],
    universe: 'earth-1610',
    featured: false,
  },
  {
    id: 'e1610-multiverse-linker',
    title: 'Multiverse Linker',
    description:
      'Monorepo project switcher with universe-flavored profiles and instant context jumps.',
    tags: ['pnpm', 'Monorepo', 'TUI'],
    universe: 'earth-1610',
    featured: false,
  },

  // —— Earth-65 · Gwen Stacy · Design ——————————————————————————————
  {
    id: 'e65-ballet-grid',
    title: 'Ballet Grid',
    description:
      'A choreographed fluid layout system. Rhythm in CSS Grid — designed for editorial layouts that breathe.',
    tags: ['CSS', 'Design System', 'Layout'],
    universe: 'earth-65',
    featured: true,
  },
  {
    id: 'e65-watercolor-atlas',
    title: 'Watercolor Atlas',
    description:
      'A hand-painted illustration library with SVG-native filters and animated wash transitions.',
    tags: ['SVG', 'Illustration', 'Figma'],
    universe: 'earth-65',
    featured: false,
  },
  {
    id: 'e65-symphony',
    title: 'Symphony',
    description:
      'A token generator that turns a single hex into a complete harmonic design palette.',
    tags: ['Tokens', 'Color', 'A11y'],
    universe: 'earth-65',
    featured: false,
  },

  // —— Earth-138 · Spider-Punk · Open Source ————————————————————————
  {
    id: 'e138-riot-js',
    title: 'RIOT.js',
    description:
      'Declarative state machines for stubborn UIs. Reject the framework. Build the framework.',
    tags: ['TypeScript', 'OSS', 'State'],
    universe: 'earth-138',
    featured: true,
  },
  {
    id: 'e138-anarchy-stack',
    title: 'Anarchy Stack',
    description:
      'Opinionated, zero-config dev stack. No yaml. No vendor lock-in. No apologies.',
    tags: ['Rust', 'OSS', 'CLI'],
    universe: 'earth-138',
    featured: false,
  },
  {
    id: 'e138-riff',
    title: 'Riff',
    description:
      'A collaborative coding playground with CRDT-backed live sessions and a one-key broadcast.',
    tags: ['CRDT', 'Realtime', 'OSS'],
    universe: 'earth-138',
    featured: false,
  },

  // —— Earth-928 · Spider-Man 2099 · AI / Future ————————————————————
  {
    id: 'e928-karen-core',
    title: 'K.A.R.E.N. Core',
    description:
      'Local-first AI assistant runtime. Ships in Phase 2 of this very portfolio.',
    tags: ['AI', 'LLM', 'Edge'],
    universe: 'earth-928',
    featured: true,
  },
  {
    id: 'e928-neural-hud',
    title: 'Neural HUD',
    description:
      'Realtime ML telemetry overlay — track tokens, latency, and confidence as your agent thinks.',
    tags: ['Observability', 'WebGPU', 'AI'],
    universe: 'earth-928',
    featured: false,
  },
  {
    id: 'e928-chrono-query',
    title: 'ChronoQuery',
    description:
      'Temporal datastore with time-travel queries — read the state of your system at any past moment.',
    tags: ['Database', 'Temporal', 'Rust'],
    universe: 'earth-928',
    featured: false,
  },
]
