import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFullscreen } from '../useFullscreen'

function installFakeFullscreen(el: HTMLElement) {
  let current: Element | null = null
  const fire = () => document.dispatchEvent(new Event('fullscreenchange'))
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => current })
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true })
  el.requestFullscreen = vi.fn(async () => { current = el; fire() })
  document.exitFullscreen = vi.fn(async () => { current = null; fire() })
}

afterEach(() => {
  delete (document as unknown as Record<string, unknown>).fullscreenElement
  delete (document as unknown as Record<string, unknown>).fullscreenEnabled
})

describe('useFullscreen', () => {
  it('is unsupported when the Fullscreen API is missing', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false })
    const el = document.createElement('main')
    const { result } = renderHook(() => useFullscreen({ current: el }))
    expect(result.current.supported).toBe(false)
  })

  it('toggles in and out and follows the browser state', async () => {
    const el = document.createElement('main')
    installFakeFullscreen(el)
    const { result } = renderHook(() => useFullscreen({ current: el }))
    expect(result.current.supported).toBe(true)
    expect(result.current.active).toBe(false)
    await act(async () => { await result.current.toggle() })
    expect(el.requestFullscreen).toHaveBeenCalled()
    expect(result.current.active).toBe(true)
    await act(async () => { await result.current.toggle() })
    expect(document.exitFullscreen).toHaveBeenCalled()
    expect(result.current.active).toBe(false)
  })

  it('picks up Esc (the browser leaving fullscreen on its own)', async () => {
    const el = document.createElement('main')
    installFakeFullscreen(el)
    const { result } = renderHook(() => useFullscreen({ current: el }))
    await act(async () => { await result.current.toggle() })
    await act(async () => { await document.exitFullscreen() })
    expect(result.current.active).toBe(false)
  })
})
