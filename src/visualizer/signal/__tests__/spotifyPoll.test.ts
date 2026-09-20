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

  // R15: the interpolated position must include the response's CDN age,
  // so lastFetchedAt is the SERVER stamp when it is plausible ...
  it('interpolates from the server fetchedAt (includes response age)', async () => {
    const now = Date.now()
    const payload = { isPlaying: true, spotifyId: 'x', track: 't', artist: 'a', album: 'b', art: null, progressMs: 10_000, durationMs: 100_000, fetchedAt: now - 2500 }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload)))
    const stop = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().lastFetchedAt).toBe(now - 2500)
    expect(useSpotifyStore.getState().positionMs()).toBeCloseTo(12_500, -1)
    stop()
  })

  // ... and falls back to the local clock when it is not (visitor clock skew).
  it('falls back to the local stamp when the server fetchedAt is implausible', async () => {
    const now = Date.now()
    const payload = { isPlaying: true, spotifyId: 'x', track: 't', artist: 'a', album: 'b', art: null, progressMs: 10_000, durationMs: 100_000, fetchedAt: now - 999_999 }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload)))
    const stop = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().lastFetchedAt).toBe(Date.now())
    expect(useSpotifyStore.getState().positionMs()).toBeCloseTo(10_000, -1)
    stop()
    // A stamp from the future (skew the other way) also falls back.
    const future = { ...payload, fetchedAt: Date.now() + 5000 }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(future)))
    const stop2 = useSpotifyStore.getState().start()
    await vi.advanceTimersByTimeAsync(0)
    expect(useSpotifyStore.getState().lastFetchedAt).toBe(Date.now())
    stop2()
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
