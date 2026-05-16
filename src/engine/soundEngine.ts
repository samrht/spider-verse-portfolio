import { Howl, Howler } from 'howler'
import type { Universe } from '../store/universeStore'

// Thin wrapper around Howler. Phase 1 ships with silent placeholders — drop
// real ogg/mp3 files into /public/audio/ later and the manifest below picks
// them up. Calls are no-ops if a track has no source (avoids 404 noise).

interface TrackDef {
  src: string[]
  volume: number
  loop?: boolean
  html5?: boolean
}

const AMBIENT: Record<Universe, TrackDef> = {
  'earth-1610': { src: ['/audio/ambient-1610.ogg'], volume: 0.28, loop: true, html5: true },
  'earth-65':   { src: ['/audio/ambient-65.ogg'],   volume: 0.28, loop: true, html5: true },
  'earth-138':  { src: ['/audio/ambient-138.ogg'],  volume: 0.32, loop: true, html5: true },
  'earth-928':  { src: ['/audio/ambient-928.ogg'],  volume: 0.25, loop: true, html5: true },
}

const FX: Record<string, TrackDef> = {
  hover:    { src: ['/audio/fx-hover.ogg'],    volume: 0.18 },
  click:    { src: ['/audio/fx-click.ogg'],    volume: 0.30 },
  webshot:  { src: ['/audio/fx-webshot.ogg'],  volume: 0.45 },
  glitch:   { src: ['/audio/fx-glitch.ogg'],   volume: 0.40 },
  symbiote: { src: ['/audio/fx-symbiote.ogg'], volume: 0.55 },
}

const ambientHowls = new Map<Universe, Howl>()
const fxHowls = new Map<string, Howl>()
let currentAmbient: Universe | null = null

function makeHowl(def: TrackDef): Howl {
  return new Howl({
    src: def.src,
    volume: def.volume,
    loop: def.loop ?? false,
    html5: def.html5 ?? false,
    preload: false,
    // Swallow 404s silently for Phase 1 placeholder paths.
    onloaderror: () => {},
    onplayerror: () => {},
  })
}

export function unlockAudio() {
  // Howler defers AudioContext creation until first user gesture. Touching
  // any Howl resumes it; this call exists so callers can be explicit.
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume().catch(() => {})
  }
}

export function setMuted(muted: boolean) {
  Howler.mute(muted)
}

export function playAmbient(universe: Universe) {
  if (currentAmbient === universe) return
  stopAmbient()
  let howl = ambientHowls.get(universe)
  if (!howl) {
    howl = makeHowl(AMBIENT[universe])
    ambientHowls.set(universe, howl)
  }
  howl.play()
  currentAmbient = universe
}

export function stopAmbient() {
  if (currentAmbient) {
    ambientHowls.get(currentAmbient)?.stop()
    currentAmbient = null
  }
}

export function playFX(name: keyof typeof FX | string) {
  const def = FX[name]
  if (!def) return
  let howl = fxHowls.get(name)
  if (!howl) {
    howl = makeHowl(def)
    fxHowls.set(name, howl)
  }
  howl.play()
}

export function disposeAudio() {
  ambientHowls.forEach((h) => h.unload())
  fxHowls.forEach((h) => h.unload())
  ambientHowls.clear()
  fxHowls.clear()
  currentAmbient = null
}
