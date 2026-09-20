import type { Universe } from '../store/universeStore'

export interface Project {
  id: string
  slug: string
  title: string
  description: string
  tags: string[]
  universe: Universe
  link?: string
  repoLink?: string
  image?: string
  featured: boolean
}

const P = (p: Omit<Project, 'id'>): Project => ({ ...p, id: p.slug })

export const projects: Project[] = [
  // —— MCU · flagship, deployed ————————————————————————————————
  P({ slug: 'drishti', title: 'DRISHTI', universe: 'mcu', featured: true,
    description: 'Offline satellite change detection over Assam/Arunachal: CLIP retrieval, spectral + radar change, cloud-aware confidence, analyst feedback loop. 351 hand-labelled pairs; 7.8% false-alarm rate.',
    tags: ['Python', 'FastAPI', 'CLIP', 'GEE', 'React'], repoLink: 'https://github.com/samrht/drishti' }),
  P({ slug: 'idea-lab', title: 'Idea Lab', universe: 'mcu', featured: true,
    description: 'An execution translator: dump a "what if", get an honest reality check, a skill diff, and a week-by-week learning journey. Semantic cache on pgvector.',
    tags: ['Next.js', 'Prisma', 'Neon', 'Gemini'], link: 'https://idea-lab-mu.vercel.app' }),
  P({ slug: 'execution-os', title: 'Execution OS', universe: 'mcu', featured: true,
    description: 'A ranked "do this next" engine for many parallel goals. Deterministic scoring, an LLM only for parsing messy capture.',
    tags: ['Next.js', 'Prisma', 'Gemini'], link: 'https://execution-os-kappa.vercel.app', repoLink: 'https://github.com/samrht/execution-os' }),
  P({ slug: 'research-agent', title: 'Research Agent', universe: 'mcu', featured: true,
    description: 'Paste a paper or drop a 25 MB PDF, get a streamed State of the Field report with live-search evidence for and against.',
    tags: ['Next.js', 'Gemini', 'Vercel Blob'], repoLink: 'https://github.com/samrht/research-agent' }),
  P({ slug: 'spider-verse-portfolio', title: 'This Site', universe: 'mcu', featured: true,
    description: 'A multiverse comic book with a GPU halftone music visualizer, a public Spotify feed, a Daily Bugle that reads real news, and a suit HUD.',
    tags: ['React', 'Three.js', 'GLSL', 'GSAP'], repoLink: 'https://github.com/samrht/spider-verse-portfolio' }),

  // —— Cartoon · experiments and side quests ————————————————————
  P({ slug: 'blackhole-sim', title: 'Kerr Black Hole', universe: 'toon', featured: true,
    description: 'Real-time general-relativistic ray tracer of a spinning black hole\'s accretion disk, in the browser on WebGPU. Real physics, real colour.',
    tags: ['WebGPU', 'TypeScript', 'Physics'], repoLink: 'https://github.com/samrht/blackhole-sim' }),
  P({ slug: 'living-task-canvas', title: 'Living Task Canvas', universe: 'toon', featured: false,
    description: 'A todo app where tasks visibly wilt as they age. Neglect you can see.',
    tags: ['React', 'Vite'] }),
  P({ slug: 'algo-trading-starter', title: 'Algo Trading Starter', universe: 'toon', featured: false,
    description: 'NSE daily-swing pipeline: data, backtester with real Indian costs, paper trading, Dhan adapter.',
    tags: ['Python', 'pandas', 'NSE'] }),
  P({ slug: 'productivity-dashboard', title: 'Productivity Dashboard', universe: 'toon', featured: false,
    description: 'One self-contained HTML file, no build step, Chart.js and a dark theme. Open it and it works.',
    tags: ['HTML', 'Chart.js'] }),
  P({ slug: 'claude-design-system', title: 'Claude Design System', universe: 'toon', featured: false,
    description: 'A reusable system prompt for making AI generate premium, non-generic UI. One strong idea, ruthless restraint.',
    tags: ['Design', 'Prompting'] }),
  P({ slug: 'transcript-tool', title: 'Transcript Tool', universe: 'toon', featured: false,
    description: 'Turns recordings into clean, searchable transcripts.',
    tags: ['TypeScript'], repoLink: 'https://github.com/samrht/transcript-tool' }),

  // —— Spider-Verse · everything else ————————————————————————————
  P({ slug: 'founder-discovery', title: 'Founder Discovery', universe: 'verse', featured: false,
    description: 'Finds and scores founders as leads from HN, YC and Reddit; six weighted dimensions, evidence per score, human-edited outreach.',
    tags: ['Next.js', 'Gemini', 'SQLite'], repoLink: 'https://github.com/samrht/founder-discovery' }),
  P({ slug: 'montecarlo-risk-dashboard', title: 'Monte Carlo Risk Dashboard', universe: 'verse', featured: true,
    description: '30,000 simulated market paths in a Web Worker answer "will my SIP reach the goal?" with probabilities, not point estimates.',
    tags: ['TypeScript', 'Web Workers', 'Quant'], link: 'https://montecarlo-risk-dashboard.vercel.app', repoLink: 'https://github.com/samrht/montecarlo-risk-dashboard' }),
  P({ slug: 'siply-smart', title: 'SIPlySmart', universe: 'verse', featured: true,
    description: 'Invest with logic, not vibes: a multi-goal planner that shows the math and rates each goal 😱🙂😎.',
    tags: ['React', 'Vite', 'Fintech'], link: 'https://siplysmart.vercel.app', repoLink: 'https://github.com/samrht/SIPlySmart' }),
  P({ slug: 'ledger-investment-lab', title: 'Ledger', universe: 'verse', featured: false,
    description: 'Local-first investment lab: charts vs SPY, honest risk cards, watchlist with a thesis, portfolio lots.',
    tags: ['React', 'Zustand', 'Recharts'] }),
  P({ slug: 'investing-assistant', title: 'Investing Assistant', universe: 'verse', featured: false,
    description: 'NSE portfolio tracker with live LTP, XIRR, sector allocation and a watchlist with sparklines.',
    tags: ['FastAPI', 'React', 'yfinance'] }),
  P({ slug: 'discord-bot-template', title: 'Discord Bot Template', universe: 'verse', featured: false,
    description: 'Drop-in multifunctional bot: music, blackjack, moderation, modular cogs. Fork it, tear it down.',
    tags: ['Python', 'discord.py'], repoLink: 'https://github.com/samrht/discord-bot-template' }),
]

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}
