import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null, getMediaElement: () => null,
}))

import { useArtPalette } from '../useArtPalette'
import { useSpotifyStore } from '../../signal/spotifyPoll'
import { useMixtapeStore } from '../../../store/mixtapeStore'
import { useUniverseStore } from '../../../store/universeStore'
import type { Palette3 } from '../../signal/artPalette'

const RED: Palette3 = ['#dd2222', '#2244dd', '#eecc22']
const now = (art: string) => ({ spotifyId: 'x', track: 't', artist: 'a', album: 'al', art, durationMs: 1, progressMs: 0 })

beforeEach(() => {
  useMixtapeStore.setState({ isPlaying: false })
  useUniverseStore.setState({ activeUniverse: 'mcu' })
  useSpotifyStore.setState({ status: 'playing', now: now('https://i/a.jpg') } as never)
})

describe('useArtPalette', () => {
  it('returns fitted album colours while Spotify plays and nothing local or mic', async () => {
    const load = vi.fn(async () => RED)
    const { result } = renderHook(() => useArtPalette({ micOn: false, load }))
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current).toHaveLength(3)
  })

  it('is null when a local track plays, when the mic is on, or when Spotify is idle', async () => {
    const load = vi.fn(async () => RED)
    useMixtapeStore.setState({ isPlaying: true })
    const a = renderHook(() => useArtPalette({ micOn: false, load }))
    expect(a.result.current).toBeNull()
    useMixtapeStore.setState({ isPlaying: false })
    const b = renderHook(() => useArtPalette({ micOn: true, load }))
    expect(b.result.current).toBeNull()
    useSpotifyStore.setState({ status: 'idle' } as never)
    const c = renderHook(() => useArtPalette({ micOn: false, load }))
    expect(c.result.current).toBeNull()
  })

  it('latest cover wins when a slow earlier load resolves after a newer one', async () => {
    let resolveSlow: (p: Palette3) => void = () => {}
    const load = vi.fn((url: string) => url.endsWith('a.jpg')
      ? new Promise<Palette3>((r) => { resolveSlow = r })
      : Promise.resolve<Palette3>(['#22dd22', '#2244dd', '#dd22dd']))
    const { result } = renderHook(() => useArtPalette({ micOn: false, load }))
    act(() => { useSpotifyStore.setState({ now: now('https://i/b.jpg') } as never) })
    await waitFor(() => expect(result.current).not.toBeNull())
    const newer = result.current
    await act(async () => { resolveSlow(RED) })
    expect(result.current).toEqual(newer)
  })

  it('a greyscale or unreadable cover gives null', async () => {
    const load = vi.fn(async () => null)
    const { result } = renderHook(() => useArtPalette({ micOn: false, load }))
    await act(async () => { await Promise.resolve() })
    expect(result.current).toBeNull()
  })
})
