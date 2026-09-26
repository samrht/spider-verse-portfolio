import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { fakeControls } from './fakeControls'
import { GlitchCassette } from '../GlitchCassette'
import { InkedCassette } from '../InkedCassette'
import { HudRing } from '../HudRing'
import { Boombox } from '../Boombox'
import type { Face } from '../index'

const ALL: Array<[string, Face]> = [
  ['glitch-cassette', GlitchCassette],
  ['inked-cassette', InkedCassette],
  ['hud-ring', HudRing],
  ['boombox', Boombox],
]

describe.each(ALL)('%s face contract', (id, FaceC) => {
  it('renders every shared control with its accessible name', () => {
    render(<FaceC c={fakeControls()} />)
    for (const name of ['Track progress', 'Toggle shuffle', 'Previous track', 'Play', 'Next track',
      'Repeat: off', 'Volume', 'Toggle tracklist', 'Hide player (H)']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(fakeControls().track.title)
    expect(document.querySelector(`[data-face="${id}"]`)).not.toBeNull()
  })

  it('shows Pause while playing', () => {
    render(<FaceC c={fakeControls({ isPlaying: true })} />)
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('buttons and ranges call the controls', () => {
    const c = fakeControls()
    render(<FaceC c={c} />)
    fireEvent.click(screen.getByLabelText('Play'))
    fireEvent.click(screen.getByLabelText('Next track'))
    fireEvent.click(screen.getByLabelText('Previous track'))
    fireEvent.click(screen.getByLabelText('Toggle shuffle'))
    fireEvent.click(screen.getByLabelText('Repeat: off'))
    fireEvent.click(screen.getByLabelText('Toggle tracklist'))
    fireEvent.click(screen.getByLabelText('Hide player (H)'))
    fireEvent.change(screen.getByLabelText('Track progress'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '0.2' } })
    expect(c.toggle).toHaveBeenCalled()
    expect(c.next).toHaveBeenCalled()
    expect(c.prev).toHaveBeenCalled()
    expect(c.toggleShuffle).toHaveBeenCalled()
    expect(c.cycleRepeat).toHaveBeenCalled()
    expect(c.toggleList).toHaveBeenCalled()
    expect(c.toggleHidden).toHaveBeenCalled()
    expect(c.seek).toHaveBeenCalledWith(60)
    expect(c.setVolume).toHaveBeenCalledWith(0.2)
  })
})

describe('HudRing keyboard seeking', () => {
  it('keeps a focusable Track progress range even though the arc is the visible control', () => {
    const c = fakeControls()
    render(<HudRing c={c} />)
    const range = screen.getByLabelText('Track progress')
    expect(range.tagName).toBe('INPUT')
    expect(range).not.toHaveAttribute('tabindex', '-1')
    fireEvent.change(range, { target: { value: '90' } })
    expect(c.seek).toHaveBeenCalledWith(90)
  })

  it('a cancelled drag stops hover-seeking', () => {
    const c = fakeControls()
    render(<HudRing c={c} />)
    const svg = document.querySelector('.hud-arc') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 64, height: 64, right: 64, bottom: 64, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 64, clientY: 32 })
    expect(c.seek).toHaveBeenCalledTimes(1)
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 32, clientY: 64 })
    expect(c.seek).toHaveBeenCalledTimes(2)
    fireEvent.pointerCancel(svg, { pointerId: 1 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 0, clientY: 32 })
    expect(c.seek).toHaveBeenCalledTimes(2)
  })
})
