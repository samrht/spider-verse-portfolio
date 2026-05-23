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

// Src order = files-we-actually-have first, then placeholder slots for any
// higher-fidelity format the user might drop in later. Howler's src array
// only falls through on codec-rejection (canPlayType), not on 404 — so the
// existing format MUST be first or Howler gets stuck loading the missing
// one and silently bails via onloaderror.
const AMBIENT: Record<Universe, TrackDef> = {
  'earth-1610': { src: ['/audio/ambient-1610.mp3', '/audio/ambient-1610.ogg'], volume: 0.28, loop: true, html5: true },
  'earth-65':   { src: ['/audio/ambient-65.mp3',   '/audio/ambient-65.ogg'],   volume: 0.28, loop: true, html5: true },
  'earth-138':  { src: ['/audio/ambient-138.mp3',  '/audio/ambient-138.ogg'],  volume: 0.32, loop: true, html5: true },
  'earth-928':  { src: ['/audio/ambient-928.mp3',  '/audio/ambient-928.ogg'],  volume: 0.25, loop: true, html5: true },
}

// Files-we-actually-have FIRST (.wav) then higher-fidelity placeholder slots
// (.mp3, .ogg) for the user to drop in later. Howler picks the first src
// whose codec the browser claims to support — so the missing-format-first
// ordering trap that broke ambient (state stuck at "loading" because the
// .ogg 404'd and onloaderror silently swallowed) doesn't repeat here.
// fx-symbiote is still unsupplied; the slot exists so the symbiote toggle
// can keep calling playFX('symbiote') without throwing.
const FX: Record<string, TrackDef> = {
  hover:         { src: ['/audio/fx-hover.wav',         '/audio/fx-hover.mp3',         '/audio/fx-hover.ogg'],       volume: 0.18 },
  click:         { src: ['/audio/fx-click.wav',         '/audio/fx-click.mp3',         '/audio/fx-click.ogg'],       volume: 0.30 },
  webshot:       { src: ['/audio/fx-webshot.wav',       '/audio/fx-webshot.mp3',       '/audio/fx-webshot.ogg'],     volume: 0.45 },
  glitch:        { src: ['/audio/fx-glitch.wav',        '/audio/fx-glitch.mp3',        '/audio/fx-glitch.ogg'],      volume: 0.40 },
  symbiote:      { src: ['/audio/fx-symbiote.mp3',      '/audio/fx-symbiote.ogg'],      volume: 0.55 },
  'suit-boot':   { src: ['/audio/fx-suit-boot.wav',     '/audio/fx-suit-boot.mp3',     '/audio/fx-suit-boot.ogg'],   volume: 0.45 },
  'mode-switch': { src: ['/audio/fx-mode-switch.wav',   '/audio/fx-mode-switch.mp3',   '/audio/fx-mode-switch.ogg'], volume: 0.35 },
  'suit-close':  { src: ['/audio/fx-suit-close.wav',    '/audio/fx-suit-close.mp3',    '/audio/fx-suit-close.ogg'],  volume: 0.40 },
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
    // Default preload (true). We previously set preload:false so Phase 1
    // placeholder paths didn't 404-spam — but with html5:true, that pathway
    // never triggers an actual load on .play(), so ambient stayed at state
    // 'unloaded' forever. Real files exist now; let Howler load on construct.
    // Still swallow load/play errors so a missing fx-symbiote.mp3 (etc.)
    // doesn't break anything noisily.
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
