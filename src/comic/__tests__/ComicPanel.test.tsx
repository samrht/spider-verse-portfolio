import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ComicPanel } from '../ComicPanel'
import { useUniverseStore } from '../../store/universeStore'

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void
let lastCallback: IOCallback | null = null

beforeEach(() => {
  lastCallback = null
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: IOCallback) { lastCallback = cb }
    observe() {} disconnect() {} unobserve() {}
  })
  useUniverseStore.setState({ activeUniverse: '616' })
})

describe('ComicPanel', () => {
  it('renders a section with data-universe and the frame class', () => {
    render(<ComicPanel universe="mcu"><p>hi</p></ComicPanel>)
    const sec = screen.getByText('hi').closest('section')!
    expect(sec.getAttribute('data-universe')).toBe('mcu')
    expect(sec).toHaveClass('comic-panel')
  })
  it('sets the active universe once the panel dominates the viewport', () => {
    render(<ComicPanel universe="toon"><p>x</p></ComicPanel>)
    act(() => lastCallback!([{ intersectionRatio: 0.3 }]))
    expect(useUniverseStore.getState().activeUniverse).toBe('616')
    act(() => lastCallback!([{ intersectionRatio: 0.6 }]))
    expect(useUniverseStore.getState().activeUniverse).toBe('toon')
  })
  it('activates a panel taller than the viewport once it fills most of the screen', () => {
    render(<ComicPanel universe="verse"><p>y</p></ComicPanel>)
    const rootBounds = { height: 740 } as DOMRectReadOnly
    // 2x-viewport panel: ratio can never reach 0.55, but it covers 60% / 100% of the screen
    act(() => lastCallback!([{ intersectionRatio: 0.2, rootBounds, intersectionRect: { height: 296 } as DOMRectReadOnly }]))
    expect(useUniverseStore.getState().activeUniverse).toBe('616')
    act(() => lastCallback!([{ intersectionRatio: 0.3, rootBounds, intersectionRect: { height: 444 } as DOMRectReadOnly }]))
    expect(useUniverseStore.getState().activeUniverse).toBe('verse')
  })
})
