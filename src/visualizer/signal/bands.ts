// Band math shared by LiveFFT (browser AnalyserNode bins) and the offline
// analyser (scripts/analyse-track.mjs re-implements the same ranges).

export const BAND_HZ = {
  bass: [20, 150],
  mids: [150, 2000],
  highs: [2000, 16000],
} as const

// [lo, hi) bin indices for a frequency range. Always at least one bin wide.
export function binRange(
  sampleRate: number,
  fftSize: number,
  loHz: number,
  hiHz: number,
): [number, number] {
  const binHz = sampleRate / fftSize
  const lo = Math.floor(loHz / binHz)
  const hi = Math.max(lo + 1, Math.floor(hiHz / binHz))
  return [lo, hi]
}

// Mean of byte bins in [lo, hi), normalised to 0..1.
export function bandAverage(bins: Uint8Array, lo: number, hi: number): number {
  const end = Math.min(hi, bins.length)
  if (end <= lo) return 0
  let sum = 0
  for (let i = lo; i < end; i++) sum += bins[i]
  return sum / ((end - lo) * 255)
}

// One-pole smoothing with separate attack (rising) and release (falling)
// coefficients; both 0..1 where 1 = instant.
export function smooth(prev: number, next: number, attack: number, release: number): number {
  const k = next > prev ? attack : release
  return prev + (next - prev) * k
}
