import { mulberry32 } from './rng'

// Orb web on the z=0 plane: 14 spokes + 9 spiral rings, jitter ±0.02.
// Points are distributed along thread length so rings and spokes read as
// continuous lines rather than beads.
const SPOKES = 14
const RINGS = 9
const RADIUS = 1.4

export function web(n: number, seed: number): Float32Array {
  const rnd = mulberry32(seed)
  const out = new Float32Array(n * 3)
  // thread segments: [ax, ay, bx, by]
  const segs: Array<[number, number, number, number]> = []
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * Math.PI * 2
    segs.push([0, 0, Math.cos(a) * RADIUS, Math.sin(a) * RADIUS])
  }
  for (let r = 1; r <= RINGS; r++) {
    const rr = (r / RINGS) * RADIUS
    for (let s = 0; s < SPOKES; s++) {
      const a0 = (s / SPOKES) * Math.PI * 2
      const a1 = ((s + 1) / SPOKES) * Math.PI * 2
      // slight sag between spokes like a real web
      const sag = 0.96
      segs.push([Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(a1) * rr * sag, Math.sin(a1) * rr * sag])
    }
  }
  const lengths = segs.map(([ax, ay, bx, by]) => Math.hypot(bx - ax, by - ay))
  const total = lengths.reduce((a, b) => a + b, 0)
  let i = 0
  for (let s = 0; s < segs.length && i < n; s++) {
    const count = s === segs.length - 1 ? n - i : Math.round((lengths[s] / total) * n)
    const [ax, ay, bx, by] = segs[s]
    for (let k = 0; k < count && i < n; k++, i++) {
      const t = rnd()
      out[i * 3] = ax + (bx - ax) * t + (rnd() - 0.5) * 0.04
      out[i * 3 + 1] = ay + (by - ay) * t + (rnd() - 0.5) * 0.04
      out[i * 3 + 2] = (rnd() - 0.5) * 0.04
    }
  }
  return out
}
