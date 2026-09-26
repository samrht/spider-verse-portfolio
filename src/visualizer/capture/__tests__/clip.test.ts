import { describe, it, expect, vi } from 'vitest'
import { pickMimeType, clipFilename, coverRect, drawComposite, CLIP_W, CLIP_H } from '../clip'

describe('pickMimeType', () => {
  it('prefers webm with opus, then plain webm, then mp4', () => {
    expect(pickMimeType(() => true)).toEqual({ mime: 'video/webm;codecs=vp9,opus', ext: 'webm' })
    expect(pickMimeType((t) => t === 'video/webm')).toEqual({ mime: 'video/webm', ext: 'webm' })
    expect(pickMimeType((t) => t === 'video/mp4')).toEqual({ mime: 'video/mp4', ext: 'mp4' })
  })
  it('returns null when nothing is supported', () => {
    expect(pickMimeType(() => false)).toBeNull()
  })
})

describe('clipFilename', () => {
  it('slugs universe and track', () => {
    expect(clipFilename('616', "What's Up Danger", 'webm')).toBe('mixtape-616-whats-up-danger.webm')
    expect(clipFilename('mcu', '  Sunflower (Spider-Man)  ', 'mp4')).toBe('mixtape-mcu-sunflower-spider-man.mp4')
  })
  it('falls back when the title slugs to nothing', () => {
    expect(clipFilename('toon', '???', 'webm')).toBe('mixtape-toon-clip.webm')
  })
})

describe('coverRect', () => {
  it('fills the destination, cropping the overflowing axis, centred', () => {
    // 1600x900 source into 1280x720: same aspect → exact fit
    expect(coverRect(1600, 900, 1280, 720)).toEqual({ x: 0, y: 0, w: 1280, h: 720 })
    // tall 390x844 source into 1280x720: scale to width, crop top/bottom
    const r = coverRect(390, 844, 1280, 720)
    expect(r.w).toBe(1280)
    expect(r.h).toBeCloseTo(844 * (1280 / 390))
    expect(r.x).toBe(0)
    expect(r.y).toBeCloseTo((720 - r.h) / 2)
  })
})

describe('drawComposite', () => {
  function fakeCtx() {
    const calls: string[] = []
    const grad = { addColorStop: vi.fn() }
    const ctx = {
      calls,
      fillStyle: '' as unknown,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      createRadialGradient: vi.fn(() => grad),
      fillRect: vi.fn((...a: number[]) => calls.push(`fillRect:${a.join(',')}`)),
      drawImage: vi.fn(() => calls.push('drawImage')),
      fillText: vi.fn((t: string) => calls.push(`text:${t}`)),
    }
    return ctx
  }

  it('draws backdrop, then the dots, then the caption strip with track, universe and watermark', () => {
    const ctx = fakeCtx()
    const src = { width: 1280, height: 720 } as HTMLCanvasElement
    drawComposite(ctx as unknown as CanvasRenderingContext2D, src, {
      universe: '616', universeLabel: 'EARTH-616', title: 'Hero', artist: 'Chad Kroeger', watermark: 'example.app',
    })
    expect(ctx.calls[0]).toBe(`fillRect:0,0,${CLIP_W},${CLIP_H}`)
    expect(ctx.calls[1]).toBe('drawImage')
    expect(ctx.calls).toContain('text:Hero — Chad Kroeger')
    expect(ctx.calls).toContain('text:EARTH-616 · MIXTAPE')
    expect(ctx.calls).toContain('text:example.app')
  })

  it('skips the dots when the source has no size yet', () => {
    const ctx = fakeCtx()
    drawComposite(ctx as unknown as CanvasRenderingContext2D, { width: 0, height: 0 } as HTMLCanvasElement, {
      universe: 'verse', universeLabel: 'SPIDER-VERSE', title: 'X', artist: 'Y', watermark: 'w',
    })
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })
})
