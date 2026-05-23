import { create } from 'zustand'
import { MIXTAPE_TRACKS } from '../data/mixtape'
import {
  disposeMixtape,
  loadMixtapeTrack,
  pauseMixtape,
  playMixtape,
  seekMixtape,
  setMixtapeCallbacks,
  setMixtapeVolume,
  getMixtapeDuration,
} from '../engine/mixtapeEngine'
import { useAudioStore } from './audioStore'
import { useUniverseStore } from './universeStore'

type RepeatMode = 'off' | 'all' | 'one'

interface MixtapeState {
  currentIndex: number
  isPlaying: boolean
  shuffle: boolean
  repeat: RepeatMode
  volume: number
  progress: number
  duration: number
  shuffleOrder: number[]

  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  select: (index: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setVolume: (v: number) => void
  seek: (s: number) => void
}

const STORAGE_KEY = 'spv-mixtape'

interface Persisted {
  currentIndex: number
  shuffle: boolean
  repeat: RepeatMode
  volume: number
}

function readPersisted(): Persisted {
  const defaults: Persisted = {
    currentIndex: 0,
    shuffle: false,
    repeat: 'off',
    volume: 0.6,
  }
  if (typeof window === 'undefined') return defaults
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      currentIndex:
        typeof parsed.currentIndex === 'number' &&
        parsed.currentIndex >= 0 &&
        parsed.currentIndex < MIXTAPE_TRACKS.length
          ? parsed.currentIndex
          : defaults.currentIndex,
      shuffle: parsed.shuffle ?? defaults.shuffle,
      repeat:
        parsed.repeat === 'all' || parsed.repeat === 'one' || parsed.repeat === 'off'
          ? parsed.repeat
          : defaults.repeat,
      volume:
        typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : defaults.volume,
    }
  } catch {
    return defaults
  }
}

function persist(state: MixtapeState) {
  if (typeof window === 'undefined') return
  const payload: Persisted = {
    currentIndex: state.currentIndex,
    shuffle: state.shuffle,
    repeat: state.repeat,
    volume: state.volume,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota errors: silent */
  }
}

function buildShuffleOrder(skip: number): number[] {
  const others = MIXTAPE_TRACKS.map((_, i) => i).filter((i) => i !== skip)
  // Fisher-Yates
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[others[i], others[j]] = [others[j], others[i]]
  }
  return [skip, ...others]
}

const initial = readPersisted()

export const useMixtapeStore = create<MixtapeState>()((set, get) => ({
  currentIndex: initial.currentIndex,
  isPlaying: false,
  shuffle: initial.shuffle,
  repeat: initial.repeat,
  volume: initial.volume,
  progress: 0,
  duration: 0,
  shuffleOrder: initial.shuffle ? buildShuffleOrder(initial.currentIndex) : [],

  play: () => {
    const { currentIndex, volume, isPlaying } = get()
    if (isPlaying) return
    const audio = useAudioStore.getState()
    audio.unlock()
    // Silence the per-universe ambient so the mixtape isn't muddied by a
    // background loop. pause()/onend resumes ambient symmetrically.
    audio.stopAmbient()
    const effectiveVolume = audio.isMuted ? 0 : volume
    loadMixtapeTrack(MIXTAPE_TRACKS[currentIndex], true, effectiveVolume)
    set({ isPlaying: true })
  },

  pause: () => {
    pauseMixtape()
    set({ isPlaying: false })
    // Bring ambient back for the universe the visitor is currently in.
    // playAmbient is a no-op if muted or already playing this universe.
    const audio = useAudioStore.getState()
    audio.playAmbient(useUniverseStore.getState().activeUniverse)
  },

  toggle: () => {
    if (get().isPlaying) get().pause()
    else get().play()
  },

  next: () => {
    const { currentIndex, shuffle, shuffleOrder, repeat } = get()
    let nextIndex: number
    if (shuffle && shuffleOrder.length > 0) {
      const pos = shuffleOrder.indexOf(currentIndex)
      if (pos < shuffleOrder.length - 1) {
        nextIndex = shuffleOrder[pos + 1]
      } else if (repeat === 'all') {
        const reshuffled = buildShuffleOrder(currentIndex)
        set({ shuffleOrder: reshuffled })
        nextIndex = reshuffled[1] ?? currentIndex
      } else {
        get().pause()
        return
      }
    } else {
      if (currentIndex < MIXTAPE_TRACKS.length - 1) {
        nextIndex = currentIndex + 1
      } else if (repeat === 'all') {
        nextIndex = 0
      } else {
        get().pause()
        return
      }
    }
    get().select(nextIndex)
  },

  prev: () => {
    const { currentIndex, progress, shuffle, shuffleOrder } = get()
    // Standard player UX: if more than 3s in, prev restarts current track.
    if (progress > 3) {
      seekMixtape(0)
      set({ progress: 0 })
      return
    }
    let prevIndex: number
    if (shuffle && shuffleOrder.length > 0) {
      const pos = shuffleOrder.indexOf(currentIndex)
      prevIndex = pos > 0 ? shuffleOrder[pos - 1] : shuffleOrder[shuffleOrder.length - 1]
    } else {
      prevIndex = currentIndex > 0 ? currentIndex - 1 : MIXTAPE_TRACKS.length - 1
    }
    get().select(prevIndex)
  },

  select: (index) => {
    if (index < 0 || index >= MIXTAPE_TRACKS.length) return
    const { volume } = get()
    const audio = useAudioStore.getState()
    audio.unlock()
    audio.stopAmbient() // same reason as play(): no overlap between layers
    const effectiveVolume = audio.isMuted ? 0 : volume
    loadMixtapeTrack(MIXTAPE_TRACKS[index], true, effectiveVolume)
    set({ currentIndex: index, isPlaying: true, progress: 0, duration: 0 })
    persist(get())
  },

  toggleShuffle: () => {
    const next = !get().shuffle
    set({
      shuffle: next,
      shuffleOrder: next ? buildShuffleOrder(get().currentIndex) : [],
    })
    persist(get())
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'all', 'one']
    const idx = order.indexOf(get().repeat)
    const next = order[(idx + 1) % order.length]
    set({ repeat: next })
    persist(get())
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v))
    set({ volume: clamped })
    if (!useAudioStore.getState().isMuted) setMixtapeVolume(clamped)
    persist(get())
  },

  seek: (s) => {
    seekMixtape(s)
    set({ progress: s })
  },
}))

// Wire engine callbacks once at module load.
if (typeof window !== 'undefined') {
  setMixtapeCallbacks({
    onEnd: () => {
      const { repeat, currentIndex } = useMixtapeStore.getState()
      if (repeat === 'one') {
        seekMixtape(0)
        playMixtape()
        useMixtapeStore.setState({ progress: 0 })
        return
      }
      // Delegate to next() — handles shuffle + repeat-all + stop-at-end.
      useMixtapeStore.getState().next()
      // If next() chose to pause (end of queue, repeat off), reflect that.
      if (!useMixtapeStore.getState().isPlaying) {
        // currentIndex is unchanged; keep it as-is for resume.
        void currentIndex
      }
    },
    onLoad: () => {
      useMixtapeStore.setState({ duration: getMixtapeDuration() })
    },
    onPoll: (seconds) => {
      useMixtapeStore.setState({ progress: seconds })
    },
  })

  // Honor the site-wide symbiote mute. When the user mutes the whole site,
  // we drop the mixtape's Howl volume to 0 (Howler.mute() doesn't reach
  // html5 audio on iOS Safari, so this is the reliable path).
  useAudioStore.subscribe((state, prev) => {
    if (state.isMuted === prev.isMuted) return
    const v = state.isMuted ? 0 : useMixtapeStore.getState().volume
    setMixtapeVolume(v)
  })

  // Dispose on tab close so iOS Safari doesn't leak the audio element.
  window.addEventListener('beforeunload', () => disposeMixtape())
}
