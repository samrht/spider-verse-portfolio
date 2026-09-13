export const DOTS_DESKTOP = 40000
export const DOTS_MOBILE = 12000

export function chooseDotCount(env: {
  dpr: number
  cores: number
  width: number
  override?: string | null
}): number {
  if (env.override) {
    const n = parseInt(env.override, 10)
    if (Number.isFinite(n)) return Math.min(100000, Math.max(1000, n))
  }
  const weak = env.dpr >= 2 && env.cores <= 4
  if (weak || env.width < 768) return DOTS_MOBILE
  return DOTS_DESKTOP
}
