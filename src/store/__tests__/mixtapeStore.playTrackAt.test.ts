import { describe, it, expect, vi, beforeEach } from 'vitest'

// R11 regression: playTrackAt used to always route through select() + a
// duration-flip subscription. loadMixtapeTrack short-circuits (no new Howl,
// no onLoad) when the engine is already on the requested slug, so that
// subscription would wait forever — "listen along" silently did nothing when
// the local deck already had the Spotify-shown track loaded.
vi.mock('../../engine/mixtapeEngine', () => ({
  getCurrentSlug: vi.fn(() => null),
  getMixtapeDuration: vi.fn(() => 0),
  seekMixtape: vi.fn(),
  loadMixtapeTrack: vi.fn(),
  setMixtapeCallbacks: vi.fn(),
  playMixtape: vi.fn(),
  pauseMixtape: vi.fn(),
  setMixtapeVolume: vi.fn(),
  disposeMixtape: vi.fn(),
  getMediaElement: vi.fn(() => null),
}))

import * as engine from '../../engine/mixtapeEngine'
import { useMixtapeStore } from '../mixtapeStore'
import { MIXTAPE_TRACKS } from '../../data/mixtape'

const slug = MIXTAPE_TRACKS[0].slug
const otherSlug = MIXTAPE_TRACKS[1].slug

describe('mixtapeStore.playTrackAt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMixtapeStore.setState({
      currentIndex: 0,
      isPlaying: false,
      progress: 0,
      duration: 0,
    })
  })

  it('seeks immediately when the same slug is already loaded and playing', () => {
    vi.mocked(engine.getCurrentSlug).mockReturnValue(slug)
    vi.mocked(engine.getMixtapeDuration).mockReturnValue(200)
    useMixtapeStore.setState({ isPlaying: true, currentIndex: 0 })

    useMixtapeStore.getState().playTrackAt(slug, 30)

    expect(engine.seekMixtape).toHaveBeenCalledWith(30)
    expect(useMixtapeStore.getState().progress).toBe(30)
    expect(engine.loadMixtapeTrack).not.toHaveBeenCalled()
  })

  it('clamps the seek position to duration - 1', () => {
    vi.mocked(engine.getCurrentSlug).mockReturnValue(slug)
    vi.mocked(engine.getMixtapeDuration).mockReturnValue(200)
    useMixtapeStore.setState({ isPlaying: true, currentIndex: 0 })

    useMixtapeStore.getState().playTrackAt(slug, 500)

    expect(engine.seekMixtape).toHaveBeenCalledWith(199)
    expect(useMixtapeStore.getState().progress).toBe(199)
  })

  it('selects and defers the seek to the duration subscription for a different slug', () => {
    vi.mocked(engine.getCurrentSlug).mockReturnValue(null)
    vi.mocked(engine.getMixtapeDuration).mockReturnValue(0)

    useMixtapeStore.getState().playTrackAt(otherSlug, 30)

    expect(engine.loadMixtapeTrack).toHaveBeenCalled()
    expect(engine.seekMixtape).not.toHaveBeenCalled()

    // Simulate the engine's onLoad callback flipping duration 0 -> >0.
    useMixtapeStore.setState({ duration: 200 })

    expect(engine.seekMixtape).toHaveBeenCalledWith(30)
  })
})
