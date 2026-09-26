import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null,
}))
vi.mock('gsap', () => ({ default: { set: vi.fn(), to: vi.fn() } }))

import { Deck } from '../Deck'
import { FACE_IDS } from '../faces'
import { useUniverseStore } from '../../../store/universeStore'
import { useMixtapeStore } from '../../../store/mixtapeStore'

const face = () => document.querySelector('.viz-deck')?.getAttribute('data-face')

beforeEach(() => {
  useUniverseStore.setState({ activeUniverse: 'verse' })
  useMixtapeStore.setState({ deckHidden: false, isPlaying: false })
})

describe('Deck', () => {
  it('renders the face for the active universe', () => {
    render(<Deck />)
    expect(face()).toBe(FACE_IDS.verse)
  })

  it('swaps faces when the universe changes', async () => {
    render(<Deck />)
    act(() => useUniverseStore.setState({ activeUniverse: '616' }))
    await waitFor(() => expect(face()).toBe(FACE_IDS['616']))
  })

  it('two switches inside one fade window end on the last universe', async () => {
    render(<Deck />)
    act(() => useUniverseStore.setState({ activeUniverse: 'mcu' }))
    act(() => useUniverseStore.setState({ activeUniverse: 'toon' }))
    await waitFor(() => expect(face()).toBe(FACE_IDS.toon))
  })

  it('is inert while hidden, including after a universe switch', async () => {
    useMixtapeStore.setState({ deckHidden: true })
    render(<Deck />)
    const deck = () => document.querySelector('.viz-deck')!
    expect(deck().hasAttribute('inert')).toBe(true)
    act(() => useUniverseStore.setState({ activeUniverse: '616' }))
    await waitFor(() => expect(face()).toBe(FACE_IDS['616']))
    expect(deck().hasAttribute('inert')).toBe(true)
    expect(deck().getAttribute('aria-hidden')).toBe('true')
  })
})
