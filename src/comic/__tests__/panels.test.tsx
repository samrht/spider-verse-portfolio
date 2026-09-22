import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SplashPanel } from '../SplashPanel'
import { GridPanel } from '../GridPanel'
import { universeById } from '../../data/universes'

vi.mock('../../store/audioStore', () => ({ useAudioStore: { getState: () => ({ playFX: vi.fn() }) } }))
vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })

describe('SplashPanel', () => {
  it('616 shows the bio, the chapter title, the still and the sfx word', () => {
    render(<SplashPanel universe="616" />)
    expect(screen.getByRole('heading', { level: 2, name: 'ORIGINS' })).toBeInTheDocument()
    expect(screen.getByAltText(/classic comic art/i)).toBeInTheDocument()
    expect(screen.getByTestId('focus-bio')).toBeInTheDocument()
    expect(screen.getByText(universeById('616').sfx)).toHaveClass('comic-sfx')
  })
  it('mcu shows the first flagship project as the focus block and lists the rest', () => {
    render(<SplashPanel universe="mcu" />)
    const mcu = universeById('mcu')
    expect(screen.getByTestId('focus-project')).toHaveTextContent('DRISHTI')
    const rest = screen.getByTestId('splash-rest')
    expect(within(rest).getAllByRole('listitem')).toHaveLength(mcu.itemSlugs.length - 1)
  })
})

describe('GridPanel', () => {
  it('renders one frame per item plus the bubble and sfx word', () => {
    render(<GridPanel universe="toon" />)
    const toon = universeById('toon')
    expect(screen.getAllByTestId('grid-frame')).toHaveLength(toon.itemSlugs.length)
    expect(screen.getByText(toon.chapter.tagline)).toHaveClass('comic-bubble')
    expect(screen.getByText(toon.sfx)).toHaveClass('comic-sfx')
  })
})
