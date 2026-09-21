import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BugleSkin } from '../BugleSkin'
import { useUniverseStore } from '../../store/universeStore'

vi.mock('../DailyBugle', () => ({ DailyBugle: () => <aside data-testid="bugle" /> }))

describe('BugleSkin', () => {
  it('exposes the active universe as data-skin', () => {
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    const { container, rerender } = render(<BugleSkin />)
    expect(container.querySelector('.bugle-skin')!.getAttribute('data-skin')).toBe('mcu')
    useUniverseStore.setState({ activeUniverse: 'toon' })
    rerender(<BugleSkin />)
    expect(container.querySelector('.bugle-skin')!.getAttribute('data-skin')).toBe('toon')
  })
})
