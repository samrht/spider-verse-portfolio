import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractPalette, artPalette, fitToBackdrop, clearArtCache } from '../artPalette'
import { relativeLuminance } from '../../engine/vizStyles'
import { UNIVERSE_IDS } from '../../../store/universeStore'

function img(colors: Array<[number, number, number, number]>): Uint8ClampedArray {
  // colors: [r, g, b, count]
  const px: number[] = []
  for (const [r, g, b, n] of colors) for (let i = 0; i < n; i++) px.push(r, g, b, 255)
  return new Uint8ClampedArray(px)
}

beforeEach(() => clearArtCache())

describe('extractPalette', () => {
  it('returns the strongest distinct colours, most dominant first', () => {
    const p = extractPalette(img([[220, 30, 30, 500], [30, 60, 220, 300], [240, 200, 20, 200]]))!
    expect(p).toHaveLength(3)
    expect(p[0]).toMatch(/^#[0-9a-f]{6}$/)
    const r = parseInt(p[0].slice(1, 3), 16), b = parseInt(p[1].slice(5, 7), 16)
    expect(r).toBeGreaterThan(180)
    expect(b).toBeGreaterThan(180)
  })

  it('returns null for a greyscale cover', () => {
    expect(extractPalette(img([[128, 128, 128, 800], [20, 20, 20, 100], [250, 250, 250, 100]]))).toBeNull()
  })

  it('collapses near-duplicate colours; with two colours the third is a lighter first', () => {
    const p = extractPalette(img([[220, 30, 30, 500], [225, 35, 32, 400], [30, 60, 220, 300]]))!
    expect(p).not.toBeNull()
    expect(relativeLuminance(p[2])).toBeGreaterThan(relativeLuminance(p[0]))
  })
})

describe('artPalette', () => {
  it('returns null when the image cannot be read', async () => {
    expect(await artPalette('https://x/a.jpg', async () => null)).toBeNull()
  })

  it('caches per URL', async () => {
    const load = vi.fn(async () => img([[220, 30, 30, 500], [30, 60, 220, 300]]))
    const a = await artPalette('https://x/b.jpg', load)
    const b = await artPalette('https://x/b.jpg', load)
    expect(a).toEqual(b)
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe('fitToBackdrop', () => {
  it('keeps every colour inside the luminance bounds for each universe', () => {
    const pale: [string, string, string] = ['#ffffff', '#fff5cc', '#ccffee']
    const dark: [string, string, string] = ['#000000', '#101020', '#200010']
    for (const u of UNIVERSE_IDS) {
      const light = u === '616' || u === 'toon'
      for (const c of [...fitToBackdrop(pale, u), ...fitToBackdrop(dark, u)]) {
        if (light) expect(relativeLuminance(c)).toBeLessThanOrEqual(0.6)
        else expect(relativeLuminance(c)).toBeGreaterThanOrEqual(0.12)
      }
    }
  })
})
