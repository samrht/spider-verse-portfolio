import type { GitHubTelemetry } from '../types/suit'

// Mirrors the BugleApiError shape from newsApi.ts so callers (suitStore) can
// distinguish "no username configured" (no fetch attempted) from "real network
// failure" from "GitHub rate limit hit" (60/hr unauth) — the rate-limit case
// gets a soft fallback to last-known telemetry rather than a hard error UI.

export type GitHubApiErrorCode =
  | 'missing-username'
  | 'rate-limit'
  | 'network'
  | 'http'
  | 'shape'

export class GitHubApiError extends Error {
  readonly code: GitHubApiErrorCode
  readonly status: number | undefined

  constructor(code: GitHubApiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'GitHubApiError'
    this.code = code
    this.status = status
  }
}

interface GitHubEvent {
  type?: string
  created_at?: string
  payload?: { commits?: unknown[] }
}

interface GitHubRepo {
  stargazers_count?: number
  open_issues_count?: number
  fork?: boolean
}

const API_ROOT = 'https://api.github.com'

async function ghFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
  } catch (err) {
    throw new GitHubApiError(
      'network',
      `Network error fetching ${url}: ${(err as Error).message}`,
    )
  }
  if (response.status === 403 || response.status === 429) {
    throw new GitHubApiError(
      'rate-limit',
      `GitHub rate limit hit (${response.status}) — unauthenticated requests are capped at 60/hr per IP`,
      response.status,
    )
  }
  if (!response.ok) {
    throw new GitHubApiError(
      'http',
      `GitHub returned ${response.status} for ${url}`,
      response.status,
    )
  }
  try {
    return (await response.json()) as T
  } catch (err) {
    throw new GitHubApiError(
      'shape',
      `GitHub response was not valid JSON: ${(err as Error).message}`,
    )
  }
}

function dayKey(iso: string): string {
  // Local-time YYYY-MM-DD bucket so the streak respects the user's wall clock.
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// /events returns up to 90 days / 300 events, so streaks longer than that
// will under-report. Acceptable for a HUD telemetry chip.
function buildStreak(events: GitHubEvent[]): number {
  const pushDays = new Set<string>()
  for (const ev of events) {
    if (ev.type !== 'PushEvent' || !ev.created_at) continue
    pushDays.add(dayKey(ev.created_at))
  }
  if (pushDays.size === 0) return 0
  let streak = 0
  const cursor = new Date()
  // Walk backwards day-by-day; the streak ends at the first gap. Today doesn't
  // need a push to count yet — a user who pushed yesterday is still on streak.
  let allowedSkip = !pushDays.has(
    `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`,
  )
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
    if (pushDays.has(key)) {
      streak += 1
      allowedSkip = false
    } else if (allowedSkip) {
      allowedSkip = false
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
    if (streak > 365) break // safety stop
  }
  return streak
}

function countCommitsThisWeek(events: GitHubEvent[]): number {
  const weekAgo = Date.now() - 7 * 86400000
  let total = 0
  for (const ev of events) {
    if (ev.type !== 'PushEvent' || !ev.created_at) continue
    if (new Date(ev.created_at).getTime() < weekAgo) continue
    total += ev.payload?.commits?.length ?? 0
  }
  return total
}

export async function fetchGitHubTelemetry(
  signal?: AbortSignal,
): Promise<GitHubTelemetry> {
  const username = import.meta.env.VITE_GITHUB_USERNAME
  if (!username) {
    throw new GitHubApiError(
      'missing-username',
      'VITE_GITHUB_USERNAME is not set — add it to .env.local',
    )
  }

  const [events, repos] = await Promise.all([
    ghFetch<GitHubEvent[]>(
      `${API_ROOT}/users/${encodeURIComponent(username)}/events?per_page=100`,
      signal,
    ),
    ghFetch<GitHubRepo[]>(
      `${API_ROOT}/users/${encodeURIComponent(
        username,
      )}/repos?per_page=100&sort=updated`,
      signal,
    ),
  ])

  if (!Array.isArray(events) || !Array.isArray(repos)) {
    throw new GitHubApiError(
      'shape',
      'GitHub response was missing the expected array payload',
    )
  }

  // Skip forks so the star count reflects the user's own work.
  const owned = repos.filter((r) => !r.fork)

  return {
    commitsThisWeek: countCommitsThisWeek(events),
    totalStars: owned.reduce((s, r) => s + (r.stargazers_count ?? 0), 0),
    openIssues: owned.reduce((s, r) => s + (r.open_issues_count ?? 0), 0),
    currentStreak: buildStreak(events),
  }
}
