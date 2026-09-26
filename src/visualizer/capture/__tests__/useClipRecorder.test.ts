import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../../engine/mixtapeEngine', () => ({
  disposeMixtape: vi.fn(), loadMixtapeTrack: vi.fn(), pauseMixtape: vi.fn(), playMixtape: vi.fn(),
  seekMixtape: vi.fn(), setMixtapeCallbacks: vi.fn(), setMixtapeVolume: vi.fn(),
  getMixtapeDuration: () => 0, getCurrentSlug: () => null, getMediaElement: () => null,
}))

import { useClipRecorder, clipSupported } from '../useClipRecorder'
import { useUniverseStore } from '../../../store/universeStore'
import { useMixtapeStore } from '../../../store/mixtapeStore'

// jsdom has no MediaRecorder / MediaStream / canvas.captureStream / 2D context:
// minimal stand-ins so the recorder's lifecycle can be exercised for real.
const recorders: FakeRecorder[] = []
const lastRecorder = () => recorders[recorders.length - 1]
class FakeRecorder {
  static isTypeSupported = (t: string) => t === 'video/webm'
  state: 'inactive' | 'recording' = 'inactive'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  mimeType: string
  constructor(_s: unknown, opts: { mimeType: string }) { this.mimeType = opts.mimeType; recorders.push(this) }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['x'], { type: this.mimeType }) }); this.onstop?.() }
}
class FakeStream {
  tracks: Array<{ stop: () => void }>
  constructor(tracks: Array<{ stop: () => void }> = []) { this.tracks = tracks }
  getTracks() { return this.tracks }
  getVideoTracks() { return this.tracks }
  getAudioTracks() { return [] }
}
const ctx2d = {
  createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(),
  fillStyle: '', font: '', textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1,
}

let clicked: string[] = []
beforeEach(() => {
  vi.useFakeTimers()
  clicked = []
  recorders.length = 0
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.stubGlobal('MediaStream', FakeStream)
  Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', { configurable: true, value: () => new FakeStream([{ stop: vi.fn() }]) })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx2d as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download) })
  URL.createObjectURL = vi.fn(() => 'blob:clip')
  URL.revokeObjectURL = vi.fn()
  useUniverseStore.setState({ activeUniverse: 'mcu' })
  useMixtapeStore.setState({ currentIndex: 0 })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).captureStream
})

describe('useClipRecorder', () => {
  it('is unsupported without MediaRecorder', () => {
    vi.unstubAllGlobals()
    expect(clipSupported()).toBe(false)
  })

  it('records for 10 s, exposes a frame sink while recording, then saves a named file', () => {
    const { result } = renderHook(() => useClipRecorder())
    expect(result.current.supported).toBe(true)
    act(() => result.current.start())
    expect(result.current.recording).toBe(true)
    expect(result.current.secondsLeft).toBe(10)
    result.current.sink!.draw({ width: 1280, height: 720 } as HTMLCanvasElement)
    expect(ctx2d.drawImage).toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(result.current.recording).toBe(false)
    expect(result.current.sink).toBeNull()
    expect(clicked).toEqual(['mixtape-mcu-whats-up-danger.webm'])
  })

  it('stop() ends early and still saves', () => {
    const { result } = renderHook(() => useClipRecorder())
    act(() => result.current.start())
    act(() => { vi.advanceTimersByTime(3000) })
    act(() => result.current.stop())
    expect(result.current.recording).toBe(false)
    expect(clicked).toHaveLength(1)
  })

  it('a second start while recording is ignored', () => {
    const { result } = renderHook(() => useClipRecorder())
    act(() => result.current.start())
    const first = lastRecorder()
    act(() => result.current.start())
    expect(lastRecorder()).toBe(first)
    act(() => result.current.stop())
  })

  it('start({ withAudio: false }) records video only', () => {
    const { result } = renderHook(() => useClipRecorder())
    act(() => result.current.start({ withAudio: false }))
    expect(result.current.recording).toBe(true)
    act(() => result.current.stop())
  })
})
