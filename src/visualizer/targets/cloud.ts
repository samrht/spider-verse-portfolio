import { sphere } from './sphere'
import { mulberry32 } from './rng'

// Sphere pushed in/out by a cheap 3-octave value noise so it reads as a
// lumpy nebula. Radius stays within [0.4, 1.6].
function hash3(x: number, y: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.13) * 43758.5453
  return s - Math.floor(s)
}
function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c000 = hash3(ix, iy, iz, seed), c100 = hash3(ix + 1, iy, iz, seed)
  const c010 = hash3(ix, iy + 1, iz, seed), c110 = hash3(ix + 1, iy + 1, iz, seed)
  const c001 = hash3(ix, iy, iz + 1, seed), c101 = hash3(ix + 1, iy, iz + 1, seed)
  const c011 = hash3(ix, iy + 1, iz + 1, seed), c111 = hash3(ix + 1, iy + 1, iz + 1, seed)
  return lerp(
    lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
    lerp(lerp(c001, c101, u), lerp(c011, c111, u), v),
    w,
  )
}

export function cloud(n: number, seed: number): Float32Array {
  const base = sphere(n, seed)
  const rnd = mulberry32(seed)
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
    const f = noise3(x * 2, y * 2, z * 2, seed) * 0.6 + noise3(x * 5, y * 5, z * 5, seed + 1) * 0.3 + noise3(x * 11, y * 11, z * 11, seed + 2) * 0.1
    const r = 0.4 + f * 1.2 + (rnd() - 0.5) * 0.05
    out[i * 3] = x * r
    out[i * 3 + 1] = y * r
    out[i * 3 + 2] = z * r
  }
  return out
}
