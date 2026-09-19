import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSignal } from '../useSignal'
import { useMixtapeStore } from '../../store/mixtapeStore'
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
    useMixtapeStore.setState({ isPlaying: true, currentIndex: 0 })
    mockRaf()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useMixtapeStore.setState({ isPlaying: false })
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
})
