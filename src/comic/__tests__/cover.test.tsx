import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cover } from '../Cover'
import { COVER } from '../../data/cover'
import { stillById } from '../../data/stills'

describe('Cover', () => {
  it('renders masthead, issue, an eager cover still and four cover-line anchors', () => {
    render(<Cover />)
    expect(screen.getByRole('heading', { level: 1, name: COVER.masthead })).toBeInTheDocument()
    expect(screen.getByText(COVER.issue)).toBeInTheDocument()
    expect((screen.getByAltText(stillById(COVER.stillId)!.alt) as HTMLImageElement).getAttribute('loading')).toBe('eager')
    const links = screen.getAllByRole('link', { name: /!|MASK/ })
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#u-616', '#u-mcu', '#u-toon', '#u-verse'])
  })
})
