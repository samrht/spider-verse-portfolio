import { vi } from 'vitest'
import type { DeckControls } from '../../useDeckControls'
import { MIXTAPE_TRACKS } from '../../../../data/mixtape'

export function fakeControls(over: Partial<DeckControls> = {}): DeckControls {
  return {
    track: MIXTAPE_TRACKS[0], movieLabel: 'Into the Spider-Verse', isPlaying: false,
    progress: 30, duration: 120, pct: 25, shuffle: false, repeat: 'off', repeatGlyph: '⤿',
    volume: 0.6, listOpen: false, hidden: false,
    toggle: vi.fn(), next: vi.fn(), prev: vi.fn(), seek: vi.fn(), setVolume: vi.fn(),
    toggleShuffle: vi.fn(), cycleRepeat: vi.fn(), toggleList: vi.fn(), toggleHidden: vi.fn(), show: vi.fn(),
    ...over,
  }
}
