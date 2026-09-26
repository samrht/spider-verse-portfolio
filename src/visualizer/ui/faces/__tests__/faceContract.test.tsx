import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { fakeControls } from './fakeControls'
import { GlitchCassette } from '../GlitchCassette'
import type { Face } from '../index'

const ALL: Array<[string, Face]> = [
  ['glitch-cassette', GlitchCassette],
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
