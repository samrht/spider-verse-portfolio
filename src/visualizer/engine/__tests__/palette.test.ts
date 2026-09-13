import { describe, it, expect } from 'vitest'
import { paletteFor } from '../palette'

describe('paletteFor', () => {
  it('returns three colours with the universe primary first', () => {
    const p = paletteFor('earth-1610')
    expect(p).toHaveLength(3)
    expect(p[0].getHexString()).toBe('ff2d2d')
    expect(paletteFor('earth-928')[0].getHexString()).toBe('00d4ff')
  })
})
