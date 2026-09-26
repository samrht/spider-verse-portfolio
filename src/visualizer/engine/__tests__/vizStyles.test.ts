import { describe, it, expect } from 'vitest'
import { VIZ_STYLES, DOT_STYLE_INDEX, relativeLuminance } from '../vizStyles'
import { paletteFor } from '../palette'
import { UNIVERSE_IDS } from '../../../store/universeStore'

describe('VIZ_STYLES', () => {
  it('has an entry for every universe', () => {
    for (const u of UNIVERSE_IDS) expect(VIZ_STYLES[u]).toBeDefined()
  })

  it('keeps dots visible on light backdrops: normal blend, no near-white colours', () => {
    for (const u of UNIVERSE_IDS) {
      const s = VIZ_STYLES[u]
      if (!s.lightBackdrop) continue
      expect(s.blend).toBe('normal')
      for (const c of s.palette) expect(relativeLuminance(c)).toBeLessThanOrEqual(0.6)
    }
  })

  it('maps every dot style to a distinct shader index', () => {
    expect(new Set(Object.values(DOT_STYLE_INDEX)).size).toBe(4)
  })

  it('matches the spec table', () => {
    expect(VIZ_STYLES['616']).toMatchObject({ blend: 'normal', dot: 'ink', beatFx: 'swell', lightBackdrop: true })
    expect(VIZ_STYLES.mcu).toMatchObject({ blend: 'additive', dot: 'holo', beatFx: 'pulse', lightBackdrop: false })
    expect(VIZ_STYLES.toon).toMatchObject({ blend: 'normal', dot: 'cel', beatFx: 'bounce', lightBackdrop: true })
    expect(VIZ_STYLES.verse).toMatchObject({ blend: 'additive', dot: 'glitch', beatFx: 'split', lightBackdrop: false })
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1)
  })
})

describe('paletteFor', () => {
  it('reads its colours from VIZ_STYLES', () => {
    for (const u of UNIVERSE_IDS) {
      expect(paletteFor(u).map((c) => '#' + c.getHexString())).toEqual([...VIZ_STYLES[u].palette])
    }
  })
})
