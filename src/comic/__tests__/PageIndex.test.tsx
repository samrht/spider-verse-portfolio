import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageIndex } from '../PageIndex'
import { PAPER_FALLBACK } from '../../data/stills'
import { useUniverseStore } from '../../store/universeStore'

Element.prototype.scrollIntoView = vi.fn()

// jsdom has no PointerEvent, so fireEvent would drop pointerType; a minimal
// stand-in lets the touch vs mouse paths be tested for real.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    pointerType: string
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerType = init.pointerType ?? '' }
  }
  vi.stubGlobal('PointerEvent', PointerEventStub)
}

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

  it('flips to the next page on ArrowRight, but not while a dialog is open', () => {
    const target = document.createElement('section')
    target.id = 'u-mcu'
    const spy = vi.fn()
    target.scrollIntoView = spy
    document.body.appendChild(target)
    render(<PageIndex />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(spy).toHaveBeenCalledTimes(1)
    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(spy).toHaveBeenCalledTimes(1)
    modal.remove()
    target.remove()
  })

  it('calls onSelect instead of scrolling when given one (click and arrow keys)', () => {
    const onSelect = vi.fn()
    useUniverseStore.setState({ activeUniverse: '616' })
    render(<PageIndex onSelect={onSelect} />)
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent?.includes('p.3'))!)
    expect(onSelect).toHaveBeenLastCalledWith('toon')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith('mcu')
  })

  it('a touch tap opens the index with one tap (no hover/focus double-toggle)', () => {
    render(<PageIndex />)
    const label = document.querySelector('.page-index-label') as HTMLButtonElement
    fireEvent.pointerDown(label, { pointerType: 'touch' })
    fireEvent.focus(label)
    fireEvent.click(label)
    expect(label.getAttribute('aria-expanded')).toBe('true')
  })

  it('a mouse still opens the index on hover', () => {
    render(<PageIndex />)
    const nav = document.querySelector('.page-index') as HTMLElement
    fireEvent.pointerEnter(nav, { pointerType: 'mouse' })
    expect(nav.classList.contains('is-open')).toBe(true)
  })
})
