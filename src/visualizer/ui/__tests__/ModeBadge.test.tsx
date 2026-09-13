import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModeBadge } from '../ModeBadge'

describe('ModeBadge', () => {
  it('renders the exact spec labels', () => {
    const { rerender } = render(<ModeBadge kind="live" />)
    expect(screen.getByText('LIVE FFT')).toBeInTheDocument()
    rerender(<ModeBadge kind="beatmap" />)
    expect(screen.getByText('SYNCED')).toBeInTheDocument()
    rerender(<ModeBadge kind="procedural" />)
    expect(screen.getByText('PROCEDURAL')).toBeInTheDocument()
    rerender(<ModeBadge kind="idle" />)
    expect(screen.getByText('PROCEDURAL')).toBeInTheDocument()
  })
})
