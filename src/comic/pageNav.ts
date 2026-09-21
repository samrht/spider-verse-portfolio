import { UNIVERSE_IDS, type Universe } from '../store/universeStore'

const LABEL: Record<Universe, string> = { '616': 'EARTH-616', mcu: 'MCU', toon: 'SATURDAY MORNING', verse: 'SPIDER-VERSE' }

export function labelFor(id: Universe): string { return LABEL[id] }
export function pageOf(id: Universe): number { return UNIVERSE_IDS.indexOf(id) + 1 }
export function nextUniverse(current: Universe, dir: 1 | -1): Universe {
  const i = UNIVERSE_IDS.indexOf(current)
  const j = Math.min(UNIVERSE_IDS.length - 1, Math.max(0, i + dir))
  return UNIVERSE_IDS[j]
}
export function scrollToUniverse(id: Universe): void {
  document.getElementById(`u-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
