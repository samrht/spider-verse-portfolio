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

export const projects: Project[] = [
  // —— Earth-1610 · Miles Morales · Dev ——————————————————————————————
  {
    id: 'e1610-montecarlo-risk',
    title: 'Monte Carlo Risk Dashboard',
    description:
      'Browser-based quantitative finance engine. Thousands of stochastic market paths run in Web Workers — VaR, CVaR, max drawdown, goal-feasibility probabilities. Replaces deterministic calculators with a probabilistic, risk-aware framework.',
    tags: ['TypeScript', 'Web Workers', 'Monte Carlo', 'Quant'],
    universe: 'earth-1610',
    link: 'https://montecarlo-risk-dashboard.vercel.app',
    repoLink: 'https://github.com/samrht/montecarlo-risk-dashboard',
    featured: true,
  },

  // —— Earth-65 · Gwen Stacy · Design ——————————————————————————————
  {
    id: 'e65-siply-smart',
    title: 'SIPlySmart',
    description:
      'Multi-goal investment planner that translates spreadsheet math into "are you screwed or not" status. Inflation-adjusted FV, risk profiles, monthly SIP calculations — wrapped in a UI that doesn\'t make you feel stupid for asking.',
    tags: ['TypeScript', 'Product Design', 'Fintech', 'UI'],
    universe: 'earth-65',
    link: 'https://siplysmart.vercel.app',
    repoLink: 'https://github.com/samrht/SIPlySmart',
    featured: true,
  },

  // —— Earth-138 · Spider-Punk · Open Source ————————————————————————
  {
    id: 'e138-discord-bot-template',
    title: 'Discord Bot Template',
    description:
      'A drop-in multifunctional Discord bot. Music (yt-dlp + FFmpeg), Blackjack with isolated per-user sessions, moderation, custom embedded help, modular cog architecture. Fork it. Tear it down. Build it better.',
    tags: ['Python', 'discord.py', 'OSS', 'Template'],
    universe: 'earth-138',
    repoLink: 'https://github.com/samrht/discord-bot-template',
    featured: true,
  },

  // —— Earth-928 · Spider-Man 2099 · AI / Future ————————————————————
  {
    id: 'e928-spider-verse-portfolio',
    title: 'Spider-Verse Portfolio',
    description:
      'The site you\'re on. Three.js ShaderMaterial halftone loader, GLSL glitch universe-transitions, GSAP elastic web-cursor, Lenis smooth scroll, four canon-accurate colour palettes. A dimensional event, not a page.',
    tags: ['React', 'Three.js', 'GLSL', 'GSAP'],
    universe: 'earth-928',
    repoLink: 'https://github.com/samrht/spider-verse-portfolio',
    featured: true,
  },
]
