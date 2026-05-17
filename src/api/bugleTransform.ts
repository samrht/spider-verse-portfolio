import type { BugleArticle, BugleCategory } from '../types/bugle'
import { isBugleCategory } from '../types/bugle'
import { getRandomReporter } from '../data/reporters'

// Shape returned by CurrentsAPI's /v1/latest-news endpoint. We only type the
// fields we consume — extras are ignored. Everything is optional because the
// wire feed isn't guaranteed to populate every field on every article.
export interface CurrentsRawArticle {
  id?: string
  title?: string
  description?: string
  url?: string
  image?: string
  language?: string
  category?: string[] | string
  published?: string
  author?: string
}

function pickCategory(
  raw: CurrentsRawArticle,
  fallback: BugleCategory,
): BugleCategory {
  const rawCats = Array.isArray(raw.category)
    ? raw.category
    : raw.category
      ? [raw.category]
      : []
  for (const c of rawCats) {
    const lower = c.toLowerCase()
    if (isBugleCategory(lower)) return lower
  }
  return fallback
}

function safeSource(raw: CurrentsRawArticle): string {
  if (raw.author && raw.author.trim().length > 0) return raw.author
  if (raw.url) {
    try {
      return new URL(raw.url).hostname.replace(/^www\./, '')
    } catch {
      // Bad URL — fall through to the wire-service default.
    }
  }
  return 'Wire Service'
}

function pickImage(raw: CurrentsRawArticle): string | null {
  // CurrentsAPI sometimes returns the literal string "None" instead of null.
  if (!raw.image || raw.image === 'None') return null
  return raw.image
}

function generateId(raw: CurrentsRawArticle): string {
  if (raw.id) return raw.id
  // Fallback for older API responses without an id field. crypto.randomUUID
  // is available in all modern browsers (lib.dom).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `bugle-live-${crypto.randomUUID()}`
  }
  return `bugle-live-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function transformCurrentsArticle(
  raw: CurrentsRawArticle,
  requestedCategory: BugleCategory,
): BugleArticle {
  return {
    id: generateId(raw),
    headline: raw.title?.trim() || 'UNTITLED DISPATCH',
    lede: raw.description?.trim() ?? '',
    category: pickCategory(raw, requestedCategory),
    source: safeSource(raw),
    url: raw.url ?? '#',
    imageUrl: pickImage(raw),
    publishedAt: raw.published ?? new Date().toISOString(),
    reporter: getRandomReporter(),
    isSpiderManStory: false,
  }
}
