export type SectionEnergy = 'low' | 'mid' | 'high' | 'drop'
export type SignalMode = 'live' | 'synced' | 'procedural'

export interface AudioSignal {
  bass: number
  mids: number
  highs: number
  energy: number
  beat: number
  section: { index: number; energy: SectionEnergy }
  mode: SignalMode
}

export interface SignalProvider {
  readonly mode: SignalMode
  start(): Promise<void>
  stop(): void
  // Fill `out` in place. `nowSeconds` is playback position when known,
  // else wall-clock seconds since start().
  sample(out: AudioSignal, nowSeconds: number): void
}

export function createSignal(mode: SignalMode = 'procedural'): AudioSignal {
  return {
    bass: 0, mids: 0, highs: 0, energy: 0, beat: 0,
    section: { index: 0, energy: 'low' },
    mode,
  }
}
