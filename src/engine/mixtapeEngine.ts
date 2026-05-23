import { Howl } from 'howler'
import type { MixtapeTrack } from '../data/mixtape'

// Thin Howler wrapper for the Spider-Verse Mixtape. Independent from
// soundEngine (which owns ambient + FX). One Howl per session, recreated on
// track change because Howler does not hot-swap `src`. `html5: true` streams
// from disk so 5–9MB MP3s aren't loaded fully into memory before playback.

type Listener = () => void

let howl: Howl | null = null
let currentSlug: string | null = null
let onEnd: Listener | null = null
let onLoad: Listener | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

// The poll keeps the store's progress in sync with Howler's playhead. 250ms
// is smooth enough for a 200px scrubber and cheap.
let pollTick: ((seconds: number) => void) | null = null

export function setMixtapeCallbacks(opts: {
  onEnd?: Listener
  onLoad?: Listener
  onPoll?: (seconds: number) => void
}) {
  onEnd = opts.onEnd ?? null
  onLoad = opts.onLoad ?? null
  pollTick = opts.onPoll ?? null
}

function startPoll() {
  stopPoll()
  if (!pollTick) return
  pollTimer = setInterval(() => {
    if (!howl || !pollTick) return
    const seek = howl.seek()
    if (typeof seek === 'number') pollTick(seek)
  }, 250)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function loadMixtapeTrack(track: MixtapeTrack, autoplay: boolean, volume: number) {
  if (currentSlug === track.slug && howl) {
    if (autoplay && !howl.playing()) howl.play()
    return
  }
  howl?.unload()
  howl = new Howl({
    src: [track.src],
    html5: true,
    volume,
    onend: () => onEnd?.(),
    onload: () => onLoad?.(),
    onplay: () => startPoll(),
    onpause: () => stopPoll(),
    onstop: () => stopPoll(),
    onloaderror: () => {},
    onplayerror: () => {},
  })
  currentSlug = track.slug
  if (autoplay) howl.play()
}

export function playMixtape() {
  if (howl && !howl.playing()) howl.play()
}

export function pauseMixtape() {
  if (howl && howl.playing()) howl.pause()
}

export function seekMixtape(seconds: number) {
  howl?.seek(seconds)
}

export function setMixtapeVolume(volume: number) {
  howl?.volume(volume)
}

export function getMixtapeDuration(): number {
  if (!howl) return 0
  const d = howl.duration()
  return typeof d === 'number' ? d : 0
}

export function disposeMixtape() {
  stopPoll()
  howl?.unload()
  howl = null
  currentSlug = null
}
