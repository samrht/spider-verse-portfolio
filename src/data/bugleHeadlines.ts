import type { Universe } from '../store/universeStore'

export interface Headline {
  id: string
  headline: string
  subhead?: string
  date: string
  universe?: Universe
}

// Tailored to smarth — known associate: ships on Sundays, commits at 3 a.m.,
// won't let a fixed-return assumption near a forecast.
export const bugleHeadlines: Headline[] = [
  {
    id: 'bugle-001',
    headline: 'LOCAL DEV CAUGHT COMMITTING AT 3 A.M. — AGAIN',
    subhead: 'Witnesses say "the IDE never sleeps." Bugle confirms: neither does he.',
    date: 'Bugle · May 17',
    universe: 'earth-1610',
  },
  {
    id: 'bugle-002',
    headline: '"SHIPS ON SUNDAYS" — IS NOTHING SACRED ANYMORE?',
    subhead: 'City officials baffled by developer who treats the weekend like a deploy window',
    date: 'Bugle · May 16',
  },
  {
    id: 'bugle-003',
    headline: 'MONTE CARLO DASHBOARD RUNS 10,000 FUTURES — NONE LOOK GOOD FOR JAMESON',
    subhead: 'Quant simulator dares to ask: "What is the probability of reaching my goal?" Probability: low.',
    date: 'Bugle · May 16',
    universe: 'earth-1610',
  },
  {
    id: 'bugle-004',
    headline: '"INVEST WITH LOGIC, NOT VIBES" — TEENAGERS REJECT VIBES, CITY IN UPROAR',
    subhead: 'SIPlySmart investment planner threatens fundamental basis of crypto influencer economy',
    date: 'Bugle · May 15',
    universe: 'earth-65',
  },
  {
    id: 'bugle-005',
    headline: 'DISCORD BOT PLAYS BLACKJACK, BANS USER, QUEUES SONG IN SAME BREATH',
    subhead: 'Modular cog architecture confirmed real, says Bugle Tech desk',
    date: 'Bugle · May 15',
    universe: 'earth-138',
  },
  {
    id: 'bugle-006',
    headline: 'PORTFOLIO DEFIES KNOWN LAWS OF UX — CHANGES COLOUR WHEN YOU SCROLL',
    subhead: 'Three.js ShaderMaterial named in Bugle investigation; suspect at large',
    date: 'Bugle · May 14',
    universe: 'earth-928',
  },
  {
    id: 'bugle-007',
    headline: 'SPIDER-SENSE CONFIRMED REAL: DEV AVOIDS PROD DEPLOY ON FRIDAY',
    subhead: 'Pushes it Sunday instead. Coincidence? Bugle thinks not.',
    date: 'Bugle · May 14',
  },
  {
    id: 'bugle-008',
    headline: 'BUGLE EXCLUSIVE — WHO IS THE MYSTERIOUS FULL-STACK SPIDER?',
    subhead: 'Anonymous developer claims to ship from four universes; LinkedIn provides no leads',
    date: 'Bugle · May 13',
  },
  {
    id: 'bugle-009',
    headline: 'VALUE AT RISK CALCULATIONS HAUNT WALL STREET MAN IN DREAMS',
    subhead: '"It just kept saying CVaR," sobs anonymous broker outside Chrysler Building',
    date: 'Bugle · May 13',
    universe: 'earth-1610',
  },
  {
    id: 'bugle-010',
    headline: 'SYMBIOTE LEAK CONTAINED — DARK MODE STABLE',
    subhead: 'Engineers warn: "Do not press S, then Y, then M."',
    date: 'Bugle · May 12',
  },
  {
    id: 'bugle-011',
    headline: 'KAREN SIGHTING — VISOR HUD APPEARS IN CORNER OF WEB',
    subhead: 'CLASSIFIED. Phase 2 clearance required.',
    date: 'Bugle · May 12',
  },
  {
    id: 'bugle-012',
    headline: 'GOAL TRACKER RATES USER\'S RETIREMENT PLAN: 😱',
    subhead: 'SIPlySmart emoji-scoring system officially "more honest than my advisor," reports Queens resident',
    date: 'Bugle · May 11',
    universe: 'earth-65',
  },
  {
    id: 'bugle-013',
    headline: 'OSBORN TECH DEMANDS REMOVAL OF OPEN-SOURCE DISCORD BOT',
    subhead: 'Developer responds: "Fork it. Tear it down. Build it better."',
    date: 'Bugle · May 11',
    universe: 'earth-138',
  },
  {
    id: 'bugle-014',
    headline: '"NEVER HARDCODE A COLOUR" — DEV PHILOSOPHY GOES VIRAL',
    subhead: 'CSS custom properties named in police report',
    date: 'Bugle · May 10',
  },
  {
    id: 'bugle-015',
    headline: 'WEB WORKER SPOTTED RUNNING 50,000 MARKET PATHS IN BACKGROUND TAB',
    subhead: 'Browser unbothered. UI thread, untouched. Wall Street, in shambles.',
    date: 'Bugle · May 10',
    universe: 'earth-1610',
  },
  {
    id: 'bugle-016',
    headline: 'ALCHEMAX UNVEILS 2099 ROADMAP — LOCAL DEV UNIMPRESSED',
    subhead: 'Source: "We had that in a Three.js demo last week."',
    date: 'Bugle · May 9',
    universe: 'earth-928',
  },
  {
    id: 'bugle-017',
    headline: 'LIGHTHOUSE GIVES PORTFOLIO 90+ — JURY DELIBERATES',
    subhead: 'Bugle\'s panel of experts argues over CLS for fourteen hours',
    date: 'Bugle · May 9',
  },
  {
    id: 'bugle-018',
    headline: 'GLITCH-FREE UNIVERSE TRANSITIONS — IS NOTHING SACRED?',
    subhead: 'Critics call it "too smooth to be ethical"',
    date: 'Bugle · May 8',
  },
  {
    id: 'bugle-019',
    headline: 'MAYOR DEMANDS ANSWERS ON ROGUE SCROLL-TRIGGERED PORTALS',
    subhead: 'City Hall: "Where do they go? Why are they locked?"',
    date: 'Bugle · May 8',
  },
  {
    id: 'bugle-020',
    headline: 'IS YOUR CURSOR A SPIDER? BUGLE INVESTIGATES',
    subhead: 'Hint: yes. And it shoots web threads on click.',
    date: 'Bugle · May 7',
  },
]
