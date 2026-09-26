import { useCallback, useEffect, useState } from 'react'
import { MicFFT } from '../signal/MicFFT'

// Mic mode state (listen-modes spec §3.1). The page's useSignal reports
// whether MicFFT actually started; a failure shows "blocked" briefly.
export const BLOCKED_MS = 4000
export type MicState = 'off' | 'starting' | 'on' | 'blocked'

export function useMicMode() {
  const [supported] = useState(() => MicFFT.available())
  const [state, setState] = useState<MicState>('off')

  const toggle = useCallback(() => {
    setState((s) => (s === 'off' || s === 'blocked' ? 'starting' : 'off'))
  }, [])

  const report = useCallback((ok: boolean) => {
    setState((s) => (s === 'starting' ? (ok ? 'on' : 'blocked') : s))
  }, [])

  useEffect(() => {
    if (state !== 'blocked') return
    const t = window.setTimeout(() => setState((s) => (s === 'blocked' ? 'off' : s)), BLOCKED_MS)
    return () => window.clearTimeout(t)
  }, [state])

  return { supported, state, on: state === 'starting' || state === 'on', toggle, report }
}
