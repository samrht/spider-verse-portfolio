import { create } from 'zustand'

export type Universe = 'earth-1610' | 'earth-65' | 'earth-138' | 'earth-928'

export const UNIVERSE_IDS: readonly Universe[] = [
  'earth-1610',
  'earth-65',
  'earth-138',
  'earth-928',
]

interface UniverseState {
  activeUniverse: Universe
  isTransitioning: boolean
  symbioteMode: boolean
  setUniverse: (u: Universe) => void
  setTransitioning: (v: boolean) => void
  toggleSymbiote: () => void
}

const TRANSITION_MS = 800

export const useUniverseStore = create<UniverseState>()((set, get) => ({
  activeUniverse: 'earth-1610',
  isTransitioning: false,
  symbioteMode: false,

  setUniverse: (u) => {
    if (get().activeUniverse === u) return
    set({ isTransitioning: true, activeUniverse: u })
    document.documentElement.setAttribute('data-universe', u)
    window.setTimeout(() => set({ isTransitioning: false }), TRANSITION_MS)
  },

  setTransitioning: (v) => set({ isTransitioning: v }),

  toggleSymbiote: () =>
    set((s) => {
      const next = !s.symbioteMode
      if (next) document.documentElement.setAttribute('data-symbiote', 'true')
      else document.documentElement.removeAttribute('data-symbiote')
      return { symbioteMode: next }
    }),
}))
