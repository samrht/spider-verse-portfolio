import type { Mission } from '../types/suit'

// Placeholder missions for the Spider-Suit HUD MissionPanel + /suit mission
// log. Includes one CLASSIFIED entry so the redacted-title render is testable
// from day one. Swap the codenames + descriptions for real projects later.
export const MISSIONS: Mission[] = [
  {
    codename: 'OPERATION HALFTONE',
    description:
      'Cinematic Spider-Verse portfolio — Three.js dissolve loader, GSAP universe transitions, four CSS-token palettes.',
    stack: ['REACT', 'TYPESCRIPT', 'THREE.JS', 'GSAP', 'VITE'],
    status: 'ACTIVE',
    date: '2026-05-15',
  },
  {
    codename: 'PROJECT WEBHEAD',
    description:
      'Daily Bugle satire site — live CurrentsAPI feed, newspaper-fold overlay, in-universe staff bylines.',
    stack: ['REACT', 'ZUSTAND', 'GSAP', 'CURRENTS API'],
    status: 'COMPLETE',
    date: '2026-05-17',
  },
  {
    codename: 'RECON: 2099',
    description:
      'Suit HUD telemetry uplink — GitHub activity, Open-Meteo atmospherics, four-mode visual override.',
    stack: ['ZUSTAND', 'GSAP', 'OPEN-METEO', 'GITHUB API'],
    status: 'ACTIVE',
    date: '2026-05-18',
  },
  {
    codename: '█████████',
    description: 'CLEARANCE LEVEL 5 REQUIRED.',
    stack: ['███████', '████', '██████'],
    status: 'CLASSIFIED',
    date: '████-██-██',
  },
]
