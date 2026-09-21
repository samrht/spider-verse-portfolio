import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIssue } from '../NextIssue'
import { STILLS } from '../../data/stills'

vi.mock('../../store/suitStore', () => ({ useSuitStore: (sel: (s: { openSuit: () => void }) => unknown) => sel({ openSuit: vi.fn() }) }))

// Escape regex metacharacters in data-driven titles (e.g. the cover credit's
// literal parentheses) so the matcher tests for the literal substring.
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('NextIssue', () => {
  it('credits every still and shows the takedown note', () => {
    render(<NextIssue />)
    for (const s of STILLS) expect(screen.getAllByText(new RegExp(escapeRegExp(s.credit.title))).length).toBeGreaterThan(0)
    expect(screen.getByText(/not affiliated/i)).toBeInTheDocument()
  })
  it('shows the next-issue teasers and the contact links', () => {
    render(<NextIssue />)
    expect(screen.getAllByText(/NEXT ISSUE/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
  })
})
