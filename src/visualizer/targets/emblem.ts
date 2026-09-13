import { mulberry32 } from './rng'

// Spider emblem sampled from a polygon outline (the same silhouette as the
// mixtape cover SVG in Mixtape.tsx), scaled to ±1.2, extruded ±0.05.
// Interior fill by rejection sampling against the polygon.
const OUTLINE: Array<[number, number]> = [
  [12, 3], [13.6, 8], [18, 6.2], [15.6, 10.4], [20, 11.5], [15.6, 13.6],
  [18, 17.8], [13.6, 16], [12, 21], [10.4, 16], [6, 17.8], [8.4, 13.6],
  [4, 11.5], [8.4, 10.4], [6, 6.2], [10.4, 8],
]

function inside(x: number, y: number): boolean {
  let hit = false
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i], [xj, yj] = OUTLINE[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

export function emblem(n: number, seed: number): Float32Array {
  const rnd = mulberry32(seed + 7)
  const out = new Float32Array(n * 3)
  let i = 0
  while (i < n) {
    const x = 3 + rnd() * 18, y = 3 + rnd() * 18
    if (!inside(x, y)) continue
    out[i * 3] = ((x - 12) / 9) * 1.2
    out[i * 3 + 1] = -((y - 12) / 9) * 1.2
    out[i * 3 + 2] = (rnd() - 0.5) * 0.1
    i++
  }
  return out
}
