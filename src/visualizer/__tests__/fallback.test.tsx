import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom has no WebGL: VisualizerCanvas must call onFallback and the page
// must render the static fallback instead of a canvas. Correction (task-12):
// rather than mutating the spotifyPoll store from inside a vi.mock factory,
// stub fetch so the real poll simply goes offline — simpler and more robust.
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ error: 'unavailable' })),
  )
})

import { Mixtape } from '../../pages/Mixtape'

describe('Mixtape without WebGL', () => {
  it('shows the static fallback and the deck', async () => {
    render(<MemoryRouter><Mixtape /></MemoryRouter>)
    expect(await screen.findByTestId('viz-fallback')).toBeInTheDocument()
    expect(screen.getByLabelText('Mixtape deck')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
