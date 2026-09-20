import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaptionBox, SpeechBubble, SfxWord, Still } from '../primitives'
import { ProjectFrame } from '../ProjectFrame'
import { PAPER_FALLBACK } from '../../data/stills'

vi.mock('../../store/audioStore', () => ({ useAudioStore: { getState: () => ({ playFX: vi.fn() }) } }))

const still = { id: 's', universeId: '616' as const, src: '/stills/616/hero.jpg', thumb: '/stills/616/hero-thumb.jpg', alt: 'Spidey', credit: { title: 'ASM', owner: 'Marvel' } }

describe('primitives', () => {
  it('CaptionBox / SpeechBubble / SfxWord render their text with the comic classes', () => {
    render(<><CaptionBox>MEANWHILE…</CaptionBox><SpeechBubble>Hi.</SpeechBubble><SfxWord>THWIP!</SfxWord></>)
    expect(screen.getByText('MEANWHILE…')).toHaveClass('comic-caption')
    expect(screen.getByText('Hi.')).toHaveClass('comic-bubble')
    expect(screen.getByText('THWIP!')).toHaveClass('comic-sfx')
  })
  it('Still lazy-loads by default, eager on request, and falls back to paper on error', () => {
    const { rerender } = render(<Still still={still} />)
    const img = screen.getByAltText('Spidey') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('src')).toBe('/stills/616/hero.jpg')
    fireEvent.error(img)
    expect(img.getAttribute('src')).toBe(PAPER_FALLBACK)
    rerender(<Still still={still} eager />)
    expect(screen.getByAltText('Spidey').getAttribute('loading')).toBe('eager')
  })
})

describe('ProjectFrame', () => {
  const base = { id: 'x', slug: 'x', title: 'DRISHTI', description: 'sat', tags: ['Python', 'CLIP'], universe: 'mcu' as const, featured: true }
  it('links out when a link exists and renders as an article when it does not', () => {
    const { rerender } = render(<ProjectFrame project={{ ...base, link: 'https://x.dev' }} />)
    expect(screen.getByRole('link', { name: /DRISHTI/ })).toHaveAttribute('href', 'https://x.dev')
    rerender(<ProjectFrame project={base} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('article')).toBeInTheDocument()
  })
  it('renders every tag', () => {
    render(<ProjectFrame project={base} />)
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('CLIP')).toBeInTheDocument()
  })
})
