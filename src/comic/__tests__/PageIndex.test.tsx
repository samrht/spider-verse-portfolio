import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageIndex } from '../PageIndex'
import { PAPER_FALLBACK } from '../../data/stills'

Element.prototype.scrollIntoView = vi.fn()

describe('PageIndex', () => {
  it('reads p.1/4 for the default store state', () => {
    render(<PageIndex />)
    expect(screen.getByText(/p\.1\/4/)).toBeInTheDocument()
  })

  it('falls back a fan thumbnail to the paper texture on load error', () => {
    render(<PageIndex />)
    const thumbs = document.querySelectorAll('.page-index-fan img') as NodeListOf<HTMLImageElement>
    expect(thumbs.length).toBeGreaterThan(0)
    const img = thumbs[0]
    fireEvent.error(img)
    expect(img.getAttribute('src')).toBe(PAPER_FALLBACK)
  })
})
