import { describe, it, expect } from 'vitest'
import { paletteFor } from '../palette'

describe('paletteFor', () => {
  it('returns three colours with the universe primary first', () => {
    const p = paletteFor('616')
    expect(p).toHaveLength(3)
    expect(p[0].getHexString()).toBe('c0392b')
    expect(paletteFor('mcu')[0].getHexString()).toBe('7fb7ff')
  })
})
