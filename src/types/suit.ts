// Shared types for the Spider-Suit HUD feature (Phase 2).
// Pure type module — dependency-free so any data/api/UI module can import it
// without pulling in transitive runtime modules. Mirrors the convention of
// types/bugle.ts.

import type { Universe } from '../store/universeStore'

export type SuitMode = 'earth1610' | 'earth65' | 'earth138' | 'earth928'

export const SUIT_MODES: readonly SuitMode[] = [
  'earth1610',
  'earth65',
  'earth138',
  'earth928',
]

// Maps suit modes to their universe attribute value so the HUD root can carry
// data-universe="earth-1610" alongside class="suit-earth1610" — the existing
// --universe-* cascade does all colour work, the class drives HUD-only rules
// (radar blip tints, etc).
export const SUIT_MODE_UNIVERSE: Record<SuitMode, Universe> = {
  earth1610: 'earth-1610',
  earth65: 'earth-65',
  earth138: 'earth-138',
  earth928: 'earth-928',
}

export const SUIT_MODE_LABEL: Record<SuitMode, string> = {
  earth1610: 'MILES — EARTH-1610',
  earth65: 'GWEN — EARTH-65',
  earth138: 'PUNK — EARTH-138',
  earth928: '2099 — EARTH-928',
}

export const SUIT_MODE_SHORT_LABEL: Record<SuitMode, string> = {
  earth1610: 'MILES',
  earth65: 'GWEN',
  earth138: 'PUNK',
  earth928: '2099',
}

// Final line of the boot sequence per active suit mode. The first 7 lines of
// the boot sequence are constant across modes.
export const SUIT_MODE_BOOT_LINE: Record<SuitMode, string> = {
  earth1610: "LET'S GO. TIME TO BE LEGENDARY.",
  earth65: 'GRACE UNDER PRESSURE. AS ALWAYS.',
  earth138: 'SYSTEM ONLINE. NOT THAT IT MATTERS.',
  earth928: 'WELCOME BACK, MIGUEL.',
}

export type ThreatLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL'

export const THREAT_LEVELS: readonly ThreatLevel[] = [
  'LOW',
  'ELEVATED',
  'HIGH',
  'CRITICAL',
]

export type MissionStatus = 'ACTIVE' | 'COMPLETE' | 'CLASSIFIED'

export interface Mission {
  codename: string
  description: string
  stack: string[]
  status: MissionStatus
  date: string // ISO 8601 date
}

export interface Augmentation {
  name: string
  proficiency: number // 0–100, drives the proficiency bar on the /suit page
}

export interface GitHubTelemetry {
  commitsThisWeek: number
  totalStars: number
  openIssues: number
  currentStreak: number
}

// Family categorisation drives the SVG icon picked by AtmosPanel.
export type WeatherFamily =
  | 'clear'
  | 'cloud'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog'

export interface WeatherTelemetry {
  city: string
  tempC: number
  family: WeatherFamily
  // Suit-language string mapped from the WMO weather_code.
  conditionLabel: string
}

export interface SuitTelemetry {
  github: GitHubTelemetry
  weather: WeatherTelemetry
  time: Date
  threatLevel: ThreatLevel
  missionDay: number // 1-365/366, day of the current year
}

export function isSuitMode(value: string): value is SuitMode {
  return (SUIT_MODES as readonly string[]).includes(value)
}

export function isThreatLevel(value: string): value is ThreatLevel {
  return (THREAT_LEVELS as readonly string[]).includes(value)
}
