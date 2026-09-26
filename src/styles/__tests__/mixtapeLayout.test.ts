import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// jsdom has no layout, so these guard the CSS rules the browser pass relied on.
const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8')
const rule = (css: string, selector: string) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('/mixtape layout CSS', () => {
  it('page index ignores the Bugle rail offset (no rail on /mixtape, spec §6 bottom-left)', () => {
    expect(rule(read('mixtape-universe.css'), '.viz-page .page-index')).toMatch(/--bugle-w:\s*0(px)?\s*;/)
  })
  it('boombox transport stays on one row on desktop (no width cap that wraps the hide button)', () => {
    const css = read('faces/boombox.css')
    const desktop = rule(css.split('@media')[0], '.boom-transport')
    expect(desktop).not.toMatch(/max-width/)
    expect(desktop).not.toMatch(/flex-wrap:\s*wrap/)
  })
  it('inked cassette moves the tape to its own row on tablets so Hide stays on screen', () => {
    const tablet = read('faces/inked.css').split('@media (min-width: 768px) and (max-width: 919px)')[1] ?? ''
    expect(rule(tablet, '.face-inked')).toMatch(/flex-wrap:\s*wrap/)
    expect(rule(tablet, '.inked-tape')).toMatch(/flex:\s*1 1 100%/)
  })
  it('verse glitch bar moves the scrubber to its own row on tablets so Hide stays on screen', () => {
    const tablet = read('visualizer.css').split('@media (min-width: 768px) and (max-width: 919px)')[1] ?? ''
    expect(rule(tablet, '.viz-deck-bar')).toMatch(/flex-wrap:\s*wrap/)
    expect(rule(tablet, '.viz-deck-scrub')).toMatch(/flex:\s*1 1 100%/)
  })
  it('phones on /mixtape show the page-index fan so the universe can be switched (home still hides it)', () => {
    const phone = read('mixtape-universe.css').split('@media (max-width: 767px)')[1] ?? ''
    expect(rule(phone, '.viz-page .page-index-fan')).toMatch(/display:\s*grid/)
    expect(rule(phone, '.viz-page .page-index-fan')).toMatch(/grid-template-columns:\s*repeat\(2, auto\)/)
    expect(rule(phone, '.viz-page .page-index-fan img')).toMatch(/width:\s*64px/)
    const homePhone = read('page-index.css').split('@media (max-width: 767px)')[1] ?? ''
    expect(homePhone).toMatch(/\.page-index-fan\s*\{\s*display:\s*none/)
  })
  it('MCU HUD title names Rajdhani at a loaded weight (the global h2 display font must not win)', () => {
    const title = rule(read('faces/hud.css'), '.hud-title')
    expect(title).toMatch(/font-family:\s*'Rajdhani'/)
    expect(title).toMatch(/font-weight:\s*600/)
  })
})
