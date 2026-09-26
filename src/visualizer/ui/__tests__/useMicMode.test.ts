import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMicMode, BLOCKED_MS } from '../useMicMode'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('useMicMode', () => {
  it('off → starting → on', () => {
    const { result } = renderHook(() => useMicMode())
    expect(result.current.state).toBe('off')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('starting')
    expect(result.current.on).toBe(true)
    act(() => result.current.report(true))
    expect(result.current.state).toBe('on')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('off')
    expect(result.current.on).toBe(false)
  })

  it('a failed start shows blocked, then returns to off', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMicMode())
    act(() => result.current.toggle())
    act(() => result.current.report(false))
    expect(result.current.state).toBe('blocked')
    expect(result.current.on).toBe(false)
    act(() => { vi.advanceTimersByTime(BLOCKED_MS) })
    expect(result.current.state).toBe('off')
  })

  it('a late success report after turning off is ignored', () => {
    const { result } = renderHook(() => useMicMode())
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    act(() => result.current.report(true))
    expect(result.current.state).toBe('off')
  })
})
