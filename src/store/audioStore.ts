import { create } from 'zustand'
import { useUniverseStore, type Universe } from './universeStore'
import {
  playAmbient,
  playFX,
  setMuted,
  stopAmbient,
  unlockAudio,
} from '../engine/soundEngine'

interface AudioState {
  isMuted: boolean
  isUnlocked: boolean
  unlock: () => void
  toggleMute: () => void
  playAmbient: (universe: Universe) => void
  stopAmbient: () => void
  playFX: (name: string) => void
}

const STORAGE_MUTE_KEY = 'spv-muted'

function readPersistedMute(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_MUTE_KEY) === '1'
}

const initialMuted = readPersistedMute()

export const useAudioStore = create<AudioState>()((set, get) => ({
  isMuted: initialMuted,
  isUnlocked: false,

  unlock: () => {
    if (get().isUnlocked) return
    unlockAudio()
    setMuted(get().isMuted)
    set({ isUnlocked: true })
  },

  toggleMute: () => {
    const next = !get().isMuted
    setMuted(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_MUTE_KEY, next ? '1' : '0')
    }
    set({ isMuted: next })
  },

  playAmbient: (universe) => {
    if (!get().isUnlocked || get().isMuted) return
    playAmbient(universe)
  },

  stopAmbient: () => stopAmbient(),

  playFX: (name) => {
    if (!get().isUnlocked || get().isMuted) return
    playFX(name)
  },
}))

// First mousemove unlocks the AudioContext. Lives at module scope so it
// installs once, independent of React mount cycles.
if (typeof window !== 'undefined') {
  const handler = () => {
    useAudioStore.getState().unlock()
    window.removeEventListener('mousemove', handler)
    window.removeEventListener('touchstart', handler)
    window.removeEventListener('keydown', handler)
  }
  window.addEventListener('mousemove', handler, { passive: true, once: false })
  window.addEventListener('touchstart', handler, { passive: true, once: false })
  window.addEventListener('keydown', handler)

  // Cross-fade ambient when the active universe changes.
  useUniverseStore.subscribe((state, prev) => {
    if (state.activeUniverse !== prev.activeUniverse) {
      useAudioStore.getState().playAmbient(state.activeUniverse)
    }
  })
}
