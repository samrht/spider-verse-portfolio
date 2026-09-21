import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUniverseStore } from '../../store/universeStore'

vi.mock('../../components/DailyBugle', () => ({ DailyBugle: () => null }))
vi.mock('../../components/BugleOverlay', () => ({ BugleOverlay: () => null }))
vi.mock('../../components/SuitHUD/SuitHUD', () => ({ SuitHUD: () => null }))
vi.mock('../../components/SymbioteToggle', () => ({ SymbioteToggle: () => null }))
vi.mock('../../components/KarenHUD', () => ({ KarenHUD: () => <div data-testid="karen" /> }))
vi.mock('../../store/audioStore', () => ({ useAudioStore: { getState: () => ({ playFX: vi.fn() }) } }))
vi.mock('lenis', () => ({ default: class { raf() {} destroy() {} } }))
// GSAP must not run against jsdom: useComicMotion dynamic-imports it, so bindAll
// executes against these stubs (the DOM walk stays real, the tweens do not).
vi.mock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), set: vi.fn(), to: vi.fn(), fromTo: vi.fn() } }))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: vi.fn(() => ({ kill: vi.fn() })), refresh: vi.fn() } }))
vi.mock('../../engine/webCursor', () => ({ initCursor: () => () => {} }))
vi.mock('../../engine/spiderSense', () => ({ initSpiderSense: () => () => {} }))
vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })

import { Home } from '../Home'

describe('Home chrome', () => {
  it('shows KAREN only in the MCU universe and the page index everywhere', async () => {
    useUniverseStore.setState({ activeUniverse: '616' })
    const { rerender } = render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.getByText(/p\.1\/4/)).toBeInTheDocument()
    expect(screen.queryByTestId('karen')).toBeNull()
    useUniverseStore.setState({ activeUniverse: 'mcu' })
    rerender(<MemoryRouter><Home /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('karen')).toBeInTheDocument())
    expect(screen.getByText(/p\.2\/4/)).toBeInTheDocument()
  })
})
