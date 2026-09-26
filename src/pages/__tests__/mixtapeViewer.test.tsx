import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUniverseStore } from '../../store/universeStore'

// jsdom has no WebGL, so the real canvas would flip the page to its static
// fallback (which hides the mic button). A no-op canvas keeps the live view.
vi.mock('../../visualizer/VisualizerCanvas', () => ({ VisualizerCanvas: () => null }))

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: 'unavailable' }))))
  useUniverseStore.setState({ activeUniverse: '616' })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (document as unknown as Record<string, unknown>).fullscreenEnabled
})

import { Mixtape } from '../Mixtape'

describe('/mixtape viewer controls', () => {
  it('hides fullscreen and clip buttons when the browser lacks support', () => {
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(screen.queryByLabelText(/fullscreen/i)).toBeNull()
    expect(screen.queryByLabelText(/record a 10-second clip/i)).toBeNull()
  })

  it('shows the fullscreen button when supported, and F toggles it', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true })
    const request = vi.fn(async () => {})
    HTMLElement.prototype.requestFullscreen = request
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(screen.getByLabelText('Enter fullscreen (F)')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'f' })
    expect(request).toHaveBeenCalled()
  })

  it('F is ignored while typing in a field', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true })
    const request = vi.fn(async () => {})
    HTMLElement.prototype.requestFullscreen = request
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    fireEvent.keyDown(screen.getByLabelText('Volume'), { key: 'f' })
    expect(request).not.toHaveBeenCalled()
  })

  it('shows the mic button when getUserMedia exists, and M toggles it', () => {
    // A running context + a getUserMedia that never settles keeps the mic in 'starting'
    // (deterministic: no async failure flips it to blocked mid-assertion).
    vi.stubGlobal('AudioContext', class { state = 'running'; resume() { return Promise.resolve() } })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => new Promise(() => {})) } })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    const btn = screen.getByLabelText('Turn on room mic (M)')
    expect(btn).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'm' })
    expect(screen.getByLabelText(/room mic/i).getAttribute('aria-pressed')).toBe('true')
    delete (navigator as unknown as Record<string, unknown>).mediaDevices
  })
})
