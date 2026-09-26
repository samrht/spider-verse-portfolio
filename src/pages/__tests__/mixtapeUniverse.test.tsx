import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUniverseStore } from '../../store/universeStore'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' })))
})

import { Mixtape } from '../Mixtape'

const page = () => document.querySelector('main.viz-page')!

describe('/mixtape universe', () => {
  it('opens in the store universe, not forced to verse', () => {
    useUniverseStore.setState({ activeUniverse: '616' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(page().getAttribute('data-universe')).toBe('616')
    expect(useUniverseStore.getState().activeUniverse).toBe('616')
  })

  it('follows the store when the universe changes', () => {
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    act(() => useUniverseStore.getState().setUniverse('toon'))
    expect(page().getAttribute('data-universe')).toBe('toon')
  })

  it('back link returns to that universe on the comic', () => {
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /back/i }).getAttribute('href')).toBe('/#u-mcu')
  })

  it('renders the page index for switching', () => {
    useUniverseStore.setState({ activeUniverse: 'verse' })
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(screen.getByText(/p\.4\/4/)).toBeInTheDocument()
  })
})
