import type { BugleArticle, BugleCategory } from '../types/bugle'
import {
  transformCurrentsArticle,
  type CurrentsRawArticle,
} from './bugleTransform'

const ENDPOINT = 'https://api.currentsapi.services/v1/latest-news'

export type BugleApiErrorCode = 'missing-key' | 'network' | 'http' | 'shape'

// Thrown by fetchBugleNews so callers (DailyBugle sidebar, BugleOverlay, /bugle
// page) can distinguish "no key set" (silently fall back to static headlines)
// from "real network failure" (show retry UI).
export class BugleApiError extends Error {
  readonly code: BugleApiErrorCode
  readonly status: number | undefined

  constructor(code: BugleApiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'BugleApiError'
    this.code = code
    this.status = status
  }
}

interface CurrentsResponse {
  status?: string
  news?: CurrentsRawArticle[]
}

/**
 * Fetch the latest news for the given Bugle category from CurrentsAPI.
 * Throws BugleApiError on any failure — caller decides whether to fall back
 * to the static bugleHeadlines list or show an error state.
 *
 * Pass an AbortSignal to cancel in-flight requests on unmount.
 */
export async function fetchBugleNews(
  category: BugleCategory,
  signal?: AbortSignal,
): Promise<BugleArticle[]> {
  const apiKey = import.meta.env.VITE_CURRENTS_API_KEY
  if (!apiKey) {
    throw new BugleApiError(
      'missing-key',
      'VITE_CURRENTS_API_KEY is not set — add it to .env.local',
    )
  }

  const url = new URL(ENDPOINT)
  url.searchParams.set('category', category)
  url.searchParams.set('language', 'en')
  url.searchParams.set('apiKey', apiKey)

  let response: Response
  try {
    response = await fetch(url.toString(), { signal })
  } catch (err) {
    throw new BugleApiError(
      'network',
      `Network error fetching Bugle news: ${(err as Error).message}`,
    )
  }

  if (!response.ok) {
    throw new BugleApiError(
      'http',
      `CurrentsAPI returned ${response.status}`,
      response.status,
    )
  }

  let payload: CurrentsResponse
  try {
    payload = (await response.json()) as CurrentsResponse
  } catch (err) {
    throw new BugleApiError(
      'shape',
      `CurrentsAPI response was not valid JSON: ${(err as Error).message}`,
    )
  }

  if (!Array.isArray(payload.news)) {
    throw new BugleApiError(
      'shape',
      'CurrentsAPI response was missing the "news" array',
    )
  }

  return payload.news.map((raw) => transformCurrentsArticle(raw, category))
}
