import { useCallback, useEffect, useRef } from 'react'
import { useMixtapeStore } from '../../store/mixtapeStore'

// Deck visibility: ⌄ / H toggles; auto-hide after `idleMs` with no pointer
// movement while playing; any pointer move, tap or H brings it back.

export function useDeckHide(opts: { idleMs?: number } = {}) {
  const idleMs = opts.idleMs ?? 5000
  const hidden = useMixtapeStore((s) => s.deckHidden)
  const isPlaying = useMixtapeStore((s) => s.isPlaying)
  const set = useMixtapeStore((s) => s.setDeckHidden)
  const timer = useRef<number | null>(null)

  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null } }
  const arm = useCallback(() => {
    clear()
    if (!useMixtapeStore.getState().isPlaying) return
    timer.current = window.setTimeout(() => set(true), idleMs)
  }, [idleMs, set])

  const show = useCallback(() => { set(false); arm() }, [set, arm])
  const hide = useCallback(() => { set(true); clear() }, [set])
  const toggle = useCallback(() => {
    if (useMixtapeStore.getState().deckHidden) show()
    else hide()
  }, [show, hide])

  useEffect(() => {
    if (isPlaying) arm()
    else clear()
    return clear
  }, [isPlaying, arm])

  useEffect(() => {
    const onMove = () => { if (useMixtapeStore.getState().deckHidden) set(false); arm() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        toggle()
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [arm, set, toggle])

  return { hidden, show, hide, toggle }
}
