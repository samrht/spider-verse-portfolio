import type { Universe } from '../../store/universeStore'

// Per-universe look of the Halftone Field (spec §5). Pure data: no DOM, no
// THREE. ParticleField turns an entry into shader uniforms + blend mode; the
// page backdrop is CSS keyed on data-universe.

export type Blend = 'normal' | 'additive'
export type DotStyle = 'ink' | 'holo' | 'cel' | 'glitch'
export type BeatFx = 'swell' | 'pulse' | 'bounce' | 'split'

export interface VizStyle {
  blend: Blend
  palette: readonly [string, string, string]
  ink: string
  dot: DotStyle
  beatFx: BeatFx
  lightBackdrop: boolean
}

export const DOT_STYLE_INDEX: Record<DotStyle, number> = { ink: 0, holo: 1, cel: 2, glitch: 3 }

export const VIZ_STYLES: Record<Universe, VizStyle> = {
  '616': { blend: 'normal', palette: ['#c0392b', '#1f4e9c', '#1b1b1b'], ink: '#1b1b1b', dot: 'ink', beatFx: 'swell', lightBackdrop: true },
  mcu: { blend: 'additive', palette: ['#7fb7ff', '#ff2d2d', '#e6f1ff'], ink: '#7fb7ff', dot: 'holo', beatFx: 'pulse', lightBackdrop: false },
  toon: { blend: 'normal', palette: ['#ff3b3b', '#1f6feb', '#101010'], ink: '#101010', dot: 'cel', beatFx: 'bounce', lightBackdrop: true },
  verse: { blend: 'additive', palette: ['#ff2d6b', '#00e5ff', '#ffffff'], ink: '#ffffff', dot: 'glitch', beatFx: 'split', lightBackdrop: false },
}

// WCAG relative luminance of a #rrggbb colour, 0 (black) … 1 (white).
export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
