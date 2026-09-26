import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null,
}))

import { useDeckControls, fmt, repeatGlyphFor } from '../useDeckControls'
import { useMixtapeStore } from '../../../store/mixtapeStore'
import { MIXTAPE_TRACKS, MOVIE_LABEL } from '../../../data/mixtape'

beforeEach(() => {
  useMixtapeStore.setState({ currentIndex: 0, progress: 30, duration: 120, deckHidden: false })
})

describe('useDeckControls', () => {
  it('exposes the current track and derived values', () => {
    const { result } = renderHook(() => useDeckControls())
    expect(result.current.track).toBe(MIXTAPE_TRACKS[0])
    expect(result.current.movieLabel).toBe(MOVIE_LABEL[MIXTAPE_TRACKS[0].movie])
    expect(result.current.pct).toBe(25)
  })

  it('forwards actions to the store', () => {
    const next = vi.fn()
    const seek = vi.fn()
    useMixtapeStore.setState({ next, seek })
    const { result } = renderHook(() => useDeckControls())
    result.current.next()
    result.current.seek(12)
    expect(next).toHaveBeenCalled()
    expect(seek).toHaveBeenCalledWith(12)
  })

  it('toggles the tracklist locally', () => {
    const { result } = renderHook(() => useDeckControls())
    expect(result.current.listOpen).toBe(false)
    act(() => result.current.toggleList())
    expect(result.current.listOpen).toBe(true)
  })

  it('pct is 0 when duration is unknown', () => {
    useMixtapeStore.setState({ duration: 0 })
    const { result } = renderHook(() => useDeckControls())
    expect(result.current.pct).toBe(0)
  })
})

describe('fmt / repeatGlyphFor', () => {
  it('formats seconds and guards bad input', () => {
    expect(fmt(65)).toBe('1:05')
    expect(fmt(NaN)).toBe('0:00')
    expect(fmt(-3)).toBe('0:00')
  })
  it('maps repeat modes to glyphs', () => {
    expect(repeatGlyphFor('off')).toBe('⤿')
    expect(repeatGlyphFor('all')).toBe('↻')
    expect(repeatGlyphFor('one')).toBe('↻¹')
  })
})
