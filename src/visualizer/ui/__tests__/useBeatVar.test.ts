import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBeatVar } from '../useBeatVar'
import { createSignal } from '../../signal/types'

let frames: FrameRequestCallback[] = []
beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('useBeatVar', () => {
  it('writes the signal beat to --beat once per frame', () => {
    const el = document.createElement('div')
    const signal = createSignal()
    renderHook(() => useBeatVar({ current: el }, signal))
    signal.beat = 0.8
    frames.shift()!(0)
    expect(el.style.getPropertyValue('--beat')).toBe('0.800')
  })
})
