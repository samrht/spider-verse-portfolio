import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUniverseStore } from '../../store/universeStore'

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
})
