import type { Universe } from '../../store/universeStore'
import { VIZ_STYLES, relativeLuminance } from '../engine/vizStyles'

// Album-art colours (listen-modes spec §4). Pure pixel bucketing + a cached
// loader + a backdrop fit so the dots stay visible in every universe.
export type Palette3 = [string, string, string]

const SIZE = 32
const MAX_CACHE = 20
const cache = new Map<string, Promise<Palette3 | null>>()

export function clearArtCache(): void { cache.clear() }

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

export function extractPalette(pixels: Uint8ClampedArray): Palette3 | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; s: number }>()
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3]
    if (a < 128) continue
    const [, s, l] = rgbToHsl(r, g, b)
    if (s < 0.18 || l < 0.08 || l > 0.94) continue
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s: 0 }
    e.n++; e.r += r; e.g += g; e.b += b; e.s += s
    buckets.set(key, e)
  }
  const ranked = [...buckets.values()]
    .map((e) => ({ rgb: [e.r / e.n, e.g / e.n, e.b / e.n] as [number, number, number], score: e.n * (0.5 + e.s / e.n) }))
    .sort((a, b) => b.score - a.score)
  const picked: Array<[number, number, number]> = []
  for (const c of ranked) {
    if (picked.every((p) => Math.hypot(p[0] - c.rgb[0], p[1] - c.rgb[1], p[2] - c.rgb[2]) >= 60)) picked.push(c.rgb)
    if (picked.length === 3) break
  }
  if (picked.length < 2) return null
  const hexes = picked.map((p) => toHex(...p))
  if (hexes.length === 2) {
    const [h, s, l] = rgbToHsl(...picked[0])
    hexes.push(hslToHex(h, s, Math.min(0.94, l * 1.2)))
  }
  return [hexes[0], hexes[1], hexes[2]]
}

async function loadPixels(url: string): Promise<Uint8ClampedArray | null> {
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(image, 0, 0, SIZE, SIZE)
    return ctx.getImageData(0, 0, SIZE, SIZE).data
  } catch {
    return null
  }
}

export function artPalette(url: string, load: (url: string) => Promise<Uint8ClampedArray | null> = loadPixels): Promise<Palette3 | null> {
  const hit = cache.get(url)
  if (hit) return hit
  const p = load(url).then((px) => (px ? extractPalette(px) : null)).catch(() => null)
  cache.set(url, p)
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
  return p
}

export function fitToBackdrop(colors: Palette3, universe: Universe): Palette3 {
  const light = VIZ_STYLES[universe].lightBackdrop
  const fit = (hex: string) => {
    const [h, s, l0] = rgbToHsl(...hexToRgb(hex))
    let l = l0
    let out = hex
    for (let i = 0; i < 40; i++) {
      const lum = relativeLuminance(out)
      if (light ? lum <= 0.6 : lum >= 0.12) break
      l = light ? l - 0.025 : l + 0.025
      out = hslToHex(h, s, Math.max(0, Math.min(1, l)))
    }
    return out
  }
  return [fit(colors[0]), fit(colors[1]), fit(colors[2])]
}
