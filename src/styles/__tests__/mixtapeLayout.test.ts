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
})
