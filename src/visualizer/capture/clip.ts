import type { Universe } from '../../store/universeStore'

// Pure pieces of the 10-second clip recorder: format choice, filename, and
// the per-frame composite (universe backdrop → dots → caption strip). The
// dots arrive as the WebGL canvas; the backdrop and caption are drawn here
// because on the page they are CSS, which a canvas recording can't see.

export const CLIP_W = 1280
export const CLIP_H = 720
export const CLIP_SECONDS = 10
export const CLIP_FPS = 30

const STRIP_H = 56

interface ClipSkin { inner: string; outer: string; strip: string; ink: string; accent: string }

// Mirrors the /mixtape backdrops in styles/mixtape-universe.css.
const SKINS: Record<Universe, ClipSkin> = {
  '616': { inner: '#f4e8c8', outer: '#f4e8c8', strip: 'rgba(255, 253, 245, 0.92)', ink: '#1b1b1b', accent: '#c0392b' },
  mcu: { inner: '#0c1a2e', outer: '#04070c', strip: 'rgba(10, 22, 40, 0.88)', ink: '#e6f1ff', accent: '#7fb7ff' },
  toon: { inner: '#ffe14d', outer: '#ffe14d', strip: 'rgba(255, 255, 255, 0.92)', ink: '#101010', accent: '#ff3b3b' },
  verse: { inner: '#1a0a2a', outer: '#07040c', strip: 'rgba(13, 10, 20, 0.88)', ink: '#f0e6ff', accent: '#ff2d6b' },
}

const MIME_PREFERENCE: Array<{ mime: string; ext: 'webm' | 'mp4' }> = [
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
  { mime: 'video/mp4', ext: 'mp4' },
]

export function pickMimeType(isTypeSupported: (t: string) => boolean): { mime: string; ext: 'webm' | 'mp4' } | null {
  return MIME_PREFERENCE.find((m) => isTypeSupported(m.mime)) ?? null
}

export function clipFilename(universe: Universe, title: string, ext: string): string {
  const slug = title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `mixtape-${universe}-${slug || 'clip'}.${ext}`
}

// Scale (w, h) to cover (dw, dh), centred, like CSS object-fit: cover.
export function coverRect(w: number, h: number, dw: number, dh: number): { x: number; y: number; w: number; h: number } {
  const s = Math.max(dw / w, dh / h)
  const cw = w * s, ch = h * s
  return { x: (dw - cw) / 2, y: (dh - ch) / 2, w: cw, h: ch }
}

export interface CompositeOpts {
  universe: Universe
  universeLabel: string
  title: string
  artist: string
  watermark: string
}

export function drawComposite(ctx: CanvasRenderingContext2D, dots: HTMLCanvasElement, o: CompositeOpts): void {
  const skin = SKINS[o.universe]
  const g = ctx.createRadialGradient(CLIP_W / 2, CLIP_H * 0.55, 0, CLIP_W / 2, CLIP_H * 0.55, CLIP_W * 0.7)
  g.addColorStop(0, skin.inner)
  g.addColorStop(1, skin.outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CLIP_W, CLIP_H)

  if (dots.width > 0 && dots.height > 0) {
    const r = coverRect(dots.width, dots.height, CLIP_W, CLIP_H)
    ctx.drawImage(dots, r.x, r.y, r.w, r.h)
  }

  ctx.fillStyle = skin.strip
  ctx.fillRect(0, CLIP_H - STRIP_H, CLIP_W, STRIP_H)
  ctx.fillStyle = skin.accent
  ctx.fillRect(0, CLIP_H - STRIP_H, CLIP_W, 3)

  const y = CLIP_H - STRIP_H / 2 + 1
  ctx.textBaseline = 'middle'
  ctx.fillStyle = skin.ink
  ctx.textAlign = 'left'
  ctx.font = '700 22px Bangers, "Share Tech Mono", sans-serif'
  ctx.fillText(`${o.title} — ${o.artist}`, 24, y)
  ctx.textAlign = 'right'
  ctx.font = '700 14px "Share Tech Mono", monospace'
  ctx.fillText(`${o.universeLabel} · MIXTAPE`, CLIP_W - 24, y - 10)
  ctx.globalAlpha = 0.7
  ctx.fillText(o.watermark, CLIP_W - 24, y + 11)
  ctx.globalAlpha = 1
}
