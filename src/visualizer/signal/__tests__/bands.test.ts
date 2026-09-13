import { describe, it, expect } from 'vitest'
import { binRange, bandAverage, smooth, BAND_HZ } from '../bands'

describe('binRange', () => {
  it('maps hz to fft bins for 44.1k / 1024', () => {
    // bin width = 44100 / 1024 = 43.07 Hz
    expect(binRange(44100, 1024, 20, 150)).toEqual([0, 3])
    expect(binRange(44100, 1024, 150, 2000)).toEqual([3, 46])
    expect(binRange(44100, 1024, 2000, 16000)).toEqual([46, 371])
  })
  it('never returns an empty range', () => {
    expect(binRange(44100, 1024, 10, 20)).toEqual([0, 1])
  })
})

describe('bandAverage', () => {
  it('returns 0 for silence and 1 for full scale', () => {
    const silent = new Uint8Array(512)
    const loud = new Uint8Array(512).fill(255)
    expect(bandAverage(silent, 0, 10)).toBe(0)
    expect(bandAverage(loud, 0, 10)).toBe(1)
  })
  it('averages only the requested bins', () => {
    const bins = new Uint8Array(512)
    bins[5] = 255
    expect(bandAverage(bins, 5, 6)).toBe(1)
    expect(bandAverage(bins, 0, 5)).toBe(0)
  })
})

describe('smooth', () => {
  it('rises with attack and falls with release', () => {
    expect(smooth(0, 1, 0.5, 0.1)).toBe(0.5)
    expect(smooth(1, 0, 0.5, 0.1)).toBeCloseTo(0.9)
  })
})

describe('BAND_HZ', () => {
  it('matches the spec bands', () => {
    expect(BAND_HZ).toEqual({ bass: [20, 150], mids: [150, 2000], highs: [2000, 16000] })
  })
})
