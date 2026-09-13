import { sphere } from './sphere'
import { mulberry32 } from './rng'

// Sphere blown outward: radius 1.8–2.4 with per-point spread so the
// transition from sphere reads as a burst, not a scale.
export function explosion(n: number, seed: number): Float32Array {
  const base = sphere(n, seed)
  const rnd = mulberry32(seed + 99)
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 1.8 + rnd() * 0.6
    out[i * 3] = base[i * 3] * r
    out[i * 3 + 1] = base[i * 3 + 1] * r
    out[i * 3 + 2] = base[i * 3 + 2] * r
  }
  return out
}
