import { create } from 'zustand'
import { buildSuitTelemetry } from '../api/suitTransform'
import { fetchGitHubTelemetry } from '../api/githubApi'
import { fetchWeatherTelemetry } from '../api/weatherApi'
import { useAudioStore } from './audioStore'
import type { SuitMode, SuitTelemetry } from '../types/suit'

// Shared state for the Spider-Suit HUD overlay + /suit page. Mirrors the
// minimal bugleStore pattern: no module-scope subscriptions, no localStorage.
// Telemetry is cached for 5 min so re-opens are instant; refreshTelemetry
// forces a re-fetch.

interface SuitState {
  activeSuitMode: SuitMode
  isOverlayOpen: boolean
  isBooting: boolean
  telemetry: SuitTelemetry | null
  telemetryFetchedAt: number | null
  telemetryStale: boolean

  openSuit: () => Promise<void>
  closeSuit: () => void
  switchMode: (mode: SuitMode) => void
  refreshTelemetry: () => Promise<void>
  completeBoot: () => void
}

const TELEMETRY_TTL_MS = 5 * 60 * 1000

// Centralised telemetry fetch. Pulls GitHub + weather in parallel; on any
// failure, keeps the previously-cached telemetry alive and flips the stale
// flag so the HUD can surface a "TELEMETRY: STALE" chip without going blank.
async function loadTelemetry(
  prev: SuitTelemetry | null,
): Promise<{ telemetry: SuitTelemetry; stale: boolean }> {
  const [ghResult, weatherResult] = await Promise.allSettled([
    fetchGitHubTelemetry(),
    fetchWeatherTelemetry(),
  ])

  // If both calls failed and we have nothing to show, surface synthetic
  // zero-telemetry rather than crashing the HUD — the stale chip explains it.
  if (ghResult.status === 'rejected' && weatherResult.status === 'rejected') {
    if (prev) return { telemetry: prev, stale: true }
    return {
      telemetry: buildSuitTelemetry(
        { commitsThisWeek: 0, totalStars: 0, openIssues: 0, currentStreak: 0 },
        {
          city: '—',
          tempC: 0,
          family: 'cloud',
          conditionLabel: 'TELEMETRY UPLINK FAILED',
        },
      ),
      stale: true,
    }
  }

  // Partial success — patch in last-known values for the failed half.
  const github =
    ghResult.status === 'fulfilled'
      ? ghResult.value
      : prev?.github ?? {
          commitsThisWeek: 0,
          totalStars: 0,
          openIssues: 0,
          currentStreak: 0,
        }
  const weather =
    weatherResult.status === 'fulfilled'
      ? weatherResult.value
      : prev?.weather ?? {
          city: '—',
          tempC: 0,
          family: 'cloud' as const,
          conditionLabel: 'ATMOSPHERIC LINK DEGRADED',
        }

  const stale =
    ghResult.status === 'rejected' || weatherResult.status === 'rejected'

  return { telemetry: buildSuitTelemetry(github, weather), stale }
}

export const useSuitStore = create<SuitState>()((set, get) => ({
  activeSuitMode: 'earth928',
  isOverlayOpen: false,
  isBooting: false,
  telemetry: null,
  telemetryFetchedAt: null,
  telemetryStale: false,

  openSuit: async () => {
    if (get().isOverlayOpen) return
    const { telemetry, telemetryFetchedAt } = get()
    const fresh =
      telemetry != null &&
      telemetryFetchedAt != null &&
      Date.now() - telemetryFetchedAt < TELEMETRY_TTL_MS

    set({ isOverlayOpen: true, isBooting: true })
    useAudioStore.getState().playFX('suit-boot')

    if (fresh) return

    const { telemetry: nextTelemetry, stale } = await loadTelemetry(telemetry)
    set({
      telemetry: nextTelemetry,
      telemetryFetchedAt: Date.now(),
      telemetryStale: stale,
    })
  },

  closeSuit: () => {
    if (!get().isOverlayOpen) return
    useAudioStore.getState().playFX('suit-close')
    set({ isOverlayOpen: false, isBooting: false })
  },

  switchMode: (mode) => {
    if (get().activeSuitMode === mode) return
    useAudioStore.getState().playFX('mode-switch')
    set({ activeSuitMode: mode })
  },

  refreshTelemetry: async () => {
    const { telemetry } = get()
    const { telemetry: nextTelemetry, stale } = await loadTelemetry(telemetry)
    set({
      telemetry: nextTelemetry,
      telemetryFetchedAt: Date.now(),
      telemetryStale: stale,
    })
  },

  completeBoot: () => set({ isBooting: false }),
}))
