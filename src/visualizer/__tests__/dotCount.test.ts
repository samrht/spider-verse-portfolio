import { describe, it, expect } from 'vitest'
import { chooseDotCount } from '../dotCount'

describe('chooseDotCount', () => {
  it('is 40000 on desktop', () => {
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440 })).toBe(40000)
  })
  it('is 12000 on a small or weak device', () => {
    expect(chooseDotCount({ dpr: 3, cores: 4, width: 1440 })).toBe(12000)
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 600 })).toBe(12000)
  })
  it('honours ?dots override within 1000..100000', () => {
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440, override: '25000' })).toBe(25000)
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440, override: '5' })).toBe(1000)
    expect(chooseDotCount({ dpr: 1, cores: 8, width: 1440, override: 'x' })).toBe(40000)
  })
})
