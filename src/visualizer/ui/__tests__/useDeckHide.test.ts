import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeckHide } from '../useDeckHide'
import { useMixtapeStore } from '../../../store/mixtapeStore'

describe('useDeckHide', () => {
  beforeEach(() => { vi.useFakeTimers(); useMixtapeStore.setState({ deckHidden: false, isPlaying: false }) })
  afterEach(() => vi.useRealTimers())

  it('toggle flips store state', () => {
    const { result } = renderHook(() => useDeckHide())
    act(() => result.current.toggle())
    expect(useMixtapeStore.getState().deckHidden).toBe(true)
    act(() => result.current.toggle())
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
  })

  it('H key toggles', () => {
    renderHook(() => useDeckHide())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })) })
    expect(useMixtapeStore.getState().deckHidden).toBe(true)
  })

  it('auto-hides after idleMs while playing, not while paused', () => {
    useMixtapeStore.setState({ isPlaying: true })
    renderHook(() => useDeckHide({ idleMs: 5000 }))
    act(() => { vi.advanceTimersByTime(5001) })
    expect(useMixtapeStore.getState().deckHidden).toBe(true)

    useMixtapeStore.setState({ deckHidden: false, isPlaying: false })
    act(() => { vi.advanceTimersByTime(6000) })
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
  })

  it('pointer movement shows the deck and restarts the idle timer', () => {
    useMixtapeStore.setState({ isPlaying: true, deckHidden: true })
    renderHook(() => useDeckHide({ idleMs: 5000 }))
    act(() => { window.dispatchEvent(new Event('pointermove')) }) // jsdom has no PointerEvent
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(useMixtapeStore.getState().deckHidden).toBe(false)
    act(() => { vi.advanceTimersByTime(1001) })
    expect(useMixtapeStore.getState().deckHidden).toBe(true)
  })
})
