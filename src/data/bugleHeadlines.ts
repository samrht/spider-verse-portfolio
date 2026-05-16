import type { Universe } from '../store/universeStore'

export interface Headline {
  id: string
  headline: string
  subhead?: string
  date: string
  universe?: Universe
}

// Phase 1 placeholder front page. Jonah Jameson byline implied.
export const bugleHeadlines: Headline[] = [
  {
    id: 'bugle-001',
    headline: 'LOCAL DEVELOPER FOUND SWINGING THROUGH CODEBASES AT NIGHT',
    subhead: 'Witnesses report "elastic refactors" and "thread-like commits"',
    date: 'Bugle · May 15',
    universe: 'earth-1610',
  },
  {
    id: 'bugle-002',
    headline: 'MULTIVERSE PORTFOLIO DEFIES KNOWN LAWS OF UX',
    subhead: 'Experts baffled by site that "changes color when you scroll"',
    date: 'Bugle · May 14',
  },
  {
    id: 'bugle-003',
    headline: 'WHO IS THE MYSTERIOUS FULL-STACK SPIDER?',
    subhead: 'Bugle exclusive: a developer who claims to ship from four universes',
    date: 'Bugle · May 14',
  },
  {
    id: 'bugle-004',
    headline: 'OSBORN TECH DEMANDS REMOVAL OF OPEN-SOURCE PROJECT',
    subhead: 'Developer responds: "Tear it down. Build it better."',
    date: 'Bugle · May 13',
    universe: 'earth-138',
  },
  {
    id: 'bugle-005',
    headline: 'SPIDER-SENSE CONFIRMED REAL, SAYS LOCAL DEV',
    subhead: 'Avoided prod deploy on a Friday. Coincidence? Bugle thinks not.',
    date: 'Bugle · May 13',
  },
  {
    id: 'bugle-006',
    headline: '"GWEN" — ANONYMOUS DESIGNER STUNS GALLERY WITH WATERCOLOR UI',
    subhead: 'Critics call portfolio "dangerously approachable"',
    date: 'Bugle · May 12',
    universe: 'earth-65',
  },
  {
    id: 'bugle-007',
    headline: 'ALCHEMAX UNVEILS 2099 ROADMAP — DEVELOPER UNIMPRESSED',
    subhead: 'Source: "We had that in a Three.js demo last week."',
    date: 'Bugle · May 12',
    universe: 'earth-928',
  },
  {
    id: 'bugle-008',
    headline: 'SYMBIOTE LEAK CONTAINED — DARK MODE STABLE',
    subhead: 'Engineers warn: "Do not press S, then Y, then M."',
    date: 'Bugle · May 11',
  },
  {
    id: 'bugle-009',
    headline: 'KAREN SIGHTING — VISOR HUD APPEARS IN CORNER OF WEB',
    subhead: 'CLASSIFIED. Phase 2 clearance required.',
    date: 'Bugle · May 11',
  },
  {
    id: 'bugle-010',
    headline: 'GLITCH-FREE UNIVERSE TRANSITIONS — IS NOTHING SACRED?',
    subhead: 'Critics call it "too smooth to be ethical"',
    date: 'Bugle · May 10',
  },
  {
    id: 'bugle-011',
    headline: 'MAYOR DEMANDS ANSWERS ON ROGUE SCROLL-TRIGGERED PORTALS',
    subhead: 'City Hall: "Where do they go? Why are they locked?"',
    date: 'Bugle · May 10',
  },
  {
    id: 'bugle-012',
    headline: '"NEVER HARDCODE A COLOR" — DEV PHILOSOPHY GOES VIRAL',
    subhead: 'CSS custom properties named in police report',
    date: 'Bugle · May 9',
  },
  {
    id: 'bugle-013',
    headline: 'DAILY BUGLE EXCLUSIVE: WEBGL2 SHADER SEEN AT LOCAL DELI',
    subhead: 'Patrons unsettled by halftone dot pattern in the soup',
    date: 'Bugle · May 9',
  },
  {
    id: 'bugle-014',
    headline: 'SPIDER-PUNK TEARS DOWN ANOTHER PAYWALL — FANS REJOICE',
    subhead: 'Anarchy in the IDE. Anarchy in the package registry.',
    date: 'Bugle · May 8',
    universe: 'earth-138',
  },
  {
    id: 'bugle-015',
    headline: 'MILES MORALES SPOTTED REFACTORING IN UNDERGROUND DATA CENTER',
    subhead: 'TypeScript witnesses say it was "the realest thing they\'ve seen"',
    date: 'Bugle · May 8',
    universe: 'earth-1610',
  },
  {
    id: 'bugle-016',
    headline: 'HOWLER.JS UNLOCKS AUDIO CONTEXT ON FIRST MOUSE MOVE',
    subhead: 'Citizens call new policy "actually fine, weirdly"',
    date: 'Bugle · May 7',
  },
  {
    id: 'bugle-017',
    headline: 'LIGHTHOUSE GIVES PORTFOLIO 90+ — JURY STILL OUT',
    subhead: 'Bugle\'s panel of experts argues over CLS for fourteen hours',
    date: 'Bugle · May 7',
  },
  {
    id: 'bugle-018',
    headline: 'EARTH-928 GRID PATTERN HYPNOTIZES SUBWAY RIDERS',
    subhead: '"I just wanted to read a book," says Brooklyn commuter',
    date: 'Bugle · May 6',
    universe: 'earth-928',
  },
  {
    id: 'bugle-019',
    headline: '"PHASE 1 SHIPPED" — INSIDERS CLAIM MORE UNIVERSES ARE COMING',
    subhead: 'Sources at City Hall refused to comment on Phase 2 or Phase 3',
    date: 'Bugle · May 6',
  },
  {
    id: 'bugle-020',
    headline: 'IS YOUR CURSOR A SPIDER? BUGLE INVESTIGATES',
    subhead: 'Hint: yes. And it shoots web threads on click.',
    date: 'Bugle · May 5',
  },
]
