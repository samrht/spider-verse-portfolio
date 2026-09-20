import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { interpolatePosition, useSignal } from '../useSignal'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS } from '../../data/mixtape'
import { Procedural } from '../signal/Procedural'
import type { AudioSignal, SignalProvider } from '../signal/types'

// The frame-loop effect calls requestAnimationFrame(loop) recursively
// forever. Only the FIRST call actually invokes the callback (synchronously),
// so provider.sample() runs exactly once per test — deterministic, no real
// frame timing, no infinite recursion.
function mockRaf() {
  let calls = 0
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: FrameRequestCallback) => {
      calls += 1
      if (calls === 1) cb(0)
      return calls
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

describe('useSignal', () => {
  beforeEach(() => {
    useMixtapeStore.setState({ isPlaying: true, currentIndex: 0, progress: 0 })
    mockRaf()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useMixtapeStore.setState({ isPlaying: false, currentIndex: 0, progress: 0 })
  })

  // Regression for the branch-on-return-value bug: when `makeBeatMap` is
  // supplied, its result must be final. A `null` return means "no map for
  // this track, use Procedural" — never a fall-through to the network
  // `loadBeatMap` fetch (that path is only for when `makeBeatMap` itself is
  // absent).
  it('does not fetch when makeBeatMap is supplied and returns null', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))

    const { result } = renderHook(() =>
      useSignal({ beatMapFor: () => true, makeBeatMap: () => null }),
    )

    // Synchronous: selectProvider only reads isPlaying/analyserAvailable/
    // beatMapFor, no jsdom AudioContext means analyserAvailable is false, so
    // this resolves to 'beatmap' on the very first render.
    expect(result.current.kind).toBe('beatmap')

    await waitFor(() => expect(result.current.signal.mode).toBe('procedural'))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the provider makeBeatMap supplies, without touching loadBeatMap', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))
    const stub: SignalProvider = {
      mode: 'synced',
      start: vi.fn(async () => {}),
      stop: vi.fn(),
      sample: vi.fn((out: AudioSignal) => { out.mode = 'synced' }),
    }

    const { result } = renderHook(() =>
      useSignal({ beatMapFor: () => true, makeBeatMap: () => stub }),
    )

    await waitFor(() => expect(result.current.signal.mode).toBe('synced'))
    expect(stub.start).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // R16: a provider whose start() rejects must not leave the hook stuck (or
  // surface an unhandled rejection) — it falls through to Procedural.
  it('falls through to Procedural when the picked provider fails to start', async () => {
    const stub: SignalProvider = {
      mode: 'synced',
      start: vi.fn(async () => { throw new Error('AudioContext not running') }),
      stop: vi.fn(),
      sample: vi.fn((out: AudioSignal) => { out.mode = 'synced' }),
    }
    const proceduralStart = vi.spyOn(Procedural.prototype, 'start')

    const { result } = renderHook(() =>
      useSignal({ beatMapFor: () => true, makeBeatMap: () => stub }),
    )
    expect(result.current.kind).toBe('beatmap')

    await waitFor(() => expect(proceduralStart).toHaveBeenCalled())
    expect(stub.start).toHaveBeenCalled()
    expect(stub.sample).not.toHaveBeenCalled()
    expect(result.current.signal.mode).toBe('procedural')
  })

  // R14: the emblem effect keys on trackKey, so it must move only on a real
  // track change — never on pause/resume.
  it('keeps trackKey across pause/resume and changes it on a track change', () => {
    const slug0 = MIXTAPE_TRACKS[0].slug
    const slug1 = MIXTAPE_TRACKS[1].slug
    const { result } = renderHook(() => useSignal({ beatMapFor: () => false }))
    expect(result.current.trackKey).toBe(slug0)

    act(() => useMixtapeStore.setState({ isPlaying: false }))
    expect(result.current.kind).toBe('idle')
    expect(result.current.trackKey).toBe(slug0)

    act(() => useMixtapeStore.setState({ isPlaying: true }))
    expect(result.current.trackKey).toBe(slug0)

    act(() => useMixtapeStore.setState({ currentIndex: 1 }))
    expect(result.current.trackKey).toBe(slug1)
  })

  it('uses the Spotify slug as trackKey only while synced (nothing playing locally)', () => {
    const slug0 = MIXTAPE_TRACKS[0].slug
    const spotify = { playing: true, slug: 'owner-track', position: () => 0 }
    const { result, rerender } = renderHook(
      ({ playing }: { playing: boolean }) => useSignal({ beatMapFor: () => true, makeBeatMap: () => null, spotify: { ...spotify, playing } }),
      { initialProps: { playing: true } },
    )
    // Local deck playing: the local slug wins even though Spotify is live.
    expect(result.current.trackKey).toBe(slug0)
    act(() => useMixtapeStore.setState({ isPlaying: false }))
    expect(result.current.kind).toBe('beatmap')
    expect(result.current.trackKey).toBe('owner-track')
    // Owner stops: back to the local slug, not 'procedural'.
    rerender({ playing: false })
    expect(result.current.kind).toBe('idle')
    expect(result.current.trackKey).toBe(slug0)
  })

  // R13: playback position is interpolated between the 250 ms progress
  // polls while playing, and re-stamped whenever progress changes.
  it('nowSeconds() advances between calls while playing and re-stamps on a progress change', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    useMixtapeStore.setState({ progress: 10 })
    const { result } = renderHook(() => useSignal({ beatMapFor: () => true, makeBeatMap: () => null }))
    expect(result.current.kind).toBe('beatmap')
    const a = result.current.nowSeconds()
    now.mockReturnValue(1500)
    const b = result.current.nowSeconds()
    expect(a).toBeCloseTo(10)
    expect(b).toBeCloseTo(10.5)
    expect(b).toBeGreaterThan(a)

    now.mockReturnValue(2000)
    act(() => useMixtapeStore.setState({ progress: 12 }))
    now.mockReturnValue(2250)
    expect(result.current.nowSeconds()).toBeCloseTo(12.25)
  })

  it('interpolatePosition holds the stamped position while paused and never goes negative', () => {
    expect(interpolatePosition(10, 1000, 2500, false)).toBe(10)
    expect(interpolatePosition(10, 1000, 2500, true)).toBeCloseTo(11.5)
    expect(interpolatePosition(10, 3000, 2500, true)).toBe(10) // clock went backwards
    expect(interpolatePosition(-1, 1000, 1000, true)).toBe(0)
  })
})
