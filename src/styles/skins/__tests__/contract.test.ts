import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(__dirname, '..')
const IDS = ['616', 'mcu', 'toon', 'verse'] as const
export const CONTRACT = [
  '--u-bg', '--u-paper', '--u-ink', '--u-accent', '--u-accent-2',
  '--u-font-display', '--u-font-body', '--u-panel-border', '--u-panel-shadow',
  '--u-caption-bg', '--u-ease', '--u-duration', '--u-scanline',
  '--universe-bg', '--universe-primary', '--universe-accent', '--universe-text',
  '--universe-surface', '--universe-glow',
] as const

describe('skin contract', () => {
  it.each(IDS)('%s.css defines every contract variable inside its [data-universe] scope', (id) => {
    const css = readFileSync(join(DIR, `${id}.css`), 'utf8')
    expect(css).toContain(`[data-universe="${id}"]`)
    for (const v of CONTRACT) expect(css, `${id} missing ${v}`).toMatch(new RegExp(`${v}\\s*:`))
  })
  it('contract.css lists every variable name', () => {
    const css = readFileSync(join(DIR, 'contract.css'), 'utf8')
    for (const v of CONTRACT) expect(css).toContain(v)
  })
})
