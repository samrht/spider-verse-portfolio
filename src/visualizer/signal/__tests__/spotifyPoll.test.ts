import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { interpolate, slugForSpotifyId, useSpotifyStore } from '../spotifyPoll'
import { MIXTAPE_TRACKS } from '../../../data/mixtape'

describe('interpolate', () => {
  it('adds elapsed wall time to progress', () => {
    expect(interpolate(10_000, 1_000, 3_500)).toBe(12_500)
  })
  it('never goes negative', () => {
    expect(interpolate(0, 5_000, 1_000)).toBe(0)
  })
})

describe('slugForSpotifyId', () => {
  it('maps known ids and returns null otherwise', () => {
    const known = MIXTAPE_TRACKS.find((t) => t.spotifyId)
    if (known) expect(slugForSpotifyId(known.spotifyId!)).toBe(known.slug)
    expect(slugForSpotifyId('nope')).toBeNull()
  })
})

describe('useSpotifyStore polling', () => {
  beforeEach(() => { vi.useFakeTimers(); useSpotifyStore.setState({ status: 'unknown', now: null, lastFetchedAt: 0 }) })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('polls every 3 s and sets playing', async () => {
    const payload = { isPlaying: true, spotifyId: 'x', track: 't', artist: 'a', album: 'b', art: null, progressMs: 100, durationMs: 1000, fetchedAt: 1 }
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload)))
    const stop = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().status).toBe('playing')
    await vi.advanceTimersByTimeAsync(3000)
    expect(f).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(9000)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('goes offline on error payload or network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' })))
    const stop = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().status).toBe('offline')
    stop()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('net'))
    const stop2 = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().status).toBe('offline')
    stop2()
  })
})
