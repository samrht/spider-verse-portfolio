import type { Universe } from '../store/universeStore'

export interface UniverseDef {
  id: Universe
  chapter: { number: number; kicker: string; title: string; tagline: string }
  layout: 'splash' | 'grid'
  stillId: string
  caption: string
  sfx: string
  itemSlugs: string[]
}

export const UNIVERSES: readonly UniverseDef[] = [
  { id: '616', layout: 'splash', stillId: 'still-616-hero', sfx: 'THWIP!', itemSlugs: [],
    chapter: { number: 1, kicker: 'EARTH-616 · THE ORIGIN', title: 'ORIGINS', tagline: 'Bitten by a curiosity that never let go.' },
    caption: 'IT ALL STARTED WITH A SPREADSHEET…' },
  { id: 'mcu', layout: 'splash', stillId: 'still-mcu-hero', sfx: 'ACTIVATE.',
    itemSlugs: ['drishti', 'idea-lab', 'execution-os', 'research-agent', 'spider-verse-portfolio'],
    chapter: { number: 2, kicker: 'MCU · THE FLAGSHIP', title: 'FLAGSHIP', tagline: 'The big ones. Shipped, deployed, used.' },
    caption: 'MEANWHILE, IN ANOTHER UNIVERSE…' },
  { id: 'toon', layout: 'grid', stillId: 'still-toon-hero', sfx: 'WHAM!',
    itemSlugs: ['blackhole-sim', 'living-task-canvas', 'algo-trading-starter', 'productivity-dashboard', 'claude-design-system', 'transcript-tool'],
    chapter: { number: 3, kicker: 'SATURDAY MORNING · SIDE QUESTS', title: 'SIDE QUESTS', tagline: 'Experiments, toys, things built to find out.' },
    caption: 'LATER THAT SATURDAY…' },
  { id: 'verse', layout: 'grid', stillId: 'still-verse-hero', sfx: 'BOOM.',
    itemSlugs: ['founder-discovery', 'montecarlo-risk-dashboard', 'siply-smart', 'ledger-investment-lab', 'investing-assistant', 'discord-bot-template'],
    chapter: { number: 4, kicker: 'THE SPIDER-VERSE · EVERYTHING ELSE', title: 'THE MULTIVERSE', tagline: 'Anyone can wear the mask.' },
    caption: 'ACROSS THE SPIDER-VERSE…' },
]

export function universeById(id: Universe): UniverseDef {
  const u = UNIVERSES.find((x) => x.id === id)
  if (!u) throw new Error(`unknown universe ${id}`)
  return u
}
